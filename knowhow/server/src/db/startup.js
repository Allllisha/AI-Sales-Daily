require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function startup() {
  let poolConfig;

  if (process.env.DATABASE_URL) {
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 60000,
    };
  } else {
    poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'knowhow',
      user: process.env.DB_USER || 'knowhowuser',
      password: process.env.DB_PASSWORD || 'knowhowpass',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    };
  }

  const pool = new Pool(poolConfig);

  try {
    // Step 1: Run migration
    console.log('Running database migration...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Migration completed.');

    // Step 2: Check if seed data exists
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('No users found. Running seed...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      await pool.query('BEGIN');

      // Create sites
      const site1 = await pool.query(
        `INSERT INTO sites (name, location, description, status) VALUES ($1, $2, $3, $4) RETURNING id`,
        ['東京駅前再開発工事', '東京都千代田区丸の内', '東京駅前の大規模再開発プロジェクト。地下3階・地上40階の複合施設建設。', 'active']
      );
      const site1Id = site1.rows[0].id;

      const site2 = await pool.query(
        `INSERT INTO sites (name, location, description, status) VALUES ($1, $2, $3, $4) RETURNING id`,
        ['横浜港北トンネル工事', '神奈川県横浜市港北区', '横浜港北エリアのトンネル掘削工事。全長2.5km。', 'active']
      );
      const site2Id = site2.rows[0].id;

      const site3 = await pool.query(
        `INSERT INTO sites (name, location, description, status) VALUES ($1, $2, $3, $4) RETURNING id`,
        ['大阪湾岸道路橋梁補修', '大阪府大阪市住之江区', '大阪湾岸道路の橋梁補修・耐震補強工事。', 'active']
      );

      // Create users
      const admin = await pool.query(
        `INSERT INTO users (email, password, name, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['admin@example.com', hashedPassword, '管理太郎', 'admin', '本社管理部']
      );
      const adminId = admin.rows[0].id;

      const mgr1 = await pool.query(
        `INSERT INTO users (email, password, name, role, department, site_id, manager_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['yamada@example.com', hashedPassword, '山田現場長', 'site_manager', '建築部', site1Id, adminId]
      );
      const mgr1Id = mgr1.rows[0].id;

      await pool.query(
        `INSERT INTO users (email, password, name, role, department, site_id, manager_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['suzuki@example.com', hashedPassword, '鈴木現場長', 'site_manager', '土木部', site2Id, adminId]
      );

      await pool.query(
        `INSERT INTO users (email, password, name, role, department, manager_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        ['expert@example.com', hashedPassword, '佐藤ベテラン', 'expert', '技術部', adminId]
      );

      await pool.query(
        `INSERT INTO users (email, password, name, role, department, site_id, manager_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['tanaka@example.com', hashedPassword, '田中作業員', 'worker', '建築部', site1Id, mgr1Id]
      );

      await pool.query(
        `INSERT INTO users (email, password, name, role, department, site_id, manager_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['nakamura@example.com', hashedPassword, '中村作業員', 'worker', '土木部', site2Id, adminId]
      );

      await pool.query('COMMIT');
      console.log('Seed completed. Test users created.');
    } else {
      console.log(`Users already exist (${userCount.rows[0].count}). Skipping seed.`);
    }

    console.log('Database startup completed successfully.');
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

startup();
