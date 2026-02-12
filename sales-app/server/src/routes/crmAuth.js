const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const pool = require('../db/pool');

const router = express.Router();

// CRMのログイン状態を確認
router.get('/check-auth', authMiddleware, async (req, res) => {
  try {
    // ユーザーのCRMトークンを取得
    const result = await pool.query(`
      SELECT 
        crm_type,
        access_token,
        refresh_token,
        expires_at,
        updated_at
      FROM user_crm_tokens
      WHERE user_id = $1
    `, [req.userId]);

    const authStatus = {
      salesforce: {
        loggedIn: false,
        lastLogin: null,
        tokenExpiry: null,
        needsRefresh: false
      },
      dynamics365: {
        loggedIn: false,
        lastLogin: null,
        tokenExpiry: null,
        needsRefresh: false
      }
    };

    // 各CRMのログイン状態を確認
    for (const row of result.rows) {
      const crmType = row.crm_type;
      const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
      const now = new Date();
      
      // トークンの有効性を確認
      const isLoggedIn = !!row.access_token;
      const isExpired = expiresAt && expiresAt <= now;
      const isExpiringSoon = expiresAt && expiresAt <= new Date(now.getTime() + 10 * 60 * 1000); // 10分以内に期限切れ
      
      authStatus[crmType] = {
        loggedIn: isLoggedIn && !isExpired,
        lastLogin: row.updated_at ? new Date(row.updated_at).toLocaleString('ja-JP') : null,
        tokenExpiry: expiresAt ? expiresAt.toISOString() : null,
        needsRefresh: isExpiringSoon || isExpired,
        hasRefreshToken: !!row.refresh_token
      };
    }

    res.json({
      success: true,
      authStatus
    });

  } catch (error) {
    console.error('Check CRM auth status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'ログイン状態の確認に失敗しました' 
    });
  }
});

// CRM検索API
router.post('/search', authMiddleware, async (req, res) => {
  try {
    const { searchTerm, crmType } = req.body;
    
    if (!searchTerm || !crmType) {
      return res.status(400).json({ 
        error: '検索条件が不足しています' 
      });
    }

    // CRMトークンの確認
    const tokenResult = await pool.query(`
      SELECT access_token, refresh_token, instance_url
      FROM user_crm_tokens
      WHERE user_id = $1 AND crm_type = $2
    `, [req.userId, crmType]);

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ 
        error: `${crmType === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}にログインしてください`,
        requiresAuth: true,
        crmType
      });
    }

    const token = tokenResult.rows[0];
    
    // CRMサービスを使用して検索
    let searchResults = { accounts: [], opportunities: [] };
    
    if (crmType === 'salesforce') {
      const SalesforceService = require('../services/salesforceService');
      const sfService = new SalesforceService();
      
      try {
        // Salesforceで検索
        const [accounts, opportunities] = await Promise.all([
          sfService.searchAccounts(req.userId, searchTerm),
          sfService.searchOpportunities(req.userId, searchTerm)
        ]);
        
        searchResults = {
          accounts: accounts || [],
          opportunities: opportunities || []
        };
      } catch (sfError) {
        console.error('Salesforce search error:', sfError);
        
        // トークン期限切れの場合
        if (sfError.message?.includes('expired') || sfError.message?.includes('invalid')) {
          return res.status(401).json({ 
            error: 'Salesforceのセッションが期限切れです。再度ログインしてください',
            requiresAuth: true,
            crmType: 'salesforce'
          });
        }
        
        throw sfError;
      }
      
    } else if (crmType === 'dynamics365') {
      const Dynamics365Service = require('../services/dynamics365Service');
      const d365Service = new Dynamics365Service();
      
      try {
        // Dynamics 365で検索
        const [accounts, opportunities] = await Promise.all([
          d365Service.searchAccounts(req.userId, searchTerm),
          d365Service.searchOpportunities(req.userId, searchTerm)
        ]);
        
        searchResults = {
          accounts: accounts || [],
          opportunities: opportunities || []
        };
      } catch (d365Error) {
        console.error('Dynamics 365 search error:', d365Error);
        
        // トークン期限切れの場合
        if (d365Error.response?.status === 401) {
          return res.status(401).json({ 
            error: 'Dynamics 365のセッションが期限切れです。再度ログインしてください',
            requiresAuth: true,
            crmType: 'dynamics365'
          });
        }
        
        throw d365Error;
      }
    }

    res.json({
      success: true,
      ...searchResults
    });

  } catch (error) {
    console.error('CRM search error:', error);
    res.status(500).json({ 
      error: '検索中にエラーが発生しました',
      details: error.message 
    });
  }
});

module.exports = router;