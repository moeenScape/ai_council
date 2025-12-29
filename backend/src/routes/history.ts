import { Router, Request, Response, NextFunction } from 'express';
import * as historyService from '../services/historyService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /api/history
 * Get user's comparison history with pagination
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      config.history.maxLimit,
      Math.max(1, parseInt(req.query.limit as string) || config.history.defaultLimit)
    );
    
    const result = await historyService.getHistory(userId, { page, limit });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/history/:id
 * Get a specific comparison from history
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { id } = req.params;
    
    const result = await historyService.getComparison(id, userId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
