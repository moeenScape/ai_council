import { Router, Request, Response, NextFunction } from 'express';
import * as quotaService from '../services/quotaService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

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

export default router;
