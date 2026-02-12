const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/checklists:
 *   get:
 *     summary: チェックリスト一覧
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { work_type } = req.query;

    let whereClause = '';
    const params = [];

    if (work_type) {
      whereClause = 'WHERE cl.work_type = $1';
      params.push(work_type);
    }

    const result = await pool.query(
      `SELECT cl.*, u.name as created_by_name,
              (SELECT COUNT(*) FROM checklist_items ci WHERE ci.checklist_id = cl.id) as item_count
       FROM checklists cl
       LEFT JOIN users u ON cl.created_by = u.id
       ${whereClause}
       ORDER BY cl.updated_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get checklists error:', error);
    res.status(500).json({ error: 'チェックリスト一覧の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/checklists/executions/{executionId}:
 *   get:
 *     summary: チェックリスト実行詳細
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 */
router.get('/executions/:executionId', authMiddleware, async (req, res) => {
  try {
    const { executionId } = req.params;
    const execResult = await pool.query(
      `SELECT ce.*, u.name as executed_by_name, cl.name as checklist_name
       FROM checklist_executions ce
       LEFT JOIN users u ON ce.user_id = u.id
       LEFT JOIN checklists cl ON ce.checklist_id = cl.id
       WHERE ce.id = $1`,
      [executionId]
    );
    if (execResult.rows.length === 0) {
      return res.status(404).json({ error: '実行記録が見つかりません' });
    }
    const itemsResult = await pool.query(
      'SELECT * FROM checklist_execution_items WHERE execution_id = $1 ORDER BY id ASC',
      [executionId]
    );
    res.json({ ...execResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    console.error('Get execution detail error:', error);
    res.status(500).json({ error: '実行詳細の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/checklists/{id}:
 *   get:
 *     summary: チェックリスト詳細
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const checklistResult = await pool.query(
      `SELECT cl.*, u.name as created_by_name
       FROM checklists cl
       LEFT JOIN users u ON cl.created_by = u.id
       WHERE cl.id = $1`,
      [id]
    );

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'チェックリストが見つかりません' });
    }

    const itemsResult = await pool.query(
      `SELECT ci.*, ki.title as related_knowledge_title
       FROM checklist_items ci
       LEFT JOIN knowledge_items ki ON ci.related_knowledge_id = ki.id
       WHERE ci.checklist_id = $1
       ORDER BY ci.order_index ASC`,
      [id]
    );

    res.json({
      ...checklistResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Get checklist detail error:', error);
    res.status(500).json({ error: 'チェックリストの取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/checklists:
 *   post:
 *     summary: チェックリスト作成
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, [
  body('name').notEmpty().trim(),
  body('work_type').optional().trim(),
  body('description').optional(),
  body('items').isArray({ min: 1 }),
  body('items.*.content').notEmpty(),
  body('items.*.priority').isIn(['required', 'recommended', 'optional'])
], async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, work_type, description, items } = req.body;

    await client.query('BEGIN');

    const checklistResult = await client.query(
      `INSERT INTO checklists (name, work_type, description, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, work_type || null, description || null, req.userId]
    );

    const checklist = checklistResult.rows[0];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await client.query(
        `INSERT INTO checklist_items (checklist_id, content, priority, related_knowledge_id, order_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [checklist.id, item.content, item.priority, item.related_knowledge_id || null, i + 1]
      );
    }

    await client.query('COMMIT');

    // Fetch full checklist with items
    const fullResult = await pool.query(
      `SELECT cl.*, u.name as created_by_name
       FROM checklists cl
       LEFT JOIN users u ON cl.created_by = u.id
       WHERE cl.id = $1`,
      [checklist.id]
    );

    const itemsResult = await pool.query(
      `SELECT ci.*, ki.title as related_knowledge_title
       FROM checklist_items ci
       LEFT JOIN knowledge_items ki ON ci.related_knowledge_id = ki.id
       WHERE ci.checklist_id = $1
       ORDER BY ci.order_index ASC`,
      [checklist.id]
    );

    res.status(201).json({
      ...fullResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create checklist error:', error);
    res.status(500).json({ error: 'チェックリストの作成に失敗しました' });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/checklists/{id}:
 *   put:
 *     summary: チェックリスト更新
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM checklists WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'チェックリストが見つかりません' });
    }

    // Only creator or site_manager/admin can update
    if (existing.rows[0].created_by !== req.userId && !['site_manager', 'admin'].includes(req.userRole)) {
      return res.status(403).json({ error: '編集権限がありません' });
    }

    const { name, work_type, description, items } = req.body;

    await client.query('BEGIN');

    await client.query(
      `UPDATE checklists SET
        name = COALESCE($1, name),
        work_type = COALESCE($2, work_type),
        description = COALESCE($3, description)
       WHERE id = $4`,
      [name, work_type, description, id]
    );

    // Update items if provided
    if (items && Array.isArray(items)) {
      await client.query('DELETE FROM checklist_items WHERE checklist_id = $1', [id]);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(
          `INSERT INTO checklist_items (checklist_id, content, priority, related_knowledge_id, order_index)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.content, item.priority, item.related_knowledge_id || null, i + 1]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch updated checklist with items
    const fullResult = await pool.query(
      `SELECT cl.*, u.name as created_by_name
       FROM checklists cl
       LEFT JOIN users u ON cl.created_by = u.id
       WHERE cl.id = $1`,
      [id]
    );

    const itemsResult = await pool.query(
      `SELECT ci.*, ki.title as related_knowledge_title
       FROM checklist_items ci
       LEFT JOIN knowledge_items ki ON ci.related_knowledge_id = ki.id
       WHERE ci.checklist_id = $1
       ORDER BY ci.order_index ASC`,
      [id]
    );

    res.json({
      ...fullResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update checklist error:', error);
    res.status(500).json({ error: 'チェックリストの更新に失敗しました' });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/checklists/{id}/execute:
 *   post:
 *     summary: チェックリスト実行結果を保存
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/execute', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { checked_items: checkedItemIds, notes } = req.body;
    // checkedItemIds = [{ item_id: 1, checked: true, note: '' }, ...]

    // チェックリストとアイテム取得
    const checklistResult = await client.query('SELECT * FROM checklists WHERE id = $1', [id]);
    if (checklistResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'チェックリストが見つかりません' });
    }

    const itemsResult = await client.query(
      'SELECT * FROM checklist_items WHERE checklist_id = $1 ORDER BY order_index ASC', [id]
    );

    const totalItems = itemsResult.rows.length;
    const checkedCount = checkedItemIds ? checkedItemIds.filter(i => i.checked).length : 0;

    // 実行記録を作成
    const execResult = await client.query(
      `INSERT INTO checklist_executions (checklist_id, user_id, total_items, checked_items, status, notes)
       VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING *`,
      [id, req.userId, totalItems, checkedCount, notes || null]
    );
    const executionId = execResult.rows[0].id;

    // 各アイテムの結果を保存
    for (const item of itemsResult.rows) {
      const checkedInfo = checkedItemIds?.find(ci => ci.item_id === item.id);
      await client.query(
        `INSERT INTO checklist_execution_items (execution_id, checklist_item_id, item_content, is_required, checked, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [executionId, item.id, item.content, item.priority === 'required', checkedInfo?.checked || false, checkedInfo?.note || null]
      );
    }

    // usage_log記録
    await client.query(
      `INSERT INTO usage_logs (user_id, action_type, context_work_type) VALUES ($1, 'checklist_use', $2)`,
      [req.userId, checklistResult.rows[0].work_type]
    );

    await client.query('COMMIT');
    res.json(execResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Execute checklist error:', error);
    res.status(500).json({ error: 'チェックリストの実行に失敗しました' });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/checklists/{id}/executions:
 *   get:
 *     summary: チェックリスト実行履歴取得
 *     tags: [Checklists]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/executions', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ce.*, u.name as executed_by_name
       FROM checklist_executions ce
       LEFT JOIN users u ON ce.user_id = u.id
       WHERE ce.checklist_id = $1
       ORDER BY ce.completed_at DESC
       LIMIT 20`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get executions error:', error);
    res.status(500).json({ error: '実行履歴の取得に失敗しました' });
  }
});

module.exports = router;
