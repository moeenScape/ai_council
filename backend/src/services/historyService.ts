import { ComparisonResult, PaginatedResponse, PaginationOptions } from '../types/index.js';
import { config, getSubscriptionPlan } from '../config/index.js';
import { notFoundError } from '../utils/errors.js';
import * as promptRepo from '../repositories/promptRepository.js';
import * as userRepo from '../repositories/userRepository.js';

export interface HistoryItem {
  id: string;
  prompt: {
    content: string;
    contentType: string;
  };
  models: string[];
  responseCount: number;
  createdAt: Date;
}

/**
 * Get user's comparison history with pagination
 */
export async function getHistory(
  userId: string,
  options: PaginationOptions
): Promise<PaginatedResponse<ComparisonResult>> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }

  const plan = getSubscriptionPlan(user.subscriptionTier);
  const limit = Math.min(options.limit, config.history.maxLimit);
  const offset = (options.page - 1) * limit;

  // Apply tier-based retention
  const { prompts, total } = await promptRepo.getPromptsByUser(
    userId,
    limit,
    offset,
    plan.historyRetentionDays
  );

  // Fetch responses for each prompt
  const comparisons: ComparisonResult[] = await Promise.all(
    prompts.map(async (prompt) => {
      const responses = await promptRepo.getModelResponsesByPromptId(prompt.id);
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
    })
  );

  return {
    data: comparisons,
    pagination: {
      page: options.page,
      limit,
      total,
      hasMore: offset + prompts.length < total,
    },
  };
}

/**
 * Get a specific comparison from history
 */
export async function getComparison(
  id: string,
  userId: string
): Promise<ComparisonResult> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }

  const prompt = await promptRepo.getPromptByIdAndUser(id, userId);
  if (!prompt) {
    throw notFoundError('Comparison not found');
  }

  // Check tier-based retention
  const plan = getSubscriptionPlan(user.subscriptionTier);
  if (plan.historyRetentionDays !== null) {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - plan.historyRetentionDays);
    
    if (prompt.createdAt < retentionDate) {
      throw notFoundError('Comparison not found or expired');
    }
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
