const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkTanakaTags() {
  try {
    // 田中さんのタグを全て取得
    const result = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.category,
        COUNT(DISTINCT rt.report_id) as report_count
      FROM tags t
      INNER JOIN report_tags rt ON t.id = rt.tag_id
      INNER JOIN reports r ON rt.report_id = r.id
      WHERE r.user_id = 18  -- 田中さん
      GROUP BY t.id, t.name, t.category
      ORDER BY report_count DESC, t.name
    `);

    console.log('田中さんのタグ一覧:');
    console.log('='.repeat(60));
    result.rows.forEach(row => {
      console.log(`${row.name} (${row.category}) - ${row.report_count}件の日報`);
    });

    console.log('\n詳細確認: 各タグの日報を確認');
    console.log('='.repeat(60));

    for (const tag of result.rows.slice(0, 3)) {  // 上位3タグのみ
      console.log(`\nタグ: ${tag.name} (ID: ${tag.id})`);
      const reportsResult = await pool.query(`
        SELECT
          r.id,
          r.created_at::date as report_date,
          r.mode
        FROM reports r
        INNER JOIN report_tags rt ON r.id = rt.report_id
        WHERE rt.tag_id = $1
          AND r.user_id = 18
        ORDER BY r.created_at DESC
        LIMIT 5
      `, [tag.id]);

      reportsResult.rows.forEach(report => {
        console.log(`  - Report ${report.id}: ${report.report_date} (${report.mode})`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkTanakaTags();
