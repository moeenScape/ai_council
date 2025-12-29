import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AIModel, ContentType } from '../../src/types/index.js';

// Track API call attempts
let apiCallAttempts: Map<AIModel, number>;
let shouldFail: Map<AIModel, boolean>;

describe('AI Gateway Properties', () => {
  beforeEach(() => {
    vi.resetModules();
    apiCallAttempts = new Map();
    shouldFail = new Map();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: backend-api, Property 22: Retry Behavior on AI Failure
  // Validates: Requirements 9.1, 9.2
  describe('Property 22: Retry Behavior on AI Failure', () => {
    it('should retry up to 2 times on failure', async () => {
      // Mock fetch to track calls and fail
      const mockFetch = vi.fn().mockRejectedValue(new Error('API error'));
      vi.stubGlobal('fetch', mockFetch);
      
      // Mock setTimeout to avoid delays
      vi.useFakeTimers();
      
      const aiGateway = await import('../../src/services/aiGateway.js');
      aiGateway.resetAllCircuitBreakers();
      
      const resultPromise = aiGateway.sendPrompt('gpt', 'test prompt', 'text');
      
      // Fast-forward through all retries
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      
      // Should have made 3 attempts (1 initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // Should return error status
      expect(result.status).toBe('error');
      expect(result.errorMessage).toBeDefined();
      
      vi.useRealTimers();
    });

    it('should succeed without retry if first attempt works', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<AIModel>('gpt', 'claude', 'grok'),
          fc.constantFrom<ContentType>('code', 'text', 'other'),
          async (model, contentType) => {
            vi.resetModules();
            
            // Mock successful fetch
            const mockFetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => ({
                choices: [{ message: { content: `Response from ${model}` } }],
                content: [{ text: `Response from ${model}` }],
              }),
            });
            vi.stubGlobal('fetch', mockFetch);
            
            const aiGateway = await import('../../src/services/aiGateway.js');
            aiGateway.resetAllCircuitBreakers();
            
            const result = await aiGateway.sendPrompt(model, 'test prompt', contentType);
            
            // Should have made only 1 attempt
            expect(mockFetch).toHaveBeenCalledTimes(1);
            
            // Should return success
            expect(result.status).toBe('success');
            expect(result.content).toContain('Response from');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  // Feature: backend-api, Property 23: Circuit Breaker Activation
  // Validates: Requirements 9.5
  describe('Property 23: Circuit Breaker Activation', () => {
    it('should open circuit after 5 consecutive failures', async () => {
      vi.useFakeTimers();
      
      // Mock fetch to always fail
      const mockFetch = vi.fn().mockRejectedValue(new Error('API error'));
      vi.stubGlobal('fetch', mockFetch);
      
      const aiGateway = await import('../../src/services/aiGateway.js');
      aiGateway.resetAllCircuitBreakers();
      
      // Make 5 failed requests (each will retry 2 times = 3 calls per request)
      for (let i = 0; i < 5; i++) {
        const promise = aiGateway.sendPrompt('gpt', `test ${i}`, 'text');
        await vi.runAllTimersAsync();
        await promise;
      }
      
      // Circuit should now be open
      const state = aiGateway.getCircuitBreakerState('gpt');
      expect(state.state).toBe('open');
      expect(state.failures).toBeGreaterThanOrEqual(5);
      
      // Reset mock call count
      mockFetch.mockClear();
      
      // Next request should fail fast without calling API
      const result = await aiGateway.sendPrompt('gpt', 'test', 'text');
      
      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('circuit breaker');
      expect(mockFetch).not.toHaveBeenCalled(); // No API calls made
      
      vi.useRealTimers();
    });

    it('should close circuit after successful request in half-open state', async () => {
      // Mock successful fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);
      
      const aiGateway = await import('../../src/services/aiGateway.js');
      aiGateway.resetAllCircuitBreakers();
      
      // Manually set circuit to half-open state
      const state = aiGateway.getCircuitBreakerState('gpt');
      (state as any).state = 'half-open';
      (state as any).failures = 5;
      
      // Make successful request
      const result = await aiGateway.sendPrompt('gpt', 'test', 'text');
      
      expect(result.status).toBe('success');
      
      // Circuit should be closed now
      const newState = aiGateway.getCircuitBreakerState('gpt');
      expect(newState.state).toBe('closed');
      expect(newState.failures).toBe(0);
    });
  });

  // Feature: backend-api, Property 10: Partial Failure Isolation
  // Validates: Requirements 4.2, 4.3
  describe('Property 10: Partial Failure Isolation', () => {
    it('should return successful responses even when some models fail', async () => {
      vi.useFakeTimers();
      
      // Mock fetch to fail for gpt, succeed for claude
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('openai')) {
          throw new Error('API error');
        }
        return {
          ok: true,
          json: async () => ({
            content: [{ text: 'Response from claude' }],
          }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);
      
      const aiGateway = await import('../../src/services/aiGateway.js');
      aiGateway.resetAllCircuitBreakers();
      
      const resultsPromise = aiGateway.sendPromptToMultiple(
        ['gpt', 'claude'],
        'test prompt',
        'text'
      );
      
      await vi.runAllTimersAsync();
      const results = await resultsPromise;
      
      expect(results).toHaveLength(2);
      
      const gptResult = results.find(r => r.model === 'gpt');
      const claudeResult = results.find(r => r.model === 'claude');
      
      // GPT should have error status
      expect(gptResult?.status).toBe('error');
      
      // Claude should have success status with content
      expect(claudeResult?.status).toBe('success');
      expect(claudeResult?.content).toBeDefined();
      expect(claudeResult?.content.length).toBeGreaterThan(0);
      
      vi.useRealTimers();
    });
  });
});

describe('AI Response Properties', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should always include response time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<AIModel>('gpt', 'claude', 'grok'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom<ContentType>('code', 'text', 'other'),
        async (model, prompt, contentType) => {
          vi.resetModules();
          
          const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              choices: [{ message: { content: 'Response' } }],
              content: [{ text: 'Response' }],
            }),
          });
          vi.stubGlobal('fetch', mockFetch);
          
          const aiGateway = await import('../../src/services/aiGateway.js');
          aiGateway.resetAllCircuitBreakers();
          
          const result = await aiGateway.sendPrompt(model, prompt, contentType);
          
          expect(typeof result.responseTimeMs).toBe('number');
          expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should always include model identifier', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<AIModel>('gpt', 'claude', 'grok'),
        async (model) => {
          vi.resetModules();
          
          const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              choices: [{ message: { content: 'Response' } }],
              content: [{ text: 'Response' }],
            }),
          });
          vi.stubGlobal('fetch', mockFetch);
          
          const aiGateway = await import('../../src/services/aiGateway.js');
          aiGateway.resetAllCircuitBreakers();
          
          const result = await aiGateway.sendPrompt(model, 'test', 'text');
          
          expect(result.model).toBe(model);
        }
      ),
      { numRuns: 50 }
    );
  });
});
