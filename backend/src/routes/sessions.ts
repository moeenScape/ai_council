import { Router, Request, Response, NextFunction } from 'express';
import * as sessionService from '../services/sessionService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AIModel, ContentType } from '../types/index.js';

const router = Router();

/**
 * GET /api/sessions
 * Get user's chat sessions
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const result = await sessionService.getUserSessions(userId, page, limit);
    
    res.json({
      success: true,
      data: result.sessions,
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions
 * Create a new chat session
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { title } = req.body as { title?: string };
    
    const session = await sessionService.createSession(userId, title);
    
    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:id
 * Get a session with all messages
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { id } = req.params;
    
    const result = await sessionService.getSession(id, userId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:id/messages
 * Send a message in a session
 */
router.post('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { id } = req.params;
    const { content, contentType, models } = req.body as {
      content: string;
      contentType: ContentType;
      models: AIModel[];
    };
    
    const message = await sessionService.sendMessage(
      id,
      userId,
      content,
      contentType,
      models
    );
    
    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:id/messages/stream
 * Stream AI responses as Server-Sent Events (SSE)
 */
router.post('/:id/messages/stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { id } = req.params;
    const { content, contentType, models } = req.body as {
      content: string;
      contentType: ContentType;
      models: AIModel[];
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const writeEvent = (event: string, data: unknown) => {
      if (closed) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const message = await sessionService.sendMessageStreaming(
      id,
      userId,
      content,
      contentType,
      models,
      (response) => {
        writeEvent('response', { response });
      },
      (createdMessage) => {
        writeEvent('message', { message: createdMessage });
      }
    );

    writeEvent('done', { message });
    res.end();
  } catch (error) {
    if (res.headersSent) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: (error as Error).message })}\n\n`);
      res.end();
      return;
    }
    next(error);
  }
});

/**
 * PATCH /api/sessions/:id
 * Update session title
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { id } = req.params;
    const { title } = req.body as { title: string };
    
    const session = await sessionService.updateSessionTitle(id, userId, title);
    
    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete a session
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { id } = req.params;
    
    await sessionService.deleteSession(id, userId);
    
    res.json({
      success: true,
      message: 'Session deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
