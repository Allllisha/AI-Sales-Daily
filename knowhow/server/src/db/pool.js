const { Pool } = require('pg');

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000,
    query_timeout: 120000,
    statement_timeout: 120000,
    idle_in_transaction_session_timeout: 60000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'knowhow',
    user: process.env.DB_USER || 'knowhowuser',
    password: process.env.DB_PASSWORD || 'knowhowpass',
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
  // Do not exit - the pool will automatically reconnect
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('Database connection successful');
    release();
  }
});

module.exports = pool;
