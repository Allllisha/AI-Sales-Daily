const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkJKLReports() {
  try {
    // 「株式会社JKL製作所」の全ての日報を詳細に確認
    const result = await pool.query(`
      SELECT
        r.id,
        r.user_id,
        r.report_date,
        r.created_at,
        r.status,
        rs.customer,
        rs.project
      FROM reports r
      INNER JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = 18
        AND rs.customer = '株式会社JKL製作所'
      ORDER BY r.report_date DESC, r.created_at DESC
    `);

    console.log('「株式会社JKL製作所」の日報詳細:');
    console.log('='.repeat(100));
    result.rows.forEach(row => {
      console.log(`Report ID: ${row.id}`);
      console.log(`  Created: ${row.created_at}`);
      console.log(`  Report Date: ${row.report_date}`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Project: ${row.project || '(未設定)'}`);
      console.log('');
    });

    // あるreportでgenerateSuggestionsを実行した時のシミュレーション
    if (result.rows.length > 0) {
      const currentReport = result.rows[0]; // 最新の日報
      console.log(`\nシミュレーション: Report ${currentReport.id}のAI提案を生成する場合`);
      console.log('='.repeat(100));

      const pastReportsQuery = `
        SELECT
          r.id,
          r.report_date,
          rs.customer,
          rs.project,
          rs.next_action,
          rs.issues
        FROM reports r
        LEFT JOIN report_slots rs ON r.id = rs.report_id
        WHERE r.user_id = $1
        AND r.id != $2
        AND r.status = 'completed'
        AND rs.customer = $3
        ORDER BY r.report_date DESC
        LIMIT 5
      `;

      const pastResult = await pool.query(pastReportsQuery, [
        currentReport.user_id,
        currentReport.id,
        currentReport.customer
      ]);

      console.log(`過去の日報検索結果: ${pastResult.rows.length}件`);
      if (pastResult.rows.length === 0) {
        console.log('⚠️ 過去の日報が見つかりませんでした');
        console.log('AI提案: "まだ過去の日報がありません。最初の商談として、顧客のニーズと課題をしっかり聞き取ることに集中しましょう。"');
      } else {
        console.log('✓ 過去の日報が見つかりました:');
        pastResult.rows.forEach(row => {
          console.log(`  - Report ${row.id}: ${row.report_date} - ${row.project || '(未設定)'}`);
        });
      }
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkJKLReports();
