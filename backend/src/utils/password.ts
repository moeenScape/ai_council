import bcrypt from 'bcrypt';
import { config } from '../config/index.js';

/**
 * Hash a password using bcrypt with configured salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcrypt.saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Password validation rules:
 * - Minimum 8 characters
 * - At least one number
 * - At least one uppercase letter
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid bcrypt hash
 */
export function isBcryptHash(str: string): boolean {
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
  return /^\$2[aby]\$\d{2}\$/.test(str);
}

/**
 * Get the cost factor from a bcrypt hash
 */
export function getBcryptCost(hash: string): number | null {
  const match = hash.match(/^\$2[aby]\$(\d{2})\$/);
  return match ? parseInt(match[1], 10) : null;
}
