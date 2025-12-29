import * as fc from 'fast-check';

/**
 * Generator for valid passwords (meets all requirements)
 * - At least 8 characters
 * - Contains at least one number
 * - Contains at least one uppercase letter
 */
export const validPasswordArb = fc.tuple(
  // Uppercase letter
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  // Lowercase letters (at least 5 to ensure min length with other chars)
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 5, maxLength: 20 }),
  // At least one digit
  fc.constantFrom(...'0123456789'.split('')),
  // One more lowercase to ensure we hit 8 chars minimum
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split(''))
).map(([upper, lower, digit, extra]) => {
  // Combine: upper + lower (5+) + digit + extra = 8+ chars guaranteed
  const combined = upper + lower + digit + extra;
  // Shuffle the characters
  const chars = combined.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
});

/**
 * Generator for passwords that are too short (less than 8 characters)
 */
export const tooShortPasswordArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
  { minLength: 1, maxLength: 7 }
);

/**
 * Generator for passwords without numbers
 */
export const noNumberPasswordArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  { minLength: 8, maxLength: 20 }
).filter(s => /[A-Z]/.test(s)); // Ensure it has uppercase

/**
 * Generator for passwords without uppercase letters
 */
export const noUppercasePasswordArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  { minLength: 8, maxLength: 20 }
).filter(s => /\d/.test(s)); // Ensure it has a number

/**
 * Generator for invalid passwords (fails at least one requirement)
 */
export const invalidPasswordArb = fc.oneof(
  tooShortPasswordArb,
  noNumberPasswordArb,
  noUppercasePasswordArb
);

/**
 * Generator for any password string
 */
export const anyPasswordArb = fc.string({ minLength: 0, maxLength: 100 });
