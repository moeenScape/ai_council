import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { ERROR_TYPES, ErrorResponse } from '../types/index.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error details
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });

  // Handle known AppError
  if (err instanceof AppError) {
    const response = err.toResponse();
    res.status(response.status).json(response);
    return;
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    status: 500,
    error: {
      type: ERROR_TYPES.INTERNAL_ERROR,
      message: config.nodeEnv === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
  };

  res.status(500).json(response);
}

// Async handler wrapper to catch async errors
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
