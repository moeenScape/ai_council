import morgan from 'morgan';
import { config } from '../config/index.js';

// Custom token for response time in ms
morgan.token('response-time-ms', (_req, res) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? String(responseTime) : '-';
});

// Development format with colors
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// Production format (JSON-like for log aggregation)
const prodFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
});

export const requestLogger = morgan(
  config.nodeEnv === 'production' ? prodFormat : devFormat,
  {
    skip: (_req, res) => {
      // Skip logging for health checks in production
      if (config.nodeEnv === 'production' && res.statusCode < 400) {
        return false;
      }
      return false;
    },
  }
);
