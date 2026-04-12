import Bull from 'bull';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const queueOptions: Bull.QueueOptions = {
  redis: env.REDIS_URL,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
  // Graceful: don't crash if Redis is unavailable
  createClient: (type) => {
    const IORedis = require('ioredis') as typeof import('ioredis').default;
    const client = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    client.on('error', (err: Error) => {
      logger.warn({ type, err: err.message }, 'Redis connection error — queues disabled');
    });
    return client;
  },
};

function makeQueue(name: string): Bull.Queue {
  const q = new Bull(name, queueOptions);
  q.on('error', (err) => {
    logger.warn({ queue: name, err: err.message }, 'Queue error — job skipped');
  });
  return q;
}

export const notificationQueue = makeQueue('notifications');
export const reportQueue = makeQueue('reports');
export const medicationReminderQueue = makeQueue('medication-reminders');
