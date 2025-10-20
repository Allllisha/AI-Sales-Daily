const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware: requireAuth } = require('../middleware/auth');

// ヒアリング設定一覧取得
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    
    const query = `
      SELECT 
        id, name, description, greeting, input_mode, max_questions, 
        time_per_question, question_template, custom_questions,
        required_slots, optional_slots, enable_follow_up, 
        follow_up_threshold, enable_smart_skip, usage_count,
        last_used_at, is_default, created_at, updated_at
      FROM hearing_settings
      WHERE user_id = $1
      ORDER BY is_default DESC, last_used_at DESC NULLS LAST
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching hearing settings:', error);
    res.status(500).json({ error: 'ヒアリング設定の取得に失敗しました' });
  }
});

// デフォルト設定取得
router.get('/default', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    
    const query = `
      SELECT * FROM hearing_settings
      WHERE user_id = $1 AND is_default = true
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      // デフォルト設定がない場合は、標準設定を返す
      return res.json({
        greeting: 'お疲れ様です！今日はどんな一日でしたか？',
        input_mode: 'voice',
        max_questions: 5,
        question_template: 'default',
        custom_questions: [],
        required_slots: ['customer', 'project', 'next_action'],
        optional_slots: ['budget', 'schedule', 'participants', 'location', 'issues'],
        enable_follow_up: true,
        follow_up_threshold: 0.7,
        enable_smart_skip: true
      });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching default hearing setting:', error);
    res.status(500).json({ error: 'デフォルト設定の取得に失敗しました' });
  }
});

// 特定のヒアリング設定取得
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const query = `
      SELECT * FROM hearing_settings
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ヒアリング設定が見つかりません' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching hearing setting:', error);
    res.status(500).json({ error: 'ヒアリング設定の取得に失敗しました' });
  }
});

// ヒアリング設定作成（上書き保存）
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      description,
      greeting,
      input_mode,
      max_questions,
      time_per_question,
      question_template,
      custom_questions,
      required_slots,
      optional_slots,
      enable_follow_up,
      follow_up_threshold,
      enable_smart_skip,
      is_default
    } = req.body;
    
    // バリデーション
    if (!name) {
      return res.status(400).json({ error: '設定名は必須です' });
    }
    
    if (custom_questions && !Array.isArray(custom_questions)) {
      return res.status(400).json({ error: '質問リストが不正です' });
    }
    
    if (custom_questions && custom_questions.some(q => !q.text || !q.text.trim())) {
      return res.status(400).json({ error: '空の質問があります' });
    }
    
    // デフォルト以外の既存設定を確認（1つのカスタム設定のみ許可）
    const checkQuery = `
      SELECT id FROM hearing_settings 
      WHERE user_id = $1 AND is_default = false
      LIMIT 1
    `;
    const existingResult = await pool.query(checkQuery, [userId]);
    
    if (existingResult.rows.length > 0) {
      // 既存のカスタム設定を上書き
      const updateQuery = `
        UPDATE hearing_settings SET
          name = $2,
          description = $3,
          greeting = $4,
          input_mode = $5,
          max_questions = $6,
          time_per_question = $7,
          question_template = $8,
          custom_questions = $9,
          required_slots = $10,
          optional_slots = $11,
          enable_follow_up = $12,
          follow_up_threshold = $13,
          enable_smart_skip = $14,
          updated_at = NOW()
        WHERE id = $1 AND user_id = $15
        RETURNING *
      `;
      
      const updateValues = [
        existingResult.rows[0].id,
        name,
        description || null,
        greeting || 'お疲れ様です！今日はどんな一日でしたか？',
        input_mode || 'voice',
        max_questions || 5,
        30,
        question_template || 'default',
        JSON.stringify(custom_questions || []),
        required_slots || ['customer', 'project', 'next_action'], // PostgreSQL配列型として直接渡す
        optional_slots || [], // PostgreSQL配列型として直接渡す
        enable_follow_up !== false,
        follow_up_threshold || 0.7,
        enable_smart_skip !== false,
        userId
      ];
      
      const result = await pool.query(updateQuery, updateValues);
      return res.json(result.rows[0]);
    }
    
    // 新規作成（カスタム設定が存在しない場合のみ）
    const insertQuery = `
      INSERT INTO hearing_settings (
        user_id, name, description, greeting, input_mode,
        max_questions, time_per_question, question_template,
        custom_questions, required_slots, optional_slots,
        enable_follow_up, follow_up_threshold, enable_smart_skip,
        is_default
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *
    `;
    
    const values = [
      userId,
      name,
      description || null,
      greeting || 'お疲れ様です！今日はどんな一日でしたか？',
      input_mode || 'voice',
      max_questions || 5,
      30, // time_per_question - デフォルト値のみ
      question_template || 'default',
      JSON.stringify(custom_questions || []),
      required_slots || ['customer', 'project', 'next_action'], // PostgreSQL配列型として直接渡す
      optional_slots || [], // PostgreSQL配列型として直接渡す
      enable_follow_up !== false,
      follow_up_threshold || 0.7,
      enable_smart_skip !== false,
      false // Never allow is_default for custom settings
    ];
    
    const result = await pool.query(insertQuery, values);
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Error creating hearing setting:', error);
    res.status(500).json({ error: 'ヒアリング設定の作成に失敗しました' });
  }
});

// ヒアリング設定更新
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;
    
    // 存在確認
    const checkQuery = 'SELECT id FROM hearing_settings WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'ヒアリング設定が見つかりません' });
    }
    
    // 動的にUPDATEクエリを構築
    const updateFields = [];
    const values = [];
    let valueIndex = 1;
    
    const allowedFields = [
      'name', 'description', 'greeting', 'input_mode',
      'max_questions', 'time_per_question', 'question_template',
      'custom_questions', 'required_slots', 'optional_slots',
      'enable_follow_up', 'follow_up_threshold', 'enable_smart_skip',
      'is_default'
    ];
    
    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = $${valueIndex}`);
        if (field === 'custom_questions' && typeof updates[field] === 'object') {
          values.push(JSON.stringify(updates[field]));
        } else {
          values.push(updates[field]);
        }
        valueIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: '更新するフィールドがありません' });
    }
    
    values.push(id, userId);
    
    const updateQuery = `
      UPDATE hearing_settings
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex} AND user_id = $${valueIndex + 1}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating hearing setting:', error);
    res.status(500).json({ error: 'ヒアリング設定の更新に失敗しました' });
  }
});

// ヒアリング設定削除
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const deleteQuery = `
      DELETE FROM hearing_settings
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await pool.query(deleteQuery, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ヒアリング設定が見つかりません' });
    }
    
    res.json({ message: 'ヒアリング設定を削除しました', id: result.rows[0].id });
    
  } catch (error) {
    console.error('Error deleting hearing setting:', error);
    res.status(500).json({ error: 'ヒアリング設定の削除に失敗しました' });
  }
});

