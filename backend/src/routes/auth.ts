import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { signupSchema, loginSchema, refreshTokenSchema } from '../validators/auth.js';
import * as authService from '../services/authService.js';
import { validationError } from '../utils/errors.js';
import { ZodError } from 'zod';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = signupSchema.parse(req.body);
    const result = await authService.signup(email, password);
    
    res.status(201).json({
      status: 201,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw validationError('Validation failed', { 
        errors: error.errors.map(e => e.message) 
      });
    }
    throw error;
  }
}));

/**
 * POST /api/auth/login
 * Authenticate user
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw validationError('Validation failed', { 
        errors: error.errors.map(e => e.message) 
      });
    }
    throw error;
  }
}));

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const result = await authService.refreshAccessToken(refreshToken);
    
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw validationError('Validation failed', { 
        errors: error.errors.map(e => e.message) 
      });
    }
    throw error;
  }
}));

/**
 * POST /api/auth/logout
 * Invalidate refresh token
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const userId = req.body.userId; // Would come from auth middleware in protected version
  
  if (refreshToken && userId) {
    await authService.logout(userId, refreshToken);
  }
  
  res.json({
    status: 200,
    message: 'Logged out successfully',
  });
}));

export default router;
