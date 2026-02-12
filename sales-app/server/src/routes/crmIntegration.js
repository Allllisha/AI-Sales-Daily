const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const pool = require('../db/pool');
const Dynamics365Service = require('../services/dynamics365Service');
const SalesforceService = require('../services/salesforceService');

const router = express.Router();

// 日報をCRMに同期（新規作成または更新）
router.post('/reports/:id/sync', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { crmType, action, crmData } = req.body;
    
    console.log('=== CRM Sync Request ===');
    console.log('Report ID:', id);
    console.log('CRM Type:', crmType);
    console.log('Action:', action);
    console.log('CRM Data:', JSON.stringify(crmData, null, 2));
    
    // 権限チェックとレポートデータ取得（report_slotsも含む）
    const reportResult = await pool.query(`
      SELECT r.*, 
             rs.customer, rs.project, rs.next_action, rs.budget, 
             rs.schedule, rs.participants, rs.location, rs.issues,
             rs.personal_info, rs.relationship_notes
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.id = $1 AND r.user_id = $2
    `, [id, req.userId]);
    
    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const report = reportResult.rows[0];
    
    // 既存のCRMデータを保存（別案件への紐付け変更時の履歴用）
    const previousCrmData = report.crm_data ? 
      (typeof report.crm_data === 'string' ? JSON.parse(report.crm_data) : report.crm_data) : 
      null;
    
    // report_slotsのデータをreport.slotsにマージ
    report.slots = {
      customer: report.customer,
      project: report.project,
      next_action: report.next_action,
      budget: report.budget,
      schedule: report.schedule,
      participants: report.participants,
      location: report.location,
      issues: report.issues,
      personal_info: report.personal_info,
      relationship_notes: report.relationship_notes
    };
    
    // questions_answersも取得
    const qaResult = await pool.query(
      'SELECT question, answer, timestamp, order_index FROM report_qa WHERE report_id = $1 ORDER BY order_index',
      [id]
    );
    
    if (qaResult.rows.length > 0) {
      report.questions_answers = qaResult.rows;
    }
    
    // 実際のCRM APIを呼び出す
    let syncResult = null;
    try {
      // CRMタイプの検証
      if (!crmType || (crmType !== 'dynamics365' && crmType !== 'salesforce')) {
        throw new Error(`サポートされていないCRMタイプです: ${crmType}`);
      }
      
      // アクションの検証
      if (!action || (action !== 'create' && action !== 'update')) {
        throw new Error(`サポートされていないアクションです: ${action}`);
      }
      
      if (crmType === 'dynamics365') {
        const dynamics365Service = new Dynamics365Service();
        if (action === 'create') {
          // Dynamics365に新規作成
          syncResult = await dynamics365Service.createReportInCRM(req.userId, report, crmData);
        } else if (action === 'update' && crmData) {
          // Dynamics365の既存レコードを更新
          syncResult = await dynamics365Service.updateReportInCRM(req.userId, report, crmData);
        }
      } else if (crmType === 'salesforce') {
        const salesforceService = new SalesforceService();
        if (action === 'create') {
          // Salesforceに新規作成
          syncResult = await salesforceService.createReportInCRM(req.userId, report, crmData);
        } else if (action === 'update' && crmData) {
          // Salesforceの既存レコードを更新
          syncResult = await salesforceService.updateReportInCRM(req.userId, report, crmData);
        }
      }
    } catch (crmError) {
      console.error('CRM sync error:', crmError);
      console.error('Error stack:', crmError.stack);
      console.error('Request data:', { crmType, action, crmData });
      
      // CRM同期失敗を記録
      await pool.query(`
        UPDATE reports 
        SET sync_status = 'failed',
            sync_error = $2
        WHERE id = $1
      `, [id, crmError.message]);
      
      return res.status(500).json({ 
        error: crmError.message || 'CRM同期に失敗しました', 
        details: crmError.message,
        type: crmType,
        action: action
      });
    }
    
    // 成功時のデータベース更新
    if (syncResult) {
      await pool.query(`
        UPDATE reports 
        SET crm_type = $2, 
            crm_data = $3,
            last_sync_date = CURRENT_TIMESTAMP,
            sync_status = 'synced',
            sync_error = NULL
        WHERE id = $1
      `, [id, crmType, JSON.stringify({ 
        ...crmData, 
        ...syncResult,
        actionType: action,
        isNew: action === 'create'
      })]);
      
      // 同期履歴をcrm_sync_historyテーブルに記録
      // 別案件への紐付け変更を検出
      const isChangingOpportunity = action === 'update' && 
        previousCrmData?.opportunityId && 
        crmData.opportunityId && 
        previousCrmData.opportunityId !== crmData.opportunityId;
      
      const syncData = {
        before: action === 'update' ? previousCrmData : null,  // 以前のCRMデータを記録
        after: {
          ...syncResult,
          accountId: crmData.accountId,
          accountName: crmData.accountName,
          opportunityId: crmData.opportunityId,
          opportunityName: crmData.opportunityName
        },
        fields_updated: action === 'update' ? {
          customer: report.slots?.customer,
          project: report.slots?.project,
          budget: report.slots?.budget,
          schedule: report.slots?.schedule,
          next_action: report.slots?.next_action,
          issues: report.slots?.issues,
          // 案件変更の場合は明示的に記録
          ...(isChangingOpportunity ? {
            previous_opportunity: `${previousCrmData.opportunityName} (ID: ${previousCrmData.opportunityId})`,
            new_opportunity: `${crmData.opportunityName} (ID: ${crmData.opportunityId})`
          } : {})
        } : null,
        fields_created: action === 'create' ? {
          customer: report.slots?.customer,
          project: report.slots?.project,
          budget: report.slots?.budget,
          schedule: report.slots?.schedule,
          participants: report.slots?.participants,
          location: report.slots?.location,
          next_action: report.slots?.next_action,
          issues: report.slots?.issues
        } : null
      };
      
      await pool.query(`
        INSERT INTO crm_sync_history (
          report_id, crm_type, sync_type, sync_direction, 
          sync_data, sync_result, sync_status, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `, [
        id,
        crmType,
        action,
        'to_crm',
        JSON.stringify(syncData),
        JSON.stringify(syncResult),
        'completed'
      ]);
      
      // crm_mappingsテーブルも更新（複数CRM対応）
      if (isChangingOpportunity || action === 'update') {
        // 既存のマッピングを非アクティブ化
        await pool.query(`
          UPDATE crm_mappings 
          SET is_active = false, deactivated_at = CURRENT_TIMESTAMP
          WHERE report_id = $1 AND crm_type = $2 AND is_active = true
        `, [id, crmType]);
        
        // 新しいマッピングを作成
        await pool.query(`
          INSERT INTO crm_mappings (
            report_id, crm_type, 
            crm_account_id, crm_account_name,
            crm_opportunity_id, crm_opportunity_name,
            mapping_type, priority, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          id,
          crmType,
          crmData.accountId,
          crmData.accountName,
          crmData.opportunityId,
          crmData.opportunityName,
          action === 'create' ? 'created' : 'linked',
          1, // デフォルト優先度
          true
        ]);
      }
    }
    
    res.json({
      success: true,
      message: `Report ${action === 'update' ? 'updated' : 'created'} in ${crmType}`,
      data: { 
        reportId: id, 
        crmType, 
        action,
        crmData: {
          ...crmData,
          ...syncResult
        }
      }
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// CRMマッピング情報を取得（複数CRM対応）
router.get('/reports/:id/crm-mapping', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // まず、reportsテーブルから既存のCRMデータを取得（後方互換性）
    const reportResult = await pool.query(`
      SELECT id, crm_type, crm_data, sync_status, last_sync_date
      FROM reports 
      WHERE id = $1 AND user_id = $2
    `, [id, req.userId]);
    
    if (reportResult.rows.length === 0) {
      return res.json({ mapped: false, mappings: [] });
    }
    
    const report = reportResult.rows[0];
    
    // crm_mappingsテーブルから全てのアクティブな紐付けを取得
    const mappingsResult = await pool.query(`
      SELECT 
        id,
        crm_type,
        crm_account_id,
        crm_account_name,
        crm_opportunity_id,
        crm_opportunity_name,
        mapping_type,
        priority,
        is_active,
        created_at,
        updated_at
      FROM crm_mappings
      WHERE report_id = $1 AND is_active = true
      ORDER BY priority DESC, created_at ASC
    `, [id]);
    
    // 複数のマッピング情報を構築
    const mappings = mappingsResult.rows.map(mapping => ({
      id: mapping.id,
      crm_type: mapping.crm_type,
      crm_data: {
        accountId: mapping.crm_account_id,
        accountName: mapping.crm_account_name,
        opportunityId: mapping.crm_opportunity_id,
        opportunityName: mapping.crm_opportunity_name
      },
      priority: mapping.priority,
      mapping_type: mapping.mapping_type,
      created_at: mapping.created_at,
      updated_at: mapping.updated_at
    }));
    
    // 後方互換性のため、reportsテーブルのデータも含める
    if (report.crm_type && report.crm_data && mappings.length === 0) {
      res.json({
        mapped: true,
        mapping: {
          crm_type: report.crm_type,
          crm_data: report.crm_data,
          sync_status: report.sync_status,
          last_sync_date: report.last_sync_date
        },
        mappings: []
      });
    } else if (mappings.length > 0) {
      // 優先度が最も高いマッピングをメインとして返す
      const mainMapping = mappings[0];
      res.json({
        mapped: true,
        mapping: {
          crm_type: mainMapping.crm_type,
          crm_data: mainMapping.crm_data,
          sync_status: report.sync_status,
          last_sync_date: report.last_sync_date
        },
        mappings: mappings // 全てのマッピングも返す
      });
    } else {
      res.json({ mapped: false, mappings: [] });
    }
  } catch (error) {
    console.error('Get CRM mapping error:', error);
    res.status(500).json({ error: error.message });
  }
});

// CRM紐付けを削除（非アクティブ化）
router.delete('/reports/:reportId/crm-mapping/:mappingId', authMiddleware, async (req, res) => {
  try {
    const { reportId, mappingId } = req.params;
    
    // マッピングの所有権を確認
    const checkResult = await pool.query(`
      SELECT m.id 
      FROM crm_mappings m
      JOIN reports r ON m.report_id = r.id
      WHERE m.id = $1 AND m.report_id = $2 AND r.user_id = $3
    `, [mappingId, reportId, req.userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'マッピングが見つかりません' });
    }
    
    // マッピングを非アクティブ化
    await pool.query(`
      UPDATE crm_mappings 
      SET is_active = false, deactivated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [mappingId]);
    
    res.json({ success: true, message: 'CRM紐付けを解除しました' });
  } catch (error) {
    console.error('Delete CRM mapping error:', error);
    res.status(500).json({ error: error.message });
  }
});

