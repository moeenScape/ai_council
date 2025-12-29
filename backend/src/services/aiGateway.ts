import { AIModel, ContentType, ResponseStatus } from '../types/index.js';
import { config } from '../config/index.js';

export interface AIResponse {
  model: AIModel;
  content: string;
  responseTimeMs: number;
  status: ResponseStatus;
  errorMessage?: string;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

// Circuit breaker state per AI service
const circuitBreakers = new Map<AIModel, CircuitBreakerState>();

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  resetTimeout: 60000,
};

/**
 * Get or initialize circuit breaker state for a model
 */
function getCircuitBreaker(model: AIModel): CircuitBreakerState {
  if (!circuitBreakers.has(model)) {
    circuitBreakers.set(model, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
    });
  }
  return circuitBreakers.get(model)!;
}

/**
 * Check if circuit breaker allows request
 */
function canMakeRequest(model: AIModel): boolean {
  const cb = getCircuitBreaker(model);
  
  if (cb.state === 'closed') {
    return true;
  }
  
  if (cb.state === 'open') {
    // Check if reset timeout has passed
    if (Date.now() - cb.lastFailure > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      cb.state = 'half-open';
      return true;
    }
    return false;
  }
  
  // half-open: allow one request to test
  return true;
}

/**
 * Record success for circuit breaker
 */
function recordSuccess(model: AIModel): void {
  const cb = getCircuitBreaker(model);
  
  if (cb.state === 'half-open') {
    cb.failures = 0;
    cb.state = 'closed';
  } else {
    cb.failures = Math.max(0, cb.failures - 1);
  }
}

/**
 * Record failure for circuit breaker
 */
function recordFailure(model: AIModel): void {
  const cb = getCircuitBreaker(model);
  cb.failures += 1;
  cb.lastFailure = Date.now();
  
  if (cb.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    cb.state = 'open';
  }
}

/**
 * Reset circuit breaker (for testing)
 */
export function resetCircuitBreaker(model: AIModel): void {
  circuitBreakers.set(model, {
    failures: 0,
    lastFailure: 0,
    state: 'closed',
  });
}

/**
 * Reset all circuit breakers (for testing)
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
}

/**
 * Get circuit breaker state (for testing/monitoring)
 */
export function getCircuitBreakerState(model: AIModel): CircuitBreakerState {
  return getCircuitBreaker(model);
}

/**
 * Sleep helper for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate backoff delay with exponential backoff
 */
function getBackoffDelay(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 5000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter
  return delay + Math.random() * 500;
}

/**
 * Build system prompt based on content type
 */
function buildSystemPrompt(contentType: ContentType): string {
  const prompts: Record<ContentType, string> = {
    code: 'You are a helpful coding assistant. Provide clear, well-documented code solutions.',
    text: 'You are a helpful writing assistant. Provide clear and well-structured text.',
    speech: 'You are a speech writing assistant. Create engaging and natural-sounding speeches.',
    summary: 'You are a summarization assistant. Provide concise and accurate summaries.',
    email: 'You are an email writing assistant. Write professional and clear emails.',
    other: 'You are a helpful assistant. Provide clear and accurate responses.',
  };
  return prompts[contentType];
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt: string, contentType: ContentType): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.ai.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: buildSystemPrompt(contentType) },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(config.ai.timeout),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

/**
 * Call Anthropic API
 */
async function callAnthropic(prompt: string, contentType: ContentType): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.ai.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system: buildSystemPrompt(contentType),
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(config.ai.timeout),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as { content: Array<{ text: string }> };
  return data.content[0]?.text || '';
}

/**
 * Call xAI (Grok) API
 */
async function callXAI(prompt: string, contentType: ContentType): Promise<string> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.ai.xaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        { role: 'system', content: buildSystemPrompt(contentType) },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(config.ai.timeout),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

/**
 * Send prompt to a single AI model with retry logic
 */
export async function sendPrompt(
  model: AIModel,
  prompt: string,
  contentType: ContentType
): Promise<AIResponse> {
  const startTime = Date.now();
  
  // Check circuit breaker
  if (!canMakeRequest(model)) {
    return {
      model,
      content: '',
      responseTimeMs: Date.now() - startTime,
      status: 'error',
      errorMessage: 'Service temporarily unavailable (circuit breaker open)',
    };
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.ai.maxRetries; attempt++) {
    try {
      let content: string;
      
      switch (model) {
        case 'gpt':
          content = await callOpenAI(prompt, contentType);
          break;
        case 'claude':
          content = await callAnthropic(prompt, contentType);
          break;
        case 'grok':
          content = await callXAI(prompt, contentType);
          break;
        default:
          throw new Error(`Unknown model: ${model}`);
      }
      
      recordSuccess(model);
      
      return {
        model,
        content,
        responseTimeMs: Date.now() - startTime,
        status: 'success',
      };
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a timeout
      if (lastError.name === 'TimeoutError' || lastError.message.includes('timeout')) {
        recordFailure(model);
        return {
          model,
          content: '',
          responseTimeMs: Date.now() - startTime,
          status: 'timeout',
          errorMessage: 'Request timed out',
        };
      }
      
      // Retry with backoff if not last attempt
      if (attempt < config.ai.maxRetries) {
        await sleep(getBackoffDelay(attempt));
      }
    }
  }
  
  // All retries exhausted
  recordFailure(model);
  
  return {
    model,
    content: '',
    responseTimeMs: Date.now() - startTime,
    status: 'error',
    errorMessage: lastError?.message || 'Unknown error',
  };
}

/**
 * Send prompt to multiple AI models in parallel
 */
export async function sendPromptToMultiple(
  models: AIModel[],
  prompt: string,
  contentType: ContentType
): Promise<AIResponse[]> {
  const promises = models.map(model => sendPrompt(model, prompt, contentType));
  return Promise.all(promises);
}
