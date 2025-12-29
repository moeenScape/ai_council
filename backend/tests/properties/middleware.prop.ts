import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth, requireTier } from '../../src/middleware/auth.js';
import { generateAccessToken } from '../../src/utils/jwt.js';
import { SubscriptionTier } from '../../src/types/index.js';

// Helper to create mock request
function createMockRequest(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

// Helper to create mock response
function createMockResponse(): Partial<Response> {
  return {};
}

// Generator for valid subscription tiers
const tierArb = fc.constantFrom<SubscriptionTier>('free', 'pro', 'team');

// Generator for valid user data
const userDataArb = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  tier: tierArb,
});

describe('Authentication Middleware Properties', () => {
  // Feature: backend-api, Property 19: Protected Endpoint Authentication
  // Validates: Requirements 8.6
  
  describe('Property 19: Protected Endpoint Authentication', () => {
    it('should reject requests without authorization header', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const req = createMockRequest() as Request;
          const res = createMockResponse() as Response;
          let error: Error | null = null;
          
          const next: NextFunction = (err?: unknown) => {
            if (err instanceof Error) {
              error = err;
            }
          };
          
          authenticate(req, res, next);
          
          expect(error).not.toBeNull();
          expect(error?.message).toContain('Authorization header required');
        }),
        { numRuns: 10 }
      );
    });

    it('should reject requests with invalid authorization format', async () => {
      const invalidFormats = [
        'InvalidFormat',
        'Basic token123',
        'Bearer',
        'bearer token123', // lowercase
        'Bearer token1 token2',
      ];
      
      await fc.assert(
        fc.asyncProperty(fc.constantFrom(...invalidFormats), async (authHeader) => {
          const req = createMockRequest(authHeader) as Request;
          const res = createMockResponse() as Response;
          let error: Error | null = null;
          
          const next: NextFunction = (err?: unknown) => {
            if (err instanceof Error) {
              error = err;
            }
          };
          
          authenticate(req, res, next);
          
          expect(error).not.toBeNull();
        }),
        { numRuns: 10 }
      );
    });

    it('should reject requests with invalid tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate tokens that look like valid format but aren't valid JWTs
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-'.split('')), { minLength: 10, maxLength: 100 }),
          async (invalidToken) => {
            const req = createMockRequest(`Bearer ${invalidToken}`) as Request;
            const res = createMockResponse() as Response;
            let error: Error | null = null;
            
            const next: NextFunction = (err?: unknown) => {
              if (err instanceof Error) {
                error = err;
              }
            };
            
            authenticate(req, res, next);
            
            // Should reject with some authentication error
            expect(error).not.toBeNull();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should accept requests with valid tokens and attach user', async () => {
      await fc.assert(
        fc.asyncProperty(userDataArb, async (userData) => {
          // Generate valid token
          const token = generateAccessToken({
            sub: userData.id,
            email: userData.email,
            tier: userData.tier,
          });
          
          const req = createMockRequest(`Bearer ${token}`) as Request;
          const res = createMockResponse() as Response;
          let nextCalled = false;
          let error: Error | null = null;
          
          const next: NextFunction = (err?: unknown) => {
            if (err instanceof Error) {
              error = err;
            } else {
              nextCalled = true;
            }
          };
          
          authenticate(req, res, next);
          
          expect(error).toBeNull();
          expect(nextCalled).toBe(true);
          expect(req.user).toBeDefined();
          expect(req.user?.sub).toBe(userData.id);
          expect(req.user?.email).toBe(userData.email);
          expect(req.user?.tier).toBe(userData.tier);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Optional Authentication', () => {
    it('should pass through without token', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const req = createMockRequest() as Request;
          const res = createMockResponse() as Response;
          let nextCalled = false;
          
          const next: NextFunction = () => {
            nextCalled = true;
          };
          
          optionalAuth(req, res, next);
          
          expect(nextCalled).toBe(true);
          expect(req.user).toBeUndefined();
        }),
        { numRuns: 10 }
      );
    });

    it('should attach user when valid token is provided', async () => {
      await fc.assert(
        fc.asyncProperty(userDataArb, async (userData) => {
          const token = generateAccessToken({
            sub: userData.id,
            email: userData.email,
            tier: userData.tier,
          });
          
          const req = createMockRequest(`Bearer ${token}`) as Request;
          const res = createMockResponse() as Response;
          let nextCalled = false;
          
          const next: NextFunction = () => {
            nextCalled = true;
          };
          
          optionalAuth(req, res, next);
          
          expect(nextCalled).toBe(true);
          expect(req.user).toBeDefined();
          expect(req.user?.sub).toBe(userData.id);
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Tier Requirements', () => {
    it('should allow users with matching tier', async () => {
      await fc.assert(
        fc.asyncProperty(userDataArb, async (userData) => {
          const req = {
            user: {
              sub: userData.id,
              email: userData.email,
              tier: userData.tier,
            },
          } as Request;
          const res = createMockResponse() as Response;
          let nextCalled = false;
          
          const next: NextFunction = () => {
            nextCalled = true;
          };
          
          // Require the user's actual tier
          const middleware = requireTier(userData.tier);
          middleware(req, res, next);
          
          expect(nextCalled).toBe(true);
        }),
        { numRuns: 30 }
      );
    });

    it('should reject users without matching tier', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            tier: fc.constant<SubscriptionTier>('free'),
          }),
          async (userData) => {
            const req = {
              user: {
                sub: userData.id,
                email: userData.email,
                tier: userData.tier,
              },
            } as Request;
            const res = createMockResponse() as Response;
            let error: Error | null = null;
            
            const next: NextFunction = (err?: unknown) => {
              if (err instanceof Error) {
                error = err;
              }
            };
            
            // Require pro or team tier (user is free)
            const middleware = requireTier('pro', 'team');
            middleware(req, res, next);
            
            expect(error).not.toBeNull();
            expect(error?.message).toContain('subscription');
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
