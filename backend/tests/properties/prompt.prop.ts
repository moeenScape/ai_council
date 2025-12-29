import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AIModel, ContentType, SubscriptionTier } from '../../src/types/index.js';

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
const usageLogs = new Map<string, { comparisonsUsed: number }>();
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

// Mock usage repository
vi.mock('../../src/repositories/usageRepository.js', () => ({
  getTodayDate: vi.fn(() => new Date().toISOString().split('T')[0]),
  getUsageLog: vi.fn(async (userId: string) => {
    const key = `${userId}-today`;
    const log = usageLogs.get(key);
    return log ? {
      id: 'log-id',
      userId,
      date: new Date().toISOString().split('T')[0],
      comparisonsUsed: log.comparisonsUsed,
      updatedAt: new Date()
    } : null;
  }),
  incrementUsage: vi.fn(async (userId: string) => {
    const key = `${userId}-today`;
    const current = usageLogs.get(key) || { comparisonsUsed: 0 };
    current.comparisonsUsed += 1;
    usageLogs.set(key, current);
    return {
      id: 'log-id',
      userId,
      date: new Date().toISOString().split('T')[0],
      comparisonsUsed: current.comparisonsUsed,
      updatedAt: new Date()
    };
  }),
  resetUsage: vi.fn(async (userId: string) => {
    const key = `${userId}-today`;
    usageLogs.set(key, { comparisonsUsed: 0 });
  }),
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
  createModelResponses: vi.fn(async (promptId: string, responses: any[]) => {
    const saved = responses.map((r, i) => ({
      id: `response-${i}`,
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

// Mock AI Gateway - simulate successful responses
vi.mock('../../src/services/aiGateway.js', () => ({
  sendPromptToMultiple: vi.fn(async (models: AIModel[], prompt: string, contentType: ContentType) => {
    return models.map(model => ({
      model,
      content: `Response from ${model} for: ${prompt.substring(0, 50)}...`,
      responseTimeMs: Math.floor(Math.random() * 2000) + 500,
      status: 'success' as const,
    }));
  }),
  sendPrompt: vi.fn(async (model: AIModel, prompt: string, contentType: ContentType) => ({
    model,
    content: `Response from ${model}`,
    responseTimeMs: Math.floor(Math.random() * 2000) + 500,
    status: 'success' as const,
  })),
  resetAllCircuitBreakers: vi.fn(),
}));

// Import after mocks
import * as promptService from '../../src/services/promptService.js';
import * as userRepo from '../../src/repositories/userRepository.js';

// Generators
const contentTypeArb = fc.constantFrom<ContentType>('code', 'text', 'speech', 'summary', 'email', 'other');
const aiModelArb = fc.constantFrom<AIModel>('gpt', 'claude', 'grok');
const validContentArb = fc.string({ minLength: 1, maxLength: 1000 });
const invalidContentArb = fc.oneof(
  fc.constant(''), // empty
  fc.string({ minLength: 10001, maxLength: 10100 }) // too long
);
const subscriptionTierArb = fc.constantFrom<SubscriptionTier>('free', 'pro', 'team');

// Helper to create test user
async function createTestUser(tier: SubscriptionTier): Promise<string> {
  const email = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
  const user = await userRepo.createUser(email, 'hashedpassword', tier);
  return user.id;
}

describe('Prompt Processing Properties', () => {
  beforeEach(() => {
    users.clear();
    usageLogs.clear();
    prompts.clear();
    modelResponses.clear();
  });

  // Feature: backend-api, Property 6: Valid Prompt Processing
  // Validates: Requirements 3.1, 3.3
  describe('Property 6: Valid Prompt Processing', () => {
    it('should accept valid prompts with 1-3 models', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          validContentArb,
          contentTypeArb,
          fc.integer({ min: 1, max: 3 }),
          async (tier, content, contentType, modelCount) => {
            // Adjust model count for free tier
            const maxModels = tier === 'free' ? 2 : 3;
            const actualModelCount = Math.min(modelCount, maxModels);
            
            const userId = await createTestUser(tier);
            const models: AIModel[] = ['gpt', 'claude', 'grok'].slice(0, actualModelCount) as AIModel[];
            
            const result = await promptService.submitPrompt(userId, {
              content,
              contentType,
              models,
            });
            
            // Should return valid result
            expect(result.id).toBeDefined();
            expect(result.prompt.content).toBe(content);
            expect(result.prompt.contentType).toBe(contentType);
            expect(result.responses).toHaveLength(actualModelCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: backend-api, Property 7: Invalid Prompt Rejection
  // Validates: Requirements 3.2, 3.6
  describe('Property 7: Invalid Prompt Rejection', () => {
    it('should reject prompts with empty content', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          contentTypeArb,
          async (tier, contentType) => {
            const userId = await createTestUser(tier);
            
            await expect(promptService.submitPrompt(userId, {
              content: '',
              contentType,
              models: ['gpt'],
            })).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject prompts with no models', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          validContentArb,
          contentTypeArb,
          async (tier, content, contentType) => {
            const userId = await createTestUser(tier);
            
            await expect(promptService.submitPrompt(userId, {
              content,
              contentType,
              models: [],
            })).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject prompts exceeding model limit for tier', async () => {
      await fc.assert(
        fc.asyncProperty(
          validContentArb,
          contentTypeArb,
          async (content, contentType) => {
            // Free tier can only use 2 models
            const userId = await createTestUser('free');
            
            await expect(promptService.submitPrompt(userId, {
              content,
              contentType,
              models: ['gpt', 'claude', 'grok'], // 3 models
            })).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: backend-api, Property 8: Quota Enforcement
  // Validates: Requirements 3.5, 5.3
  describe('Property 8: Quota Enforcement', () => {
    it('should reject prompts when quota is exhausted', async () => {
      await fc.assert(
        fc.asyncProperty(
          validContentArb,
          contentTypeArb,
          async (content, contentType) => {
            const userId = await createTestUser('free');
            
            // Exhaust quota (10 for free tier)
            for (let i = 0; i < 10; i++) {
              await promptService.submitPrompt(userId, {
                content: `test ${i}`,
                contentType,
                models: ['gpt'],
              });
            }
            
            // Next request should fail
            await expect(promptService.submitPrompt(userId, {
              content,
              contentType,
              models: ['gpt'],
            })).rejects.toThrow('Daily quota exceeded');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Feature: backend-api, Property 9: Response Structure Completeness
  // Validates: Requirements 4.1, 4.5
  describe('Property 9: Response Structure Completeness', () => {
    it('should return complete response structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          validContentArb,
          contentTypeArb,
          fc.integer({ min: 1, max: 2 }),
          async (tier, content, contentType, modelCount) => {
            const userId = await createTestUser(tier);
            const models: AIModel[] = ['gpt', 'claude'].slice(0, modelCount) as AIModel[];
            
            const result = await promptService.submitPrompt(userId, {
              content,
              contentType,
              models,
            });
            
            // Check prompt structure
            expect(result.id).toBeDefined();
            expect(typeof result.id).toBe('string');
            expect(result.prompt.content).toBe(content);
            expect(result.prompt.contentType).toBe(contentType);
            expect(result.createdAt).toBeInstanceOf(Date);
            
            // Check responses structure
            expect(result.responses).toHaveLength(modelCount);
            for (const response of result.responses) {
              expect(models).toContain(response.model);
              expect(typeof response.content).toBe('string');
              expect(typeof response.responseTimeMs).toBe('number');
              expect(response.responseTimeMs).toBeGreaterThanOrEqual(0);
              expect(['success', 'error', 'timeout']).toContain(response.status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Prompt Validation Properties', () => {
  beforeEach(() => {
    users.clear();
    usageLogs.clear();
    prompts.clear();
    modelResponses.clear();
  });

  it('should validate content type enum', async () => {
    const validTypes: ContentType[] = ['code', 'text', 'speech', 'summary', 'email', 'other'];
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...validTypes),
        validContentArb,
        async (contentType, content) => {
          const userId = await createTestUser('pro');
          
          // Should not throw for valid content types
          const result = await promptService.submitPrompt(userId, {
            content,
            contentType,
            models: ['gpt'],
          });
          
          expect(result.prompt.contentType).toBe(contentType);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate model enum', async () => {
    const validModels: AIModel[] = ['gpt', 'claude', 'grok'];
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...validModels),
        validContentArb,
        contentTypeArb,
        async (model, content, contentType) => {
          const userId = await createTestUser('pro');
          
          const result = await promptService.submitPrompt(userId, {
            content,
            contentType,
            models: [model],
          });
          
          expect(result.responses[0].model).toBe(model);
        }
      ),
      { numRuns: 100 }
    );
  });
});
