const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkReport() {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.user_id,
        u.name as user_name,
        u.email,
        u.role,
        u.manager_id
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = 154
    `);

    console.log('Report 154 details:');
    console.log(result.rows[0]);

    if (result.rows[0]?.manager_id) {
      const managerResult = await pool.query(`
        SELECT id, name, email, role
        FROM users
        WHERE id = $1
      `, [result.rows[0].manager_id]);

      console.log('\nManager details:');
      console.log(managerResult.rows[0]);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkReport();
