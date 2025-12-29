import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePassword, hashPassword, verifyPassword, isBcryptHash, getBcryptCost } from '../../src/utils/password.js';
import { 
  validPasswordArb, 
  tooShortPasswordArb, 
  noNumberPasswordArb, 
  noUppercasePasswordArb 
} from '../generators/password.gen.js';

describe('Password Validation Properties', () => {
  // Feature: backend-api, Property 2: Password Validation Rejects Weak Passwords
  // Validates: Requirements 1.3
  
  it('should accept all valid passwords (8+ chars, number, uppercase)', () => {
    fc.assert(
      fc.property(validPasswordArb, (password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject passwords shorter than 8 characters', () => {
    fc.assert(
      fc.property(tooShortPasswordArb, (password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      }),
      { numRuns: 100 }
    );
  });

  it('should reject passwords without numbers', () => {
    fc.assert(
      fc.property(noNumberPasswordArb, (password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      }),
      { numRuns: 100 }
    );
  });

  it('should reject passwords without uppercase letters', () => {
    fc.assert(
      fc.property(noUppercasePasswordArb, (password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      }),
      { numRuns: 100 }
    );
  });
});

describe('Password Hashing Properties', () => {
  // Feature: backend-api, Property 20: Password Hashing Security
  // Validates: Requirements 8.5

  it('should produce valid bcrypt hashes with cost factor >= 10', async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await hashPassword(password);
        
        // Should be a valid bcrypt hash
        expect(isBcryptHash(hash)).toBe(true);
        
        // Cost factor should be at least 10
        const cost = getBcryptCost(hash);
        expect(cost).not.toBeNull();
        expect(cost).toBeGreaterThanOrEqual(10);
      }),
      { numRuns: 20 } // Reduced due to bcrypt being slow
    );
  });

  it('should verify correct passwords', async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash = await hashPassword(password);
        const isValid = await verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }),
      { numRuns: 20 }
    );
  });

  it('should reject incorrect passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPasswordArb,
        validPasswordArb.filter(p => p.length > 0),
        async (password, wrongPassword) => {
          // Skip if passwords happen to be the same
          if (password === wrongPassword) return;
          
          const hash = await hashPassword(password);
          const isValid = await verifyPassword(wrongPassword, hash);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should produce different hashes for the same password (salt)', async () => {
    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);
        
        // Hashes should be different due to random salt
        expect(hash1).not.toBe(hash2);
        
        // But both should verify correctly
        expect(await verifyPassword(password, hash1)).toBe(true);
        expect(await verifyPassword(password, hash2)).toBe(true);
      }),
      { numRuns: 10 }
    );
  });
});
