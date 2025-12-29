# Implementation Plan: Backend API

## Overview

This plan implements the AI Comparator Hub backend API using TypeScript with Express.js, PostgreSQL, and Redis. Tasks are organized to build foundational components first, then layer on features incrementally with property-based tests validating correctness.

## Tasks

- [x] 1. Project Setup and Core Infrastructure
  - [x] 1.1 Initialize Node.js project with TypeScript configuration
    - Create package.json with dependencies (express, pg, redis, bcrypt, jsonwebtoken, zod, fast-check, vitest)
    - Configure tsconfig.json for ES modules
    - Set up ESLint and Prettier
    - _Requirements: N/A (infrastructure)_

  - [x] 1.2 Set up database schema and connection
    - Create PostgreSQL schema with all tables (users, refresh_tokens, prompts, model_responses, usage_logs)
    - Implement database connection pool
    - Create migration scripts
    - _Requirements: Data Models_

  - [x] 1.3 Set up Redis connection for caching and rate limiting
    - Configure Redis client
    - Implement connection health check
    - _Requirements: 8.1_

  - [x] 1.4 Create Express server with middleware stack
    - Set up Express app with JSON parsing, CORS
    - Create error handling middleware
    - Implement request logging
    - _Requirements: 9.3, 9.4_

- [x] 2. Authentication Service
  - [x] 2.1 Implement password hashing and validation utilities
    - Create bcrypt wrapper with cost factor 10
    - Implement password strength validation (8+ chars, number, uppercase)
    - _Requirements: 1.3, 8.5_

  - [x] 2.2 Write property test for password validation
    - **Property 2: Password Validation Rejects Weak Passwords**
    - **Validates: Requirements 1.3**

  - [x] 2.3 Implement user registration endpoint
    - Create POST /api/auth/signup handler
    - Validate email uniqueness
    - Hash password and create user with Free tier
    - Generate and return JWT tokens
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 2.4 Write property test for registration and default tier
    - **Property 3: New Users Default to Free Tier**
    - **Validates: Requirements 1.4**

  - [x] 2.5 Implement login endpoint
    - Create POST /api/auth/login handler
    - Verify credentials and return tokens with user info
    - Include subscription tier and usage stats in response
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 2.6 Write property test for authentication round-trip
    - **Property 1: Authentication Round-Trip**
    - **Validates: Requirements 1.1, 1.5, 2.1**

  - [x] 2.7 Write property test for invalid credentials
    - **Property 4: Invalid Credentials Return 401**
    - **Validates: Requirements 2.2**

  - [x] 2.8 Implement token refresh endpoint
    - Create POST /api/auth/refresh handler
    - Validate refresh token and issue new access token
    - _Requirements: 2.3, 2.4_

  - [x] 2.9 Write property test for token refresh
    - **Property 5: Token Refresh Validity**
    - **Validates: Requirements 2.3, 2.4**

  - [x] 2.10 Implement JWT authentication middleware
    - Create middleware to validate access tokens
    - Extract user context from token
    - Return 401 for missing/invalid tokens
    - _Requirements: 8.6_

  - [x] 2.11 Write property test for protected endpoints
    - **Property 19: Protected Endpoint Authentication**
    - **Validates: Requirements 8.6**

- [x] 3. Checkpoint - Authentication Complete
  - Ensure all auth tests pass, ask the user if questions arise.

- [x] 4. Quota and Usage Management
  - [x] 4.1 Implement Quota Manager service
    - Create checkQuota method to verify user has remaining quota
    - Create decrementQuota method to reduce quota after comparison
    - Create getUsageStats method to return usage information
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [x] 4.2 Write property test for quota decrement
    - **Property 12: Quota Decrement Consistency**
    - **Validates: Requirements 5.1, 5.6**

  - [x] 4.3 Write property test for usage stats completeness
    - **Property 13: Usage Stats Completeness**
    - **Validates: Requirements 5.2**

  - [x] 4.4 Implement subscription tier limits
    - Define tier configurations (Free: 10/day, 2 models; Pro: unlimited, 3 models; Team: unlimited, 3 models)
    - Enforce model count limits per tier
    - _Requirements: 6.2_

  - [x] 4.5 Write property test for subscription tier limits
    - **Property 14: Subscription Tier Limits**
    - **Validates: Requirements 5.3, 5.4, 6.2**

  - [x] 4.6 Implement usage endpoint
    - Create GET /api/usage handler
    - Return current usage stats for authenticated user
    - _Requirements: 5.2_

  - [x] 4.7 Implement subscription endpoint
    - Create GET /api/subscription handler
    - Return current plan details and limits
    - _Requirements: 6.1_

- [x] 5. Checkpoint - Quota Management Complete
  - Ensure all quota tests pass, ask the user if questions arise.

- [x] 6. Rate Limiting
  - [x] 6.1 Implement Redis-based rate limiter middleware
    - Track requests per user per minute window
    - Return 429 with Retry-After header when exceeded
    - Add rate limit headers to responses
    - _Requirements: 8.1, 8.2_

  - [x] 6.2 Write property test for rate limiting
    - **Property 18: Rate Limiting Enforcement**
    - **Validates: Requirements 8.1, 8.2**

