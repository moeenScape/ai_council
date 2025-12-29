import { notFoundError, authorizationError } from '../utils/errors.js';
import * as userRepo from '../repositories/userRepository.js';
import * as usageRepo from '../repositories/usageRepository.js';
import { getCache, setCache, deleteCache } from '../db/redis.js';

// Kill switch key in Redis
const KILL_SWITCH_KEY = 'admin:kill_switch';

/**
 * Check if kill switch is enabled
 */
export async function isKillSwitchEnabled(): Promise<boolean> {
  const value = await getCache(KILL_SWITCH_KEY);
  return value === 'true';
}

/**
 * Enable or disable the kill switch
 */
export async function setKillSwitch(enabled: boolean): Promise<void> {
  if (enabled) {
    await setCache(KILL_SWITCH_KEY, 'true', 86400 * 30); // 30 days expiry
  } else {
    await deleteCache(KILL_SWITCH_KEY);
  }
}

/**
 * Reset a user's quota
 */
export async function resetUserQuota(userId: string): Promise<void> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }
  
  await usageRepo.resetUsage(userId);
}

/**
 * Get system metrics
 */
export async function getMetrics(): Promise<{
  totalUsers: number;
  activeUsersToday: number;
  totalComparisonsToday: number;
}> {
  // These would typically come from database queries
  // For now, return placeholder values
  return {
    totalUsers: 0,
    activeUsersToday: 0,
    totalComparisonsToday: 0,
  };
}

/**
 * Verify user has admin role
 */
export function verifyAdminRole(userTier: string): void {
  // For now, only 'team' tier users can be admins
  // In a real system, you'd have a separate admin flag
  if (userTier !== 'team') {
    throw authorizationError('Admin access required');
  }
}
