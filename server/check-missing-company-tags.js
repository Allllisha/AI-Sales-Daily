const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkMissingCompanyTags() {
  try {
    // 企業タグ（category='company'）がない日報を確認
    const result = await pool.query(`
      SELECT DISTINCT
        r.id,
        r.user_id,
        r.report_date,
        rs.customer,
        (
          SELECT COUNT(*)
          FROM report_tags rt
          INNER JOIN tags t ON rt.tag_id = t.id
          WHERE rt.report_id = r.id AND t.category = 'company'
        ) as company_tag_count
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.status IN ('completed', 'draft')
      ORDER BY r.report_date DESC
    `);

    console.log('全日報のタグ状況:');
    console.log('='.repeat(100));

    let missingCount = 0;
    const missingReports = [];

    result.rows.forEach(row => {
      if (row.company_tag_count === '0' || row.company_tag_count === 0) {
        missingCount++;
        missingReports.push(row);
        console.log(`Report ID: ${row.id}`);
        console.log(`  Date: ${row.report_date}`);
        console.log(`  Customer: ${row.customer || '(未設定)'}`);
        console.log(`  Company tags: ${row.company_tag_count}`);
        console.log('');
      }
    });

    console.log('='.repeat(100));
    console.log(`企業タグがない日報: ${missingCount}件 / 全${result.rows.length}件`);

    if (missingReports.length > 0) {
      console.log('\n対象日報ID:');
      console.log(missingReports.map(r => r.id).join(', '));
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkMissingCompanyTags();
