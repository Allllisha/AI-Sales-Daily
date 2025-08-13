const { Pool } = require('pg');

// DATABASE_URLが設定されている場合はそれを使用
let poolConfig;

if (process.env.DATABASE_URL) {
  // DATABASE_URLからの接続
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    min: 2, // 最小接続数を設定
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000, // 60秒に延長（Azure環境での接続を考慮）
    query_timeout: 30000,
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000,
    keepAlive: true, // TCP keep-aliveを有効化
    keepAliveInitialDelayMillis: 10000 // 10秒後にkeep-alive開始
  };
} else {
  // 個別の環境変数からの接続
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sales_daily',
    user: process.env.DB_USER || 'salesuser',
    password: process.env.DB_PASSWORD || 'salespass',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  };
}

console.log('Database connection config:', {
  connectionString: poolConfig.connectionString ? 'DATABASE_URL is set' : 'Using individual env vars',
  ssl: poolConfig.ssl,
  max: poolConfig.max
});

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// 接続テスト
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('Database connection successful');
    release();
  }
});

module.exports = pool;