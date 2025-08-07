const express = require('express');
const router = express.Router();
const CRMAdapterFactory = require('../services/crm/CRMAdapterFactory');
const { authMiddleware } = require('../middleware/auth');
const pool = require('../db/pool');

/**
 * 利用可能なCRM一覧を取得
 */
router.get('/available', authMiddleware, async (req, res) => {
  try {
    const availableCRMs = CRMAdapterFactory.getAvailableCRMs();
    res.json({
      success: true,
      crms: availableCRMs
    });
  } catch (error) {
    console.error('Get available CRMs error:', error);
    res.status(500).json({ 
      success: false, 
      message: '利用可能なCRM一覧の取得に失敗しました',
      error: error.message 
    });
  }
});

/**
 * 指定されたCRMの接続テスト
 */
router.post('/test-connection', authMiddleware, async (req, res) => {
  try {
    const { crmType, config } = req.body;

    // CRMタイプとコンフィグの検証
    const validation = CRMAdapterFactory.validateCRMConfig(crmType, config || {});
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'CRM設定が無効です',
        errors: validation.errors
      });
    }

    if (crmType === 'none') {
      return res.json({
        success: true,
        message: 'CRM連携なしが選択されています',
        crmType: 'none'
      });
    }

    const adapter = CRMAdapterFactory.create(crmType, config);
    const result = await adapter.testConnection();
    
    res.json(result);
  } catch (error) {
    console.error('CRM connection test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'CRM接続テストに失敗しました',
      error: error.message 
    });
  }
});

/**
 * 取引先企業一覧を取得
 */
router.get('/:crmType/accounts', authMiddleware, async (req, res) => {
  try {
    const { crmType } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (crmType === 'none') {
      return res.json({
        success: true,
        accounts: []
      });
    }

    // ユーザー個別のCRM設定を使用
    const adapter = await CRMAdapterFactory.createForUser(crmType, req.userId, {});
    
    const accounts = await adapter.getAccounts(limit);
    
    res.json({
      success: true,
      accounts: accounts
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ 
      success: false, 
      message: '取引先企業の取得に失敗しました',
      error: error.message 
    });
  }
});

/**
 * 商談一覧を取得
 */
router.get('/:crmType/opportunities', authMiddleware, async (req, res) => {
  try {
    const { crmType } = req.params;
    const accountId = req.query.accountId;
    const limit = parseInt(req.query.limit) || 50;

    if (crmType === 'none') {
      return res.json({
        success: true,
        opportunities: []
      });
    }

    const adapter = await CRMAdapterFactory.createForUser(crmType, req.userId, {});
    
    const opportunities = await adapter.getOpportunities(accountId, limit);
    
    res.json({
      success: true,
      opportunities: opportunities
    });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({ 
      success: false, 
      message: '商談の取得に失敗しました',
      error: error.message 
    });
  }
});

/**
 * 活動一覧を取得
 */
router.get('/:crmType/activities', authMiddleware, async (req, res) => {
  try {
    const { crmType } = req.params;
    const regardingObjectId = req.query.regardingObjectId;
    const limit = parseInt(req.query.limit) || 50;

    if (crmType === 'none') {
      return res.json({
        success: true,
        activities: []
      });
    }

    const adapter = await CRMAdapterFactory.createForUser(crmType, req.userId, {});
    
    const activities = await adapter.getActivities(regardingObjectId, limit);
    
    res.json({
      success: true,
      activities: activities
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ 
      success: false, 
      message: '活動の取得に失敗しました',
      error: error.message 
    });
  }
});

/**
 * メモ・議事録一覧を取得
 */
router.get('/:crmType/notes', authMiddleware, async (req, res) => {
  try {
    const { crmType } = req.params;
    const regardingObjectId = req.query.regardingObjectId;
    const limit = parseInt(req.query.limit) || 50;

    console.log('Get notes request:', { crmType, regardingObjectId, limit, userId: req.userId });

    if (crmType === 'none') {
      return res.json({
        success: true,
        notes: []
      });
    }

    const adapter = await CRMAdapterFactory.createForUser(crmType, req.userId, {});
    console.log('Adapter created:', adapter.constructor.name);
    
    const notes = await adapter.getNotes(regardingObjectId, limit);
    console.log('Notes retrieved:', notes.length);
    
    res.json({
      success: true,
      notes: notes
    });
  } catch (error) {
    console.error('Get notes error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'メモの取得に失敗しました',
      error: error.message 
    });
  }
});

/**
 * 会議情報一覧を取得
 */
router.get('/:crmType/meetings', authMiddleware, async (req, res) => {
  try {
    const { crmType } = req.params;
    const regardingObjectId = req.query.regardingObjectId;
    const limit = parseInt(req.query.limit) || 50;

    if (crmType === 'none') {
      return res.json({
        success: true,
        meetings: []
      });
    }

    const adapter = await CRMAdapterFactory.createForUser(crmType, req.userId, {});
    
    const meetings = await adapter.getMeetings(regardingObjectId, limit);
    
    res.json({
      success: true,
      meetings: meetings
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ 
      success: false, 
      message: '会議情報の取得に失敗しました',
      error: error.message 
    });
  }
});

/**
 * 日報をCRMに同期
 */
router.post('/:crmType/sync-report', authMiddleware, async (req, res) => {
  try {
    const { crmType } = req.params;
    const reportData = req.body;

    if (crmType === 'none') {
      return res.json({
        success: true,
        message: 'CRM連携なしのため同期をスキップしました'
      });
    }

    const adapter = await CRMAdapterFactory.createForUser(crmType, req.userId, {});
    
    const syncResult = await adapter.syncReport(reportData);
    
    res.json({
      success: syncResult.sync_status === 'synced',
      message: syncResult.sync_status === 'synced' 
        ? `${CRMAdapterFactory.AVAILABLE_CRMS[crmType]?.label}に日報を同期しました`
        : `${CRMAdapterFactory.AVAILABLE_CRMS[crmType]?.label}への同期に失敗しました`,
      syncResult: syncResult
    });
  } catch (error) {
    console.error('Sync report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'CRMへの同期に失敗しました',
      error: error.message 
    });
  }
});

/**
 * ユーザーのCRM設定を取得
 * @param {number} userId - ユーザーID
 * @param {string} crmType - CRMタイプ
 * @returns {Object} CRM設定
 */
async function getUserCRMConfig(userId, crmType) {
  try {
    const settings = await pool.query(
      'SELECT * FROM user_crm_settings WHERE user_id = $1',
      [userId]
    );

    if (settings.rows.length === 0) {
      return {}; // デフォルト設定（環境変数を使用）
    }

    const userSettings = settings.rows[0];
    
    switch (crmType) {
      case 'dynamics365':
        return userSettings.dynamics365_config || {};
      case 'salesforce':
        return userSettings.salesforce_config || {};
      case 'hubspot':
        return userSettings.hubspot_config || {};
      default:
        return {};
    }
  } catch (error) {
    console.warn('Failed to get user CRM config:', error.message);
    return {}; // フォールバック（環境変数を使用）
  }
}

module.exports = router;