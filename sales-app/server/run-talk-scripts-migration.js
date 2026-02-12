const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// .env.productionから環境変数を読み込む
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Starting talk_scripts table migrations...');

    // Check if talk_scripts table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'talk_scripts'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ talk_scripts table already exists');
    } else {
      console.log('❌ talk_scripts table does NOT exist - running migration 013');

      // Run migration 013
      const migration013 = fs.readFileSync(
        path.join(__dirname, 'src', 'db', 'migrations', '013_create_talk_scripts.sql'),
        'utf8'
      );
      await client.query(migration013);
      console.log('✅ Migration 013 completed - talk_scripts table created');
    }

    // Check if enhanced columns exist
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'talk_scripts'
      AND column_name IN ('script_name', 'tags', 'is_favorite');
    `);

    if (columnCheck.rows.length === 3) {
      console.log('✅ talk_scripts enhanced columns already exist');
    } else {
      console.log('❌ Enhanced columns missing - running migration 014');

      // Run migration 014
      const migration014 = fs.readFileSync(
        path.join(__dirname, 'src', 'db', 'migrations', '014_enhance_talk_scripts.sql'),
        'utf8'
      );
      await client.query(migration014);
      console.log('✅ Migration 014 completed - enhanced columns added');
    }

    console.log('\n✅ All migrations completed successfully!');

    // Verify tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%script%'
      ORDER BY table_name;
    `);

    console.log('\nScript-related tables:');
    tables.rows.forEach(row => console.log('  -', row.table_name));

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
