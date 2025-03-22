import Redis from 'ioredis';

const createRedisClient = () => {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  client.on('error', (err) => {
    console.error("Redis error:", err);
  });

  client.on('connect', () => {
    console.log("Redis connected successfully");
  });

  return client;
};

const clientRedis = createRedisClient();
export default clientRedis;