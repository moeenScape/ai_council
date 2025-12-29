import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authenticate, requireAdmin } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import usageRoutes from './routes/usage.js';
import subscriptionRoutes from './routes/subscription.js';
import promptRoutes from './routes/prompts.js';
import historyRoutes from './routes/history.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhook.js';
import sessionRoutes from './routes/sessions.js';
import profileRoutes from './routes/profile.js';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Stripe webhook needs raw body - must be before express.json()
  app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/usage', authenticate, usageRoutes);
  app.use('/api/subscription', authenticate, subscriptionRoutes);
  app.use('/api/prompts', authenticate, rateLimit(), promptRoutes);
  app.use('/api/history', authenticate, historyRoutes);
  app.use('/api/admin', authenticate, requireAdmin, adminRoutes);
  app.use('/api/payments', authenticate, paymentRoutes);
  app.use('/api/webhook', webhookRoutes);
  app.use('/api/sessions', authenticate, rateLimit(), sessionRoutes);
  app.use('/api/profile', authenticate, profileRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      status: 404,
      error: {
        type: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
