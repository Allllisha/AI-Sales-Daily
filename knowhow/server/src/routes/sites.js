const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authMiddleware, managerOrAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/sites:
 *   get:
 *     summary: 現場一覧取得
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, suspended]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 現場一覧
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND s.status = $${paramIndex++}`;
      params.push(status);
    }
    if (search) {
      whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.location ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sites s ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);

    const result = await pool.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM users u WHERE u.site_id = s.id) as member_count
       FROM sites s
       ${whereClause}
       ORDER BY s.created_at DESC
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
    console.error('Get sites error:', error);
    res.status(500).json({ error: '現場一覧の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/sites/{id}:
 *   get:
 *     summary: 現場詳細取得
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM users u WHERE u.site_id = s.id) as member_count
       FROM sites s
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '現場が見つかりません' });
    }

    // Get members assigned to this site
    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department
       FROM users u
       WHERE u.site_id = $1
       ORDER BY u.name`,
      [id]
    );

    res.json({
      ...result.rows[0],
      members: membersResult.rows
    });
  } catch (error) {
    console.error('Get site detail error:', error);
    res.status(500).json({ error: '現場の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/sites:
 *   post:
 *     summary: 現場登録
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, completed, suspended]
 *     responses:
 *       201:
 *         description: 作成された現場
 */
router.post('/', authMiddleware, managerOrAdmin, [
  body('name').notEmpty().trim(),
  body('location').optional().trim(),
  body('description').optional(),
  body('status').optional().isIn(['active', 'completed', 'suspended'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, location, description, status } = req.body;

    const result = await pool.query(
      `INSERT INTO sites (name, location, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, location || null, description || null, status || 'active']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({ error: '現場の登録に失敗しました' });
  }
});

/**
 * @swagger
 * /api/sites/{id}:
 *   put:
 *     summary: 現場更新
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, managerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM sites WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '現場が見つかりません' });
    }

    const { name, location, description, status } = req.body;

    const result = await pool.query(
      `UPDATE sites SET
        name = COALESCE($1, name),
        location = COALESCE($2, location),
        description = COALESCE($3, description),
        status = COALESCE($4, status)
       WHERE id = $5
       RETURNING *`,
      [name, location, description, status, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ error: '現場の更新に失敗しました' });
  }
});

module.exports = router;
