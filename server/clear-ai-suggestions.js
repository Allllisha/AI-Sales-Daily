const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clearAISuggestions() {
  try {
    // 全てのai_suggestionsをクリア
    const result = await pool.query(`
      UPDATE reports
      SET ai_suggestions = NULL
      WHERE ai_suggestions IS NOT NULL
    `);

    console.log(`✓ ${result.rowCount}件のAI提案をクリアしました`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

clearAISuggestions();
