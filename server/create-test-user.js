require('dotenv').config();
const pool = require('./src/db/pool');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const query = `
      INSERT INTO users (email, password, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE
      SET password = $2, name = $3
      RETURNING id, email, name, role
    `;
    
    const result = await pool.query(query, [
      'test@example.com',
      hashedPassword,
      'テストユーザー',
      'sales'
    ]);
    
    console.log('テストユーザー作成完了:', result.rows[0]);
    console.log('ログイン情報:');
    console.log('  Email: test@example.com');
    console.log('  Password: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();