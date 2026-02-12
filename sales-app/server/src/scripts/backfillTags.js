const pool = require('../db/pool');
const { extractTagsFromReport } = require('../services/tagExtractor');
const { getOrCreateTag } = require('../routes/tags');

async function backfillTags() {
  try {
    console.log('Starting tag backfill for existing reports...');

    // すべての日報を取得（タグが未設定のもの）
    const reportsResult = await pool.query(`
      SELECT r.id, r.mode
      FROM reports r
      WHERE NOT EXISTS (
        SELECT 1 FROM report_tags rt WHERE rt.report_id = r.id
      )
      ORDER BY r.id DESC
    `);

    const reports = reportsResult.rows;
    console.log(`Found ${reports.length} reports without tags`);

    let successCount = 0;
    let errorCount = 0;

    for (const report of reports) {
      try {
        console.log(`\nProcessing report ${report.id}...`);

        // 質問と回答を取得
        const qaResult = await pool.query(
          `SELECT question, answer, timestamp, order_index
           FROM report_qa
           WHERE report_id = $1
           ORDER BY order_index`,
          [report.id]
        );

        const questions_answers = qaResult.rows.map(row => ({
          question: row.question,
          answer: row.answer,
          timestamp: row.timestamp
        }));

        // スロット情報を取得
        const slotsResult = await pool.query(
          `SELECT customer, project, next_action, budget, schedule,
                  participants, location, issues, industry, personal_info, relationship_notes
           FROM report_slots
           WHERE report_id = $1
           LIMIT 1`,
          [report.id]
        );

        const slots = slotsResult.rows.length > 0 ? slotsResult.rows[0] : {};

        // 日報からタグを抽出
        const tags = await extractTagsFromReport({
          questions_answers,
          slots,
          mode: report.mode || 'hearing'
        });

        console.log(`Extracted ${tags.length} tags for report ${report.id}`);

        // タグを登録
        for (const tag of tags) {
          try {
            const tagId = await getOrCreateTag(tag.name, tag.category);
            await pool.query(
              `INSERT INTO report_tags (report_id, tag_id, auto_generated, confidence)
               VALUES ($1, $2, true, $3)
               ON CONFLICT (report_id, tag_id) DO NOTHING`,
              [report.id, tagId, tag.confidence || 0.8]
            );
            console.log(`  - Added tag: ${tag.name} (${tag.category})`);
          } catch (tagErr) {
            console.error(`  - Error adding tag ${tag.name}:`, tagErr.message);
          }
        }

        successCount++;
      } catch (reportErr) {
        console.error(`Error processing report ${report.id}:`, reportErr.message);
        errorCount++;
      }
    }

    console.log(`\n=== Backfill Complete ===`);
    console.log(`Success: ${successCount} reports`);
    console.log(`Errors: ${errorCount} reports`);

    // タグの統計を表示
    const tagsStats = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM tags
      GROUP BY category
      ORDER BY category
    `);

    console.log('\n=== Tag Statistics ===');
    tagsStats.rows.forEach(row => {
      console.log(`${row.category}: ${row.count} tags`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
}

backfillTags();
