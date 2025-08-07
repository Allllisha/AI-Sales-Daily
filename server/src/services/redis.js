const redis = require('redis');

let client = null;

const initRedis = async () => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  client = redis.createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Max reconnection attempts reached');
          return new Error('Max reconnection attempts reached');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis Client Connected');
  });

  client.on('ready', () => {
    console.log('Redis Client Ready');
  });

  try {
    await client.connect();
    console.log('Redis connection successful');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    // Redisが利用できない場合はメモリフォールバックを使用
    console.warn('Falling back to in-memory cache');
  }

  return client;
};

// メモリフォールバック（Redisが利用できない場合）
const memoryCache = new Map();

const redisWrapper = {
  async get(key) {
    if (client && client.isOpen) {
      return await client.get(key);
    }
    return memoryCache.get(key);
  },

  async set(key, value, options = {}) {
    if (client && client.isOpen) {
      if (options.EX) {
        return await client.setEx(key, options.EX, value);
      }
      return await client.set(key, value);
    }
    memoryCache.set(key, value);
    if (options.EX) {
      setTimeout(() => memoryCache.delete(key), options.EX * 1000);
    }
    return 'OK';
  },

  async del(key) {
    if (client && client.isOpen) {
      return await client.del(key);
    }
    return memoryCache.delete(key) ? 1 : 0;
  },

  async exists(key) {
    if (client && client.isOpen) {
      return await client.exists(key);
    }
    return memoryCache.has(key) ? 1 : 0;
  },

  async hSet(key, field, value) {
    if (client && client.isOpen) {
      return await client.hSet(key, field, value);
    }
    if (!memoryCache.has(key)) {
      memoryCache.set(key, new Map());
    }
    memoryCache.get(key).set(field, value);
    return 1;
  },

  async hGet(key, field) {
    if (client && client.isOpen) {
      return await client.hGet(key, field);
    }
    const hash = memoryCache.get(key);
    return hash ? hash.get(field) : null;
  },

  async hGetAll(key) {
    if (client && client.isOpen) {
      return await client.hGetAll(key);
    }
    const hash = memoryCache.get(key);
    if (!hash) return {};
    const obj = {};
    for (const [field, value] of hash) {
      obj[field] = value;
    }
    return obj;
  },

  async expire(key, seconds) {
    if (client && client.isOpen) {
      return await client.expire(key, seconds);
    }
    setTimeout(() => memoryCache.delete(key), seconds * 1000);
    return 1;
  },

  async setex(key, seconds, value) {
    if (client && client.isOpen) {
      return await client.setEx(key, seconds, value);
    }
    memoryCache.set(key, value);
    setTimeout(() => memoryCache.delete(key), seconds * 1000);
    return 'OK';
  }
};

module.exports = { initRedis, redisWrapper };