const express = require('express');
const { authMiddleware, managerOnly } = require('../middleware/auth');
const pool = require('../db/pool');

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [sales, manager]
 *       404:
 *         description: ユーザーが見つかりません
 */

/**
 * @swagger
 * /api/users/team:
 *   get:
 *     summary: 部下のリストを取得
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: マネージャー権限が必要です
 *     responses:
 *       200:
 *         description: チームメンバー一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *       403:
 *         description: 権限がありません
 */

/**
 * @swagger
 * /api/users/managers:
 *   get:
 *     summary: マネージャー一覧を取得
 *     tags: [Users]
 *     description: 新規登録時にマネージャーを選択するために使用
 *     responses:
 *       200:
 *         description: マネージャー一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 */

/**
 * @swagger
 * /api/users/subordinates:
 *   get:
 *     summary: 部下のリストを取得（認証付き）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: マネージャー権限が必要です
 *     responses:
 *       200:
 *         description: 部下一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *       403:
 *         description: 権限がありません
 */

// 現在のユーザー情報を取得
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const result = await pool.query(`
      SELECT id, name, email, role
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});

// マネージャーの部下リストを取得
router.get('/team', authMiddleware, managerOnly, async (req, res) => {
  try {
    const managerId = req.userId;
    
    const result = await pool.query(`
      SELECT id, name, email, role
      FROM users 
      WHERE manager_id = $1
      ORDER BY name
    `, [managerId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'チームメンバーの取得に失敗しました' });
  }
});

// マネージャー一覧を取得（新規登録時に使用）
router.get('/managers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email
      FROM users 
      WHERE role = 'manager'
      ORDER BY name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ error: 'マネージャー一覧の取得に失敗しました' });
  }
});

module.exports = router;