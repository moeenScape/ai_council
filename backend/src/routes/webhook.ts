import { Router, Request, Response } from 'express';
import * as stripeService from '../services/stripeService.js';

const router = Router();

/**
 * POST /api/webhook/stripe
 * Handle Stripe webhook events
 * Note: This route needs raw body, configured in app.ts
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    const result = await stripeService.handleWebhook(req.body, signature);
    console.log(`Webhook handled: ${result.type}, processed: ${result.handled}`);
    res.json({ received: true, ...result });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
