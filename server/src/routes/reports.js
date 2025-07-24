const express = require('express');
const { authMiddleware, managerOnly } = require('../middleware/auth');
const pool = require('../db/pool');

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
    
    // 各行のスロットデータの配列フィールドを適切に処理
    const processedRows = result.rows.map(row => {
      ['participants', 'issues', 'next_action', 'project', 'personal_info', 'relationship_notes'].forEach(field => {
        if (row[field]) {
          // PostgreSQL配列が文字列として返される場合の処理
          if (typeof row[field] === 'string' && row[field].startsWith('{')) {
            // PostgreSQL配列形式 "{item1,item2}" を配列に変換
            row[field] = row[field]
              .replace(/^\{|\}$/g, '') // 前後の{}を削除
              .split(',') // カンマで分割
              .map(item => item.trim().replace(/^"|"$/g, '')); // 前後の引用符を削除
          }
        }
      });
      return row;
    });
    
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

    // データを処理してPostgreSQLのセット記法を適切に変換
    const processedRows = result.rows.map(row => {
      const processedRow = { ...row };
      
      // 配列フィールドの処理
      ['customer', 'project'].forEach(field => {
        if (processedRow[field]) {
          if (typeof processedRow[field] === 'string') {
            // PostgreSQLのセット記法 {item1,item2} を配列に変換
            if (processedRow[field].startsWith('{') && processedRow[field].endsWith('}')) {
              try {
                const arrayStr = processedRow[field].replace(/^{/, '[').replace(/}$/, ']');
                const parsed = JSON.parse(arrayStr);
                processedRow[field] = Array.isArray(parsed) ? parsed[0] : parsed;
              } catch (e) {
                // パースに失敗した場合は元の文字列から{}を除去
                processedRow[field] = processedRow[field].replace(/[{}]/g, '');
              }
            }
          }
        }
      });
      
      return processedRow;
    });

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

    // スロットデータの配列フィールドを適切に処理
    const slots = slotsResult.rows[0] || {};
    if (slots) {
      // PostgreSQL配列データを適切なJavaScript配列に変換
      ['participants', 'issues', 'next_action', 'project', 'personal_info', 'relationship_notes'].forEach(field => {
        if (slots[field]) {
          // PostgreSQL配列が文字列として返される場合の処理
          if (typeof slots[field] === 'string' && slots[field].startsWith('{')) {
            // PostgreSQL配列形式 "{item1,item2}" を配列に変換
            slots[field] = slots[field]
              .replace(/^\{|\}$/g, '') // 前後の{}を削除
              .split(',') // カンマで分割
              .map(item => item.trim().replace(/^"|"$/g, '')); // 前後の引用符を削除
          }
        }
      });
    }

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
    const reportDate = report_date || new Date();

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
      await client.query(`
        INSERT INTO report_slots (
          report_id, customer, project, next_action, budget, 
          schedule, participants, location, issues, personal_info, relationship_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        reportId,
        slots.customer,
        slots.project,
        slots.next_action,
        slots.budget,
        slots.schedule,
        slots.participants,
        slots.location,
        slots.issues,
        slots.personal_info,
        slots.relationship_notes
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
      await client.query(`
        INSERT INTO report_slots (
          report_id, customer, project, next_action, budget, 
          schedule, participants, location, issues, personal_info, relationship_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (report_id) DO UPDATE SET
          customer = $2, project = $3, next_action = $4, budget = $5,
          schedule = $6, participants = $7, location = $8, issues = $9,
          personal_info = $10, relationship_notes = $11
      `, [
        id,
        slots.customer,
        slots.project,
        slots.next_action,
        slots.budget,
        slots.schedule,
        slots.participants,
        slots.location,
        slots.issues,
        slots.personal_info,
        slots.relationship_notes
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