const express = require('express');
const router = express.Router();
const dynamics365Service = require('../services/dynamics365');
const { authMiddleware } = require('../middleware/auth');

// 接続テスト
router.get('/test', authMiddleware, async (req, res) => {
  try {
    const result = await dynamics365Service.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Dynamics 365 test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Dynamics 365接続テストに失敗しました',
      error: error.message 
    });
  }
});

// 取引先企業一覧を取得
router.get('/accounts', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await dynamics365Service.getAccounts(limit);
    
    res.json({
      success: true,
      accounts: result.value.map(account => ({
        id: account.accountid,
        name: account.name,
        phone: account.telephone1,
        email: account.emailaddress1
      }))
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

// 商談一覧を取得
router.get('/opportunities', authMiddleware, async (req, res) => {
  try {
    const accountId = req.query.accountId;
    const limit = parseInt(req.query.limit) || 50;
    const result = await dynamics365Service.getOpportunities(accountId, limit);
    
    // 取引先企業名を取得するため、必要に応じて別途APIコールを実行
    let accountsMap = {};
    if (result.value && result.value.length > 0) {
      const uniqueAccountIds = [...new Set(result.value.map(opp => opp._customerid_value).filter(Boolean))];
      if (uniqueAccountIds.length > 0) {
        try {
          const accountsResult = await dynamics365Service.getAccountsByIds(uniqueAccountIds);
          if (accountsResult.value) {
            accountsMap = accountsResult.value.reduce((map, account) => {
              map[account.accountid] = account.name;
              return map;
            }, {});
          }
        } catch (accountError) {
          console.warn('Failed to fetch account names:', accountError.message);
        }
      }
    }
    
    res.json({
      success: true,
      opportunities: result.value.map(opp => ({
        id: opp.opportunityid,
        name: opp.name,
        customer: accountsMap[opp._customerid_value] || 'Unknown',
        customerId: opp._customerid_value,
        estimatedValue: opp.estimatedvalue,
        closeDate: opp.actualclosedate,
        stage: opp.stepname,
        status: opp.statecode === 0 ? 'Open' : 'Closed'
      }))
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

// 活動一覧を取得
router.get('/activities', authMiddleware, async (req, res) => {
  try {
    const regardingObjectId = req.query.regardingObjectId;
    const limit = parseInt(req.query.limit) || 50;
    const result = await dynamics365Service.getActivities(regardingObjectId, limit);
    
    res.json({
      success: true,
      activities: result.value.map(activity => ({
        id: activity.activityid,
        subject: activity.subject,
        description: activity.description,
        createdOn: activity.createdon,
        status: activity.statecode === 0 ? 'Open' : activity.statecode === 1 ? 'Completed' : 'Cancelled',
        priority: activity.prioritycode === 0 ? 'Low' : activity.prioritycode === 1 ? 'Normal' : 'High',
        regardingObjectId: activity._regardingobjectid_value
      }))
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

// メモ・議事録一覧を取得
router.get('/notes', authMiddleware, async (req, res) => {
  try {
    const regardingObjectId = req.query.regardingObjectId;
    const limit = parseInt(req.query.limit) || 50;
    const result = await dynamics365Service.getNotes(regardingObjectId, limit);
    
    res.json({
      success: true,
      notes: result.value.map(note => ({
        id: note.annotationid,
        subject: note.subject,
        noteText: note.notetext,
        createdOn: note.createdon,
        modifiedOn: note.modifiedon,
        regardingObjectId: note._objectid_value,
        fileName: note.filename,
        mimeType: note.mimetype
      }))
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'メモの取得に失敗しました',
      error: error.message 
    });
  }
});

// 会議情報を取得
router.get('/meetings', authMiddleware, async (req, res) => {
  try {
    const regardingObjectId = req.query.regardingObjectId;
    const limit = parseInt(req.query.limit) || 50;
    const result = await dynamics365Service.getMeetings(regardingObjectId, limit);
    
    res.json({
      success: true,
      meetings: result.value.map(meeting => ({
        id: meeting.activityid,
        subject: meeting.subject,
        description: meeting.description,
        scheduledStart: meeting.scheduledstart,
        scheduledEnd: meeting.scheduledend,
        actualStart: meeting.actualstart,
        actualEnd: meeting.actualend,
        location: meeting.location,
        status: meeting.statecode === 0 ? 'Open' : meeting.statecode === 1 ? 'Completed' : 'Cancelled',
        regardingObjectId: meeting._regardingobjectid_value
      }))
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

// 日報をDynamics 365に同期
router.post('/sync-report', authMiddleware, async (req, res) => {
  try {
    const reportData = req.body;
    const result = await dynamics365Service.createActivity(reportData);
    
    res.json({
      success: true,
      message: 'Dynamics 365に日報を同期しました',
      activityId: result.activityid
    });
  } catch (error) {
    console.error('Sync report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Dynamics 365への同期に失敗しました',
      error: error.message 
    });
  }
});

module.exports = router;