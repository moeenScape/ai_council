import { ERROR_TYPES, ErrorType } from '../types/index.js';

export class AppError extends Error {
  public readonly status: number;
  public readonly type: ErrorType;
  public readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    type: ErrorType,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.status = status;
    this.type = type;
    this.details = details;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      status: this.status,
      error: {
        type: this.type,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }

  toResponse() {
    return this.toJSON();
  }
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(400, ERROR_TYPES.VALIDATION_ERROR, message, details);
}

export function authenticationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(401, ERROR_TYPES.AUTHENTICATION_ERROR, message, details);
}

export function authorizationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(403, ERROR_TYPES.AUTHORIZATION_ERROR, message, details);
}

export function notFoundError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(404, ERROR_TYPES.NOT_FOUND, message, details);
}

export function conflictError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(409, ERROR_TYPES.CONFLICT, message, details);
}

export function quotaExceededError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(429, ERROR_TYPES.QUOTA_EXCEEDED, message, details);
}

export function rateLimitedError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(429, ERROR_TYPES.RATE_LIMITED, message, details);
}

export function aiServiceError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(502, ERROR_TYPES.AI_SERVICE_ERROR, message, details);
}

export function internalError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(500, ERROR_TYPES.INTERNAL_ERROR, message, details);
}