- [x] 7. AI Gateway and Prompt Processing
  - [x] 7.1 Implement AI Gateway service
    - Create adapters for OpenAI, Anthropic, and xAI APIs
    - Implement sendPrompt method for single model
    - Implement sendPromptToMultiple for parallel requests
    - Measure and record response times
    - _Requirements: 3.4, 4.5_

  - [x] 7.2 Implement retry logic with exponential backoff
    - Configure max 2 retries with backoff
    - Handle timeout (30 seconds) and error cases
    - _Requirements: 9.1, 9.2_

  - [x] 7.3 Write property test for retry behavior
    - **Property 22: Retry Behavior on AI Failure**
    - **Validates: Requirements 9.1, 9.2**

  - [x] 7.4 Implement circuit breaker pattern
    - Track failures per AI service
    - Open circuit after 5 consecutive failures
    - Implement half-open state for recovery
    - _Requirements: 9.5_

  - [x] 7.5 Write property test for circuit breaker
    - **Property 23: Circuit Breaker Activation**
    - **Validates: Requirements 9.5**

  - [x] 7.6 Implement prompt validation
    - Validate content length (1-10,000 chars)
    - Validate model selection (1-3 models)
    - Validate content type enum
    - _Requirements: 3.2, 3.3, 3.6_

  - [x] 7.7 Write property test for valid prompt processing
    - **Property 6: Valid Prompt Processing**
    - **Validates: Requirements 3.1, 3.3**

  - [x] 7.8 Write property test for invalid prompt rejection
    - **Property 7: Invalid Prompt Rejection**
    - **Validates: Requirements 3.2, 3.6**

  - [x] 7.9 Implement prompt submission endpoint
    - Create POST /api/prompts handler
    - Check quota before processing
    - Send to AI Gateway in parallel
    - Aggregate responses with timing
    - Persist prompt and responses
    - Decrement quota on success
    - _Requirements: 3.1, 3.4, 3.5, 4.1, 4.4_

  - [x] 7.10 Write property test for quota enforcement
    - **Property 8: Quota Enforcement**
    - **Validates: Requirements 3.5, 5.3**

  - [x] 7.11 Write property test for response structure
    - **Property 9: Response Structure Completeness**
    - **Validates: Requirements 4.1, 4.5**

  - [x] 7.12 Write property test for partial failure isolation
    - **Property 10: Partial Failure Isolation**
    - **Validates: Requirements 4.2, 4.3**

- [x] 8. Checkpoint - Prompt Processing Complete
  - Ensure all prompt tests pass, ask the user if questions arise.

- [x] 9. History Service
  - [x] 9.1 Implement History Service
    - Create getHistory method with pagination
    - Apply tier-based retention (Free: 7 days, Pro/Team: unlimited)
    - Create getComparison method for single comparison
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 9.2 Write property test for comparison persistence
    - **Property 11: Comparison Persistence Round-Trip**
    - **Validates: Requirements 4.4, 7.5**

  - [x] 9.3 Write property test for history pagination
    - **Property 15: History Pagination**
    - **Validates: Requirements 7.1**

  - [x] 9.4 Write property test for tier-based retention
    - **Property 16: History Tier-Based Retention**
    - **Validates: Requirements 7.2, 7.3**

  - [x] 9.5 Write property test for history item completeness
    - **Property 17: History Item Completeness**
    - **Validates: Requirements 7.4**

  - [x] 9.6 Implement history endpoints
    - Create GET /api/history handler with pagination
    - Create GET /api/history/:id handler
    - _Requirements: 7.1, 7.5_

- [x] 10. Checkpoint - History Complete
  - Ensure all history tests pass, ask the user if questions arise.

- [x] 11. Error Handling and Input Validation
  - [x] 11.1 Implement global error handler
    - Catch all unhandled errors
    - Return consistent error format
    - Log error details
    - _Requirements: 9.3, 9.4_

  - [x] 11.2 Write property test for error format consistency
    - **Property 21: Error Response Format Consistency**
    - **Validates: Requirements 9.3, 9.4**

  - [x] 11.3 Implement input sanitization middleware
    - Sanitize string inputs
    - Prevent injection attacks
    - _Requirements: 8.3_

  - [x] 11.4 Write property test for password hashing security
    - **Property 20: Password Hashing Security**
    - **Validates: Requirements 8.5**

- [x] 12. Admin Endpoints (Optional)
  - [x] 12.1 Implement admin authentication middleware
    - Verify admin role in JWT
    - Reject non-admin users
    - _Requirements: 10.1_

  - [x] 12.2 Implement kill-switch endpoint
    - Create POST /api/admin/kill-switch handler
    - Toggle prompt submission availability
    - _Requirements: 10.2_

  - [x] 12.3 Implement quota reset endpoint
    - Create POST /api/admin/reset-quota handler
    - Reset specified user's quota
    - _Requirements: 10.3_

  - [x] 12.4 Implement metrics endpoint
    - Create GET /api/admin/metrics handler
    - Return active users, total comparisons, error rates
    - _Requirements: 10.4_

- [x] 13. Final Checkpoint
  - All tests pass (65 property-based tests)

## Notes

- All property-based tests are required for comprehensive testing
- Each property test must run minimum 100 iterations
- External AI service calls should be mocked in tests
- Use test database for integration tests
- Environment variables required: DATABASE_URL, REDIS_URL, JWT_SECRET, OPENAI_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY
