import { ChatSession, ChatMessageWithResponses, AIModel, ContentType } from '../types/index.js';
import * as sessionRepo from '../repositories/sessionRepository.js';
import * as aiGateway from './aiGateway.js';
import * as quotaService from './quotaService.js';
import { notFoundError, authorizationError } from '../utils/errors.js';

/**
 * Create a new chat session
 */
export async function createSession(userId: string, title?: string): Promise<ChatSession> {
  return sessionRepo.createSession(userId, title);
}

/**
 * Get user's chat sessions
 */
export async function getUserSessions(
  userId: string,
  page = 1,
  limit = 50
): Promise<{ sessions: ChatSession[]; total: number; hasMore: boolean }> {
  const offset = (page - 1) * limit;
  const { sessions, total } = await sessionRepo.getUserSessions(userId, limit, offset);
  return {
    sessions,
    total,
    hasMore: offset + sessions.length < total,
  };
}

/**
 * Get a session with all messages
 */
export async function getSession(
  sessionId: string,
  userId: string
): Promise<{ session: ChatSession; messages: ChatMessageWithResponses[] }> {
  const result = await sessionRepo.getSessionWithMessages(sessionId);
  
  if (!result) {
    throw notFoundError('Session not found');
  }
  
  if (result.session.userId !== userId) {
    throw authorizationError('Not authorized to access this session');
  }
  
  return result;
}

/**
 * Send a message in a session and get AI responses
 */
export async function sendMessage(
  sessionId: string,
  userId: string,
  content: string,
  contentType: ContentType,
  models: AIModel[]
): Promise<ChatMessageWithResponses> {
  // Verify session ownership
  const session = await sessionRepo.getSessionById(sessionId);
  if (!session) {
    throw notFoundError('Session not found');
  }
  if (session.userId !== userId) {
    throw authorizationError('Not authorized to access this session');
  }
  
  // Check and enforce quota
  const user = await import('../repositories/userRepository.js').then(m => m.findUserById(userId));
  if (!user) throw notFoundError('User not found');
  
  await quotaService.enforceQuota(userId);
  quotaService.validateModelCount(user.subscriptionTier, models);
  
  // Create the message
  const message = await sessionRepo.createMessage(
    sessionId,
    userId,
    content,
    contentType,
    models
  );
  
  // Get AI responses in parallel
  const responses = await aiGateway.sendPromptToMultiple(models, content, contentType);
  
  // Save responses
  for (const response of responses) {
    await sessionRepo.createResponse(
      message.id,
      response.model,
      response.content,
      response.responseTimeMs,
      response.status,
      response.errorMessage
    );
  }
  
  // Decrement quota
  await quotaService.decrementQuota(userId);
  
  // Auto-generate title if first message
  await sessionRepo.autoGenerateTitle(sessionId);
  
  return {
    ...message,
    responses,
  };
}

/**
 * Send a message in a session and stream AI responses as they complete.
 */
export async function sendMessageStreaming(
  sessionId: string,
  userId: string,
  content: string,
  contentType: ContentType,
  models: AIModel[],
  onResponse: (response: ChatMessageWithResponses['responses'][number]) => void,
  onMessage?: (message: ChatMessageWithResponses) => void
): Promise<ChatMessageWithResponses> {
  // Verify session ownership
  const session = await sessionRepo.getSessionById(sessionId);
  if (!session) {
    throw notFoundError('Session not found');
  }
  if (session.userId !== userId) {
    throw authorizationError('Not authorized to access this session');
  }

  // Check and enforce quota
  const user = await import('../repositories/userRepository.js').then(m => m.findUserById(userId));
  if (!user) throw notFoundError('User not found');

  await quotaService.enforceQuota(userId);
  quotaService.validateModelCount(user.subscriptionTier, models);

  // Create the message
  const message = await sessionRepo.createMessage(
    sessionId,
    userId,
    content,
    contentType,
    models
  );

  onMessage?.({
    ...message,
    responses: [],
  });

  const responses = await Promise.all(models.map(async (model) => {
    const response = await aiGateway.sendPrompt(model, content, contentType);
    await sessionRepo.createResponse(
      message.id,
      response.model,
      response.content,
      response.responseTimeMs,
      response.status,
      response.errorMessage
    );
    onResponse(response);
    return response;
  }));

  // Decrement quota
  await quotaService.decrementQuota(userId);

  // Auto-generate title if first message
  await sessionRepo.autoGenerateTitle(sessionId);

  return {
    ...message,
    responses,
  };
}

/**
 * Update session title
 */
export async function updateSessionTitle(
  sessionId: string,
  userId: string,
  title: string
): Promise<ChatSession> {
  const session = await sessionRepo.getSessionById(sessionId);
  if (!session) {
    throw notFoundError('Session not found');
  }
  if (session.userId !== userId) {
    throw authorizationError('Not authorized to access this session');
  }
  
  const updated = await sessionRepo.updateSessionTitle(sessionId, title);
  if (!updated) {
    throw notFoundError('Session not found');
  }
  
  return updated;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  const session = await sessionRepo.getSessionById(sessionId);
  if (!session) {
    throw notFoundError('Session not found');
  }
  if (session.userId !== userId) {
    throw authorizationError('Not authorized to delete this session');
  }
  
  await sessionRepo.deleteSession(sessionId);
}
