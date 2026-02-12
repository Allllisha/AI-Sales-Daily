const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { semanticSearch } = require('../services/searchService');

const router = express.Router();

/**
 * @swagger
 * /api/incidents:
 *   get:
 *     summary: 事例一覧取得
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { work_type, severity, site_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (work_type) {
      whereClause += ` AND ic.work_type = $${paramIndex++}`;
      params.push(work_type);
    }
    if (severity) {
      whereClause += ` AND ic.severity = $${paramIndex++}`;
      params.push(severity);
    }
    if (site_id) {
      whereClause += ` AND ic.site_id = $${paramIndex++}`;
      params.push(site_id);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM incident_cases ic ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);

    const result = await pool.query(
      `SELECT ic.*, u.name as reported_by_name, s.name as site_name
       FROM incident_cases ic
       LEFT JOIN users u ON ic.reported_by = u.id
       LEFT JOIN sites s ON ic.site_id = s.id
       ${whereClause}
       ORDER BY ic.occurred_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      items: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: '事例一覧の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/incidents/{id}:
 *   get:
 *     summary: 事例詳細取得
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ic.*, u.name as reported_by_name, s.name as site_name
       FROM incident_cases ic
       LEFT JOIN users u ON ic.reported_by = u.id
       LEFT JOIN sites s ON ic.site_id = s.id
       WHERE ic.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '事例が見つかりません' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get incident detail error:', error);
    res.status(500).json({ error: '事例の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/incidents:
 *   post:
 *     summary: 事例登録
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, [
  body('title').notEmpty().trim(),
  body('description').notEmpty(),
  body('severity').isIn(['minor', 'moderate', 'serious', 'critical']),
  body('work_type').optional().trim(),
  body('site_id').optional().isInt(),
  body('cause').optional(),
  body('countermeasure').optional(),
  body('occurred_at').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, cause, countermeasure, site_id, work_type, severity, occurred_at } = req.body;

    const result = await pool.query(
      `INSERT INTO incident_cases (title, description, cause, countermeasure, site_id, work_type, severity, occurred_at, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, cause || null, countermeasure || null, site_id || null, work_type || null, severity, occurred_at || null, req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ error: '事例の登録に失敗しました' });
  }
});

/**
 * @swagger
 * /api/incidents/{id}:
 *   put:
 *     summary: 事例更新
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM incident_cases WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '事例が見つかりません' });
    }

    if (existing.rows[0].reported_by !== req.userId && !['expert', 'site_manager', 'admin'].includes(req.userRole)) {
      return res.status(403).json({ error: '編集権限がありません' });
    }

    const { title, description, cause, countermeasure, site_id, work_type, severity, occurred_at } = req.body;

    const result = await pool.query(
      `UPDATE incident_cases SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        cause = COALESCE($3, cause),
        countermeasure = COALESCE($4, countermeasure),
        site_id = COALESCE($5, site_id),
        work_type = COALESCE($6, work_type),
        severity = COALESCE($7, severity),
        occurred_at = COALESCE($8, occurred_at)
       WHERE id = $9
       RETURNING *`,
      [title, description, cause, countermeasure, site_id, work_type, severity, occurred_at, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ error: '事例の更新に失敗しました' });
  }
});

/**
 * @swagger
 * /api/incidents/search:
 *   post:
 *     summary: 類似事例検索
 *     tags: [Incidents]
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

    const { query: searchQuery, work_type, severity, top = 5 } = req.body;

    // DB text search for incidents
    let whereClause = `WHERE (ic.title ILIKE $1 OR ic.description ILIKE $1 OR ic.cause ILIKE $1)`;
    const params = [`%${searchQuery}%`];
    let paramIndex = 2;

    if (work_type) {
      whereClause += ` AND ic.work_type = $${paramIndex++}`;
      params.push(work_type);
    }
    if (severity) {
      whereClause += ` AND ic.severity = $${paramIndex++}`;
      params.push(severity);
    }

    params.push(top);

    const result = await pool.query(
      `SELECT ic.*, u.name as reported_by_name, s.name as site_name
       FROM incident_cases ic
       LEFT JOIN users u ON ic.reported_by = u.id
       LEFT JOIN sites s ON ic.site_id = s.id
       ${whereClause}
       ORDER BY ic.severity DESC, ic.occurred_at DESC
       LIMIT $${paramIndex}`,
      params
    );

    res.json({ results: result.rows });
  } catch (error) {
    console.error('Search incidents error:', error);
    res.status(500).json({ error: '事例検索に失敗しました' });
  }
});

module.exports = router;
