import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { SubscriptionTier, AIModel } from '../../src/types/index.js';

// Mock the database connection
vi.mock('../../src/db/connection.js', () => ({
  query: vi.fn(),
  pool: { query: vi.fn() },
}));

// In-memory stores for testing
const users = new Map<string, { 
  id: string; 
  email: string; 
  passwordHash: string; 
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}>();
const usageLogs = new Map<string, { comparisonsUsed: number }>();

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
  findUserByEmail: vi.fn(async (email: string) => {
    for (const user of users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }),
  findUserById: vi.fn(async (id: string) => {
    return users.get(id) || null;
  }),
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
  getOrCreateUsageLog: vi.fn(async (userId: string) => {
    const key = `${userId}-today`;
    if (!usageLogs.has(key)) {
      usageLogs.set(key, { comparisonsUsed: 0 });
    }
    return { 
      id: 'log-id', 
      userId, 
      date: new Date().toISOString().split('T')[0], 
      comparisonsUsed: usageLogs.get(key)!.comparisonsUsed, 
      updatedAt: new Date() 
    };
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
    return { 
      id: 'log-id', 
      userId, 
      date: new Date().toISOString().split('T')[0], 
      comparisonsUsed: 0, 
      updatedAt: new Date() 
    };
  }),
}));

// Import after mocks
import * as quotaService from '../../src/services/quotaService.js';
import * as userRepo from '../../src/repositories/userRepository.js';
import { SUBSCRIPTION_PLANS } from '../../src/config/index.js';

// Generators
const subscriptionTierArb = fc.constantFrom<SubscriptionTier>('free', 'pro', 'team');
const aiModelArb = fc.constantFrom<AIModel>('gpt', 'claude', 'grok');
const modelArrayArb = (min: number, max: number) => 
  fc.array(aiModelArb, { minLength: min, maxLength: max });

