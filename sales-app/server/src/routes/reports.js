const express = require('express');
const { authMiddleware, managerOnly } = require('../middleware/auth');
const pool = require('../db/pool');
const { generateSuggestions } = require('../services/suggestionGenerator');
const { searchCompanyInfo } = require('../services/bingSearch');

const router = express.Router();

/**
 * 日報完了時に会社タグのWeb情報を自動取得
 * @param {number} reportId - 日報ID
 */
async function autoFetchCompanyWebInfo(reportId) {
  try {
    console.log('[Auto Fetch] Starting web info fetch for report:', reportId);

    // 日報に紐付く会社タグを取得（categoryが'company'のもの）
    const tagsResult = await pool.query(`
      SELECT DISTINCT t.id, t.name, twi.last_fetched_at
      FROM report_tags rt
      INNER JOIN tags t ON rt.tag_id = t.id
      LEFT JOIN tag_web_info twi ON t.id = twi.tag_id
      WHERE rt.report_id = $1 AND t.category = 'company'
    `, [reportId]);

    const companyTags = tagsResult.rows;

    if (companyTags.length === 0) {
      console.log('[Auto Fetch] No company tags found for report:', reportId);
      return;
    }

    console.log('[Auto Fetch] Found', companyTags.length, 'company tags');

    // 各会社タグについて、Web情報が古いか存在しない場合は取得
    for (const tag of companyTags) {
      const daysSinceLastFetch = tag.last_fetched_at
        ? (Date.now() - new Date(tag.last_fetched_at).getTime()) / (1000 * 60 * 60 * 24)
        : 999;

      // 7日以上経過している、または未取得の場合に取得
      if (daysSinceLastFetch > 7) {
        console.log('[Auto Fetch] Fetching web info for tag:', tag.name);

        // 非同期で取得（エラーが起きても処理は継続）
        searchCompanyInfo(tag.name)
          .then(searchResult => {
            if (searchResult.success) {
              // データベースに保存（upsert）
              return pool.query(`
                INSERT INTO tag_web_info (
                  tag_id,
                  company_info,
                  latest_news,
                  related_people,
                  last_fetched_at
                ) VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (tag_id)
                DO UPDATE SET
                  company_info = EXCLUDED.company_info,
                  latest_news = EXCLUDED.latest_news,
                  related_people = EXCLUDED.related_people,
                  last_fetched_at = NOW(),
                  updated_at = NOW()
              `, [
                tag.id,
                JSON.stringify(searchResult.company_info || {}),
                JSON.stringify(searchResult.latest_news || []),
                JSON.stringify(searchResult.related_people || [])
              ]);
            }
          })
          .then(() => {
            console.log('[Auto Fetch] Successfully saved web info for tag:', tag.name);
          })
          .catch(error => {
            console.error('[Auto Fetch] Failed to fetch/save web info for tag:', tag.name, error.message);
          });

        // レート制限対策で少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log('[Auto Fetch] Skipping tag (recently fetched):', tag.name);
      }
    }

    console.log('[Auto Fetch] Completed web info fetch for report:', reportId);

  } catch (error) {
    console.error('[Auto Fetch] Error in autoFetchCompanyWebInfo:', error);
  }
}

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: 日報一覧を取得
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 日付でフィルタリング
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *         description: 顧客名で検索
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: 案件名で検索
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 取得件数の上限
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 取得開始位置
 *     responses:
 *       200:
 *         description: 日報一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Report'
 */

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: 日報を作成
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - report_date
 *               - customer
 *               - project
 *             properties:
 *               report_date:
 *                 type: string
 *                 format: date
 *               customer:
 *                 type: string
 *               project:
 *                 type: string
 *               next_action:
 *                 type: string
 *               budget:
 *                 type: string
 *               schedule:
 *                 type: string
 *               participants:
 *                 type: string
 *               location:
 *                 type: string
 *               issues:
 *                 type: string
 *               customer_sentiment:
 *                 type: string
 *               probability:
 *                 type: string
 *               sales_amount:
 *                 type: string
 *     responses:
 *       201:
 *         description: 作成された日報
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 */

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: 特定の日報を取得
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 日報ID
 *     responses:
 *       200:
 *         description: 日報情報
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       404:
 *         description: 日報が見つかりません
 */

