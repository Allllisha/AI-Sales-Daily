const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authMiddleware, expertOrAbove } = require('../middleware/auth');
const { semanticSearch, indexDocument, deleteDocument } = require('../services/searchService');
const { extractTagsFromKnowledge } = require('../services/tagExtractor');

const router = express.Router();

/**
 * @swagger
 * /api/knowledge:
 *   get:
 *     summary: ナレッジ一覧取得
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: work_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ナレッジ一覧
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { category, work_type, status, risk_level, tag, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND ki.category = $${paramIndex++}`;
      params.push(category);
    }
    if (work_type) {
      whereClause += ` AND ki.work_type = $${paramIndex++}`;
      params.push(work_type);
    }
    if (status) {
      whereClause += ` AND ki.status = $${paramIndex++}`;
      params.push(status);
    } else {
      // 公開済み + 自分の下書きを表示
      whereClause += ` AND (ki.status = 'published' OR (ki.status = 'draft' AND ki.author_id = $${paramIndex++}))`;
      params.push(req.userId);
    }
    if (risk_level) {
      whereClause += ` AND ki.risk_level = $${paramIndex++}`;
      params.push(risk_level);
    }
    if (tag) {
      whereClause += ` AND EXISTS (SELECT 1 FROM knowledge_tags kt2 WHERE kt2.knowledge_id = ki.id AND kt2.tag_name = $${paramIndex++})`;
      params.push(tag);
    }
    if (search) {
      whereClause += ` AND (ki.title ILIKE $${paramIndex} OR ki.content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM knowledge_items ki ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(req.userId);
    const userIdParam = paramIndex++;

    params.push(limit);
    const limitParam = paramIndex++;

    params.push(offset);
    const offsetParam = paramIndex++;

    const result = await pool.query(
      `SELECT ki.*, u.name as author_name,
              COALESCE(
                (SELECT json_agg(json_build_object('id', kt.id, 'tag_name', kt.tag_name, 'auto_generated', kt.auto_generated))
                 FROM knowledge_tags kt WHERE kt.knowledge_id = ki.id), '[]'
              ) as tags,
              CASE WHEN EXISTS (
                SELECT 1 FROM usage_logs ul
                WHERE ul.knowledge_id = ki.id AND ul.user_id = $${userIdParam} AND ul.action_type = 'useful_mark'
              ) THEN true ELSE false END as marked_useful_by_me
       FROM knowledge_items ki
       LEFT JOIN users u ON ki.author_id = u.id
       ${whereClause}
       ORDER BY marked_useful_by_me DESC, ki.useful_count DESC, ki.updated_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    res.json({
      items: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get knowledge list error:', error);
    res.status(500).json({ error: 'ナレッジ一覧の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/knowledge/export/csv:
 *   get:
 *     summary: ナレッジCSVエクスポート
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 */
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const { category, work_type, status, risk_level } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND ki.category = $${paramIndex++}`;
      params.push(category);
    }
    if (work_type) {
      whereClause += ` AND ki.work_type = $${paramIndex++}`;
      params.push(work_type);
    }
    if (status) {
      whereClause += ` AND ki.status = $${paramIndex++}`;
      params.push(status);
    } else {
      whereClause += ` AND ki.status = 'published'`;
    }
    if (risk_level) {
      whereClause += ` AND ki.risk_level = $${paramIndex++}`;
      params.push(risk_level);
    }

    const result = await pool.query(
      `SELECT ki.id, ki.title, ki.category, ki.work_type, ki.risk_level,
              ki.status, ki.view_count, ki.useful_count, ki.created_at,
              u.name as author_name,
              COALESCE(
                (SELECT string_agg(kt.tag_name, ', ')
                 FROM knowledge_tags kt WHERE kt.knowledge_id = ki.id), ''
              ) as tags
       FROM knowledge_items ki
       LEFT JOIN users u ON ki.author_id = u.id
       ${whereClause}
       ORDER BY ki.created_at DESC`,
      params
    );

    const categoryLabels = {
      procedure: '手順', safety: '安全', quality: '品質',
      cost: 'コスト', equipment: '設備', material: '資材',
    };
    const riskLabels = {
      low: '低', medium: '中', high: '高', critical: '重大',
    };
    const statusLabels = {
      draft: '下書き', review: 'レビュー中', published: '公開済み',
    };

    const escapeCsv = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

    const header = ['ID', 'タイトル', 'カテゴリ', '工種', 'リスクレベル', 'ステータス', '閲覧数', '高評価数', 'タグ', '作成者', '作成日'];
    const rows = result.rows.map(r => [
      r.id,
      r.title,
      categoryLabels[r.category] || r.category || '',
      r.work_type || '',
      riskLabels[r.risk_level] || r.risk_level || '',
      statusLabels[r.status] || r.status || '',
      r.view_count || 0,
      r.useful_count || 0,
      r.tags || '',
      r.author_name || '',
      r.created_at ? new Date(r.created_at).toLocaleDateString('ja-JP') : '',
    ]);

    const csvContent = '\uFEFF' + [
      header.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="knowledge_export.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export knowledge CSV error:', error);
    res.status(500).json({ error: 'CSVエクスポートに失敗しました' });
  }
});

/**
 * @swagger
 * /api/knowledge/{id}:
 *   get:
 *     summary: ナレッジ詳細取得
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ki.*, u.name as author_name, au.name as approved_by_name,
              COALESCE(
                (SELECT json_agg(json_build_object('id', kt.id, 'tag_name', kt.tag_name, 'auto_generated', kt.auto_generated))
                 FROM knowledge_tags kt WHERE kt.knowledge_id = ki.id), '[]'
              ) as tags
       FROM knowledge_items ki
       LEFT JOIN users u ON ki.author_id = u.id
       LEFT JOIN users au ON ki.approved_by = au.id
       WHERE ki.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ナレッジが見つかりません' });
    }

    // Increment view count
    await pool.query('UPDATE knowledge_items SET view_count = view_count + 1 WHERE id = $1', [id]);

    // Log usage
    await pool.query(
      `INSERT INTO usage_logs (user_id, knowledge_id, action_type) VALUES ($1, $2, 'view')`,
      [req.userId, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get knowledge detail error:', error);
    res.status(500).json({ error: 'ナレッジの取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/knowledge:
 *   post:
 *     summary: ナレッジ新規登録
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, [
  body('title').notEmpty().trim(),
  body('content').notEmpty(),
  body('category').isIn(['procedure', 'safety', 'quality', 'cost', 'equipment', 'material']),
  body('work_type').optional().trim(),
  body('risk_level').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('tags').optional().isArray(),
  body('status').optional().isIn(['draft', 'published'])
], async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, summary, category, work_type, risk_level, tags, status } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO knowledge_items (title, content, summary, category, work_type, risk_level, author_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, content, summary || null, category, work_type || null, risk_level || 'low', req.userId, status || 'draft']
    );

    const knowledgeItem = result.rows[0];

    // Add manual tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        await client.query(
          `INSERT INTO knowledge_tags (knowledge_id, tag_name, auto_generated) VALUES ($1, $2, false)`,
          [knowledgeItem.id, tagName]
        );
      }
    }

    // Auto-extract tags
    try {
      const autoTags = await extractTagsFromKnowledge({ title, content, category, work_type });
      for (const tag of autoTags) {
        const exists = tags && tags.includes(tag.name);
        if (!exists) {
          await client.query(
            `INSERT INTO knowledge_tags (knowledge_id, tag_name, auto_generated) VALUES ($1, $2, true)`,
            [knowledgeItem.id, tag.name]
          );
        }
      }
    } catch (tagError) {
      console.error('Auto tag extraction failed:', tagError.message);
    }

    await client.query('COMMIT');

    // Index in Azure Search (async, don't wait)
    indexDocument({ id: knowledgeItem.id, title, content, category, work_type, risk_level }).catch(err =>
      console.error('Indexing failed:', err.message)
    );

    // Re-fetch with tags
    const fullResult = await pool.query(
      `SELECT ki.*, u.name as author_name,
              COALESCE(
                (SELECT json_agg(json_build_object('id', kt.id, 'tag_name', kt.tag_name, 'auto_generated', kt.auto_generated))
                 FROM knowledge_tags kt WHERE kt.knowledge_id = ki.id), '[]'
              ) as tags
       FROM knowledge_items ki
       LEFT JOIN users u ON ki.author_id = u.id
       WHERE ki.id = $1`,
      [knowledgeItem.id]
    );

    res.status(201).json(fullResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create knowledge error:', error);
    res.status(500).json({ error: 'ナレッジの作成に失敗しました' });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/knowledge/{id}:
 *   put:
 *     summary: ナレッジ更新
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, [
  body('title').optional().notEmpty().trim(),
  body('content').optional().notEmpty(),
  body('category').optional().isIn(['procedure', 'safety', 'quality', 'cost', 'equipment', 'material']),
  body('work_type').optional().trim(),
  body('risk_level').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('tags').optional().isArray()
], async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Check ownership or permission
    const existing = await pool.query('SELECT * FROM knowledge_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ナレッジが見つかりません' });
    }

    const item = existing.rows[0];
    if (item.author_id !== req.userId && !['expert', 'site_manager', 'admin'].includes(req.userRole)) {
      return res.status(403).json({ error: '編集権限がありません' });
    }

    const { title, content, summary, category, work_type, risk_level, status, tags } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE knowledge_items SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        summary = COALESCE($3, summary),
        category = COALESCE($4, category),
        work_type = COALESCE($5, work_type),
        risk_level = COALESCE($6, risk_level),
        status = COALESCE($7, status),
        version = version + 1
       WHERE id = $8
       RETURNING *`,
      [title, content, summary, category, work_type, risk_level, status, id]
    );

    // Update tags if provided
    if (tags) {
      await client.query('DELETE FROM knowledge_tags WHERE knowledge_id = $1 AND auto_generated = false', [id]);
      for (const tagName of tags) {
        await client.query(
          `INSERT INTO knowledge_tags (knowledge_id, tag_name, auto_generated) VALUES ($1, $2, false)`,
          [id, tagName]
        );
      }
    }

    await client.query('COMMIT');

    // Re-index in Azure Search
    const updatedItem = result.rows[0];
    indexDocument({
      id: updatedItem.id,
      title: updatedItem.title,
      content: updatedItem.content,
      category: updatedItem.category,
      work_type: updatedItem.work_type,
      risk_level: updatedItem.risk_level
    }).catch(err => console.error('Re-indexing failed:', err.message));

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update knowledge error:', error);
    res.status(500).json({ error: 'ナレッジの更新に失敗しました' });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/knowledge/{id}:
 *   delete:
 *     summary: ナレッジ削除
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM knowledge_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ナレッジが見つかりません' });
    }

    const item = existing.rows[0];
    if (item.author_id !== req.userId && !['site_manager', 'admin'].includes(req.userRole)) {
      return res.status(403).json({ error: '削除権限がありません' });
    }

    // 外部キー参照を先に削除
    await pool.query('DELETE FROM knowledge_tags WHERE knowledge_id = $1', [id]);
    await pool.query('DELETE FROM usage_logs WHERE knowledge_id = $1', [id]);
    await pool.query('UPDATE checklist_items SET related_knowledge_id = NULL WHERE related_knowledge_id = $1', [id]);
    await pool.query('UPDATE knowledge_items SET parent_id = NULL WHERE parent_id = $1', [id]);
    await pool.query('DELETE FROM knowledge_items WHERE id = $1', [id]);

    deleteDocument(id).catch(err => console.error('Delete from index failed:', err.message));

    res.json({ message: 'ナレッジを削除しました' });
  } catch (error) {
    console.error('Delete knowledge error:', error);
    res.status(500).json({ error: 'ナレッジの削除に失敗しました' });
  }
});

