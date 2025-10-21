const { Pool } = require('pg');
const { extractTagsFromReport } = require('./src/services/tagExtractor');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addCompanyTagsToAllReports() {
  try {
    // 企業タグがない日報を取得
    const reportsResult = await pool.query(`
      SELECT DISTINCT
        r.id,
        r.user_id,
        r.report_date,
        rs.customer,
        rs.project,
        rs.next_action,
        rs.budget,
        rs.schedule,
        rs.participants,
        rs.location,
        rs.issues,
        rs.industry
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.status IN ('completed', 'draft')
      AND NOT EXISTS (
        SELECT 1
        FROM report_tags rt
        INNER JOIN tags t ON rt.tag_id = t.id
        WHERE rt.report_id = r.id AND t.category = 'company'
      )
      ORDER BY r.id ASC
    `);

    console.log(`企業タグがない日報: ${reportsResult.rows.length}件`);
    console.log('='.repeat(100));

    let successCount = 0;
    let errorCount = 0;

    for (const report of reportsResult.rows) {
      try {
        console.log(`\n[${successCount + errorCount + 1}/${reportsResult.rows.length}] Report ID: ${report.id} - ${report.customer || '(未設定)'}`);

        // 日報データを構築
        const reportData = {
          mode: 'hearing',
          questions_answers: [],
          slots: {
            customer: report.customer || '',
            project: report.project || '',
            next_action: report.next_action || '',
            issues: report.issues || '',
            budget: report.budget || '',
            schedule: report.schedule || '',
            participants: report.participants || '',
            location: report.location || '',
            industry: report.industry || ''
          }
        };

        // スロットに値があるか確認
        const hasContent = Object.values(reportData.slots).some(val => val && val.trim());
        if (!hasContent) {
          console.log('  ⚠️ スキップ: 日報内容が空です');
          continue;
        }

        // タグを抽出
        console.log('  タグを抽出中...');
        const tags = await extractTagsFromReport(reportData);

        if (!tags || tags.length === 0) {
          console.log('  ⚠️ タグが抽出されませんでした');
          continue;
        }

        // タグをデータベースに保存
        let addedCount = 0;
        for (const tag of tags) {
          // タグを取得または作成
          let tagResult = await pool.query(
            'SELECT id FROM tags WHERE name = $1 AND category = $2',
            [tag.name, tag.category]
          );

          let tagId;
          if (tagResult.rows.length === 0) {
            // 新しいタグを作成
            const insertResult = await pool.query(
              'INSERT INTO tags (name, category, color) VALUES ($1, $2, $3) RETURNING id',
              [tag.name, tag.category, tag.color]
            );
            tagId = insertResult.rows[0].id;
          } else {
            tagId = tagResult.rows[0].id;
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
            addedCount++;
          }
        }

        console.log(`  ✓ ${addedCount}個のタグを追加しました`);
        successCount++;

      } catch (error) {
        console.error(`  ✗ Error processing report ${report.id}:`, error.message);
        errorCount++;
      }

      // レート制限対策で少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
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

addCompanyTagsToAllReports();
