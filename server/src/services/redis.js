const Redis = require('ioredis');

let client = null;

const initRedis = async () => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    console.log('Connecting to Redis:', redisUrl.split('@')[1]); // URLのパスワード部分を隠して表示
    
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          console.error('Redis: Max reconnection attempts reached');
          return null;
        }
        const delay = Math.min(times * 200, 5000);
        console.log(`Redis: Retrying connection (attempt ${times}) in ${delay}ms`);
        return delay;
      },
      tls: redisUrl.includes('ssl=true') ? {
        rejectUnauthorized: false // Azure Redis Cacheのための設定
      } : undefined,
      lazyConnect: false,
      enableOfflineQueue: false,
      keepAlive: 10000, // 10秒ごとにキープアライブ
      connectTimeout: 30000, // 接続タイムアウト30秒に延長
      commandTimeout: 5000, // コマンドタイムアウト5秒
      enableReadyCheck: true, // 接続確認を有効化
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // レプリカへの接続時はtrueを返して再接続
          return true;
        }
        return false;
      }
    });

    client.on('error', (err) => {
      console.error('Redis error:', err.message);
    });

    client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    client.on('ready', () => {
      console.log('Redis Client Ready');
    });

    await client.ping();
    console.log('Redis connection successful');
    
    // 定期的にpingを送信して接続を維持
    setInterval(async () => {
      if (client && client.status === 'ready') {
        try {
          await client.ping();
        } catch (err) {
          console.error('Redis ping failed:', err.message);
        }
      }
    }, 30000); // 30秒ごとにping
    
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    // Redisが利用できない場合はメモリフォールバックを使用
    console.warn('Falling back to in-memory cache');
    client = null;
  }

  return client;
};

// メモリフォールバック（Redisが利用できない場合）
const memoryCache = new Map();

const redisWrapper = {
  async get(key) {
    try {
      if (client && client.status === 'ready') {
        return await client.get(key);
      }
    } catch (error) {
      console.error('Redis get error:', error.message);
    }
    return memoryCache.get(key);
  },

  async set(key, value, options = {}) {
    try {
      if (client && client.status === 'ready') {
        if (options.EX) {
          return await client.setex(key, options.EX, value);
        }
        return await client.set(key, value);
      }
    } catch (error) {
      console.error('Redis set error:', error.message);
    }
    memoryCache.set(key, value);
    if (options.EX) {
      setTimeout(() => memoryCache.delete(key), options.EX * 1000);
    }
    return 'OK';
  },

  async del(key) {
    try {
      if (client && client.status === 'ready') {
        return await client.del(key);
      }
    } catch (error) {
      console.error('Redis del error:', error.message);
    }
    return memoryCache.delete(key) ? 1 : 0;
  },

  async exists(key) {
    try {
      if (client && client.status === 'ready') {
        return await client.exists(key);
      }
    } catch (error) {
      console.error('Redis exists error:', error.message);
    }
    return memoryCache.has(key) ? 1 : 0;
  },

  async hSet(key, field, value) {
    if (client && client.status === 'ready') {
      return await client.hSet(key, field, value);
    }
    if (!memoryCache.has(key)) {
      memoryCache.set(key, new Map());
    }
    memoryCache.get(key).set(field, value);
    return 1;
  },

  async hGet(key, field) {
    if (client && client.status === 'ready') {
      return await client.hGet(key, field);
    }
    const hash = memoryCache.get(key);
    return hash ? hash.get(field) : null;
  },

  async hGetAll(key) {
    if (client && client.status === 'ready') {
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
    if (client && client.status === 'ready') {
      return await client.expire(key, seconds);
    }
    setTimeout(() => memoryCache.delete(key), seconds * 1000);
    return 1;
  },

  async setex(key, seconds, value) {
    if (client && client.status === 'ready') {
      return await client.setex(key, seconds, value);
    }
    memoryCache.set(key, value);
    setTimeout(() => memoryCache.delete(key), seconds * 1000);
    return 'OK';
  }
};

const getRedisClient = () => client;

module.exports = { initRedis, redisWrapper, getRedisClient };