const express = require('express');
const { authMiddleware, managerOnly } = require('../middleware/auth');
const pool = require('../db/pool');

// スロットデータをクリーンアップする関数
// 全体の会話から業界を推測する関数
function inferIndustryFromText(text) {
  const industryKeywords = [
    { industry: '建設業', keywords: ['建設', '工務', '施工', '建築', '土木', 'ゼネコン', '現場', '着工', '竣工', 'BIM', 'CAD', '建設会社', '工事', '設計', '施工管理', '図面'] },
    { industry: '保険業', keywords: ['保険', '損保', '生保', '共済', '契約者', '被保険者', '保険料', '保険金', '査定', '保険会社', 'アクサ', '東京海上', '三井住友海上', '損害保険'] },
    { industry: '金融業', keywords: ['銀行', '信金', '証券', '投資', '融資', '資金', '金利', '債券', '株式', 'ファンド', '銀行', 'みずほ', 'UFJ', '三菱', '金融機関', 'リース'] },
    { industry: '製造業', keywords: ['製造', '工場', '生産', '品質', '検査', '組立', '製品', '部品', '設備', '機械', '製造業', '生産管理', '品質管理', '工場長', '製造ライン'] },
    { industry: 'IT業', keywords: ['IT', 'システム', 'ソフト', 'アプリ', 'データ', 'クラウド', 'AI', 'DX', 'SaaS', 'AWS', 'Azure', 'サーバー', 'ネットワーク', 'プログラム', 'エンジニア', 'SE'] },
    { industry: '医療・介護', keywords: ['病院', '医療', '看護', '介護', '患者', '診療', '薬剤', 'カルテ', 'レセプト', '医師', '看護師', 'クリニック', '薬局', '介護施設', '老人ホーム'] },
    { industry: '教育', keywords: ['学校', '大学', '教育', '学生', '生徒', '授業', '講義', '研修', 'e-learning', '教師', '先生', '教授', '学習', '教育機関', '専門学校'] },
    { industry: '小売業', keywords: ['店舗', '販売', '商品', '在庫', 'POS', 'レジ', 'EC', '顧客管理', '売上', '小売', '百貨店', 'スーパー', 'コンビニ', '店長', '販売員'] },
    { industry: '不動産業', keywords: ['不動産', '賃貸', '売買', '物件', 'マンション', 'オフィス', '仲介', '管理', '不動産会社', '賃貸管理', '売買仲介', '大家', 'テナント'] },
    { industry: '公共・自治体', keywords: ['自治体', '市役所', '県庁', '公共', '行政', '住民', '公務員', '入札', '市町村', '都道府県', '役所', '官公庁'] }
  ];
  
  // スコアベースで最適な業界を選択
  let bestMatch = null;
  let bestScore = 0;
  
  for (const { industry, keywords } of industryKeywords) {
    let score = 0;
    for (const keyword of keywords) {
      const count = (text.match(new RegExp(keyword, 'g')) || []).length;
      score += count;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }
  
  // 最低1つのキーワードがマッチした場合のみ返す
  return bestScore > 0 ? bestMatch : null;
}

function cleanSlotData(slots) {
  if (!slots || typeof slots !== 'object') return slots;
  
  const cleaned = {};
  Object.keys(slots).forEach(key => {
    const value = slots[key];
    if (value !== null && value !== undefined) {
      if (typeof value === 'string') {
        // {}[]"を除去
        cleaned[key] = value.replace(/[{}[\]"]/g, '');
      } else if (Array.isArray(value)) {
        // 配列の場合はカンマ区切り文字列に変換し、{}[]"を除去
        cleaned[key] = value.map(item => 
          typeof item === 'string' ? item.replace(/[{}[\]"]/g, '') : item
        ).join(', ');
      } else {
        cleaned[key] = value;
      }
    } else {
      cleaned[key] = value;
    }
  });
  
  return cleaned;
}

const router = express.Router();

// 日報一覧取得
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    let query = `
      SELECT 
        r.id, r.user_id, r.report_date, r.mode, r.status, r.created_at,
        u.name as user_name,
        rs.customer, rs.project, rs.next_action, rs.budget, 
        rs.schedule, rs.participants, rs.location, rs.issues,
        rs.personal_info, rs.relationship_notes
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // ユーザーフィルター（常に指定されたユーザーの日報のみ取得）
    query += ` AND r.user_id = $${paramIndex}`;
    params.push(req.userId);
    paramIndex++;

    // 日付フィルター
    if (startDate) {
      query += ` AND r.report_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      query += ` AND r.report_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // 特定ユーザーのフィルター（マネージャーのみ）
    if (userId && req.userRole === 'manager') {
      query += ` AND r.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    query += ' ORDER BY r.report_date DESC, r.created_at DESC';

    const result = await pool.query(query, params);
    
    // データはすでに文字列形式なので、特別な処理は不要
    const processedRows = result.rows;
    
    res.json(processedRows);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: '日報の取得に失敗しました' });
  }
});

