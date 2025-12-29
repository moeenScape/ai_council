import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { SubscriptionTier, ContentType, AIModel } from '../../src/types/index.js';

// Mock database
vi.mock('../../src/db/connection.js', () => ({
  query: vi.fn(),
  pool: { query: vi.fn() },
}));

// In-memory stores
const users = new Map<string, {
  id: string;
  email: string;
  passwordHash: string;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}>();
const prompts = new Map<string, {
  id: string;
  userId: string;
  content: string;
  contentType: ContentType;
  createdAt: Date;
}>();
const modelResponses = new Map<string, Array<{
  id: string;
  promptId: string;
  model: AIModel;
  content: string;
  responseTimeMs: number;
  status: string;
  errorMessage?: string;
  createdAt: Date;
}>>();

// Mock user repository
vi.mock('../../src/repositories/userRepository.js', () => ({
  createUser: vi.fn(async (email: string, passwordHash: string, tier: SubscriptionTier) => {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id,
      email,
      passwordHash,
      subscriptionTier: tier,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.set(id, user);
    return user;
  }),
  findUserById: vi.fn(async (id: string) => users.get(id) || null),
}));

// Mock prompt repository
vi.mock('../../src/repositories/promptRepository.js', () => ({
  createPrompt: vi.fn(async (userId: string, content: string, contentType: ContentType) => {
    const id = `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const prompt = {
      id,
      userId,
      content,
      contentType,
      createdAt: new Date(),
    };
    prompts.set(id, prompt);
    return prompt;
  }),
  getPromptByIdAndUser: vi.fn(async (id: string, userId: string) => {
    const prompt = prompts.get(id);
    return prompt && prompt.userId === userId ? prompt : null;
  }),
  getPromptsByUser: vi.fn(async (userId: string, limit: number, offset: number, retentionDays?: number | null) => {
    let userPrompts = Array.from(prompts.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply retention filter
    if (retentionDays !== null && retentionDays !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      userPrompts = userPrompts.filter(p => p.createdAt >= cutoff);
    }
    
    const total = userPrompts.length;
    const paged = userPrompts.slice(offset, offset + limit);
    
    return { prompts: paged, total };
  }),
  createModelResponses: vi.fn(async (promptId: string, responses: any[]) => {
    const saved = responses.map((r, i) => ({
      id: `response-${promptId}-${i}`,
      promptId,
      model: r.model,
      content: r.content,
      responseTimeMs: r.responseTimeMs,
      status: r.status,
      errorMessage: r.errorMessage,
      createdAt: new Date(),
    }));
    modelResponses.set(promptId, saved);
    return saved;
  }),
  getModelResponsesByPromptId: vi.fn(async (promptId: string) => {
    return modelResponses.get(promptId) || [];
  }),
}));

// Import after mocks
import * as historyService from '../../src/services/historyService.js';
import * as userRepo from '../../src/repositories/userRepository.js';
import * as promptRepo from '../../src/repositories/promptRepository.js';

// Generators
const subscriptionTierArb = fc.constantFrom<SubscriptionTier>('free', 'pro', 'team');
const contentTypeArb = fc.constantFrom<ContentType>('code', 'text', 'speech', 'summary', 'email', 'other');
const aiModelArb = fc.constantFrom<AIModel>('gpt', 'claude', 'grok');

// Helper to create test user
async function createTestUser(tier: SubscriptionTier): Promise<string> {
  const email = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
  const user = await userRepo.createUser(email, 'hashedpassword', tier);
  return user.id;
}

// Helper to create test prompt with responses
async function createTestPrompt(
  userId: string,
  content: string,
  contentType: ContentType,
  models: AIModel[],
  createdAt?: Date
): Promise<string> {
  const prompt = await promptRepo.createPrompt(userId, content, contentType);
  
  // Override createdAt if provided
  if (createdAt) {
    const stored = prompts.get(prompt.id);
    if (stored) {
      stored.createdAt = createdAt;
    }
  }
  
  const responses = models.map(model => ({
    model,
    content: `Response from ${model}`,
    responseTimeMs: Math.floor(Math.random() * 2000) + 500,
    status: 'success' as const,
  }));
  
  await promptRepo.createModelResponses(prompt.id, responses);
  
  return prompt.id;
}

describe('History Properties', () => {
  beforeEach(() => {
    users.clear();
    prompts.clear();
    modelResponses.clear();
  });

  // Feature: backend-api, Property 15: History Pagination
  // Validates: Requirements 7.1
  describe('Property 15: History Pagination', () => {
    it('should return at most the requested limit of items', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 50 }),
          async (tier, promptCount, limit) => {
            users.clear();
            prompts.clear();
            modelResponses.clear();
            
            const userId = await createTestUser(tier);
            
            // Create prompts
            for (let i = 0; i < promptCount; i++) {
              await createTestPrompt(userId, `Prompt ${i}`, 'text', ['gpt']);
            }
            
            const result = await historyService.getHistory(userId, { page: 1, limit });
            
            // Should return at most limit items
            expect(result.data.length).toBeLessThanOrEqual(limit);
            expect(result.data.length).toBeLessThanOrEqual(promptCount);
            
            // Pagination metadata should be correct
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBeLessThanOrEqual(100); // Max limit
            expect(result.pagination.total).toBe(promptCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include correct pagination metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          fc.integer({ min: 10, max: 30 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 5, max: 10 }),
          async (tier, promptCount, page, limit) => {
            users.clear();
            prompts.clear();
            modelResponses.clear();
            
            const userId = await createTestUser(tier);
            
            // Create prompts
            for (let i = 0; i < promptCount; i++) {
              await createTestPrompt(userId, `Prompt ${i}`, 'text', ['gpt']);
            }
            
            const result = await historyService.getHistory(userId, { page, limit });
            
            // Check pagination metadata
            expect(result.pagination.page).toBe(page);
            expect(typeof result.pagination.total).toBe('number');
            expect(typeof result.pagination.hasMore).toBe('boolean');
            
            // hasMore should be true if there are more items
            const offset = (page - 1) * limit;
            const expectedHasMore = offset + result.data.length < result.pagination.total;
            expect(result.pagination.hasMore).toBe(expectedHasMore);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: backend-api, Property 16: History Tier-Based Retention
  // Validates: Requirements 7.2, 7.3
  describe('Property 16: History Tier-Based Retention', () => {
    it('should limit free tier history to 7 days', async () => {
      users.clear();
      prompts.clear();
      modelResponses.clear();
      
      const userId = await createTestUser('free');
      
      // Create old prompt (10 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      await createTestPrompt(userId, 'Old prompt', 'text', ['gpt'], oldDate);
      
      // Create recent prompt (today)
      await createTestPrompt(userId, 'Recent prompt', 'text', ['gpt']);
      
      const result = await historyService.getHistory(userId, { page: 1, limit: 50 });
      
      // Should only return the recent prompt
      expect(result.data.length).toBe(1);
      expect(result.data[0].prompt.content).toBe('Recent prompt');
    });

    it('should allow unlimited history for pro/team tiers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<SubscriptionTier>('pro', 'team'),
          async (tier) => {
            users.clear();
            prompts.clear();
            modelResponses.clear();
            
            const userId = await createTestUser(tier);
            
            // Create old prompt (30 days ago)
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 30);
            await createTestPrompt(userId, 'Old prompt', 'text', ['gpt'], oldDate);
            
            // Create recent prompt
            await createTestPrompt(userId, 'Recent prompt', 'text', ['gpt']);
            
            const result = await historyService.getHistory(userId, { page: 1, limit: 50 });
            
            // Should return both prompts
            expect(result.data.length).toBe(2);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: backend-api, Property 17: History Item Completeness
  // Validates: Requirements 7.4
  describe('Property 17: History Item Completeness', () => {
    it('should include all required fields in history items', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          contentTypeArb,
          fc.array(aiModelArb, { minLength: 1, maxLength: 3 }),
          async (tier, content, contentType, models) => {
            users.clear();
            prompts.clear();
            modelResponses.clear();
            
            const userId = await createTestUser(tier);
            const uniqueModels = [...new Set(models)] as AIModel[];
            
            await createTestPrompt(userId, content, contentType, uniqueModels);
            
            const result = await historyService.getHistory(userId, { page: 1, limit: 50 });
            
            expect(result.data.length).toBe(1);
            const item = result.data[0];
            
            // Check required fields
            expect(item.id).toBeDefined();
            expect(typeof item.id).toBe('string');
            
            expect(item.prompt).toBeDefined();
            expect(item.prompt.content).toBe(content);
            expect(item.prompt.contentType).toBe(contentType);
            
            expect(item.responses).toBeDefined();
            expect(Array.isArray(item.responses)).toBe(true);
            expect(item.responses.length).toBe(uniqueModels.length);
            
            // Check each response
            for (const response of item.responses) {
              expect(uniqueModels).toContain(response.model);
              expect(typeof response.content).toBe('string');
              expect(typeof response.responseTimeMs).toBe('number');
              expect(['success', 'error', 'timeout']).toContain(response.status);
            }
            
            expect(item.createdAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: backend-api, Property 11: Comparison Persistence Round-Trip
  // Validates: Requirements 4.4, 7.5
  describe('Property 11: Comparison Persistence Round-Trip', () => {
    it('should retrieve the same data that was saved', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          contentTypeArb,
          fc.array(aiModelArb, { minLength: 1, maxLength: 3 }),
          async (tier, content, contentType, models) => {
            users.clear();
            prompts.clear();
            modelResponses.clear();
            
            const userId = await createTestUser(tier);
            const uniqueModels = [...new Set(models)] as AIModel[];
            
            const promptId = await createTestPrompt(userId, content, contentType, uniqueModels);
            
            // Retrieve via getComparison
            const retrieved = await historyService.getComparison(promptId, userId);
            
            // Verify data matches
            expect(retrieved.id).toBe(promptId);
            expect(retrieved.prompt.content).toBe(content);
            expect(retrieved.prompt.contentType).toBe(contentType);
            expect(retrieved.responses.length).toBe(uniqueModels.length);
            
            for (const model of uniqueModels) {
              const response = retrieved.responses.find(r => r.model === model);
              expect(response).toBeDefined();
              expect(response?.status).toBe('success');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
