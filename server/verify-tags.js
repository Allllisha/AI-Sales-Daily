require('dotenv').config();
const pool = require('./src/db/pool');

async function verifyTags() {
  try {
    console.log('\n=== タグ付き日報の確認 ===\n');

    const result = await pool.query(`
      SELECT r.id, r.date, u.name, COUNT(rt.id) as tag_count,
             STRING_AGG(t.name, ', ') as tag_names
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN report_tags rt ON r.id = rt.report_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE u.manager_id = (SELECT id FROM users WHERE email = 'yamada@example.com')
      GROUP BY r.id, r.date, u.name
      ORDER BY r.date DESC
      LIMIT 30
    `);

    console.log(`部下の日報: ${result.rows.length}件\n`);

    let taggedCount = 0;
    let untaggedCount = 0;

    result.rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      const tagCount = parseInt(row.tag_count);

      if (tagCount > 0) {
        console.log(`✓ ${dateStr} - ${row.name} (${tagCount}個): ${row.tag_names}`);
        taggedCount++;
      } else {
        console.log(`✗ ${dateStr} - ${row.name} (タグなし)`);
        untaggedCount++;
      }
    });

    console.log(`\n統計:`);
    console.log(`  タグ付き: ${taggedCount}件`);
    console.log(`  タグなし: ${untaggedCount}件`);

    // タグ使用状況
    const tagUsage = await pool.query(`
      SELECT t.name, t.category, COUNT(rt.id) as usage_count
      FROM tags t
      LEFT JOIN report_tags rt ON t.id = rt.tag_id
      GROUP BY t.id, t.name, t.category
      ORDER BY usage_count DESC
    `);

    console.log(`\n=== タグ使用状況 ===\n`);
    tagUsage.rows.forEach(tag => {
      console.log(`  ${tag.name} [${tag.category}]: ${tag.usage_count}回`);
    });

  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await pool.end();
  }
}

verifyTags();
