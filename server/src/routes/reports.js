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
        // [object Object]という文字列が既に入っている場合の処理
        if (value.includes('[object Object]')) {
          console.warn(`Detected [object Object] in ${key}, this should not happen - check client-side processing`);
          // カンマで分割して[object Object]の部分だけ除去
          const parts = value.split(',').map(part => part.trim());
          const cleanedParts = parts.filter(part => !part.includes('[object Object]'));
          if (cleanedParts.length > 0) {
            cleaned[key] = cleanedParts.join(', ');
          } else {
            // すべてが[object Object]の場合はnullに
            cleaned[key] = null;
          }
          return;
        }
        // {}[]"を除去し、制御文字も除去
        let cleanedValue = value.replace(/[{}[\]"]/g, '').replace(/[\x00-\x1F\x7F]/g, '');
        
        // 非常に長いテキストの場合は適切に処理（改行を保持）
        cleanedValue = cleanedValue.trim();
        
        cleaned[key] = cleanedValue;
      } else if (Array.isArray(value)) {
        // 配列の場合は各要素を適切に処理してカンマ区切り文字列に変換
        cleaned[key] = value.map(item => {
          if (typeof item === 'string') {
            return item.replace(/[{}[\]"]/g, '').replace(/[\x00-\x1F\x7F]/g, '').trim();
          } else if (typeof item === 'object' && item !== null) {
            // 課題の場合の特別処理
            if (key === 'issues') {
              if (item.issue) return item.issue;
              if (item.description) return item.description;
              if (item.text) return item.text;
              if (item.content) return item.content;
            }
            // 次のアクションの場合の特別処理
            if (key === 'next_action') {
              if (item.task) {
                const parts = [item.task];
                if (item.responsible) parts.push(`担当: ${item.responsible}`);
                if (item.deadline) parts.push(`期限: ${item.deadline}`);
                return parts.join(' ');
              }
              if (item.action) return item.action;
              if (item.text) return item.text;
              if (item.content) return item.content;
            }
            // スケジュールの場合の特別処理
            if (key === 'schedule') {
              if (item.phase && item.due_date) {
                return `${item.phase}(${item.due_date})`;
              }
            }
            // オブジェクトの場合、nameプロパティやその他の識別可能なプロパティを使用
            if (item.name) return item.name;
            if (item.title) return item.title;
            if (item.label) return item.label;
            if (item.value) return item.value;
            // その他のケースは文字列化
            return Object.values(item).filter(v => v && typeof v === 'string').join(' ');
          }
          return String(item);
        }).filter(item => item && item.trim()).join(', ');
      } else if (typeof value === 'object') {
        // オブジェクトの場合は適切に処理
        if (value.name) {
          cleaned[key] = value.name;
        } else if (value.title) {
          cleaned[key] = value.title;
        } else if (value.label) {
          cleaned[key] = value.label;
        } else if (value.value) {
          cleaned[key] = value.value;
        } else {
          // その他のオブジェクトは、値を結合して文字列化
          const objValues = Object.values(value).filter(v => v && typeof v === 'string');
          cleaned[key] = objValues.join(' ');
        }
      } else {
        cleaned[key] = value;
      }
    } else {
      cleaned[key] = null;
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
        r.daily_sequence,
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

// 今日の日報が存在するかチェック（複数の日報を返す）
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await pool.query(
      'SELECT id, status, daily_sequence FROM reports WHERE user_id = $1 AND report_date = $2 ORDER BY daily_sequence DESC',
      [req.userId, today]
    );
    
    if (result.rows.length > 0) {
      res.json({ 
        exists: true, 
        reports: result.rows,  // 複数の日報を返す
        count: result.rows.length
      });
    } else {
      res.json({ exists: false, reports: [], count: 0 });
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
    console.log('Report creation request body:', JSON.stringify(req.body, null, 2));
    await client.query('BEGIN');

    const { report_date, mode, questions_answers, slots, crm_data } = req.body;
    // If no report_date provided, use current JST date
    const reportDate = report_date || (() => {
      const now = new Date();
      const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      return jstDate.toISOString().split('T')[0];
    })();
    
    console.log('Creating report with date:', reportDate, 'from report_date:', report_date);
    
    // dateがnullでないことを確認
    if (!reportDate) {
      throw new Error('Report date cannot be null');
    }

    // 同じ日付の最大シーケンス番号を取得
    const maxSequenceResult = await client.query(
      'SELECT COALESCE(MAX(daily_sequence), 0) as max_seq FROM reports WHERE user_id = $1 AND report_date = $2',
      [req.userId, reportDate]
    );
    
    const nextSequence = maxSequenceResult.rows[0].max_seq + 1;
    let reportId;
    
    // 常に新規作成（複数日報対応）
    {
      // 新規作成
      console.log('Executing INSERT with params:', {
        user_id: req.userId,
        date: reportDate,
        report_date: reportDate,
        mode: mode || 'hearing',
        status: 'draft'
      });
      
      // パラメータを個別に確認
      const insertParams = [req.userId, reportDate, reportDate, mode || 'hearing', 'draft'];
      console.log('INSERT parameters array:', insertParams);
      console.log('Parameter types:', insertParams.map(p => typeof p));
      
      // 新規日報作成（シーケンス番号付き）
      const reportResult = await client.query(
        `INSERT INTO reports (
          user_id, report_date, mode, status, daily_sequence
        ) VALUES (
          $1, $2, $3, $4, $5
        ) RETURNING *`,
        [req.userId, reportDate, mode || 'hearing', 'draft', nextSequence]
      );
      reportId = reportResult.rows[0].id;
      console.log('INSERT successful, reportId:', reportId, ', sequence:', nextSequence);
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
      
      // CRMデータが存在する場合、基本情報を自動的に埋める
      if (crm_data) {
        // Dynamics365またはSalesforceのデータから基本情報を抽出
        if (!cleanedSlots.customer && slots.customer) {
          cleanedSlots.customer = slots.customer;
        }
        if (!cleanedSlots.project && slots.project) {
          cleanedSlots.project = slots.project;
        }
        if (!cleanedSlots.participants && slots.participants) {
          cleanedSlots.participants = slots.participants;
        }
        
        // CRM IDも保存
        if (slots.dynamics365_account_id) {
          cleanedSlots.dynamics365_account_id = slots.dynamics365_account_id;
        }
        if (slots.dynamics365_opportunity_id) {
          cleanedSlots.dynamics365_opportunity_id = slots.dynamics365_opportunity_id;
        }
        if (slots.salesforce_account_id) {
          cleanedSlots.salesforce_account_id = slots.salesforce_account_id;
        }
        if (slots.salesforce_opportunity_id) {
          cleanedSlots.salesforce_opportunity_id = slots.salesforce_opportunity_id;
        }
      }
      
      // 業界が設定されていない場合、全体の会話から推測
      if (!cleanedSlots.industry && questions_answers && questions_answers.length > 0) {
        const allAnswers = questions_answers.map(qa => qa.answer).join(' ');
        const inferredIndustry = inferIndustryFromText(allAnswers);
        if (inferredIndustry) {
          cleanedSlots.industry = inferredIndustry;
        }
      }
      
      try {
        await client.query(`
          INSERT INTO report_slots (
            report_id, customer, project, next_action, budget, 
            schedule, participants, location, issues, personal_info, relationship_notes, industry,
            dynamics365_account_id, dynamics365_opportunity_id, salesforce_account_id, salesforce_opportunity_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
          cleanedSlots.industry,
          cleanedSlots.dynamics365_account_id || null,
          cleanedSlots.dynamics365_opportunity_id || null,
          cleanedSlots.salesforce_account_id || null,
          cleanedSlots.salesforce_opportunity_id || null
        ]);
      } catch (slotError) {
        console.error('Error inserting slot data:', slotError);
        console.error('Slot data lengths:', {
          customer: cleanedSlots.customer?.length || 0,
          project: cleanedSlots.project?.length || 0,
          next_action: cleanedSlots.next_action?.length || 0,
          budget: cleanedSlots.budget?.length || 0,
          schedule: cleanedSlots.schedule?.length || 0,
          participants: cleanedSlots.participants?.length || 0,
          location: cleanedSlots.location?.length || 0,
          issues: cleanedSlots.issues?.length || 0,
          personal_info: cleanedSlots.personal_info?.length || 0,
          relationship_notes: cleanedSlots.relationship_notes?.length || 0,
          industry: cleanedSlots.industry?.length || 0
        });
        throw slotError;
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: reportId,
      message: '日報を作成しました'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create report error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error detail:', error.detail);
    console.error('Request body was:', req.body);
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
      
      // 既存のCRMデータを取得して保持
      const existingSlots = await client.query(
        'SELECT dynamics365_account_id, dynamics365_opportunity_id, salesforce_account_id, salesforce_opportunity_id FROM report_slots WHERE report_id = $1',
        [id]
      );
      
      // 既存のCRM IDを保持（新しい値がない場合）
      if (existingSlots.rows.length > 0) {
        const existing = existingSlots.rows[0];
        cleanedSlots.dynamics365_account_id = cleanedSlots.dynamics365_account_id || existing.dynamics365_account_id;
        cleanedSlots.dynamics365_opportunity_id = cleanedSlots.dynamics365_opportunity_id || existing.dynamics365_opportunity_id;
        cleanedSlots.salesforce_account_id = cleanedSlots.salesforce_account_id || existing.salesforce_account_id;
        cleanedSlots.salesforce_opportunity_id = cleanedSlots.salesforce_opportunity_id || existing.salesforce_opportunity_id;
      }
      
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
          schedule, participants, location, issues, personal_info, relationship_notes, industry,
          dynamics365_account_id, dynamics365_opportunity_id, salesforce_account_id, salesforce_opportunity_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (report_id) DO UPDATE SET
          customer = $2, project = $3, next_action = $4, budget = $5,
          schedule = $6, participants = $7, location = $8, issues = $9,
          personal_info = $10, relationship_notes = $11, industry = $12,
          dynamics365_account_id = $13, dynamics365_opportunity_id = $14,
          salesforce_account_id = $15, salesforce_opportunity_id = $16
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
        cleanedSlots.industry,
        cleanedSlots.dynamics365_account_id || null,
        cleanedSlots.dynamics365_opportunity_id || null,
        cleanedSlots.salesforce_account_id || null,
        cleanedSlots.salesforce_opportunity_id || null
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

// 日報のステータスを更新
router.put('/:id/status', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;
    
    // ステータスの妥当性チェック
    if (!['draft', 'completed'].includes(status)) {
      return res.status(400).json({ error: '無効なステータスです' });
    }
    
    // 日報の所有者確認
    const reportResult = await client.query(
      'SELECT user_id, status FROM reports WHERE id = $1',
      [id]
    );
    
    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: '日報が見つかりません' });
    }
    
    const report = reportResult.rows[0];
    
    // 所有者またはマネージャーのみ変更可能
    if (report.user_id !== userId) {
      // マネージャー権限チェック
      const managerCheck = await client.query(
        'SELECT 1 FROM users WHERE id = $1 AND manager_id = $2',
        [report.user_id, userId]
      );
      
      if (managerCheck.rows.length === 0) {
        return res.status(403).json({ error: '権限がありません' });
      }
    }
    
    // ステータスを更新
    await client.query(
      'UPDATE reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
    
    res.json({ 
      success: true, 
      message: `日報を${status === 'draft' ? '下書き' : '完了'}に変更しました` 
    });
    
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({ error: 'ステータスの更新に失敗しました' });
  } finally {
    client.release();
  }
});

module.exports = router;