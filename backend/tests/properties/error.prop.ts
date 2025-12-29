import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { AppError, validationError, authenticationError, notFoundError, internalError } from '../../src/utils/errors.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { ERROR_TYPES } from '../../src/types/index.js';

// Mock config
vi.mock('../../src/config/index.js', () => ({
  config: {
    nodeEnv: 'test',
  },
}));

// Helper to create mock request
function createMockRequest(): Partial<Request> {
  return {};
}

// Helper to create mock response
function createMockResponse(): Partial<Response> & { 
  statusCode: number; 
  body: unknown;
  status: (code: number) => Response;
  json: (body: unknown) => Response;
} {
  const res: any = {
    statusCode: 200,
    body: null,
  };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

describe('Error Handling Properties', () => {
  // Feature: backend-api, Property 21: Error Response Format Consistency
  // Validates: Requirements 9.3, 9.4
  describe('Property 21: Error Response Format Consistency', () => {
    it('should return consistent error format for AppError', async () => {
      const errorTypes = [
        { fn: validationError, type: ERROR_TYPES.VALIDATION_ERROR, status: 400 },
        { fn: authenticationError, type: ERROR_TYPES.AUTHENTICATION_ERROR, status: 401 },
        { fn: notFoundError, type: ERROR_TYPES.NOT_FOUND, status: 404 },
        { fn: internalError, type: ERROR_TYPES.INTERNAL_ERROR, status: 500 },
      ];

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...errorTypes),
          fc.string({ minLength: 1, maxLength: 100 }),
          async ({ fn, type, status }, message) => {
            const error = fn(message);
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vi.fn();

            errorHandler(error, req as Request, res as unknown as Response, next);

            // Check status code
            expect(res.statusCode).toBe(status);

            // Check response format
            expect(res.body).toBeDefined();
            const body = res.body as any;
            expect(body.status).toBe(status);
            expect(body.error).toBeDefined();
            expect(body.error.type).toBe(type);
            expect(body.error.message).toBe(message);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent error format for unknown errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (message) => {
            const error = new Error(message);
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vi.fn();

            errorHandler(error, req as Request, res as unknown as Response, next);

            // Check status code
            expect(res.statusCode).toBe(500);

            // Check response format
            expect(res.body).toBeDefined();
            const body = res.body as any;
            expect(body.status).toBe(500);
            expect(body.error).toBeDefined();
            expect(body.error.type).toBe(ERROR_TYPES.INTERNAL_ERROR);
            expect(typeof body.error.message).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include details when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.dictionary(fc.string(), fc.string()),
          async (message, details) => {
            const error = validationError(message, details);
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vi.fn();

            errorHandler(error, req as Request, res as unknown as Response, next);

            const body = res.body as any;
            
            if (Object.keys(details).length > 0) {
              expect(body.error.details).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always have status, error.type, and error.message fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(new Error('test')),
            fc.constant(validationError('test')),
            fc.constant(authenticationError('test')),
            fc.constant(notFoundError('test')),
          ),
          async (error) => {
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vi.fn();

            errorHandler(error, req as Request, res as unknown as Response, next);

            const body = res.body as any;
            
            // Required fields must always be present
            expect(typeof body.status).toBe('number');
            expect(body.status).toBeGreaterThanOrEqual(400);
            expect(body.status).toBeLessThan(600);
            
            expect(body.error).toBeDefined();
            expect(typeof body.error.type).toBe('string');
            expect(typeof body.error.message).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('AppError Properties', () => {
  it('should serialize correctly to JSON', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        fc.constantFrom(...Object.values(ERROR_TYPES)),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (status, type, message) => {
          const error = new AppError(status, type, message);
          const json = error.toJSON();

          expect(json.status).toBe(status);
          expect(json.error.type).toBe(type);
          expect(json.error.message).toBe(message);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include details in JSON when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        fc.constantFrom(...Object.values(ERROR_TYPES)),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.dictionary(fc.string(), fc.jsonValue()),
        async (status, type, message, details) => {
          const error = new AppError(status, type, message, details);
          const json = error.toJSON();

          if (Object.keys(details).length > 0) {
            expect(json.error.details).toEqual(details);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
