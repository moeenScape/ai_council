import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { incrementRateLimit } from '../db/redis.js';
import { rateLimitedError } from '../utils/errors.js';
import { AuthenticatedRequest } from './auth.js';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter?: number; // Seconds until reset
}

/**
 * Get rate limit key for a request
 * Uses user ID if authenticated, otherwise IP address
 */
function getRateLimitKey(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user?.sub) {
    return `ratelimit:user:${authReq.user.sub}`;
  }
  // Fall back to IP for unauthenticated requests
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ratelimit:ip:${ip}`;
}

/**
 * Add rate limit headers to response
 */
function setRateLimitHeaders(res: Response, info: RateLimitInfo): void {
  res.setHeader('X-RateLimit-Limit', info.limit);
  res.setHeader('X-RateLimit-Remaining', info.remaining);
  res.setHeader('X-RateLimit-Reset', info.reset);
  if (info.retryAfter !== undefined) {
    res.setHeader('Retry-After', info.retryAfter);
  }
}

/**
 * Rate limiting middleware using Redis sliding window
 */
export function rateLimit(options?: {
  windowMs?: number;
  maxRequests?: number;
}) {
  const windowMs = options?.windowMs ?? config.rateLimit.windowMs;
  const maxRequests = options?.maxRequests ?? config.rateLimit.maxRequests;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = getRateLimitKey(req);
      const { count, ttl } = await incrementRateLimit(key, windowMs);
      
      const resetTimestamp = Math.ceil((Date.now() + ttl) / 1000);
      const remaining = Math.max(0, maxRequests - count);
      
      const rateLimitInfo: RateLimitInfo = {
        limit: maxRequests,
        remaining,
        reset: resetTimestamp,
      };
      
      setRateLimitHeaders(res, rateLimitInfo);
      
      if (count > maxRequests) {
        const retryAfter = Math.ceil(ttl / 1000);
        rateLimitInfo.retryAfter = retryAfter;
        setRateLimitHeaders(res, rateLimitInfo);
        
        throw rateLimitedError(
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          { retryAfter, resetAt: new Date(resetTimestamp * 1000).toISOString() }
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Strict rate limiter for sensitive endpoints (e.g., login)
 * Lower limits to prevent brute force attacks
 */
export function strictRateLimit() {
  return rateLimit({
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  });
}

/**
 * Lenient rate limiter for read-heavy endpoints
 */
export function lenientRateLimit() {
  return rateLimit({
    windowMs: 60000, // 1 minute
    maxRequests: 120, // 120 requests per minute
  });
}
