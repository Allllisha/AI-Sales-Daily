const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addCompanyTagsSimple() {
  try {
    // 企業タグがない日報を取得
    const reportsResult = await pool.query(`
      SELECT DISTINCT
        r.id,
        r.user_id,
        rs.customer
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.status IN ('completed', 'draft')
      AND rs.customer IS NOT NULL
      AND rs.customer != ''
      AND rs.customer != '(未設定)'
      AND NOT EXISTS (
        SELECT 1
        FROM report_tags rt
        INNER JOIN tags t ON rt.tag_id = t.id
        WHERE rt.report_id = r.id AND t.category = 'company'
      )
      ORDER BY r.id ASC
    `);

    console.log(`企業タグがない日報（顧客名あり）: ${reportsResult.rows.length}件`);
    console.log('='.repeat(100));

    let successCount = 0;
    let errorCount = 0;

    for (const report of reportsResult.rows) {
      try {
        const companyName = report.customer;
        console.log(`[${successCount + errorCount + 1}/${reportsResult.rows.length}] Report ID: ${report.id} - ${companyName}`);

        // companyカテゴリのタグを取得または作成
        let tagResult = await pool.query(
          'SELECT id FROM tags WHERE name = $1 AND category = $2',
          [companyName, 'company']
        );

        let tagId;
        if (tagResult.rows.length === 0) {
          // 新しいタグを作成
          const insertResult = await pool.query(
            'INSERT INTO tags (name, category, color) VALUES ($1, $2, $3) RETURNING id',
            [companyName, 'company', '#3B82F6'] // 青色
          );
          tagId = insertResult.rows[0].id;
          console.log(`  ✓ 新しいタグを作成: ${companyName} (ID: ${tagId})`);
        } else {
          tagId = tagResult.rows[0].id;
          console.log(`  ✓ 既存のタグを使用: ${companyName} (ID: ${tagId})`);
        }

        // report_tagsテーブルに関連付け（重複チェック）
        const existingLink = await pool.query(
          'SELECT 1 FROM report_tags WHERE report_id = $1 AND tag_id = $2',
          [report.id, tagId]
        );

        if (existingLink.rows.length === 0) {
          await pool.query(
            'INSERT INTO report_tags (report_id, tag_id) VALUES ($1, $2)',
            [report.id, tagId]
          );
          console.log(`  ✓ 日報にタグを関連付けました`);
          successCount++;
        } else {
          console.log(`  ⚠️ 既に関連付けられています`);
          successCount++;
        }

      } catch (error) {
        console.error(`  ✗ Error processing report ${report.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log(`完了: 成功 ${successCount}件, エラー ${errorCount}件`);

    await pool.end();

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

addCompanyTagsSimple();