// チーム日報取得（マネージャー用）
router.get('/team', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { limit = 10, userIds } = req.query;
    const managerId = req.userId;

    let whereClause = '';
    let queryParams = [];

    if (userIds && userIds.length > 0) {
      // 特定のユーザーの日報
      const userIdsArray = Array.isArray(userIds) ? userIds : [userIds];
      const placeholders = userIdsArray.map((_, i) => `$${i + 1}`).join(',');
      whereClause = `WHERE r.user_id IN (${placeholders})`;
      queryParams = userIdsArray;
    } else {
      // チーム全体の日報
      whereClause = 'WHERE u.manager_id = $1';
      queryParams = [managerId];
    }

    const result = await pool.query(`
      SELECT 
        r.id,
        r.report_date,
        r.mode,
        r.status,
        r.created_at,
        r.updated_at,
        u.name as user_name,
        rs.customer,
        rs.project
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      ${whereClause}
      ORDER BY r.report_date DESC, r.created_at DESC
      LIMIT $${queryParams.length + 1}
    `, [...queryParams, limit]);

    // データはすでにクリーンな文字列形式なので、特別な処理は不要
    const processedRows = result.rows;

    res.json(processedRows);
  } catch (error) {
    console.error('Get team reports error:', error);
    res.status(500).json({ error: 'チーム日報の取得に失敗しました' });
  }
});

// 日報詳細取得
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 日報基本情報取得
    const reportResult = await pool.query(`
      SELECT r.*, u.name as user_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [id]);

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: '日報が見つかりません' });
    }

    const report = reportResult.rows[0];

    // アクセス権限チェック
    if (req.userRole !== 'manager' && report.user_id !== req.userId) {
      return res.status(403).json({ error: 'この日報を閲覧する権限がありません' });
    }

    // Q&A取得
    const qaResult = await pool.query(
      'SELECT * FROM report_qa WHERE report_id = $1 ORDER BY order_index',
      [id]
    );

    // スロット情報取得
    const slotsResult = await pool.query(
      'SELECT * FROM report_slots WHERE report_id = $1',
      [id]
    );

    // スロットデータはすでにクリーンな文字列形式
    const slots = slotsResult.rows[0] || {};

    res.json({
      ...report,
      questions_answers: qaResult.rows,
      slots
    });
  } catch (error) {
    console.error('Get report detail error:', error);
    res.status(500).json({ error: '日報の取得に失敗しました' });
  }
});

// 今日の日報が存在するかチェック
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await pool.query(
      'SELECT id, status FROM reports WHERE user_id = $1 AND DATE(report_date) = DATE($2)',
      [req.userId, today]
    );
    
    if (result.rows.length > 0) {
      res.json({ exists: true, report: result.rows[0] });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Check today report error:', error);
    res.status(500).json({ error: '日報の確認に失敗しました' });
  }
});

// 日報作成
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { report_date, mode, questions_answers, slots } = req.body;
    // If no report_date provided, use current JST date
    const reportDate = report_date || (() => {
      const now = new Date();
      const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      return jstDate.toISOString().split('T')[0];
    })();

    // 既存の日報をチェック
    const existingReport = await client.query(
      'SELECT id FROM reports WHERE user_id = $1 AND report_date = $2',
      [req.userId, reportDate]
    );

    let reportId;
    
    if (existingReport.rows.length > 0) {
      // 既存の日報がある場合は更新
      reportId = existingReport.rows[0].id;
      
      await client.query(
        'UPDATE reports SET mode = $1, status = $2 WHERE id = $3',
        [mode || 'hearing', 'draft', reportId]
      );
      
      // 既存のQ&Aとスロットを削除
      await client.query('DELETE FROM report_qa WHERE report_id = $1', [reportId]);
      await client.query('DELETE FROM report_slots WHERE report_id = $1', [reportId]);
    } else {
      // 新規作成
      const reportResult = await client.query(
        'INSERT INTO reports (user_id, report_date, mode, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.userId, reportDate, mode || 'hearing', 'draft']
      );
      reportId = reportResult.rows[0].id;
    }

    // Q&A保存
    if (questions_answers && questions_answers.length > 0) {
      for (let i = 0; i < questions_answers.length; i++) {
        const qa = questions_answers[i];
        await client.query(
          'INSERT INTO report_qa (report_id, question, answer, timestamp, order_index) VALUES ($1, $2, $3, $4, $5)',
          [reportId, qa.question, qa.answer, qa.timestamp, i]
        );
      }
    }

    // スロット情報保存
    if (slots) {
      let cleanedSlots = cleanSlotData(slots);
      
      // 業界が設定されていない場合、全体の会話から推測
      if (!cleanedSlots.industry && questions_answers && questions_answers.length > 0) {
        const allAnswers = questions_answers.map(qa => qa.answer).join(' ');
        const inferredIndustry = inferIndustryFromText(allAnswers);
        if (inferredIndustry) {
          cleanedSlots.industry = inferredIndustry;
        }
      }
      
      await client.query(`
        INSERT INTO report_slots (
          report_id, customer, project, next_action, budget, 
          schedule, participants, location, issues, personal_info, relationship_notes, industry
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        reportId,
        cleanedSlots.customer,
        cleanedSlots.project,
        cleanedSlots.next_action,
        cleanedSlots.budget,
        cleanedSlots.schedule,
        cleanedSlots.participants,
        cleanedSlots.location,
        cleanedSlots.issues,
        cleanedSlots.personal_info,
        cleanedSlots.relationship_notes,
        cleanedSlots.industry
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: reportId,
      message: '日報を作成しました'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create report error:', error);
    res.status(500).json({ error: '日報の作成に失敗しました' });
  } finally {
    client.release();
  }
});