// Helper to create a test user
async function createTestUser(tier: SubscriptionTier): Promise<string> {
  const email = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`;
  const user = await userRepo.createUser(email, 'hashedpassword', tier);
  return user.id;
}

describe('Quota Properties', () => {
  beforeEach(() => {
    users.clear();
    usageLogs.clear();
  });

  // Feature: backend-api, Property 12: Quota Decrement Consistency
  // Validates: Requirements 5.1, 5.6
  describe('Property 12: Quota Decrement Consistency', () => {
    it('should decrement quota by exactly 1 for each call', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          fc.integer({ min: 1, max: 5 }),
          async (tier, decrementCount) => {
            const userId = await createTestUser(tier);
            
            // Get initial usage
            const initialStats = await quotaService.getUsageStats(userId);
            const initialUsed = initialStats.used;
            
            // Decrement multiple times
            for (let i = 0; i < decrementCount; i++) {
              await quotaService.decrementQuota(userId);
            }
            
            // Check final usage
            const finalStats = await quotaService.getUsageStats(userId);
            expect(finalStats.used).toBe(initialUsed + decrementCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: backend-api, Property 13: Usage Stats Completeness
  // Validates: Requirements 5.2
  describe('Property 13: Usage Stats Completeness', () => {
    it('should return complete usage stats with all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(subscriptionTierArb, async (tier) => {
          const userId = await createTestUser(tier);
          
          const stats = await quotaService.getUsageStats(userId);
          
          // Must have used count (number >= 0)
          expect(typeof stats.used).toBe('number');
          expect(stats.used).toBeGreaterThanOrEqual(0);
          
          // Must have limit (number or null for unlimited)
          expect(stats.limit === null || typeof stats.limit === 'number').toBe(true);
          
          // Must have remaining (number or null for unlimited)
          expect(stats.remaining === null || typeof stats.remaining === 'number').toBe(true);
          
          // Must have resetAt (Date)
          expect(stats.resetAt).toBeInstanceOf(Date);
          
          // resetAt should be in the future (tomorrow midnight UTC)
          expect(stats.resetAt.getTime()).toBeGreaterThan(Date.now());
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly calculate remaining quota', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          fc.integer({ min: 0, max: 15 }),
          async (tier, usageCount) => {
            const userId = await createTestUser(tier);
            const plan = SUBSCRIPTION_PLANS[tier];
            
            // Simulate usage
            for (let i = 0; i < usageCount; i++) {
              await quotaService.decrementQuota(userId);
            }
            
            const stats = await quotaService.getUsageStats(userId);
            
            if (plan.dailyLimit === null) {
              // Unlimited plans
              expect(stats.limit).toBeNull();
              expect(stats.remaining).toBeNull();
            } else {
              // Limited plans
              expect(stats.limit).toBe(plan.dailyLimit);
              expect(stats.remaining).toBe(Math.max(0, plan.dailyLimit - usageCount));
            }
            
            expect(stats.used).toBe(usageCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: backend-api, Property 14: Subscription Tier Limits
  // Validates: Requirements 5.3, 5.4, 6.2
  describe('Property 14: Subscription Tier Limits', () => {
    it('should enforce correct daily limits per tier', async () => {
      await fc.assert(
        fc.asyncProperty(subscriptionTierArb, async (tier) => {
          const userId = await createTestUser(tier);
          const plan = SUBSCRIPTION_PLANS[tier];
          
          const quotaStatus = await quotaService.checkQuota(userId);
          
          if (tier === 'free') {
            expect(quotaStatus.limit).toBe(10);
            expect(quotaStatus.remaining).toBe(10);
          } else {
            // Pro and Team have unlimited
            expect(quotaStatus.limit).toBeNull();
            expect(quotaStatus.remaining).toBeNull();
          }
          
          expect(quotaStatus.allowed).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should enforce model count limits per tier', async () => {
      await fc.assert(
        fc.asyncProperty(
          subscriptionTierArb,
          fc.integer({ min: 1, max: 5 }),
          async (tier, modelCount) => {
            const plan = SUBSCRIPTION_PLANS[tier];
            const models: AIModel[] = Array(modelCount).fill('gpt');
            
            if (modelCount <= plan.maxModelsPerComparison) {
              // Should not throw
              expect(() => quotaService.validateModelCount(tier, models)).not.toThrow();
            } else {
              // Should throw validation error
              expect(() => quotaService.validateModelCount(tier, models)).toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow free tier max 2 models, pro/team max 3 models', async () => {
      // Free tier: max 2 models
      expect(() => quotaService.validateModelCount('free', ['gpt', 'claude'])).not.toThrow();
      expect(() => quotaService.validateModelCount('free', ['gpt', 'claude', 'grok'])).toThrow();
      
      // Pro tier: max 3 models
      expect(() => quotaService.validateModelCount('pro', ['gpt', 'claude', 'grok'])).not.toThrow();
      
      // Team tier: max 3 models
      expect(() => quotaService.validateModelCount('team', ['gpt', 'claude', 'grok'])).not.toThrow();
    });

    it('should block free tier users when quota exhausted', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant('free' as SubscriptionTier), async (tier) => {
          const userId = await createTestUser(tier);
          
          // Use all 10 comparisons
          for (let i = 0; i < 10; i++) {
            await quotaService.decrementQuota(userId);
          }
          
          const quotaStatus = await quotaService.checkQuota(userId);
          expect(quotaStatus.allowed).toBe(false);
          expect(quotaStatus.remaining).toBe(0);
          
          // enforceQuota should throw
          await expect(quotaService.enforceQuota(userId)).rejects.toThrow('Daily quota exceeded');
        }),
        { numRuns: 50 }
      );
    });

    it('should never block pro/team users regardless of usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<SubscriptionTier>('pro', 'team'),
          fc.integer({ min: 0, max: 100 }),
          async (tier, usageCount) => {
            const userId = await createTestUser(tier);
            
            // Simulate heavy usage
            for (let i = 0; i < usageCount; i++) {
              await quotaService.decrementQuota(userId);
            }
            
            const quotaStatus = await quotaService.checkQuota(userId);
            expect(quotaStatus.allowed).toBe(true);
            expect(quotaStatus.limit).toBeNull();
            expect(quotaStatus.remaining).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Subscription Details Properties', () => {
  beforeEach(() => {
    users.clear();
    usageLogs.clear();
  });

  it('should return complete subscription details', async () => {
    await fc.assert(
      fc.asyncProperty(subscriptionTierArb, async (tier) => {
        const userId = await createTestUser(tier);
        
        const details = await quotaService.getSubscriptionDetails(userId);
        
        // Should have tier
        expect(details.tier).toBe(tier);
        
        // Should have plan details
        expect(details.plan).toBeDefined();
        expect(typeof details.plan.maxModelsPerComparison).toBe('number');
        expect(details.plan.dailyLimit === null || typeof details.plan.dailyLimit === 'number').toBe(true);
        expect(details.plan.historyRetentionDays === null || typeof details.plan.historyRetentionDays === 'number').toBe(true);
        expect(typeof details.plan.maxTeamMembers).toBe('number');
        
        // Should have usage stats
        expect(details.usage).toBeDefined();
        expect(typeof details.usage.used).toBe('number');
      }),
      { numRuns: 100 }
    );
  });
});
