import { User, AuthResult, UsageStats } from '../types/index.js';
import { hashPassword, verifyPassword, validatePassword } from '../utils/password.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  getAccessTokenExpirySeconds,
  getRefreshTokenExpiry
} from '../utils/jwt.js';
import * as userRepo from '../repositories/userRepository.js';
import * as refreshTokenRepo from '../repositories/refreshTokenRepository.js';
import * as usageRepo from '../repositories/usageRepository.js';
import { getSubscriptionPlan } from '../config/index.js';
import { 
  validationError, 
  authenticationError, 
  conflictError 
} from '../utils/errors.js';

/**
 * Get usage stats for a user
 */
async function getUserUsageStats(user: User): Promise<UsageStats> {
  const plan = getSubscriptionPlan(user.subscriptionTier);
  const today = usageRepo.getTodayDate();
  const usageLog = await usageRepo.getUsageLog(user.id, today);
  const used = usageLog?.comparisonsUsed ?? 0;
  
  // Calculate reset time (midnight UTC tomorrow)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  
  return {
    used,
    limit: plan.dailyLimit,
    remaining: plan.dailyLimit !== null ? Math.max(0, plan.dailyLimit - used) : null,
    resetAt: tomorrow,
  };
}

/**
 * Build auth result with tokens and user info
 */
async function buildAuthResult(user: User): Promise<AuthResult> {
  // Generate tokens
  const accessToken = generateAccessToken({
    sub: user.id,
    email: user.email,
    tier: user.subscriptionTier,
  });
  
  const refreshToken = generateRefreshToken(user.id);
  const refreshExpiry = getRefreshTokenExpiry();
  
  // Store refresh token
  await refreshTokenRepo.createRefreshToken(user.id, refreshToken, refreshExpiry);
  
  // Get usage stats
  const usage = await getUserUsageStats(user);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenExpirySeconds(),
    user: {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
    },
    usage,
  };
}

/**
 * Register a new user
 */
export async function signup(email: string, password: string): Promise<AuthResult> {
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw validationError('Invalid password', { errors: passwordValidation.errors });
  }
  
  // Check if email already exists
  const existingUser = await userRepo.findUserByEmail(email);
  if (existingUser) {
    throw conflictError('Email already registered');
  }
  
  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const user = await userRepo.createUser(email, passwordHash, 'free');
  
  return buildAuthResult(user);
}

/**
 * Authenticate a user
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  // Find user
  const user = await userRepo.findUserByEmail(email);
  if (!user) {
    throw authenticationError('Invalid email or password');
  }
  
  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw authenticationError('Invalid email or password');
  }
  
  return buildAuthResult(user);
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthResult> {
  // Verify token signature
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw authenticationError('Invalid refresh token');
  }
  
  // Check if token exists in database
  const storedToken = await refreshTokenRepo.findRefreshToken(refreshToken);
  if (!storedToken) {
    throw authenticationError('Refresh token not found or expired');
  }
  
  // Get user
  const user = await userRepo.findUserById(decoded.sub);
  if (!user) {
    throw authenticationError('User not found');
  }
  
  // Delete old refresh token
  await refreshTokenRepo.deleteRefreshToken(refreshToken);
  
  // Generate new tokens
  return buildAuthResult(user);
}

/**
 * Logout user (invalidate refresh token)
 */
export async function logout(_userId: string, refreshToken: string): Promise<void> {
  await refreshTokenRepo.deleteRefreshToken(refreshToken);
}

/**
 * Validate user exists and return user data
 */
export async function validateUser(userId: string): Promise<User> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw authenticationError('User not found');
  }
  return user;
}