// ヒアリングセッション記録
router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      setting_id,
      report_id,
      session_start,
      session_end,
      session_duration,
      qa_history,
      collected_slots,
      missing_slots,
      completion_rate,
      user_satisfaction
    } = req.body;
    
    const insertQuery = `
      INSERT INTO hearing_sessions (
        user_id, setting_id, report_id, session_start, session_end,
        session_duration, qa_history, collected_slots, missing_slots,
        completion_rate, user_satisfaction
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
    `;
    
    const values = [
      userId,
      setting_id || null,
      report_id || null,
      session_start || new Date(),
      session_end || null,
      session_duration || null,
      JSON.stringify(qa_history || []),
      JSON.stringify(collected_slots || {}),
      missing_slots || [],
      completion_rate || null,
      user_satisfaction || null
    ];
    
    const result = await pool.query(insertQuery, values);
    
    // 設定の使用回数と最終使用日時を更新
    if (setting_id) {
      await pool.query(
        'UPDATE hearing_settings SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [setting_id]
      );
    }
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Error creating hearing session:', error);
    res.status(500).json({ error: 'ヒアリングセッションの記録に失敗しました' });
  }
});

// セッション履歴取得
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 10, offset = 0 } = req.query;
    
    const query = `
      SELECT 
        hs.*,
        hset.name as setting_name,
        r.report_date
      FROM hearing_sessions hs
      LEFT JOIN hearing_settings hset ON hs.setting_id = hset.id
      LEFT JOIN reports r ON hs.report_id = r.id
      WHERE hs.user_id = $1
      ORDER BY hs.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching hearing sessions:', error);
    res.status(500).json({ error: 'ヒアリング履歴の取得に失敗しました' });
  }
});

module.exports = router;