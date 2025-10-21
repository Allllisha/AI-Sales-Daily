require('dotenv').config();
const pool = require('./src/db/pool');

async function checkManagerTags() {
  try {
    // マネージャーユーザーを取得
    const manager = await pool.query(
      "SELECT id, name, email, role FROM users WHERE email = 'yamada@example.com'"
    );
    
    if (manager.rows.length === 0) {
      console.log('マネージャーが見つかりません');
      return;
    }
    
    console.log('\n=== マネージャー情報 ===');
    console.log(`名前: ${manager.rows[0].name}`);
    console.log(`メール: ${manager.rows[0].email}`);
    console.log(`役割: ${manager.rows[0].role}`);
    console.log(`ID: ${manager.rows[0].id}`);
    
    // マネージャーの部下を確認
    const subordinates = await pool.query(
      'SELECT id, name, email FROM users WHERE manager_id = $1',
      [manager.rows[0].id]
    );
    
    console.log(`\n部下の数: ${subordinates.rows.length}人`);
    subordinates.rows.forEach(sub => {
      console.log(`  - ${sub.name} (${sub.email})`);
    });
    
    // 部下の日報を取得
    if (subordinates.rows.length > 0) {
      const subordinateIds = subordinates.rows.map(s => s.id);
      const reports = await pool.query(
        `SELECT r.id, r.date, u.name as user_name, 
         (SELECT COUNT(*) FROM report_tags WHERE report_id = r.id) as tag_count
         FROM reports r
         JOIN users u ON r.user_id = u.id
         WHERE r.user_id = ANY($1)
         ORDER BY r.date DESC
         LIMIT 10`,
        [subordinateIds]
      );
      
      console.log(`\n部下の日報: ${reports.rows.length}件`);
      reports.rows.forEach(rep => {
        console.log(`  ${rep.date} - ${rep.user_name} (タグ数: ${rep.tag_count})`);
      });
    }
    
    // すべてのタグを確認
    const tags = await pool.query('SELECT * FROM tags ORDER BY name');
    console.log(`\n=== すべてのタグ (${tags.rows.length}件) ===`);
    tags.rows.forEach(tag => {
      console.log(`  🏷️  ${tag.name} [${tag.category}] - 使用回数: ${tag.usage_count}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkManagerTags();
