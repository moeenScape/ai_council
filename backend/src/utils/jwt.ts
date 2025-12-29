import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { SubscriptionTier } from '../types/index.js';

export interface AccessTokenPayload {
  sub: string; // User ID
  email: string;
  tier: SubscriptionTier;
}

export interface DecodedAccessToken extends AccessTokenPayload {
  iat: number;
  exp: number;
}

/**
 * Parse expiry string to seconds
 */
function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 900; // Default 15 minutes
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}

/**
 * Generate an access token (short-lived)
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  const expiresIn = parseExpiryToSeconds(config.jwt.accessExpiry);
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

/**
 * Generate a refresh token (long-lived)
 */
export function generateRefreshToken(userId: string): string {
  const expiresIn = parseExpiryToSeconds(config.jwt.refreshExpiry);
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn }
  );
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): DecodedAccessToken {
  return jwt.verify(token, config.jwt.secret) as DecodedAccessToken;
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): { sub: string; type: string } {
  const decoded = jwt.verify(token, config.jwt.secret) as { sub: string; type: string };
  
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  return decoded;
}

/**
 * Get expiry time in seconds for access token
 */
export function getAccessTokenExpirySeconds(): number {
  return parseExpiryToSeconds(config.jwt.accessExpiry);
}

/**
 * Get refresh token expiry date
 */
export function getRefreshTokenExpiry(): Date {
  const expiry = config.jwt.refreshExpiry;
  const match = expiry.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    // Default 7 days
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  let ms: number;
  
  switch (unit) {
    case 's': ms = value * 1000; break;
    case 'm': ms = value * 60 * 1000; break;
    case 'h': ms = value * 3600 * 1000; break;
    case 'd': ms = value * 86400 * 1000; break;
    default: ms = 7 * 24 * 60 * 60 * 1000;
  }
  
  return new Date(Date.now() + ms);
}
