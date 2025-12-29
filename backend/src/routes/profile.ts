import { Router, Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import * as userRepo from '../repositories/userRepository.js';
import { Theme } from '../types/index.js';
import { notFoundError } from '../utils/errors.js';

const router = Router();

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    
    const user = await userRepo.findUserById(userId);
    if (!user) {
      throw notFoundError('User not found');
    }
    
    res.json({
      success: true,
      data: userRepo.mapUserToProfile(user),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/profile
 * Update user profile
 */
router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { displayName, avatarUrl } = req.body as {
      displayName?: string;
      avatarUrl?: string;
    };
    
    const user = await userRepo.updateUserProfile(userId, { displayName, avatarUrl });
    if (!user) {
      throw notFoundError('User not found');
    }
    
    res.json({
      success: true,
      data: userRepo.mapUserToProfile(user),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/profile/theme
 * Update user theme preference
 */
router.patch('/theme', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { theme } = req.body as { theme: Theme };
    
    if (!theme || !['light', 'dark', 'system'].includes(theme)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid theme. Must be "light", "dark", or "system"',
        },
      });
      return;
    }
    
    const user = await userRepo.updateUserTheme(userId, theme);
    if (!user) {
      throw notFoundError('User not found');
    }
    
    res.json({
      success: true,
      data: { theme: user.theme },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
