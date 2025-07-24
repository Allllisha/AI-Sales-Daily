require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seeding...');
    await client.query('BEGIN');

    // Create manager
    const managerPassword = await bcrypt.hash('manager123', 10);
    const managerResult = await client.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['manager@example.com', managerPassword, '山田太郎', 'manager']
    );
    const managerId = managerResult.rows[0].id;

    // Create sales users
    const salesPassword = await bcrypt.hash('sales123', 10);
    await client.query(
      'INSERT INTO users (email, password, name, role, manager_id) VALUES ($1, $2, $3, $4, $5)',
      ['tanaka@example.com', salesPassword, '田中花子', 'sales', managerId]
    );
    
    await client.query(
      'INSERT INTO users (email, password, name, role, manager_id) VALUES ($1, $2, $3, $4, $5)',
      ['suzuki@example.com', salesPassword, '鈴木一郎', 'sales', managerId]
    );

    await client.query('COMMIT');
    console.log('Database seeding completed successfully!');
    console.log('Created users:');
    console.log('- manager@example.com (password: manager123)');
    console.log('- tanaka@example.com (password: sales123)');
    console.log('- suzuki@example.com (password: sales123)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();