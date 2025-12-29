import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';

let redisClient: RedisClientType | null = null;
let redisAvailable: boolean | null = null; // null = not tested yet

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisAvailable === false) {
    return null;
  }
  
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  
  try {
    redisClient = createClient({
      url: config.redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: false, // Don't auto-reconnect
      },
    });
    
    redisClient.on('error', () => {
      // Silently handle errors after initial connection attempt
    });
    
    await redisClient.connect();
    redisAvailable = true;
    return redisClient;
  } catch {
    console.warn('Redis not available, running without caching/rate limiting');
    redisAvailable = false;
    redisClient = null;
    return null;
  }
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    await client.ping();
    return true;
  } catch (error) {
    console.warn('Redis connection failed:', error);
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export async function closeRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Rate limiting helpers
export async function incrementRateLimit(
  key: string,
  windowMs: number
): Promise<{ count: number; ttl: number }> {
  const client = await getRedisClient();
  if (!client) {
    // No Redis - allow all requests (dev mode)
    return { count: 1, ttl: windowMs };
  }
  
  const multi = client.multi();
  
  multi.incr(key);
  multi.pTTL(key);
  
  const results = await multi.exec();
  const count = results[0] as number;
  let ttl = results[1] as number;
  
  // Set expiry if this is a new key
  if (ttl === -1) {
    await client.pExpire(key, windowMs);
    ttl = windowMs;
  }
  
  return { count, ttl: Math.max(0, ttl) };
}

// Cache helpers
export async function setCache(
  key: string,
  value: string,
  expirySeconds: number
): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  await client.setEx(key, expirySeconds, value);
}

export async function getCache(key: string): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) return null;
  return client.get(key);
}

export async function deleteCache(key: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  await client.del(key);
}