/**
 * @swagger
 * /api/reports/{id}:
 *   put:
 *     summary: 日報を更新
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 日報ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Report'
 *     responses:
 *       200:
 *         description: 更新された日報
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 */

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: 日報を削除
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 日報ID
 *     responses:
 *       200:
 *         description: 削除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/reports/team:
 *   get:
 *     summary: チームの日報一覧を取得
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     description: マネージャーが部下の日報を閲覧するためのAPI
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: 特定のユーザーIDでフィルタリング
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 日付でフィルタリング
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 取得件数の上限
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 取得開始位置
 *     responses:
 *       200:
 *         description: チームの日報一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Report'
 *       403:
 *         description: 権限がありません
 */

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

    // 各レポートのタグを取得
    if (processedRows.length > 0) {
      const reportIds = processedRows.map(r => r.id);
      const tagsResult = await pool.query(
        `SELECT rt.report_id, t.id, t.name, t.category, t.color
         FROM report_tags rt
         INNER JOIN tags t ON rt.tag_id = t.id
         WHERE rt.report_id = ANY($1)
         ORDER BY t.category, t.name`,
        [reportIds]
      );

      // レポートIDごとにタグをグループ化
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

      // 各レポートにタグを追加
      processedRows.forEach(report => {
        report.tags = tagsByReportId[report.id] || [];
      });
    }

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

    // 各レポートのタグを取得
    if (processedRows.length > 0) {
      const reportIds = processedRows.map(r => r.id);
      const tagsResult = await pool.query(
        `SELECT rt.report_id, t.id, t.name, t.category, t.color
         FROM report_tags rt
         INNER JOIN tags t ON rt.tag_id = t.id
         WHERE rt.report_id = ANY($1)
         ORDER BY t.category, t.name`,
        [reportIds]
      );

      // レポートIDごとにタグをグループ化
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

      // 各レポートにタグを追加
      processedRows.forEach(report => {
        report.tags = tagsByReportId[report.id] || [];
      });
    }

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

    // タグ情報取得
    const tagsResult = await pool.query(
      `SELECT t.id, t.name, t.category, t.color
       FROM report_tags rt
       INNER JOIN tags t ON rt.tag_id = t.id
       WHERE rt.report_id = $1
       ORDER BY t.category, t.name`,
      [id]
    );

    const tags = tagsResult.rows;

    res.json({
      ...report,
      questions_answers: qaResult.rows,
      slots,
      tags
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

    // タグの自動抽出と登録（全モード対応：voice, text, meeting, realtime）
    // 質問回答またはスロットデータがあれば実行
    if (questions_answers || slots) {
      try {
        const { extractTagsFromReport } = require('../services/tagExtractor');
        const { getOrCreateTag } = require('./tags');

        console.log(`Starting tag extraction for report ${reportId}, mode: ${mode || 'hearing'}`);

        const tags = await extractTagsFromReport({
          questions_answers,
          slots,
          mode: mode || 'hearing'  // モード情報も渡す
        });

        console.log(`Auto-extracted ${tags.length} tags for report ${reportId} (mode: ${mode || 'hearing'})`);

        // タグを登録
        for (const tag of tags) {
          try {
            const tagId = await getOrCreateTag(tag.name, tag.category, null, client);
            await client.query(
              `INSERT INTO report_tags (report_id, tag_id, auto_generated, confidence)
               VALUES ($1, $2, true, $3)
               ON CONFLICT (report_id, tag_id) DO NOTHING`,
              [reportId, tagId, tag.confidence || 0.8]
            );
          } catch (tagErr) {
            console.error(`Error adding tag ${tag.name}:`, tagErr.message);
          }
        }
      } catch (extractErr) {
        console.error('Error extracting tags:', extractErr.message);
        // タグ抽出のエラーは無視（日報作成自体は成功させる）
      }
    }

    // AI提案の自動生成
    try {
      const { generateSuggestions } = require('../services/suggestionGenerator');
      console.log(`Generating AI suggestions for report ${reportId}`);

      const suggestions = await generateSuggestions(reportId);

      await client.query(
        'UPDATE reports SET ai_suggestions = $1 WHERE id = $2',
        [JSON.stringify(suggestions), reportId]
      );

      console.log(`AI suggestions generated successfully for report ${reportId}`);
    } catch (suggestErr) {
      console.error('Error generating AI suggestions:', suggestErr.message);
      // AI提案のエラーは無視（日報作成自体は成功させる）
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

    // 完了状態になった場合、AI提案を自動生成（非同期）
    if (status === 'completed') {
      console.log('[AI Suggestions] Auto-generating suggestions for report:', id);
      generateSuggestions(id)
        .then(suggestions => {
          pool.query(
            'UPDATE reports SET ai_suggestions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(suggestions), id]
          );
          console.log('[AI Suggestions] Auto-generated successfully for report:', id);
        })
        .catch(error => {
          console.error('[AI Suggestions] Auto-generation failed for report:', id, error);
        });

      // 会社タグのWeb情報を自動取得（非同期）
      autoFetchCompanyWebInfo(id)
        .catch(error => {
          console.error('[Auto Fetch] Failed for report:', id, error);
        });
    }

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

    // 完了状態になった場合、AI提案を自動生成（非同期）
    if (status === 'completed') {
      console.log('[AI Suggestions] Auto-generating suggestions for report:', id);
      generateSuggestions(id)
        .then(suggestions => {
          pool.query(
            'UPDATE reports SET ai_suggestions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(suggestions), id]
          );
          console.log('[AI Suggestions] Auto-generated successfully for report:', id);
        })
        .catch(error => {
          console.error('[AI Suggestions] Auto-generation failed for report:', id, error);
        });

      // 会社タグのWeb情報を自動取得（非同期）
      autoFetchCompanyWebInfo(id)
        .catch(error => {
          console.error('[Auto Fetch] Failed for report:', id, error);
        });
    }

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

// 日報にタグを追加
router.post('/:reportId/tags', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { reportId } = req.params;
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({ success: false, message: 'タグIDが必要です' });
    }

    // 日報の所有者確認
    const reportCheck = await client.query(
      'SELECT user_id FROM reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: '日報が見つかりません' });
    }

    if (reportCheck.rows[0].user_id !== req.userId) {
      return res.status(403).json({ success: false, message: '権限がありません' });
    }

    // タグが存在するか確認
    const tagCheck = await client.query(
      'SELECT id FROM tags WHERE id = $1',
      [tagId]
    );

    if (tagCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'タグが見つかりません' });
    }

    // 既に追加済みか確認
    const existingCheck = await client.query(
      'SELECT id FROM report_tags WHERE report_id = $1 AND tag_id = $2',
      [reportId, tagId]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'このタグは既に追加されています' });
    }

    // タグを追加
    await client.query(
      'INSERT INTO report_tags (report_id, tag_id) VALUES ($1, $2)',
      [reportId, tagId]
    );

    // タグの使用回数を更新
    await client.query(
      'UPDATE tags SET usage_count = usage_count + 1 WHERE id = $1',
      [tagId]
    );

    // 追加したタグの情報を取得
    const tagResult = await client.query(
      'SELECT * FROM tags WHERE id = $1',
      [tagId]
    );

    res.json({
      success: true,
      message: 'タグを追加しました',
      tag: tagResult.rows[0]
    });

  } catch (error) {
    console.error('Add tag to report error:', error);
    res.status(500).json({ success: false, message: 'タグの追加に失敗しました' });
  } finally {
    client.release();
  }
});

