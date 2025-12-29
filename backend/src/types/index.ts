// Subscription Tiers
export type SubscriptionTier = 'free' | 'pro' | 'team';

// Content Types
export type ContentType = 'code' | 'text' | 'speech' | 'summary' | 'email' | 'other';

// AI Models
export type AIModel = 'gpt' | 'claude' | 'grok';

// Response Status
export type ResponseStatus = 'success' | 'error' | 'timeout';

// Theme
export type Theme = 'light' | 'dark' | 'system';

// User Model
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
  theme: Theme;
  createdAt: Date;
  updatedAt: Date;
}

// User Profile (public info)
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
  theme: Theme;
  createdAt: Date;
}

// Chat Session
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  lastActivityAt: Date;
  createdAt: Date;
}

// Chat Message
export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  contentType: ContentType;
  models: AIModel[];
  createdAt: Date;
}

// Chat Message with Responses
export interface ChatMessageWithResponses extends ChatMessage {
  responses: {
    model: AIModel;
    content: string;
    responseTimeMs: number;
    status: ResponseStatus;
    errorMessage?: string;
  }[];
}

// Session with Messages
export interface SessionWithMessages {
  session: ChatSession;
  messages: ChatMessageWithResponses[];
}

// Subscription Plan Configuration
export interface SubscriptionPlan {
  tier: SubscriptionTier;
  dailyLimit: number | null; // null = unlimited
  maxModelsPerComparison: number;
  historyRetentionDays: number | null; // null = unlimited
  maxTeamMembers: number;
}

// Prompt Model
export interface Prompt {
  id: string;
  userId: string;
  content: string;
  contentType: ContentType;
  createdAt: Date;
}

// Model Response
export interface ModelResponse {
  id: string;
  promptId: string;
  model: AIModel;
  content: string;
  responseTimeMs: number;
  status: ResponseStatus;
  errorMessage?: string;
  createdAt: Date;
}

// Comparison Result (aggregated view)
export interface ComparisonResult {
  id: string;
  prompt: {
    content: string;
    contentType: ContentType;
  };
  responses: {
    model: AIModel;
    content: string;
    responseTimeMs: number;
    status: ResponseStatus;
    errorMessage?: string;
  }[];
  createdAt: Date;
}

// Usage Log
export interface UsageLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  comparisonsUsed: number;
  updatedAt: Date;
}

// Usage Stats
export interface UsageStats {
  used: number;
  limit: number | null;
  remaining: number | null;
  resetAt: Date;
}

// Authentication Result
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    subscriptionTier: SubscriptionTier;
  };
  usage: UsageStats;
}

// Refresh Token
export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

// Pagination Options
export interface PaginationOptions {
  page: number;
  limit: number;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Prompt Request
export interface PromptRequest {
  content: string;
  contentType: ContentType;
  models: AIModel[];
}

// Quota Status
export interface QuotaStatus {
  allowed: boolean;
  remaining: number | null;
  limit: number | null;
  resetAt: Date;
}

// Error Types
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
} as const;

export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];

// Error Response
export interface ErrorResponse {
  status: number;
  error: {
    type: ErrorType;
    message: string;
    details?: Record<string, unknown>;
  };
}
