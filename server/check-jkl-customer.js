const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkJKLCustomer() {
  try {
    // 田中さんの全ての顧客を確認
    const result = await pool.query(`
      SELECT
        rs.customer,
        COUNT(r.id) as report_count,
        MIN(r.report_date) as first_date,
        MAX(r.report_date) as last_date
      FROM reports r
      INNER JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = 18  -- 田中さん
        AND rs.customer IS NOT NULL
        AND rs.customer != ''
      GROUP BY rs.customer
      ORDER BY report_count DESC, rs.customer
    `);

    console.log('田中さんの顧客一覧:');
    console.log('='.repeat(80));
    result.rows.forEach(row => {
      console.log(`${row.customer}: ${row.report_count}件 (${row.first_date} 〜 ${row.last_date})`);
    });

    // JKLを含む顧客名を検索
    console.log('\n\nJKLを含む顧客名:');
    console.log('='.repeat(80));
    const jklResult = result.rows.filter(row =>
      row.customer && row.customer.toUpperCase().includes('JKL')
    );

    if (jklResult.length > 0) {
      jklResult.forEach(row => {
        console.log(`見つかりました: "${row.customer}" - ${row.report_count}件の日報`);
      });
    } else {
      console.log('JKLを含む顧客名は見つかりませんでした');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkJKLCustomer();
