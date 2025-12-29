import Stripe from 'stripe';
import { config } from '../config/index.js';
import { SubscriptionTier } from '../types/index.js';
import * as userRepo from '../repositories/userRepository.js';
import { notFoundError } from '../utils/errors.js';

// Lazy initialize Stripe
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!config.stripe.secretKey || config.stripe.secretKey.startsWith('sk_test_1234')) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in .env');
    }
    stripeInstance = new Stripe(config.stripe.secretKey);
  }
  return stripeInstance;
}

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!(config.stripe.secretKey && !config.stripe.secretKey.startsWith('sk_test_1234'));
}

// Price IDs for each tier
const PRICE_IDS: Record<string, string> = {
  pro: config.stripe.proPriceId,
  team: config.stripe.teamPriceId,
};

// Price amounts (in cents) for display
export const PLAN_PRICES = {
  pro: 1900, // $19.00
  team: 4900, // $49.00
};

/**
 * Create a Stripe Checkout Session for subscription upgrade
 */
export async function createCheckoutSession(
  userId: string,
  tier: 'pro' | 'team',
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe();
  
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }

  const priceId = PRICE_IDS[tier];
  if (!priceId) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    customer_email: user.email,
    metadata: {
      userId: userId,
      tier: tier,
    },
    subscription_data: {
      metadata: {
        userId: userId,
        tier: tier,
      },
    },
  });

  return {
    sessionId: session.id,
    url: session.url || '',
  };
}

/**
 * Handle successful checkout - upgrade user subscription
 */
export async function handleCheckoutComplete(sessionId: string): Promise<void> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  
  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed');
  }

  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as SubscriptionTier;

  if (!userId || !tier) {
    throw new Error('Missing metadata in session');
  }

  await userRepo.updateUserSubscription(userId, tier);
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhook(
  payload: string | Buffer,
  signature: string
): Promise<{ type: string; handled: boolean }> {
  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${(err as Error).message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier as SubscriptionTier;
        if (userId && tier) {
          await userRepo.updateUserSubscription(userId, tier);
        }
      }
      return { type: event.type, handled: true };
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId && subscription.status === 'active') {
        const tier = subscription.metadata?.tier as SubscriptionTier;
        if (tier) {
          await userRepo.updateUserSubscription(userId, tier);
        }
      }
      return { type: event.type, handled: true };
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await userRepo.updateUserSubscription(userId, 'free');
      }
      return { type: event.type, handled: true };
    }

    default:
      return { type: event.type, handled: false };
  }
}

/**
 * Create a portal session for managing subscription
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Get Stripe publishable key for frontend
 */
export function getPublishableKey(): string {
  return 'pk_test_placeholder';
}
