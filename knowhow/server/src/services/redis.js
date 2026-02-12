const Redis = require('ioredis');

let client = null;

const initRedis = async () => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          console.error('Redis: Max reconnection attempts reached');
          return null;
        }
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      tls: redisUrl.includes('ssl=true') ? {
        rejectUnauthorized: false,
      } : undefined,
      lazyConnect: false,
      enableOfflineQueue: true,
      keepAlive: 15000,
      connectTimeout: 30000,
      commandTimeout: 10000,
      family: 4,
      enableReadyCheck: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
      reconnectOnError: (err) => {
        const reconnectErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
        if (reconnectErrors.some(errorType => err.message.includes(errorType) || err.code === errorType)) {
          return true;
        }
        return false;
      }
    });

    client.on('error', (err) => {
      if (err.code === 'ECONNRESET') {
        console.log('Redis connection reset (will auto-reconnect)');
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        console.warn('Redis connection issue:', err.code);
      } else {
        console.error('Redis error:', err.code || err.message);
      }
    });

    client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    client.on('ready', () => {
      console.log('Redis Client Ready');
    });

    client.on('close', () => {
      console.log('Redis connection closed - reconnecting...');
    });

    client.on('reconnecting', (delay) => {
      console.log(`Redis reconnecting in ${delay}ms`);
    });

    try {
      await new Promise((resolve, reject) => {
        if (client.status === 'ready') {
          resolve();
        } else {
          client.once('ready', resolve);
          client.once('error', reject);
          setTimeout(() => reject(new Error('Redis connection timeout')), 10000);
        }
      });

      await client.ping();
      console.log('Redis connection successful');
    } catch (connectionError) {
      console.warn('Redis connection failed:', connectionError.message);
      if (client) {
        try {
          client.disconnect(false);
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
      }
      client = null;
      return null;
    }

    // Keep-alive ping
    setInterval(async () => {
      if (client && client.status === 'ready') {
        try {
          await client.ping();
        } catch (err) {
          console.log('Redis ping failed (will auto-reconnect):', err.message);
        }
      }
    }, 15000);

  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    console.warn('Falling back to in-memory cache');
    client = null;
  }

  return client;
};

// Memory fallback
const memoryCache = new Map();

const isTransientError = (error) => {
  const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
  return transientCodes.includes(error.code) || error.message.includes('READONLY');
};

const executeWithRetry = async (operation, fallback, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (client && (client.status === 'ready' || client.status === 'connecting')) {
        return await operation();
      }
      return fallback();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      if (isTransientError(error) && !isLastAttempt) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      return fallback();
    }
  }
};

const redisWrapper = {
  async get(key) {
    return executeWithRetry(
      () => client.get(key),
      () => memoryCache.get(key)
    );
  },

  async set(key, value, options = {}) {
    return executeWithRetry(
      async () => {
        if (options.EX) {
          return await client.setex(key, options.EX, value);
        }
        return await client.set(key, value);
      },
      () => {
        memoryCache.set(key, value);
        if (options.EX) {
          setTimeout(() => memoryCache.delete(key), options.EX * 1000);
        }
        return 'OK';
      }
    );
  },

  async del(key) {
    return executeWithRetry(
      () => client.del(key),
      () => memoryCache.delete(key) ? 1 : 0
    );
  },

  async exists(key) {
    return executeWithRetry(
      () => client.exists(key),
      () => memoryCache.has(key) ? 1 : 0
    );
  },

  async setex(key, seconds, value) {
    return executeWithRetry(
      () => client.setex(key, seconds, value),
      () => {
        memoryCache.set(key, value);
        setTimeout(() => memoryCache.delete(key), seconds * 1000);
        return 'OK';
      }
    );
  },

  async expire(key, seconds) {
    return executeWithRetry(
      () => client.expire(key, seconds),
      () => {
        setTimeout(() => memoryCache.delete(key), seconds * 1000);
        return 1;
      }
    );
  }
};

const getRedisClient = () => client;

module.exports = { initRedis, redisWrapper, getRedisClient };
