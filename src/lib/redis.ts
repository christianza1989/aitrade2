import IORedis from 'ioredis';

let redis: IORedis | null = null;

// This function ensures that the Redis client is created only once
// and only when actually needed (not during build time)
export const getRedisClient = (): IORedis => {
  if (!redis) {
    console.log('Creating new Redis client...');
    redis = new IORedis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: null, // Important for BullMQ
      enableReadyCheck: false, // Important for production - don't hang forever if Redis is unreachable during build
      lazyConnect: true, // Don't connect immediately
    });
  }
  return redis;
};

// Optional: Function to close the connection
export const closeRedisClient = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null;
  }
};
