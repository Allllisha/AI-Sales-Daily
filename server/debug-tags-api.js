require('dotenv').config();
const pool = require('./src/db/pool');

async function debugTagsAPI() {
  try {
    console.log('\n=== GET /api/tags の動作確認 ===\n');

    // GET /api/tagsと同じクエリ
    const limit = 100;
    const query = 'SELECT * FROM tags ORDER BY usage_count DESC, name ASC LIMIT $1';
    const result = await pool.query(query, [limit]);

    console.log(`タグ数: ${result.rows.length}件\n`);

    result.rows.forEach(tag => {
      console.log(`ID: ${tag.id} | 名前: ${tag.name} | カテゴリ: ${tag.category} | 色: ${tag.color} | 使用回数: ${tag.usage_count}`);
    });

    console.log('\n=== GET /api/reports/team の動作確認 ===\n');

    // yamadaマネージャーのID取得
    const manager = await pool.query(
      "SELECT id FROM users WHERE email = 'yamada@example.com'"
    );

    if (manager.rows.length === 0) {
      console.log('マネージャーが見つかりません');
      return;
    }

    const managerId = manager.rows[0].id;

    // チーム日報取得
    const teamReports = await pool.query(`
      SELECT
        r.id,
        r.report_date,
        r.mode,
        r.status,
        u.name as user_name,
        rs.customer,
        rs.project
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE u.manager_id = $1
      ORDER BY r.report_date DESC, r.created_at DESC
      LIMIT 5
    `, [managerId]);

    console.log(`チーム日報: ${teamReports.rows.length}件\n`);

    if (teamReports.rows.length > 0) {
      const reportIds = teamReports.rows.map(r => r.id);

      // タグ取得
      const tagsResult = await pool.query(
        `SELECT rt.report_id, t.id, t.name, t.category, t.color
         FROM report_tags rt
         INNER JOIN tags t ON rt.tag_id = t.id
         WHERE rt.report_id = ANY($1)
         ORDER BY t.category, t.name`,
        [reportIds]
      );

      console.log(`タグ関連付け: ${tagsResult.rows.length}件\n`);

      // グループ化
      const tagsByReportId = {};
      tagsResult.rows.forEach(tag => {
        if (!tagsByReportId[tag.report_id]) {
          tagsByReportId[tag.report_id] = [];
        }
        tagsByReportId[tag.report_id].push({
          id: tag.id,
          name: tag.name,
          category: tag.category,
          color: tag.color
        });
      });

      // 各日報を表示
      teamReports.rows.forEach((report, index) => {
        const tags = tagsByReportId[report.id] || [];
        console.log(`\n[${index + 1}] 日報ID: ${report.id}`);
        console.log(`    日付: ${report.report_date.toISOString().split('T')[0]}`);
        console.log(`    作成者: ${report.user_name}`);
        console.log(`    タグ数: ${tags.length}`);
        if (tags.length > 0) {
          tags.forEach(tag => {
            console.log(`      - ${tag.name} [${tag.category}]`);
          });
        }
      });

      console.log('\n=== APIレスポンス形式 ===\n');
      const sampleReport = teamReports.rows[0];
      sampleReport.tags = tagsByReportId[sampleReport.id] || [];
      console.log(JSON.stringify(sampleReport, null, 2));
    }

  } catch (error) {
    console.error('エラー:', error.message);
    console.error('スタック:', error.stack);
  } finally {
    await pool.end();
  }
}

debugTagsAPI();
