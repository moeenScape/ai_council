import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { validEmailArb, uniqueEmailArb } from '../generators/user.gen.js';
import { validPasswordArb, invalidPasswordArb } from '../generators/password.gen.js';

// Mock the database repositories
vi.mock('../../src/db/connection.js', () => ({
  query: vi.fn(),
  pool: { query: vi.fn() },
}));

// In-memory user store for testing
const users = new Map<string, { id: string; email: string; passwordHash: string; subscriptionTier: string }>();
const refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();
const usageLogs = new Map<string, { comparisonsUsed: number }>();

// Mock user repository
vi.mock('../../src/repositories/userRepository.js', () => ({
  createUser: vi.fn(async (email: string, passwordHash: string, tier: string) => {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id,
      email,
      passwordHash,
      subscriptionTier: tier,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.set(email, user);
    return user;
  }),
  findUserByEmail: vi.fn(async (email: string) => {
    return users.get(email) || null;
  }),
  findUserById: vi.fn(async (id: string) => {
    for (const user of users.values()) {
      if (user.id === id) return user;
    }
    return null;
  }),
}));

// Mock refresh token repository
vi.mock('../../src/repositories/refreshTokenRepository.js', () => ({
  createRefreshToken: vi.fn(async (userId: string, token: string, expiresAt: Date) => {
    refreshTokens.set(token, { userId, expiresAt });
    return { id: 'token-id', userId, tokenHash: 'hash', expiresAt, createdAt: new Date() };
  }),
  findRefreshToken: vi.fn(async (token: string) => {
    const stored = refreshTokens.get(token);
    if (!stored || stored.expiresAt < new Date()) return null;
    return { id: 'token-id', userId: stored.userId, tokenHash: 'hash', expiresAt: stored.expiresAt, createdAt: new Date() };
  }),
  deleteRefreshToken: vi.fn(async (token: string) => {
    return refreshTokens.delete(token);
  }),
}));

// Mock usage repository
vi.mock('../../src/repositories/usageRepository.js', () => ({
  getTodayDate: vi.fn(() => new Date().toISOString().split('T')[0]),
  getUsageLog: vi.fn(async (userId: string) => {
    const key = `${userId}-today`;
    const log = usageLogs.get(key);
    return log ? { id: 'log-id', userId, date: 'today', comparisonsUsed: log.comparisonsUsed, updatedAt: new Date() } : null;
  }),
  getOrCreateUsageLog: vi.fn(async (userId: string) => {
    const key = `${userId}-today`;
    if (!usageLogs.has(key)) {
      usageLogs.set(key, { comparisonsUsed: 0 });
    }
    return { id: 'log-id', userId, date: 'today', comparisonsUsed: usageLogs.get(key)!.comparisonsUsed, updatedAt: new Date() };
  }),
}));

// Import after mocks are set up
import * as authService from '../../src/services/authService.js';