// 日報更新
router.put('/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status, questions_answers, slots } = req.body;

    // 権限チェック
    const checkResult = await client.query(
      'SELECT user_id FROM reports WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '日報が見つかりません' });
    }

    if (checkResult.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'この日報を編集する権限がありません' });
    }

    // ステータス更新
    if (status) {
      await client.query(
        'UPDATE reports SET status = $1 WHERE id = $2',
        [status, id]
      );
    }

    // Q&A更新（既存削除して再作成）
    if (questions_answers) {
      await client.query('DELETE FROM report_qa WHERE report_id = $1', [id]);
      
      for (let i = 0; i < questions_answers.length; i++) {
        const qa = questions_answers[i];
        await client.query(
          'INSERT INTO report_qa (report_id, question, answer, timestamp, order_index) VALUES ($1, $2, $3, $4, $5)',
          [id, qa.question, qa.answer, qa.timestamp, i]
        );
      }
    }

    // スロット情報更新
    if (slots) {
      let cleanedSlots = cleanSlotData(slots);
      
      // 業界が設定されていない場合、全体の会話から推測
      if (!cleanedSlots.industry && questions_answers && questions_answers.length > 0) {
        const allAnswers = questions_answers.map(qa => qa.answer).join(' ');
        const inferredIndustry = inferIndustryFromText(allAnswers);
        if (inferredIndustry) {
          cleanedSlots.industry = inferredIndustry;
        }
      }
      
      await client.query(`
        INSERT INTO report_slots (
          report_id, customer, project, next_action, budget, 
          schedule, participants, location, issues, personal_info, relationship_notes, industry
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (report_id) DO UPDATE SET
          customer = $2, project = $3, next_action = $4, budget = $5,
          schedule = $6, participants = $7, location = $8, issues = $9,
          personal_info = $10, relationship_notes = $11, industry = $12
      `, [
        id,
        cleanedSlots.customer,
        cleanedSlots.project,
        cleanedSlots.next_action,
        cleanedSlots.budget,
        cleanedSlots.schedule,
        cleanedSlots.participants,
        cleanedSlots.location,
        cleanedSlots.issues,
        cleanedSlots.personal_info,
        cleanedSlots.relationship_notes,
        cleanedSlots.industry
      ]);
    }

    await client.query('COMMIT');

    res.json({ message: '日報を更新しました' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update report error:', error);
    res.status(500).json({ error: '日報の更新に失敗しました' });
  } finally {
    client.release();
  }
});

// 日報削除
router.delete('/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // 権限チェック
    const checkResult = await client.query(
      'SELECT user_id FROM reports WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '日報が見つかりません' });
    }

    if (checkResult.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'この日報を削除する権限がありません' });
    }

    // 関連データの削除（CASCADE設定がない場合）
    await client.query('DELETE FROM report_qa WHERE report_id = $1', [id]);
    await client.query('DELETE FROM report_slots WHERE report_id = $1', [id]);
    
    // 日報本体の削除
    await client.query('DELETE FROM reports WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ message: '日報を削除しました' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete report error:', error);
    res.status(500).json({ error: '日報の削除に失敗しました' });
  } finally {
    client.release();
  }
});

module.exports = router;