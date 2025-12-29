import { QuotaStatus, UsageStats, SubscriptionTier, AIModel } from '../types/index.js';
import { getSubscriptionPlan } from '../config/index.js';
import * as usageRepo from '../repositories/usageRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import { quotaExceededError, validationError, notFoundError } from '../utils/errors.js';

/**
 * Get the reset time (midnight UTC tomorrow)
 */
function getResetTime(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Check if user has available quota
 */
export async function checkQuota(userId: string): Promise<QuotaStatus> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }

  const plan = getSubscriptionPlan(user.subscriptionTier);
  const today = usageRepo.getTodayDate();
  const usageLog = await usageRepo.getUsageLog(userId, today);
  const used = usageLog?.comparisonsUsed ?? 0;

  // Unlimited quota for pro/team
  if (plan.dailyLimit === null) {
    return {
      allowed: true,
      remaining: null,
      limit: null,
      resetAt: getResetTime(),
    };
  }

  const remaining = Math.max(0, plan.dailyLimit - used);
  return {
    allowed: remaining > 0,
    remaining,
    limit: plan.dailyLimit,
    resetAt: getResetTime(),
  };
}

/**
 * Decrement user's quota by 1 (after successful comparison)
 */
export async function decrementQuota(userId: string): Promise<void> {
  await usageRepo.incrementUsage(userId);
}

/**
 * Get usage statistics for a user
 */
export async function getUsageStats(userId: string): Promise<UsageStats> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }

  const plan = getSubscriptionPlan(user.subscriptionTier);
  const today = usageRepo.getTodayDate();
  const usageLog = await usageRepo.getUsageLog(userId, today);
  const used = usageLog?.comparisonsUsed ?? 0;

  return {
    used,
    limit: plan.dailyLimit,
    remaining: plan.dailyLimit !== null ? Math.max(0, plan.dailyLimit - used) : null,
    resetAt: getResetTime(),
  };
}

/**
 * Reset user's quota (admin function)
 */
export async function resetQuota(userId: string): Promise<void> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }
  await usageRepo.resetUsage(userId);
}

/**
 * Validate model count against subscription tier limits
 */
export function validateModelCount(tier: SubscriptionTier, models: AIModel[]): void {
  const plan = getSubscriptionPlan(tier);
  
  if (models.length < 1) {
    throw validationError('At least 1 model must be selected');
  }
  
  if (models.length > plan.maxModelsPerComparison) {
    throw validationError(
      `Your ${tier} plan allows maximum ${plan.maxModelsPerComparison} models per comparison`,
      { maxAllowed: plan.maxModelsPerComparison, requested: models.length }
    );
  }
}

/**
 * Enforce quota - throws if quota exceeded
 */
export async function enforceQuota(userId: string): Promise<QuotaStatus> {
  const status = await checkQuota(userId);
  
  if (!status.allowed) {
    throw quotaExceededError(
      'Daily quota exceeded. Please upgrade your plan or wait until tomorrow.',
      { resetAt: status.resetAt, limit: status.limit }
    );
  }
  
  return status;
}

/**
 * Get subscription plan details for a user
 */
export async function getSubscriptionDetails(userId: string) {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }

  const plan = getSubscriptionPlan(user.subscriptionTier);
  const usage = await getUsageStats(userId);

  return {
    tier: user.subscriptionTier,
    plan: {
      dailyLimit: plan.dailyLimit,
      maxModelsPerComparison: plan.maxModelsPerComparison,
      historyRetentionDays: plan.historyRetentionDays,
      maxTeamMembers: plan.maxTeamMembers,
    },
    usage,
  };
}

/**
 * Upgrade user subscription tier
 */
export async function upgradeSubscription(userId: string, newTier: SubscriptionTier): Promise<void> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }
  
  await userRepo.updateUserSubscription(userId, newTier);
}
