import { Router, Request, Response, NextFunction } from 'express';
import * as quotaService from '../services/quotaService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/usage
 * Get current usage stats for authenticated user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    
    const usage = await quotaService.getUsageStats(userId);
    
    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
