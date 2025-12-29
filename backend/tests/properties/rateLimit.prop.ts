import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { Request, Response } from 'express';

// Track rate limit state per key
const rateLimitState = new Map<string, { count: number; expiresAt: number }>();

// Mock Redis
vi.mock('../../src/db/redis.js', () => ({
  getRedisClient: vi.fn(),
  incrementRateLimit: vi.fn(async (key: string, windowMs: number) => {
    const now = Date.now();
    let state = rateLimitState.get(key);
    
    // Reset if expired
    if (!state || state.expiresAt < now) {
      state = { count: 0, expiresAt: now + windowMs };
      rateLimitState.set(key, state);
    }
    
    state.count += 1;
    const ttl = Math.max(0, state.expiresAt - now);
    
    return { count: state.count, ttl };
  }),
}));

// Import after mocks
import { rateLimit, RateLimitInfo } from '../../src/middleware/rateLimit.js';

// Helper to create mock request
function createMockRequest(userId?: string, ip?: string): Partial<Request> {
  const req: Partial<Request> = {
    ip: ip || '127.0.0.1',
    socket: { remoteAddress: ip || '127.0.0.1' } as any,
  };
  
  if (userId) {
    (req as any).user = { sub: userId };
  }
  
  return req;
}

// Helper to create mock response
function createMockResponse(): Partial<Response> & { headers: Record<string, string | number> } {
  const headers: Record<string, string | number> = {};
  return {
    headers,
    setHeader: vi.fn((name: string, value: string | number) => {
      headers[name] = value;
    }),
  };
}

describe('Rate Limiting Properties', () => {
  beforeEach(() => {
    rateLimitState.clear();
  });

  // Feature: backend-api, Property 18: Rate Limiting Enforcement
  // Validates: Requirements 8.1, 8.2
  describe('Property 18: Rate Limiting Enforcement', () => {
    it('should allow requests within the limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 51, max: 100 }),
          async (requestCount, maxRequests) => {
            rateLimitState.clear();
            
            const middleware = rateLimit({ windowMs: 60000, maxRequests });
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Make requests within limit
            for (let i = 0; i < requestCount; i++) {
              const req = createMockRequest(userId);
              const res = createMockResponse();
              const next = vi.fn();
              
              await middleware(req as Request, res as unknown as Response, next);
              
              // Should call next without error
              expect(next).toHaveBeenCalledWith();
              
              // Should set rate limit headers
              expect(res.headers['X-RateLimit-Limit']).toBe(maxRequests);
              expect(res.headers['X-RateLimit-Remaining']).toBe(maxRequests - (i + 1));
              expect(res.headers['X-RateLimit-Reset']).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests exceeding the limit with 429', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }),
          fc.integer({ min: 1, max: 5 }),
          async (maxRequests, extraRequests) => {
            rateLimitState.clear();
            
            const middleware = rateLimit({ windowMs: 60000, maxRequests });
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Exhaust the limit
            for (let i = 0; i < maxRequests; i++) {
              const req = createMockRequest(userId);
              const res = createMockResponse();
              const next = vi.fn();
              await middleware(req as Request, res as unknown as Response, next);
            }
            
            // Make extra requests that should be rejected
            for (let i = 0; i < extraRequests; i++) {
              const req = createMockRequest(userId);
              const res = createMockResponse();
              const next = vi.fn();
              
              await middleware(req as Request, res as unknown as Response, next);
              
              // Should call next with error
              expect(next).toHaveBeenCalledWith(expect.objectContaining({
                status: 429,
                type: 'RATE_LIMITED',
              }));
              
              // Should set Retry-After header
              expect(res.headers['Retry-After']).toBeDefined();
              expect(typeof res.headers['Retry-After']).toBe('number');
              expect(res.headers['Retry-After']).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include Retry-After header when rate limited', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (maxRequests) => {
            rateLimitState.clear();
            
            const windowMs = 60000;
            const middleware = rateLimit({ windowMs, maxRequests });
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Exhaust the limit
            for (let i = 0; i < maxRequests; i++) {
              const req = createMockRequest(userId);
              const res = createMockResponse();
              const next = vi.fn();
              await middleware(req as Request, res as unknown as Response, next);
            }
            
            // Make one more request
            const req = createMockRequest(userId);
            const res = createMockResponse();
            const next = vi.fn();
            
            await middleware(req as Request, res as unknown as Response, next);
            
            // Retry-After should be set and be a positive number
            expect(res.headers['Retry-After']).toBeDefined();
            expect(res.headers['Retry-After']).toBeGreaterThan(0);
            expect(res.headers['Retry-After']).toBeLessThanOrEqual(Math.ceil(windowMs / 1000));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track rate limits per user independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 5, max: 10 }),
          async (userCount, maxRequests) => {
            rateLimitState.clear();
            
            const middleware = rateLimit({ windowMs: 60000, maxRequests });
            const users = Array.from({ length: userCount }, (_, i) => 
              `user-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`
            );
            
            // Each user makes maxRequests - 1 requests
            for (const userId of users) {
              for (let i = 0; i < maxRequests - 1; i++) {
                const req = createMockRequest(userId);
                const res = createMockResponse();
                const next = vi.fn();
                
                await middleware(req as Request, res as unknown as Response, next);
                
                // Should succeed
                expect(next).toHaveBeenCalledWith();
              }
            }
            
            // Each user should still have 1 request remaining
            for (const userId of users) {
              const req = createMockRequest(userId);
              const res = createMockResponse();
              const next = vi.fn();
              
              await middleware(req as Request, res as unknown as Response, next);
              
              // Should succeed (last allowed request)
              expect(next).toHaveBeenCalledWith();
              expect(res.headers['X-RateLimit-Remaining']).toBe(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always set rate limit headers on every response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          async (requestCount) => {
            rateLimitState.clear();
            
            const maxRequests = 60;
            const middleware = rateLimit({ windowMs: 60000, maxRequests });
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            for (let i = 0; i < requestCount; i++) {
              const req = createMockRequest(userId);
              const res = createMockResponse();
              const next = vi.fn();
              
              await middleware(req as Request, res as unknown as Response, next);
              
              // Headers should always be set
              expect(res.headers['X-RateLimit-Limit']).toBe(maxRequests);
              expect(typeof res.headers['X-RateLimit-Remaining']).toBe('number');
              expect(res.headers['X-RateLimit-Remaining']).toBeGreaterThanOrEqual(0);
              expect(res.headers['X-RateLimit-Reset']).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
