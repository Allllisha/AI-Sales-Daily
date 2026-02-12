const Redis = require('ioredis');

let client = null;

const initRedis = async () => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    console.log('REDIS_URL env var:', process.env.REDIS_URL);
    console.log('Connecting to Redis:', redisUrl); // デバッグ用に完全なURLを表示
    
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
        rejectUnauthorized: false, // Azure Redis Cacheのための設定
        servername: 'salesdaily-redis.redis.cache.windows.net' // SNI対応
      } : undefined,
      lazyConnect: false,
      enableOfflineQueue: true, // オフラインキューを有効化してコマンドを保持
      keepAlive: 15000, // 15秒ごとにTCPキープアライブ（Azure Redisのアイドルタイムアウト対策）
      connectTimeout: 30000, // 接続タイムアウト30秒
      commandTimeout: 10000, // コマンドタイムアウト10秒に延長
      family: 4, // IPv4を優先（Azure Redis Cacheとの互換性）
      enableReadyCheck: true, // 接続確認を有効化
      autoResubscribe: true, // 自動的にサブスクリプションを再登録
      autoResendUnfulfilledCommands: true, // 未完了のコマンドを自動的に再送信
      reconnectOnError: (err) => {
        // ECONNRESET、READONLY、その他の一時的なエラーで再接続
        const reconnectErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
        if (reconnectErrors.some(errorType => err.message.includes(errorType) || err.code === errorType)) {
          console.log('Redis: Reconnecting due to error:', err.code || err.message);
          return true;
        }
        return false;
      }
    });

    client.on('error', (err) => {
      // ECONNRESETは自動再接続されるため、警告レベルで記録
      if (err.code === 'ECONNRESET') {
        // Azure Redis Cacheでは頻繁に発生するが、自動再接続されるため問題なし
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

    client.on('end', () => {
      console.log('Redis connection ended');
    });

    // 接続が確立されるまで待つ（タイムアウトを延長し、失敗時は続行）
    try {
      await new Promise((resolve, reject) => {
        if (client.status === 'ready') {
          resolve();
        } else {
          client.once('ready', resolve);
          client.once('error', reject);
          setTimeout(() => reject(new Error('Redis connection timeout')), 10000); // 10秒に延長
        }
      });

      await client.ping();
      console.log('Redis connection successful');
    } catch (connectionError) {
      console.warn('Redis connection failed:', connectionError.message);
      console.warn('Redis connection failed - using in-memory storage');
      if (client) {
        try {
          client.disconnect(false); // false = do not wait for pending replies
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
      }
      client = null;
      return null;
    }
    
    // 定期的にpingを送信して接続を維持（Azure Redis Cacheのアイドルタイムアウト対策）
    setInterval(async () => {
      if (client && client.status === 'ready') {
        try {
          await client.ping();
        } catch (err) {
          // pingの失敗は通常の接続エラーハンドリングで処理されるため、ログレベルを下げる
          console.log('Redis ping failed (will auto-reconnect):', err.message);
        }
      }
    }, 15000); // 15秒ごとにping（Azure Redis Cacheのアイドルタイムアウトを防ぐ）
    
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

// 一時的なエラーかどうかを判定
const isTransientError = (error) => {
  const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
  return transientCodes.includes(error.code) || error.message.includes('READONLY');
};

// リトライ付きでRedis操作を実行
const executeWithRetry = async (operation, fallback, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (client && (client.status === 'ready' || client.status === 'connecting')) {
        return await operation();
      }
      // clientが存在しないか、状態が不適切な場合はフォールバック
      return fallback();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      if (isTransientError(error) && !isLastAttempt) {
        // 一時的なエラーの場合は短時間待機して再試行
        console.log(`Redis operation retry ${attempt + 1}/${maxRetries} due to ${error.code}`);
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      // 永続的なエラーまたは最後の試行の場合はフォールバック
      console.error('Redis operation error:', error.code || error.message);
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

  async hSet(key, field, value) {
    return executeWithRetry(
      () => client.hSet(key, field, value),
      () => {
        if (!memoryCache.has(key)) {
          memoryCache.set(key, new Map());
        }
        memoryCache.get(key).set(field, value);
        return 1;
      }
    );
  },

  async hGet(key, field) {
    return executeWithRetry(
      () => client.hGet(key, field),
      () => {
        const hash = memoryCache.get(key);
        return hash ? hash.get(field) : null;
      }
    );
  },

  async hGetAll(key) {
    return executeWithRetry(
      () => client.hGetAll(key),
      () => {
        const hash = memoryCache.get(key);
        if (!hash) return {};
        const obj = {};
        for (const [field, value] of hash) {
          obj[field] = value;
        }
        return obj;
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
  }
};

const getRedisClient = () => client;

module.exports = { initRedis, redisWrapper, getRedisClient };