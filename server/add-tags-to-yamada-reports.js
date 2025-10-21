// 山田マネージャーの日報にタグを追加するスクリプト
const pool = require('./src/db/pool');

// タグIDのマッピング（既存のタグを使用）
const TAG_IDS = {
  '新規顧客': 4,
  '既存顧客': 5,
  'フォローアップ必要': 1,
  '見積提出済': 7,
  '商談中': 8,
  '成約見込み高': 9,
  '建設業界': 2,
  'IT・通信': 3,
  '製造業': 6,
  '大型案件': 10
};

async function addTagsToYamadaReports() {
  try {
    console.log('山田マネージャーの日報にタグを追加中...\n');

    // 山田マネージャーのユーザーIDを取得
    const yamadaResult = await pool.query(
      "SELECT id, name FROM users WHERE email = 'yamada@example.com'"
    );

    if (yamadaResult.rows.length === 0) {
      console.error('山田マネージャーが見つかりません');
      return;
    }

    const yamadaId = yamadaResult.rows[0].id;
    const yamadaName = yamadaResult.rows[0].name;
    console.log(`山田マネージャー: ID=${yamadaId}, 名前=${yamadaName}`);

    // 山田マネージャーの日報を取得
    const reportsResult = await pool.query(`
      SELECT r.id, r.report_date, rs.customer, rs.project
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1
      ORDER BY r.report_date DESC
    `, [yamadaId]);

    const reports = reportsResult.rows;
    console.log(`\n取得した日報: ${reports.length}件\n`);

    if (reports.length === 0) {
      console.log('山田マネージャーの日報がありません');
      return;
    }

    // 各日報にタグを追加
    let processedCount = 0;

    for (const report of reports) {
      // ランダムに3-5個のタグを選択
      const numTags = 3 + Math.floor(Math.random() * 3); // 3-5個
      const availableTagIds = Object.values(TAG_IDS);
      const selectedTagIds = [];

      // ランダムにタグを選択
      while (selectedTagIds.length < numTags && selectedTagIds.length < availableTagIds.length) {
        const randomTag = availableTagIds[Math.floor(Math.random() * availableTagIds.length)];
        if (!selectedTagIds.includes(randomTag)) {
          selectedTagIds.push(randomTag);
        }
      }

      // タグを追加（重複は無視）
      for (const tagId of selectedTagIds) {
        try {
          await pool.query(`
            INSERT INTO report_tags (report_id, tag_id, auto_generated, confidence)
            VALUES ($1, $2, true, 0.9)
            ON CONFLICT (report_id, tag_id) DO NOTHING
          `, [report.id, tagId]);
        } catch (err) {
          // 重複エラーは無視
        }
      }

      // タグ名を取得して表示
      const tagsResult = await pool.query(`
        SELECT t.name
        FROM tags t
        WHERE t.id = ANY($1)
      `, [selectedTagIds]);

      const tagNames = tagsResult.rows.map(row => row.name);

      console.log(`✓ ${yamadaName}の日報 (${report.report_date.toISOString().substring(0, 10)}) に${tagNames.length}個のタグを追加`);
      processedCount++;
    }

    console.log(`\n✅ ${processedCount}件の日報にタグを追加しました！`);

  } catch (error) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

addTagsToYamadaReports();
