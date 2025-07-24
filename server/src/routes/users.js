const express = require('express');
const { authMiddleware, managerOnly } = require('../middleware/auth');
const pool = require('../db/pool');

const router = express.Router();

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

module.exports = router;