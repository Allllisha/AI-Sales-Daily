const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { chat, summarize, assessRisk, extractTags, analyzeAndExtractKnowledge, correctSpeech, generateSessionTitle } = require('../services/openai');
const { semanticSearch } = require('../services/searchService');
const realtimeAI = require('../services/realtimeAI');

const router = express.Router();

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: AIチャット（事務作業モード）
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/chat', authMiddleware, [
  body('message').notEmpty().trim(),
  body('mode').optional().isIn(['office', 'field']),
  body('work_type').optional().trim(),
  body('session_id').optional().isInt(),
  body('conversation_history').optional().isArray(),
  body('system_hint').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, mode, work_type, session_id, conversation_history, system_hint } = req.body;

    const isFirstMessage = !conversation_history || conversation_history.filter(m => m.role === 'user').length === 0;

    // 日本語テキストからキーワードを抽出（音声入力の長文対応）
    const extractKeywords = (text) => {
      return text
        .split(/[\s　。、！？]+/)
        .flatMap(part => part.split(/[のをはがでにとかもけどですますったんだよねへており]+/))
        .filter(p => p.length >= 2 && p.length <= 15)
        .slice(0, 6);
    };

    // Search for related knowledge, incidents, and checklists
    let relatedKnowledge = '';
    let relatedIncidents = '';
    let relatedChecklists = '';
    let knowledgeIds = [];

    try {
      // Semantic search for knowledge
      const { results: knowledgeResults } = await semanticSearch(message, {
        top: isFirstMessage ? 5 : 3,
        filter: work_type ? `work_type eq '${work_type}'` : undefined
      });

      if (knowledgeResults.length > 0) {
        relatedKnowledge = knowledgeResults
          .map(k => `【${k.title}】(ナレッジID: ${k.id})\n${k.content.substring(0, 300)}`)
          .join('\n\n');
        knowledgeIds = knowledgeResults.map(k => ({ id: k.id, title: k.title }));
      } else {
        // Fallback to DB keyword search
        const keywords = extractKeywords(message);
        if (keywords.length > 0) {
          const conditions = keywords.map((_, i) =>
            `(title ILIKE $${i + 1} OR content ILIKE $${i + 1})`
          ).join(' OR ');
          const params = keywords.map(kw => `%${kw}%`);
          params.push(req.userId);
          const userIdParam = params.length;

          const dbKnowledge = await pool.query(
            `SELECT id, title, content, summary,
                    CASE WHEN EXISTS (
                      SELECT 1 FROM usage_logs ul
                      WHERE ul.knowledge_id = knowledge_items.id AND ul.user_id = $${userIdParam} AND ul.action_type = 'useful_mark'
                    ) THEN true ELSE false END as marked_useful_by_me
             FROM knowledge_items
             WHERE status = 'published'
             AND (${conditions})
             ${work_type ? "AND work_type = '" + work_type + "'" : ''}
             ORDER BY marked_useful_by_me DESC, useful_count DESC LIMIT 3`,
            params
          );
          if (dbKnowledge.rows.length > 0) {
            relatedKnowledge = dbKnowledge.rows
              .map(k => `【${k.title}】(ナレッジID: ${k.id})\n${(k.summary || k.content).substring(0, 300)}`)
              .join('\n\n');
            knowledgeIds = dbKnowledge.rows.map(k => ({ id: String(k.id), title: k.title }));
          }
        }
      }

      // Search for related incidents (keyword-based)
      const incidentKeywords = extractKeywords(message).slice(0, 3);
      if (incidentKeywords.length > 0) {
        const incidentConditions = incidentKeywords.map((_, i) =>
          `(title ILIKE $${i + 1} OR description ILIKE $${i + 1})`
        ).join(' OR ');
        const incidentParams = incidentKeywords.map(kw => `%${kw}%`);

        const dbIncidents = await pool.query(
          `SELECT title, description, severity, countermeasure FROM incident_cases
           WHERE (${incidentConditions})
           ${work_type ? "AND work_type = '" + work_type + "'" : ''}
           ORDER BY severity DESC LIMIT ${isFirstMessage ? 4 : 2}`,
          incidentParams
        );
        if (dbIncidents.rows.length > 0) {
          relatedIncidents = dbIncidents.rows
            .map(i => `【${i.title}】(${i.severity})\n${i.description.substring(0, 200)}\n対策: ${(i.countermeasure || '').substring(0, 150)}`)
            .join('\n\n');
        }
      }

      // Search for related checklists
      const checklistKeywords = extractKeywords(message).slice(0, 3);
      if (checklistKeywords.length > 0) {
        const checklistParams = checklistKeywords.map(kw => `%${kw}%`);
        let nextParamIdx = checklistParams.length + 1;

        const checklistConditions = checklistKeywords.map((_, i) =>
          `(name ILIKE $${i + 1} OR description ILIKE $${i + 1} OR work_type ILIKE $${i + 1})`
        ).join(' OR ');

        let workTypeFilter = '';
        if (work_type) {
          workTypeFilter = `AND work_type ILIKE $${nextParamIdx}`;
          checklistParams.push(`%${work_type}%`);
        }

        const dbChecklists = await pool.query(
          `SELECT id, name, description, work_type FROM checklists
           WHERE (${checklistConditions})
           ${workTypeFilter}
           LIMIT ${isFirstMessage ? 5 : 3}`,
          checklistParams
        );
        if (dbChecklists.rows.length > 0) {
          relatedChecklists = dbChecklists.rows
            .map(c => `【${c.name}】(チェックリストID: ${c.id}, 工種: ${c.work_type || '未設定'})\n${(c.description || '').substring(0, 200)}`)
            .join('\n\n');
        }
      }
    } catch (searchError) {
      console.error('Knowledge search error:', searchError.message);
    }

    // Generate AI response
    let effectiveHint = system_hint || '';
    if (isFirstMessage) {
      const proactiveHint = 'ユーザーが作業内容を伝えました。関連するナレッジ・類災事例・チェックリストを積極的に紹介してください。安全上の注意点や過去のトラブル事例がある場合は必ず言及してください。';
      effectiveHint = effectiveHint ? `${effectiveHint}\n${proactiveHint}` : proactiveHint;
    }
    const aiMessage = effectiveHint ? `${message}\n（${effectiveHint}）` : message;
    let aiResponse = await chat(aiMessage, {
      relatedKnowledge,
      relatedIncidents,
      relatedChecklists,
      conversationHistory: conversation_history || [],
      mode: mode || 'office'
    });

    // チェックリスト自動登録
    const checklistMatch = aiResponse.match(/```checklist_json\s*\n([\s\S]*?)\n```/);
    if (checklistMatch) {
      try {
        const checklistData = JSON.parse(checklistMatch[1].trim());
        if (checklistData.name && checklistData.items && checklistData.items.length > 0) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            const description = checklistData.category ? `[${checklistData.category}] ${checklistData.description || ''}`.trim() : (checklistData.description || '');
            const clResult = await client.query(
              `INSERT INTO checklists (name, description, work_type, created_by)
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [checklistData.name, description, checklistData.work_type || '', req.userId]
            );
            const checklistId = clResult.rows[0].id;

            for (let i = 0; i < checklistData.items.length; i++) {
              await client.query(
                `INSERT INTO checklist_items (checklist_id, content, order_index, priority)
                 VALUES ($1, $2, $3, 'required')`,
                [checklistId, checklistData.items[i], i + 1]
              );
            }
            await client.query('COMMIT');

            // JSON部分を削除してリンクに差し替え
            aiResponse = aiResponse.replace(/```checklist_json\s*\n[\s\S]*?\n```/,
              `\n\nこのチェックリストをシステムに登録しました。[[checklist:${checklistId}|${checklistData.name}]]から確認・実行できます。`);
          } catch (dbErr) {
            await client.query('ROLLBACK');
            console.error('Checklist auto-create error:', dbErr);
            aiResponse = aiResponse.replace(/```checklist_json\s*\n[\s\S]*?\n```/, '');
          } finally {
            client.release();
          }
        }
      } catch (parseErr) {
        console.error('Checklist JSON parse error:', parseErr);
        aiResponse = aiResponse.replace(/```checklist_json\s*\n[\s\S]*?\n```/, '');
      }
    }

    // Save to voice session if session_id provided
    const knowledgeIdValues = knowledgeIds.map(k => typeof k === 'object' ? k.id : k);
    if (session_id) {
      try {
        const maxOrder = await pool.query(
          'SELECT MAX(order_index) as max_idx FROM voice_session_messages WHERE session_id = $1',
          [session_id]
        );
        const nextOrder = (maxOrder.rows[0].max_idx || 0) + 1;

        await pool.query(
          `INSERT INTO voice_session_messages (session_id, role, content, related_knowledge_ids, order_index)
           VALUES ($1, 'user', $2, $3, $4)`,
          [session_id, message, knowledgeIdValues.length > 0 ? knowledgeIdValues : null, nextOrder]
        );

        await pool.query(
          `INSERT INTO voice_session_messages (session_id, role, content, related_knowledge_ids, order_index)
           VALUES ($1, 'assistant', $2, $3, $4)`,
          [session_id, aiResponse, knowledgeIdValues.length > 0 ? knowledgeIdValues : null, nextOrder + 1]
        );

        // 初回メッセージ（nextOrder === 2 = 挨拶の次）の場合、AIでセッションタイトルを生成
        if (nextOrder === 2) {
          try {
            const title = await generateSessionTitle(message, aiResponse);
            if (title) {
              await pool.query(
                'UPDATE voice_sessions SET title = $1 WHERE id = $2',
                [title.replace(/[「」『』""]/g, '').trim().substring(0, 50), session_id]
              );
            }
          } catch (titleErr) {
            console.error('Failed to generate session title:', titleErr.message);
          }
        }
      } catch (dbError) {
        console.error('Failed to save session message:', dbError.message);
      }
    }

    res.json({
      response: aiResponse,
      related_knowledge: knowledgeIds,
      has_incidents: relatedIncidents.length > 0
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'AI応答の生成に失敗しました' });
  }
});

/**
 * @swagger
 * /api/ai/voice-session:
 *   post:
 *     summary: 音声セッション開始
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/voice-session', authMiddleware, [
  body('mode').isIn(['office', 'field']),
  body('site_id').optional().isInt(),
  body('work_type').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { mode, site_id, work_type } = req.body;

    const result = await pool.query(
      `INSERT INTO voice_sessions (user_id, mode, site_id, work_type, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [req.userId, mode, site_id || null, work_type || null]
    );

    const session = result.rows[0];

    // Generate initial greeting
    const greeting = mode === 'field'
      ? 'お疲れ様です。現場の状況や作業内容を教えてください。関連するナレッジや注意点をお伝えします。'
      : 'お疲れ様です。施工検討を始めましょう。工種を教えていただければ、関連するナレッジや注意点をお伝えします。';

    // Save initial message
    await pool.query(
      `INSERT INTO voice_session_messages (session_id, role, content, order_index)
       VALUES ($1, 'assistant', $2, 1)`,
      [session.id, greeting]
    );

    res.status(201).json({
      session,
      initial_message: greeting
    });
  } catch (error) {
    console.error('Create voice session error:', error);
    res.status(500).json({ error: '音声セッションの開始に失敗しました' });
  }
});