// 日報からタグを削除
router.delete('/:reportId/tags/:tagId', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { reportId, tagId } = req.params;

    // 日報の所有者確認
    const reportCheck = await client.query(
      'SELECT user_id FROM reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: '日報が見つかりません' });
    }

    if (reportCheck.rows[0].user_id !== req.userId) {
      return res.status(403).json({ success: false, message: '権限がありません' });
    }

    // タグが日報に紐づいているか確認
    const existingCheck = await client.query(
      'SELECT id FROM report_tags WHERE report_id = $1 AND tag_id = $2',
      [reportId, tagId]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'このタグは日報に紐づいていません' });
    }

    // タグを削除
    await client.query(
      'DELETE FROM report_tags WHERE report_id = $1 AND tag_id = $2',
      [reportId, tagId]
    );

    // タグの使用回数を更新（0以下にならないように）
    await client.query(
      'UPDATE tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = $1',
      [tagId]
    );

    res.json({
      success: true,
      message: 'タグを削除しました'
    });

  } catch (error) {
    console.error('Remove tag from report error:', error);
    res.status(500).json({ success: false, message: 'タグの削除に失敗しました' });
  } finally {
    client.release();
  }
});

// AI提案を生成
router.post('/:reportId/generate-suggestions', authMiddleware, async (req, res) => {
  const { generateSuggestions } = require('../services/suggestionGenerator');

  try {
    const { reportId } = req.params;

    // 日報の所有者確認 + マネージャー権限確認
    const reportCheck = await pool.query(
      `SELECT r.user_id, u.manager_id
       FROM reports r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: '日報が見つかりません' });
    }

    const reportOwnerId = reportCheck.rows[0].user_id;
    const reportOwnerManagerId = reportCheck.rows[0].manager_id;

    // 日報の所有者、またはその上司のみがAI提案を生成できる
    if (reportOwnerId !== req.userId && reportOwnerManagerId !== req.userId) {
      return res.status(403).json({ success: false, message: '権限がありません' });
    }

    // AI提案を生成
    console.log('Generating AI suggestions for report:', reportId);
    const suggestions = await generateSuggestions(reportId);

    // データベースに保存
    await pool.query(
      'UPDATE reports SET ai_suggestions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(suggestions), reportId]
    );

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'AI提案の生成に失敗しました',
      error: error.message
    });
  }
});

module.exports = router;