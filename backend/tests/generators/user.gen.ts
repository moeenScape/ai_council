import * as fc from 'fast-check';
import { validPasswordArb } from './password.gen.js';

/**
 * Generator for valid email addresses
 */
export const validEmailArb = fc.tuple(
  // Local part (before @)
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 3, maxLength: 15 }),
  // Domain
  fc.constantFrom('example.com', 'test.org', 'mail.net', 'company.io', 'domain.co')
).map(([local, domain]) => `${local}@${domain}`);

/**
 * Generator for invalid email addresses
 */
export const invalidEmailArb = fc.oneof(
  // Missing @
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 5, maxLength: 20 }),
  // Missing domain
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 3, maxLength: 10 }).map(s => `${s}@`),
  // Missing local part
  fc.constantFrom('example.com', 'test.org').map(d => `@${d}`),
  // Empty string
  fc.constant('')
);

/**
 * Generator for valid signup credentials
 */
export const validSignupCredentialsArb = fc.record({
  email: validEmailArb,
  password: validPasswordArb,
});

/**
 * Generator for unique email (with timestamp to avoid collisions)
 */
export const uniqueEmailArb = fc.tuple(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 5, maxLength: 10 }),
  fc.integer({ min: 1000, max: 9999 })
).map(([local, num]) => `${local}${num}${Date.now()}@test.com`);

/**
 * Generator for valid login credentials (email + any password)
 */
export const loginCredentialsArb = fc.record({
  email: validEmailArb,
  password: fc.string({ minLength: 1, maxLength: 50 }),
});