/**
 * @swagger
 * /api/ai/risk-assessment:
 *   post:
 *     summary: リスク評価
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/risk-assessment', authMiddleware, [
  body('work_type').notEmpty().trim(),
  body('conditions').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { work_type, conditions = {} } = req.body;

    // Get related incidents for context
    const incidents = await pool.query(
      `SELECT title, severity, cause, countermeasure FROM incident_cases
       WHERE work_type = $1
       ORDER BY severity DESC LIMIT 5`,
      [work_type]
    );

    const enrichedConditions = {
      ...conditions,
      past_incidents: incidents.rows
    };

    const assessment = await assessRisk(work_type, enrichedConditions);

    res.json(assessment);
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({ error: 'リスク評価に失敗しました' });
  }
});

/**
 * @swagger
 * /api/ai/summarize:
 *   post:
 *     summary: ナレッジ要約生成
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/summarize', authMiddleware, [
  body('content').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;
    const summary = await summarize(content);

    res.json({ summary });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: '要約の生成に失敗しました' });
  }
});

/**
 * @swagger
 * /api/ai/extract-tags:
 *   post:
 *     summary: 自動タグ抽出
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/extract-tags', authMiddleware, [
  body('content').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, title, category, work_type } = req.body;
    const tags = await extractTags(`${title ? 'タイトル: ' + title + '\n' : ''}${content}`);

    res.json({ tags });
  } catch (error) {
    console.error('Extract tags error:', error);
    res.status(500).json({ error: 'タグ抽出に失敗しました' });
  }
});

/**
 * @swagger
 * /api/ai/correct-speech:
 *   post:
 *     summary: 音声認識テキスト補正
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/correct-speech', authMiddleware, [
  body('text').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text } = req.body;
    const corrected = await correctSpeech(text);

    res.json({ corrected });
  } catch (error) {
    console.error('Correct speech error:', error);
    res.json({ corrected: text });
  }
});

/**
 * @swagger
 * /api/ai/analyze-conversation:
 *   post:
 *     summary: 会話分析・ナレッジ抽出
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/analyze-conversation', authMiddleware, [
  body('messages').isArray({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messages } = req.body;
    const result = await analyzeAndExtractKnowledge(messages);

    res.json(result);
  } catch (error) {
    console.error('Analyze conversation error:', error);
    res.status(500).json({ error: '会話分析に失敗しました' });
  }
});

// Session management endpoints

/**
 * @swagger
 * /api/ai/voice-sessions:
 *   get:
 *     summary: ユーザーのセッション一覧取得
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.get('/voice-sessions', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, mode } = req.query;
    const offset = (page - 1) * limit;

    const params = [req.userId, limit, offset];
    const modeFilter = mode ? `AND vs.mode = $${params.length + 1}` : '';
    if (mode) params.push(mode);

    const result = await pool.query(
      `SELECT vs.*,
              (SELECT COUNT(*) FROM voice_session_messages WHERE session_id = vs.id) as message_count
       FROM voice_sessions vs
       WHERE vs.user_id = $1 ${modeFilter}
       ORDER BY vs.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    const countParams = [req.userId];
    const countModeFilter = mode ? 'AND mode = $2' : '';
    if (mode) countParams.push(mode);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM voice_sessions WHERE user_id = $1 ${countModeFilter}`,
      countParams
    );

    res.json({
      sessions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('List voice sessions error:', error);
    res.status(500).json({ error: 'セッション一覧の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/ai/voice-sessions/{id}:
 *   get:
 *     summary: セッション詳細・メッセージ取得
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.get('/voice-sessions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const session = await pool.query(
      'SELECT * FROM voice_sessions WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'セッションが見つかりません' });
    }

    const messages = await pool.query(
      'SELECT * FROM voice_session_messages WHERE session_id = $1 ORDER BY order_index ASC',
      [id]
    );

    res.json({ ...session.rows[0], messages: messages.rows });
  } catch (error) {
    console.error('Get voice session error:', error);
    res.status(500).json({ error: 'セッションの取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/ai/voice-sessions/{id}/complete:
 *   put:
 *     summary: セッション完了
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.put('/voice-sessions/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE voice_sessions SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'セッションが見つかりません' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Complete voice session error:', error);
    res.status(500).json({ error: 'セッションの完了に失敗しました' });
  }
});

/**
 * @swagger
 * /api/ai/voice-sessions/{id}/messages:
 *   post:
 *     summary: セッションにメッセージを追加
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/voice-sessions/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { messages } = req.body; // [{ role: 'user'|'assistant', content: '...' }]

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages は必須です' });
    }

    // セッションの所有者確認
    const session = await pool.query(
      'SELECT id FROM voice_sessions WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'セッションが見つかりません' });
    }

    const maxOrder = await pool.query(
      'SELECT MAX(order_index) as max_idx FROM voice_session_messages WHERE session_id = $1',
      [id]
    );
    let nextOrder = (maxOrder.rows[0].max_idx || 0) + 1;

    for (const msg of messages) {
      await pool.query(
        `INSERT INTO voice_session_messages (session_id, role, content, order_index)
         VALUES ($1, $2, $3, $4)`,
        [id, msg.role, msg.content, nextOrder++]
      );
    }

    res.json({ success: true, added: messages.length });
  } catch (error) {
    console.error('Add session messages error:', error);
    res.status(500).json({ error: 'メッセージの追加に失敗しました' });
  }
});

/**
 * @swagger
 * /api/ai/voice-sessions/{id}:
 *   delete:
 *     summary: セッション削除
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/voice-sessions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM voice_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'セッションが見つかりません' });
    }

    res.json({ message: '削除しました' });
  } catch (error) {
    console.error('Delete voice session error:', error);
    res.status(500).json({ error: 'セッションの削除に失敗しました' });
  }
});

module.exports = router;
