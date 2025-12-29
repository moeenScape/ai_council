import { Router, Request, Response, NextFunction } from 'express';
import * as quotaService from '../services/quotaService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SubscriptionTier } from '../types/index.js';

const router = Router();

/**
 * GET /api/subscription
 * Get subscription details for authenticated user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    
    const subscription = await quotaService.getSubscriptionDetails(userId);
    
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscription/upgrade
 * Upgrade user subscription (simplified - no payment integration)
 */
router.post('/upgrade', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { tier } = req.body as { tier: SubscriptionTier };
    
    if (!tier || !['pro', 'team'].includes(tier)) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid tier. Must be "pro" or "team"',
        },
      });
      return;
    }
    
    await quotaService.upgradeSubscription(userId, tier);
    const subscription = await quotaService.getSubscriptionDetails(userId);
    
    res.json({
      success: true,
      data: subscription,
      message: `Successfully upgraded to ${tier} plan`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
