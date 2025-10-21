require('dotenv').config();
const pool = require('./src/db/pool');

async function addTagsToSubordinateReports() {
  try {
    console.log('山田マネージャーの部下の日報にタグを追加中...\n');

    // 山田マネージャーの部下を取得
    const manager = await pool.query(
      "SELECT id FROM users WHERE email = 'yamada@example.com'"
    );

    if (manager.rows.length === 0) {
      console.log('マネージャーが見つかりません');
      return;
    }

    const managerId = manager.rows[0].id;

    // 部下の日報を取得
    const reports = await pool.query(
      `SELECT r.id, r.date, u.name, rs.customer, rs.project
       FROM reports r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN report_slots rs ON r.id = rs.report_id
       WHERE u.manager_id = $1
       ORDER BY r.date DESC`,
      [managerId]
    );

    console.log(`取得した日報: ${reports.rows.length}件\n`);

    // すべてのタグを取得
    const tagsResult = await pool.query('SELECT id, name, category FROM tags');
    const tags = tagsResult.rows;

    const industryTags = tags.filter(t => t.category === '業界');
    const statusTags = tags.filter(t => t.category === 'ステータス');
    const phaseTags = tags.filter(t => t.category === 'フェーズ');
    const actionTags = tags.filter(t => t.category === 'アクション');

    let taggedCount = 0;

    for (const report of reports.rows) {
      const reportTags = [];

      // 業界タグ
      if (report.customer && report.customer.includes('建設')) {
        const tag = tags.find(t => t.name === '建設業界');
        if (tag) reportTags.push(tag.id);
      } else if (report.customer && report.customer.includes('工業')) {
        const tag = tags.find(t => t.name === '製造業');
        if (tag) reportTags.push(tag.id);
      } else {
        const tag = tags.find(t => t.name === 'IT・通信');
        if (tag) reportTags.push(tag.id);
      }

      // ステータスタグ（ランダムに新規/既存）
      const statusTag = Math.random() > 0.5 ?
        tags.find(t => t.name === '新規顧客') :
        tags.find(t => t.name === '既存顧客');
      if (statusTag) reportTags.push(statusTag.id);

      // フェーズタグ（一部の日報に）
      if (Math.random() > 0.6) {
        const phaseTag = tags.find(t => t.name === '見積提出済');
        if (phaseTag) reportTags.push(phaseTag.id);
      }

      // アクションタグ（一部の日報に）
      if (Math.random() > 0.5) {
        const actionTag = tags.find(t => t.name === 'フォローアップ必要');
        if (actionTag) reportTags.push(actionTag.id);
      }

      // 大型案件タグ（一部の日報に）
      if (report.project && (report.project.includes('建設') || report.project.includes('新工場'))) {
        const largeTag = tags.find(t => t.name === '大型案件');
        if (largeTag) reportTags.push(largeTag.id);
      }

      // タグを挿入
      for (const tagId of reportTags) {
        try {
          await pool.query(
            'INSERT INTO report_tags (report_id, tag_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (report_id, tag_id) DO NOTHING',
            [report.id, tagId]
          );
        } catch (error) {
          console.error(`  エラー (日報ID: ${report.id}, タグID: ${tagId}):`, error.message);
        }
      }

      if (reportTags.length > 0) {
        taggedCount++;
        console.log(`✓ ${report.name}さんの日報 (${report.date.toISOString().split('T')[0]}) に${reportTags.length}個のタグを追加`);
      }
    }

    // usage_countを更新
    await pool.query(`
      UPDATE tags SET usage_count = (
        SELECT COUNT(*) FROM report_tags WHERE tag_id = tags.id
      )
    `);

    console.log(`\n✅ ${taggedCount}件の日報にタグを追加しました！\n`);

  } catch (error) {
    console.error('エラー:', error.message);
    console.error('スタック:', error.stack);
  } finally {
    await pool.end();
  }
}

addTagsToSubordinateReports();
