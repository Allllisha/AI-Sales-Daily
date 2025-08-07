const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration(migrationFile) {
  const client = await pool.connect();
  
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    // マイグレーションファイルを読み込み
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // トランザクション開始
    await client.query('BEGIN');
    
    // マイグレーションSQL実行
    await client.query(migrationSQL);
    
    // コミット
    await client.query('COMMIT');
    
    console.log(`Migration completed successfully: ${migrationFile}`);
  } catch (error) {
    // ロールバック
    await client.query('ROLLBACK');
    console.error(`Migration failed: ${migrationFile}`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    // コマンドライン引数からマイグレーションファイルを取得
    const migrationFile = process.argv[2] || '001_unified_data_model.sql';
    
    // マイグレーション実行
    await runMigration(migrationFile);
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// コマンドライン引数で特定のマイグレーションを実行可能
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runMigration };