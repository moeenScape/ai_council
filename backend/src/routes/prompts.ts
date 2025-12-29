import { Router, Request, Response, NextFunction } from 'express';
import * as promptService from '../services/promptService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { PromptRequest } from '../types/index.js';

const router = Router();

/**
 * POST /api/prompts
 * Submit a prompt for comparison
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    
    const request: PromptRequest = {
      content: req.body.content,
      contentType: req.body.contentType,
      models: req.body.models,
    };
    
    const result = await promptService.submitPrompt(userId, request);
    
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/:id
 * Get a specific comparison result
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { id } = req.params;
    
    const result = await promptService.getComparison(id, userId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
