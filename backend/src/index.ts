import { createApp } from './app.js';
import { config } from './config/index.js';
import { testConnection, closePool } from './db/connection.js';
import { testRedisConnection, closeRedis } from './db/redis.js';

async function main() {
  const app = createApp();

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }
  console.log('✓ Database connected');

  // Test Redis connection
  const redisConnected = await testRedisConnection();
  if (!redisConnected) {
    console.warn('⚠ Redis connection failed. Rate limiting may not work.');
  } else {
    console.log('✓ Redis connected');
  }

  // Start server
  const server = app.listen(config.port, () => {
    console.log(`✓ Server running on port ${config.port}`);
    console.log(`  Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    server.close(async () => {
      console.log('HTTP server closed');
      
      await closePool();
      console.log('Database pool closed');
      
      await closeRedis();
      console.log('Redis connection closed');
      
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
