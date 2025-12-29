import dotenv from 'dotenv';
import { SubscriptionPlan, SubscriptionTier } from '../types/index.js';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_comparator',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  // AI Providers
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    xaiApiKey: process.env.XAI_API_KEY || '',
    timeout: 30000, // 30 seconds
    maxRetries: 2,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10),
  },
  
  // Password Hashing
  bcrypt: {
    saltRounds: 10,
  },
  
  // Prompt Limits
  prompt: {
    maxLength: 10000,
    minLength: 1,
    maxModels: 3,
    minModels: 1,
  },
  
  // History
  history: {
    defaultLimit: 50,
    maxLimit: 100,
  },
};

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    dailyLimit: 10,
    maxModelsPerComparison: 2,
    historyRetentionDays: 7,
    maxTeamMembers: 1,
  },
  pro: {
    tier: 'pro',
    dailyLimit: null, // unlimited
    maxModelsPerComparison: 3,
    historyRetentionDays: null, // unlimited
    maxTeamMembers: 1,
  },
  team: {
    tier: 'team',
    dailyLimit: null, // unlimited
    maxModelsPerComparison: 3,
    historyRetentionDays: null, // unlimited
    maxTeamMembers: 10,
  },
};

export function getSubscriptionPlan(tier: SubscriptionTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[tier];
}