describe('Authentication Properties', () => {
  beforeEach(() => {
    // Clear stores before each test
    users.clear();
    refreshTokens.clear();
    usageLogs.clear();
  });

  // Feature: backend-api, Property 3: New Users Default to Free Tier
  // Validates: Requirements 1.4
  describe('Property 3: New Users Default to Free Tier', () => {
    it('should assign free tier to all newly registered users', async () => {
      await fc.assert(
        fc.asyncProperty(uniqueEmailArb, validPasswordArb, async (email, password) => {
          const result = await authService.signup(email, password);
          
          // User should have free tier
          expect(result.user.subscriptionTier).toBe('free');
          
          // Usage should reflect free tier limits
          expect(result.usage.limit).toBe(10); // Free tier has 10/day limit
        }),
        { numRuns: 50 }
      );
    });
  });

  // Feature: backend-api, Property 1: Authentication Round-Trip
  // Validates: Requirements 1.1, 1.5, 2.1
  describe('Property 1: Authentication Round-Trip', () => {
    it('should return valid tokens on successful registration', async () => {
      await fc.assert(
        fc.asyncProperty(uniqueEmailArb, validPasswordArb, async (email, password) => {
          const result = await authService.signup(email, password);
          
          // Should have both tokens
          expect(result.accessToken).toBeDefined();
          expect(result.accessToken.length).toBeGreaterThan(0);
          expect(result.refreshToken).toBeDefined();
          expect(result.refreshToken.length).toBeGreaterThan(0);
          
          // Should have expiry info
          expect(result.expiresIn).toBeGreaterThan(0);
          
          // Should have user info
          expect(result.user.id).toBeDefined();
          expect(result.user.email).toBe(email);
        }),
        { numRuns: 30 }
      );
    });

    it('should allow login after registration with same credentials', async () => {
      await fc.assert(
        fc.asyncProperty(uniqueEmailArb, validPasswordArb, async (email, password) => {
          // Register
          await authService.signup(email, password);
          
          // Login with same credentials
          const loginResult = await authService.login(email, password);
          
          // Should succeed with valid tokens
          expect(loginResult.accessToken).toBeDefined();
          expect(loginResult.refreshToken).toBeDefined();
          expect(loginResult.user.email).toBe(email);
        }),
        { numRuns: 20 }
      );
    });
  });

  // Feature: backend-api, Property 4: Invalid Credentials Return 401
  // Validates: Requirements 2.2
  describe('Property 4: Invalid Credentials Return 401', () => {
    it('should reject login with wrong password', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueEmailArb, 
          validPasswordArb, 
          validPasswordArb,
          async (email, correctPassword, wrongPassword) => {
            // Skip if passwords happen to be the same
            if (correctPassword === wrongPassword) return;
            
            // Register with correct password
            await authService.signup(email, correctPassword);
            
            // Try to login with wrong password
            await expect(authService.login(email, wrongPassword))
              .rejects.toThrow('Invalid email or password');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject login with non-existent email', async () => {
      await fc.assert(
        fc.asyncProperty(uniqueEmailArb, validPasswordArb, async (email, password) => {
          // Don't register, just try to login
          await expect(authService.login(email, password))
            .rejects.toThrow('Invalid email or password');
        }),
        { numRuns: 30 }
      );
    });
  });

  // Feature: backend-api, Property 2: Password Validation Rejects Weak Passwords
  // Validates: Requirements 1.3
  describe('Property 2: Password Validation Rejects Weak Passwords (via signup)', () => {
    it('should reject registration with invalid passwords', async () => {
      await fc.assert(
        fc.asyncProperty(uniqueEmailArb, invalidPasswordArb, async (email, password) => {
          await expect(authService.signup(email, password))
            .rejects.toThrow();
        }),
        { numRuns: 50 }
      );
    });
  });
});

describe('Token Refresh Properties', () => {
  beforeEach(() => {
    users.clear();
    refreshTokens.clear();
    usageLogs.clear();
  });

  // Feature: backend-api, Property 5: Token Refresh Validity
  // Validates: Requirements 2.3, 2.4
  describe('Property 5: Token Refresh Validity', () => {
    it('should issue new tokens when refreshing with valid refresh token', async () => {
      let counter = 0;
      await fc.assert(
        fc.asyncProperty(validPasswordArb, async (password) => {
          // Generate truly unique email for each iteration
          const email = `refresh_test_${Date.now()}_${counter++}_${Math.random().toString(36).substr(2, 9)}@test.com`;
          
          // Register to get tokens
          const signupResult = await authService.signup(email, password);
          
          // Refresh token
          const refreshResult = await authService.refreshAccessToken(signupResult.refreshToken);
          
          // Should get valid tokens
          expect(refreshResult.accessToken).toBeDefined();
          expect(refreshResult.accessToken.length).toBeGreaterThan(0);
          expect(refreshResult.refreshToken).toBeDefined();
          expect(refreshResult.refreshToken.length).toBeGreaterThan(0);
          
          // User info should be correct
          expect(refreshResult.user.email).toBe(email);
          expect(refreshResult.user.subscriptionTier).toBe('free');
          
          // Should have valid expiry
          expect(refreshResult.expiresIn).toBeGreaterThan(0);
          
          // Usage stats should be present
          expect(refreshResult.usage).toBeDefined();
          expect(refreshResult.usage.limit).toBe(10);
        }),
        { numRuns: 20 }
      );
    });

    it('should reject invalid refresh tokens', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 10, maxLength: 100 }), async (invalidToken) => {
          await expect(authService.refreshAccessToken(invalidToken))
            .rejects.toThrow();
        }),
        { numRuns: 30 }
      );
    });
  });
});
