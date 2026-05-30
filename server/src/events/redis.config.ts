import type { ConnectionOptions } from 'bullmq';

// Builds a BullMQ/ioredis ConnectionOptions from process.env. Read every time
// at module-registration so we pick up .env values that ConfigModule has
// already loaded by then.
export function getRedisConnection(): ConnectionOptions {
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT || 6379);
  const username = process.env.REDIS_USERNAME || undefined;
  const password = process.env.REDIS_PASSWORD || undefined;
  const tls = process.env.REDIS_TLS === 'true' ? {} : undefined;

  if (!host) {
    throw new Error(
      'Redis is required for the events/queues layer. Set REDIS_HOST in .env.',
    );
  }

  return {
    host,
    port,
    username,
    password,
    tls,
    // BullMQ requires this so the connection doesn't get torn down between jobs.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