/**
 * @swagger
 * /api/knowledge/{id}/approve:
 *   post:
 *     summary: ナレッジ承認
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/approve', authMiddleware, expertOrAbove, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE knowledge_items SET status = 'published', approved_by = $1, approved_at = NOW()
       WHERE id = $2 AND status IN ('draft', 'review')
       RETURNING *`,
      [req.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ナレッジが見つからないか、承認済みです' });
    }

    // Index approved document
    const item = result.rows[0];
    indexDocument({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      work_type: item.work_type,
      risk_level: item.risk_level
    }).catch(err => console.error('Indexing approved item failed:', err.message));

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve knowledge error:', error);
    res.status(500).json({ error: 'ナレッジの承認に失敗しました' });
  }
});

/**
 * @swagger
 * /api/knowledge/search:
 *   post:
 *     summary: セマンティック検索
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 */
router.post('/search', authMiddleware, [
  body('query').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { query: searchQuery, category, work_type, top = 10 } = req.body;

    // Log search
    await pool.query(
      `INSERT INTO usage_logs (user_id, action_type, search_query) VALUES ($1, 'search', $2)`,
      [req.userId, searchQuery]
    );

    // Try semantic search first
    let filter = '';
    if (category) filter += `category eq '${category}'`;
    if (work_type) {
      if (filter) filter += ' and ';
      filter += `work_type eq '${work_type}'`;
    }

    const { results, fallback } = await semanticSearch(searchQuery, { top, filter: filter || undefined });

    if (!fallback && results.length > 0) {
      return res.json({ results, searchType: 'semantic' });
    }

    // Fallback to DB full-text search
    let whereClause = `WHERE ki.status = 'published' AND (ki.title ILIKE $1 OR ki.content ILIKE $1)`;
    const params = [`%${searchQuery}%`];
    let paramIndex = 2;

    if (category) {
      whereClause += ` AND ki.category = $${paramIndex++}`;
      params.push(category);
    }
    if (work_type) {
      whereClause += ` AND ki.work_type = $${paramIndex++}`;
      params.push(work_type);
    }

    params.push(top);

    params.push(req.userId);
    const userIdParam = paramIndex++;

    const dbResults = await pool.query(
      `SELECT ki.id, ki.title, ki.content, ki.summary, ki.category, ki.work_type, ki.risk_level,
              ki.view_count, ki.useful_count, u.name as author_name,
              CASE WHEN EXISTS (
                SELECT 1 FROM usage_logs ul
                WHERE ul.knowledge_id = ki.id AND ul.user_id = $${userIdParam} AND ul.action_type = 'useful_mark'
              ) THEN true ELSE false END as marked_useful_by_me
       FROM knowledge_items ki
       LEFT JOIN users u ON ki.author_id = u.id
       ${whereClause}
       ORDER BY marked_useful_by_me DESC, ki.useful_count DESC, ki.view_count DESC
       LIMIT $${paramIndex}`,
      params
    );

    res.json({ results: dbResults.rows, searchType: 'fulltext' });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: '検索に失敗しました' });
  }
});

