import { 
  PromptRequest, 
  ComparisonResult, 
  AIModel, 
  ContentType 
} from '../types/index.js';
import { config } from '../config/index.js';
import { validationError, notFoundError } from '../utils/errors.js';
import * as quotaService from './quotaService.js';
import * as aiGateway from './aiGateway.js';
import * as promptRepo from '../repositories/promptRepository.js';
import * as userRepo from '../repositories/userRepository.js';

const VALID_CONTENT_TYPES: ContentType[] = ['code', 'text', 'speech', 'summary', 'email', 'other'];
const VALID_MODELS: AIModel[] = ['gpt', 'claude', 'grok'];

/**
 * Validate prompt request
 */
export function validatePromptRequest(request: PromptRequest, tier: string): void {
  // Validate content
  if (!request.content || typeof request.content !== 'string') {
    throw validationError('Content is required');
  }
  
  if (request.content.length < config.prompt.minLength) {
    throw validationError(`Content must be at least ${config.prompt.minLength} character(s)`);
  }
  
  if (request.content.length > config.prompt.maxLength) {
    throw validationError(`Content must not exceed ${config.prompt.maxLength} characters`);
  }
  
  // Validate content type
  if (!request.contentType || !VALID_CONTENT_TYPES.includes(request.contentType)) {
    throw validationError(`Invalid content type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}`);
  }
  
  // Validate models
  if (!request.models || !Array.isArray(request.models)) {
    throw validationError('Models array is required');
  }
  
  if (request.models.length < config.prompt.minModels) {
    throw validationError(`At least ${config.prompt.minModels} model must be selected`);
  }
  
  // Validate each model
  for (const model of request.models) {
    if (!VALID_MODELS.includes(model)) {
      throw validationError(`Invalid model: ${model}. Must be one of: ${VALID_MODELS.join(', ')}`);
    }
  }
  
  // Validate model count against tier
  quotaService.validateModelCount(tier as any, request.models);
}

/**
 * Submit a prompt for comparison
 */
export async function submitPrompt(
  userId: string,
  request: PromptRequest
): Promise<ComparisonResult> {
  // Get user to check tier
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }
  
  // Validate request
  validatePromptRequest(request, user.subscriptionTier);
  
  // Check and enforce quota
  await quotaService.enforceQuota(userId);
  
  // Save prompt to database
  const prompt = await promptRepo.createPrompt(
    userId,
    request.content,
    request.contentType
  );
  
  // Send to AI models in parallel
  const aiResponses = await aiGateway.sendPromptToMultiple(
    request.models,
    request.content,
    request.contentType
  );
  
  // Save responses to database
  await promptRepo.createModelResponses(prompt.id, aiResponses);
  
  // Decrement quota after successful processing
  await quotaService.decrementQuota(userId);
  
  // Build and return comparison result
  return {
    id: prompt.id,
    prompt: {
      content: prompt.content,
      contentType: prompt.contentType,
    },
    responses: aiResponses.map(r => ({
      model: r.model,
      content: r.content,
      responseTimeMs: r.responseTimeMs,
      status: r.status,
      errorMessage: r.errorMessage,
    })),
    createdAt: prompt.createdAt,
  };
}

/**
 * Get a comparison by ID
 */
export async function getComparison(
  id: string,
  userId: string
): Promise<ComparisonResult> {
  const prompt = await promptRepo.getPromptByIdAndUser(id, userId);
  if (!prompt) {
    throw notFoundError('Comparison not found');
  }
  
  const responses = await promptRepo.getModelResponsesByPromptId(id);
  
  return {
    id: prompt.id,
    prompt: {
      content: prompt.content,
      contentType: prompt.contentType,
    },
    responses: responses.map(r => ({
      model: r.model,
      content: r.content,
      responseTimeMs: r.responseTimeMs,
      status: r.status,
      errorMessage: r.errorMessage,
    })),
    createdAt: prompt.createdAt,
  };
}
