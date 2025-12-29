import { Router, Request, Response, NextFunction } from 'express';
import * as stripeService from '../services/stripeService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /api/payments/config
 * Get Stripe publishable key and status
 */
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      publishableKey: stripeService.getPublishableKey(),
      isConfigured: stripeService.isStripeConfigured(),
    },
  });
});

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe Checkout session for subscription upgrade
 */
router.post('/create-checkout-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if Stripe is configured
    if (!stripeService.isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'SERVICE_UNAVAILABLE',
          message: 'Payment processing is not configured. Please use test mode or contact support.',
        },
      });
    }

    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.sub;
    const { tier } = req.body as { tier: 'pro' | 'team' };

    if (!tier || !['pro', 'team'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid tier. Must be "pro" or "team"',
        },
      });
    }

    const frontendUrl = config.corsOrigin || 'http://localhost:5173';
    const successUrl = `${frontendUrl}/app?upgrade=success`;
    const cancelUrl = `${frontendUrl}/app?upgrade=cancelled`;

    const session = await stripeService.createCheckoutSession(
      userId,
      tier,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        url: session.url,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/verify-session
 * Verify a completed checkout session and upgrade user
 */
router.post('/verify-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body as { sessionId: string };

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Session ID is required',
        },
      });
    }

    await stripeService.handleCheckoutComplete(sessionId);

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
