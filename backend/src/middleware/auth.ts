import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DecodedAccessToken } from '../utils/jwt.js';
import { authenticationError, authorizationError } from '../utils/errors.js';
import { SubscriptionTier } from '../types/index.js';

// Type for authenticated request - uses 'id' to match Express.Request extension
export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;  // User ID (from JWT 'sub' claim)
    email: string;
    tier: SubscriptionTier;
  };
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email: string;
        tier: SubscriptionTier;
      };
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT access token and attaches user to request
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw authenticationError('Authorization header required');
    }
    
    // Expect "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw authenticationError('Invalid authorization header format');
    }
    
    const token = parts[1];
    
    // Verify token
    let decoded: DecodedAccessToken;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      throw authenticationError('Invalid or expired token');
    }
    
    // Attach user to request
    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      tier: decoded.tier,
    };
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }
    
    const token = parts[1];
    
    try {
      const decoded = verifyAccessToken(token);
      req.user = {
        sub: decoded.sub,
        email: decoded.email,
        tier: decoded.tier,
      };
    } catch {
      // Token invalid, but that's okay for optional auth
    }
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require specific subscription tier
 */
export function requireTier(...allowedTiers: SubscriptionTier[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(authenticationError('Authentication required'));
    }
    
    if (!allowedTiers.includes(req.user.tier)) {
      return next(authorizationError(`This feature requires ${allowedTiers.join(' or ')} subscription`));
    }
    
    next();
  };
}

/**
 * Require admin role (for admin endpoints)
 * In a real app, this would check an admin flag in the database
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(authenticationError('Authentication required'));
  }
  
  // For now, we'll use a simple email check
  // In production, this should check an admin flag in the database
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  
  if (!adminEmails.includes(req.user.email)) {
    return next(authorizationError('Admin access required'));
  }
  
  next();
}