/**
 * @swagger
 * /api/knowledge/{id}/related:
 *   get:
 *     summary: 関連ナレッジ取得
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/related', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const item = await pool.query('SELECT * FROM knowledge_items WHERE id = $1', [id]);
    if (item.rows.length === 0) {
      return res.status(404).json({ error: 'ナレッジが見つかりません' });
    }

    const knowledge = item.rows[0];

    // Find by same work_type or category, excluding self (user's useful marks prioritized)
    const result = await pool.query(
      `SELECT ki.id, ki.title, ki.summary, ki.category, ki.work_type, ki.risk_level,
              ki.view_count, ki.useful_count,
              CASE WHEN EXISTS (
                SELECT 1 FROM usage_logs ul
                WHERE ul.knowledge_id = ki.id AND ul.user_id = $4 AND ul.action_type = 'useful_mark'
              ) THEN true ELSE false END as marked_useful_by_me
       FROM knowledge_items ki
       WHERE ki.id != $1 AND ki.status = 'published'
         AND (ki.work_type = $2 OR ki.category = $3)
       ORDER BY marked_useful_by_me DESC, ki.useful_count DESC, ki.view_count DESC
       LIMIT 5`,
      [id, knowledge.work_type, knowledge.category, req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get related knowledge error:', error);
    res.status(500).json({ error: '関連ナレッジの取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/knowledge/{id}/useful:
 *   post:
 *     summary: 「役に立った」マーク
 *     tags: [Knowledge]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/useful', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE knowledge_items SET useful_count = useful_count + 1 WHERE id = $1 RETURNING useful_count',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ナレッジが見つかりません' });
    }

    await pool.query(
      `INSERT INTO usage_logs (user_id, knowledge_id, action_type) VALUES ($1, $2, 'useful_mark')`,
      [req.userId, id]
    );

    res.json({ useful_count: result.rows[0].useful_count });
  } catch (error) {
    console.error('Mark useful error:', error);
    res.status(500).json({ error: '操作に失敗しました' });
  }
});

module.exports = router;
