const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authMiddleware, adminOnly, managerOrAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: 現在のユーザー情報を取得
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ユーザー情報
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.site_id,
              s.name as site_name
       FROM users u
       LEFT JOIN sites s ON u.site_id = s.id
       WHERE u.id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/users/team:
 *   get:
 *     summary: 部下リスト取得
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/team', authMiddleware, managerOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.site_id,
              s.name as site_name
       FROM users u
       LEFT JOIN sites s ON u.site_id = s.id
       WHERE u.manager_id = $1
       ORDER BY u.name`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'チームメンバーの取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/users/managers:
 *   get:
 *     summary: マネージャー一覧取得
 *     tags: [Users]
 */
router.get('/managers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.department, u.site_id,
              s.name as site_name
       FROM users u
       LEFT JOIN sites s ON u.site_id = s.id
       WHERE u.role IN ('site_manager', 'admin')
       ORDER BY u.name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ error: 'マネージャー一覧の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: ユーザー一覧取得
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [worker, expert, site_manager, admin]
 *       - in: query
 *         name: site_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ユーザー一覧
 */
router.get('/', authMiddleware, managerOrAdmin, async (req, res) => {
  try {
    const { role, site_id, search } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) {
      whereClause += ` AND u.role = $${paramIndex++}`;
      params.push(role);
    }
    if (site_id) {
      whereClause += ` AND u.site_id = $${paramIndex++}`;
      params.push(site_id);
    }
    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.department, u.site_id, u.manager_id,
              u.created_at, u.updated_at,
              s.name as site_name,
              m.name as manager_name
       FROM users u
       LEFT JOIN sites s ON u.site_id = s.id
       LEFT JOIN users m ON u.manager_id = m.id
       ${whereClause}
       ORDER BY u.name`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/users/{id}/role:
 *   put:
 *     summary: ユーザー権限変更
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [worker, expert, site_manager, admin]
 *     responses:
 *       200:
 *         description: 権限変更成功
 */
router.put('/:id/role', authMiddleware, adminOnly, [
  body('role').isIn(['worker', 'expert', 'site_manager', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { role } = req.body;

    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role, department, site_id',
      [role, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: '権限の変更に失敗しました' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: ユーザー情報更新
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: '更新権限がありません' });
    }

    const { name, department, site_id, manager_id } = req.body;

    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        department = COALESCE($2, department),
        site_id = COALESCE($3, site_id),
        manager_id = COALESCE($4, manager_id)
       WHERE id = $5
       RETURNING id, name, email, role, department, site_id`,
      [name, department, site_id, manager_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'ユーザー情報の更新に失敗しました' });
  }
});

module.exports = router;
