import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const isTLS = env.REDIS_URL.startsWith('rediss://');

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  ...(isTLS && { tls: {} }),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.warn({ err }, 'Redis connection error — queues disabled'));