// CRM紐付けの優先順位を変更
router.put('/reports/:reportId/crm-mapping/:mappingId/priority', authMiddleware, async (req, res) => {
  try {
    const { reportId, mappingId } = req.params;
    const { priority } = req.body;
    
    // マッピングの所有権を確認
    const checkResult = await pool.query(`
      SELECT m.id 
      FROM crm_mappings m
      JOIN reports r ON m.report_id = r.id
      WHERE m.id = $1 AND m.report_id = $2 AND r.user_id = $3
    `, [mappingId, reportId, req.userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'マッピングが見つかりません' });
    }
    
    // 優先順位を更新
    await pool.query(`
      UPDATE crm_mappings 
      SET priority = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [priority, mappingId]);
    
    res.json({ success: true, message: '優先順位を更新しました' });
  } catch (error) {
    console.error('Update mapping priority error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 同期履歴を取得（詳細版）
router.get('/sync-history', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.query;
    
    if (!reportId) {
      return res.json([]);
    }
    
    // crm_sync_historyテーブルから詳細な履歴を取得
    const result = await pool.query(`
      SELECT 
        h.id,
        h.crm_type,
        h.sync_type,
        h.sync_direction,
        h.sync_data,
        h.sync_result,
        h.sync_status,
        h.error_message,
        h.created_at,
        h.completed_at
      FROM crm_sync_history h
      JOIN reports r ON h.report_id = r.id
      WHERE h.report_id = $1 AND r.user_id = $2
      ORDER BY h.created_at DESC
      LIMIT 20
    `, [reportId, req.userId]);
    
    // 旧形式の履歴も取得（後方互換性のため）
    if (result.rows.length === 0) {
      const oldResult = await pool.query(`
        SELECT 
          id, 
          crm_type, 
          last_sync_date as created_at, 
          sync_status,
          CASE 
            WHEN crm_data->>'isNew' = 'true' THEN 'create'
            WHEN crm_data->>'actionType' = 'create' THEN 'create'
            WHEN crm_data->>'actionType' = 'update' THEN 'update'
            ELSE 'sync'
          END as sync_type
        FROM reports 
        WHERE id = $1 AND user_id = $2 AND last_sync_date IS NOT NULL
        ORDER BY last_sync_date DESC
        LIMIT 10
      `, [reportId, req.userId]);
      
      return res.json(oldResult.rows);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get sync history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 最近のCRM案件を取得（ドロップダウン用）
router.get('/recent-opportunities', authMiddleware, async (req, res) => {
  try {
    const { crmType = 'salesforce' } = req.query;
    const userId = req.userId;
    
    // CRMサービスは既にファイルの先頭でインポート済み
    
    let results = {
      opportunities: [],
      accounts: []
    };
    
    if (crmType === 'salesforce') {
      const salesforceService = new SalesforceService();
      
      try {
        // 最近の商談を取得（簡単のため検索APIを活用）
        const searchResults = await salesforceService.searchOpportunities(userId, '');
        results.opportunities = searchResults.slice(0, 20);
      } catch (error) {
        console.log('Salesforce not connected or error:', error.message);
      }
    } else if (crmType === 'dynamics365') {
      const dynamics365Service = new Dynamics365Service();
      
      try {
        // 最近の商談を取得（簡単のため検索APIを活用）
        const searchResults = await dynamics365Service.searchOpportunities(userId, '');
        results.opportunities = searchResults.slice(0, 20);
      } catch (error) {
        console.log('Dynamics365 not connected or error:', error.message);
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Get recent opportunities error:', error);
    res.status(500).json({ 
      error: '最近の案件の取得に失敗しました',
      details: error.message 
    });
  }
});

module.exports = router;