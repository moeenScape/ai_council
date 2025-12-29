import { Router, Request, Response, NextFunction } from 'express';
import * as adminService from '../services/adminService.js';
import { validationError } from '../utils/errors.js';

const router = Router();

/**
 * POST /api/admin/kill-switch
 * Enable or disable prompt submissions
 */
router.post('/kill-switch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      throw validationError('enabled must be a boolean');
    }
    
    await adminService.setKillSwitch(enabled);
    
    res.json({
      success: true,
      data: {
        killSwitchEnabled: enabled,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/kill-switch
 * Get kill switch status
 */
router.get('/kill-switch', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const enabled = await adminService.isKillSwitchEnabled();
    
    res.json({
      success: true,
      data: {
        killSwitchEnabled: enabled,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/reset-quota
 * Reset a user's quota
 */
router.post('/reset-quota', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    
    if (!userId || typeof userId !== 'string') {
      throw validationError('userId is required');
    }
    
    await adminService.resetUserQuota(userId);
    
    res.json({
      success: true,
      message: 'Quota reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/metrics
 * Get system metrics
 */
router.get('/metrics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await adminService.getMetrics();
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
