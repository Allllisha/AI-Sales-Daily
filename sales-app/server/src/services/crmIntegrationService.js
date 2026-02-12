const pool = require('../db/pool');

// Phase 1: 日報をCRMに新規作成
async function createInCRM(reportId, crmType, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 日報データを取得
    const reportResult = await client.query(`
      SELECT r.*, rs.*, u.name as user_name
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [reportId]);
    
    if (reportResult.rows.length === 0) {
      throw new Error('Report not found');
    }
    
    const report = reportResult.rows[0];
    
    // Q&Aを取得
    const qaResult = await client.query(
      'SELECT * FROM report_qa WHERE report_id = $1 ORDER BY order_index',
      [reportId]
    );
    
    report.questions_answers = qaResult.rows;
    
    // 同期履歴を作成
    const syncHistoryResult = await client.query(`
      INSERT INTO crm_sync_history (
        report_id, crm_type, sync_type, sync_direction, sync_data, sync_status
      ) VALUES ($1, $2, 'create', 'to_crm', $3, 'processing')
      RETURNING id
    `, [reportId, crmType, JSON.stringify(report)]);
    
    const syncHistoryId = syncHistoryResult.rows[0].id;
    
    // CRMタイプに応じて処理
    let result;
    if (crmType === 'salesforce') {
      result = await createInSalesforce(report, userId);
    } else if (crmType === 'dynamics365') {
      result = await createInDynamics365(report, userId);
    } else {
      throw new Error('Invalid CRM type');
    }
    
    // CRMマッピングを保存
    await client.query(`
      INSERT INTO crm_mappings (
        report_id, crm_type, crm_account_id, crm_account_name,
        crm_opportunity_id, crm_opportunity_name, crm_activity_id,
        mapping_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual')
    `, [
      reportId, crmType,
      result.accountId, result.accountName,
      result.opportunityId, result.opportunityName,
      result.activityId
    ]);
    
    // レポートのCRM連携状態を更新
    await client.query(`
      UPDATE reports 
      SET crm_linked = true, 
          crm_type = $2, 
          last_sync_date = CURRENT_TIMESTAMP,
          sync_status = 'synced'
      WHERE id = $1
    `, [reportId, crmType]);
    
    // report_slotsも更新
    if (crmType === 'salesforce') {
      await client.query(`
        UPDATE report_slots 
        SET salesforce_account_id = $2, 
            salesforce_opportunity_id = $3
        WHERE report_id = $1
      `, [reportId, result.accountId, result.opportunityId]);
    } else if (crmType === 'dynamics365') {
      await client.query(`
        UPDATE report_slots 
        SET dynamics365_account_id = $2, 
            dynamics365_opportunity_id = $3
        WHERE report_id = $1
      `, [reportId, result.accountId, result.opportunityId]);
    }
    
    // 同期履歴を更新
    await client.query(`
      UPDATE crm_sync_history 
      SET sync_status = 'completed',
          sync_result = $2,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [syncHistoryId, JSON.stringify(result)]);
    
    await client.query('COMMIT');
    
    return result;
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    // エラーを記録
    await client.query(`
      UPDATE crm_sync_history 
      SET sync_status = 'failed',
          error_message = $2,
          completed_at = CURRENT_TIMESTAMP
      WHERE report_id = $1 AND sync_status = 'processing'
    `, [reportId, error.message]);
    
    throw error;
  } finally {
    client.release();
  }
}

// Phase 1: CRMレコードに日報を追記
async function appendToCRM(reportId, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 日報とCRMマッピング情報を取得
    const reportResult = await client.query(`
      SELECT r.*, rs.*, cm.*, u.name as user_name
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      LEFT JOIN crm_mappings cm ON r.id = cm.report_id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [reportId]);
    
    if (reportResult.rows.length === 0) {
      throw new Error('Report not found');
    }
    
    const report = reportResult.rows[0];
    
    // Q&Aを取得
    const qaResult = await client.query(
      'SELECT * FROM report_qa WHERE report_id = $1 ORDER BY order_index',
      [reportId]
    );
    
    report.questions_answers = qaResult.rows;
    
    // 同期履歴を作成
    const syncHistoryResult = await client.query(`
      INSERT INTO crm_sync_history (
        report_id, crm_type, sync_type, sync_direction, sync_data, sync_status
      ) VALUES ($1, $2, 'append', 'to_crm', $3, 'processing')
      RETURNING id
    `, [reportId, report.crm_type || report.mode, JSON.stringify(report)]);
    
    const syncHistoryId = syncHistoryResult.rows[0].id;
    
    // CRMタイプに応じて処理
    let result;
    if (report.salesforce_opportunity_id) {
      result = await appendToSalesforce(report, userId);
    } else if (report.dynamics365_opportunity_id) {
      result = await appendToDynamics365(report, userId);
    } else {
      throw new Error('No CRM opportunity linked to this report');
    }
    
    // 同期状態を更新
    await client.query(`
      UPDATE reports 
      SET last_sync_date = CURRENT_TIMESTAMP,
          sync_status = 'synced'
      WHERE id = $1
    `, [reportId]);
    
    // 同期履歴を更新
    await client.query(`
      UPDATE crm_sync_history 
      SET sync_status = 'completed',
          sync_result = $2,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [syncHistoryId, JSON.stringify(result)]);
    
    await client.query('COMMIT');
    
    return result;
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    // エラーを記録
    await client.query(`
      UPDATE reports 
      SET sync_status = 'failed',
          sync_error = $2
      WHERE id = $1
    `, [reportId, error.message]);
    
    throw error;
  } finally {
    client.release();
  }
}

// Phase 2: CRM案件を検索
async function searchCRMRecords(searchTerm, crmType, userId) {
  if (crmType === 'salesforce') {
    return await searchSalesforceRecords(searchTerm);
  } else if (crmType === 'dynamics365') {
    return await searchDynamics365Records(searchTerm);
  } else {
    throw new Error('Invalid CRM type');
  }
}

// Phase 2: 日報を既存CRM案件に紐付け
async function linkToCRM(reportId, crmData, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // CRMマッピングを作成または更新
    await client.query(`
      INSERT INTO crm_mappings (
        report_id, crm_type, crm_account_id, crm_account_name,
        crm_opportunity_id, crm_opportunity_name, mapping_type
      ) VALUES ($1, $2, $3, $4, $5, $6, 'manual')
      ON CONFLICT (report_id, crm_type) DO UPDATE SET
        crm_account_id = $3,
        crm_account_name = $4,
        crm_opportunity_id = $5,
        crm_opportunity_name = $6,
        mapping_type = 'manual',
        updated_at = CURRENT_TIMESTAMP
    `, [
      reportId, crmData.crmType,
      crmData.accountId, crmData.accountName,
      crmData.opportunityId, crmData.opportunityName
    ]);
    
    // レポートのCRM連携状態を更新
    await client.query(`
      UPDATE reports 
      SET crm_linked = true,
          crm_type = $2
      WHERE id = $1
    `, [reportId, crmData.crmType]);
    
    // report_slotsも更新
    if (crmData.crmType === 'salesforce') {
      await client.query(`
        UPDATE report_slots 
        SET salesforce_account_id = $2, 
            salesforce_opportunity_id = $3
        WHERE report_id = $1
      `, [reportId, crmData.accountId, crmData.opportunityId]);
    } else if (crmData.crmType === 'dynamics365') {
      await client.query(`
        UPDATE report_slots 
        SET dynamics365_account_id = $2, 
            dynamics365_opportunity_id = $3
        WHERE report_id = $1
      `, [reportId, crmData.accountId, crmData.opportunityId]);
    }
    
    await client.query('COMMIT');
    
    return { success: true, message: 'Report linked to CRM successfully' };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Phase 2: 重複チェック
async function checkDuplicates(reportData, crmType) {
  const duplicates = [];
  
  if (crmType === 'salesforce') {
    // Salesforceで顧客名と案件名で検索
    const accounts = await searchSalesforceAccounts(reportData.customer);
    const opportunities = await searchSalesforceOpportunities(reportData.project);
    
    for (const account of accounts) {
      for (const opportunity of opportunities) {
        if (opportunity.AccountId === account.Id) {
          duplicates.push({
            confidence: calculateSimilarity(reportData, { account, opportunity }),
            account,
            opportunity,
            crmType: 'salesforce'
          });
        }
      }
    }
  } else if (crmType === 'dynamics365') {
    // Dynamics365で同様の処理
    const accounts = await searchDynamics365Accounts(reportData.customer);
    const opportunities = await searchDynamics365Opportunities(reportData.project);
    
    for (const account of accounts) {
      for (const opportunity of opportunities) {
        if (opportunity.parentaccountid === account.accountid) {
          duplicates.push({
            confidence: calculateSimilarity(reportData, { account, opportunity }),
            account,
            opportunity,
            crmType: 'dynamics365'
          });
        }
      }
    }
  }
  
  // 信頼度でソート
  return duplicates.sort((a, b) => b.confidence - a.confidence);
}

// Phase 3: 自動同期設定を取得
async function getSyncConfig(userId, crmType) {
  const result = await pool.query(`
    SELECT * FROM crm_sync_config 
    WHERE user_id = $1 AND crm_type = $2
  `, [userId, crmType]);
  
  if (result.rows.length === 0) {
    // デフォルト設定を作成
    const insertResult = await pool.query(`
      INSERT INTO crm_sync_config (user_id, crm_type)
      VALUES ($1, $2)
      RETURNING *
    `, [userId, crmType]);
    return insertResult.rows[0];
  }
  
  return result.rows[0];
}

// Phase 3: 自動同期設定を更新
async function updateSyncConfig(userId, crmType, config) {
  const result = await pool.query(`
    UPDATE crm_sync_config 
    SET auto_sync_enabled = $3,
        sync_frequency = $4,
        sync_time = $5,
        conflict_resolution = $6,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND crm_type = $2
    RETURNING *
  `, [
    userId, crmType,
    config.autoSyncEnabled,
    config.syncFrequency,
    config.syncTime,
    config.conflictResolution
  ]);
  
  return result.rows[0];
}

// Phase 3: 競合を検出
async function detectConflicts(reportId, crmData) {
  const conflicts = [];
  
  // 日報データを取得
  const reportResult = await pool.query(`
    SELECT rs.* FROM report_slots rs
    WHERE rs.report_id = $1
  `, [reportId]);
  
  if (reportResult.rows.length === 0) {
    return conflicts;
  }
  
  const reportData = reportResult.rows[0];
  
  // フィールドごとに比較
  const fieldsToCompare = [
    'customer', 'project', 'budget', 'schedule', 
    'participants', 'location', 'next_action'
  ];
  
  for (const field of fieldsToCompare) {
    const reportValue = reportData[field];
    const crmValue = crmData[field];
    
    if (reportValue && crmValue && reportValue !== crmValue) {
      conflicts.push({
        field_name: field,
        report_value: reportValue,
        crm_value: crmValue
      });
    }
  }
  
  return conflicts;
}

// Phase 3: 競合を解決
async function resolveConflicts(reportId, resolutions) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const resolution of resolutions) {
      // 競合記録を保存
      await client.query(`
        INSERT INTO crm_sync_conflicts (
          report_id, field_name, report_value, crm_value,
          resolution, resolved_value, resolved_by, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `, [
        reportId,
        resolution.fieldName,
        resolution.reportValue,
        resolution.crmValue,
        resolution.resolution,
        resolution.resolvedValue,
        resolution.resolvedBy
      ]);
      
      // 選択された値でレポートを更新
      if (resolution.resolution === 'use_crm') {
        await client.query(`
          UPDATE report_slots 
          SET ${resolution.fieldName} = $2
          WHERE report_id = $1
        `, [reportId, resolution.crmValue]);
      }
    }
    
    await client.query('COMMIT');
    
    return { success: true, message: 'Conflicts resolved successfully' };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Phase 3: バッチ同期
async function batchSync(userId, crmType) {
  const client = await pool.connect();
  
  try {
    // 未同期のレポートを取得
    const reportsResult = await client.query(`
      SELECT r.id FROM reports r
      WHERE r.user_id = $1 
        AND (r.sync_status = 'pending' OR r.sync_status = 'failed')
        AND (r.crm_type = $2 OR r.mode = $2)
      ORDER BY r.created_at ASC
      LIMIT 50
    `, [userId, crmType]);
    
    const results = {
      total: reportsResult.rows.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const report of reportsResult.rows) {
      try {
        // 既にCRMにリンクされているか確認
        const mappingResult = await client.query(`
          SELECT * FROM crm_mappings WHERE report_id = $1 AND crm_type = $2
        `, [report.id, crmType]);
        
        if (mappingResult.rows.length > 0) {
          // 既存レコードに追記
          await appendToCRM(report.id, userId);
        } else {
          // 新規作成
          await createInCRM(report.id, crmType, userId);
        }
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          reportId: report.id,
          error: error.message
        });
      }
    }
    
    return results;
    
  } finally {
    client.release();
  }
}

// ヘルパー関数：類似度計算
function calculateSimilarity(reportData, crmData) {
  let score = 0;
  let maxScore = 0;
  
  // 顧客名の一致
  if (reportData.customer && crmData.account) {
    maxScore += 10;
    if (reportData.customer.toLowerCase() === crmData.account.Name?.toLowerCase()) {
      score += 10;
    } else if (reportData.customer.toLowerCase().includes(crmData.account.Name?.toLowerCase()) ||
               crmData.account.Name?.toLowerCase().includes(reportData.customer.toLowerCase())) {
      score += 5;
    }
  }
  
  // 案件名の一致
  if (reportData.project && crmData.opportunity) {
    maxScore += 10;
    if (reportData.project.toLowerCase() === crmData.opportunity.Name?.toLowerCase()) {
      score += 10;
    } else if (reportData.project.toLowerCase().includes(crmData.opportunity.Name?.toLowerCase()) ||
               crmData.opportunity.Name?.toLowerCase().includes(reportData.project.toLowerCase())) {
      score += 5;
    }
  }
  
  // 予算の近似
  if (reportData.budget && crmData.opportunity?.Amount) {
    maxScore += 5;
    const reportBudget = parseFloat(reportData.budget.replace(/[^0-9]/g, ''));
    const crmBudget = crmData.opportunity.Amount;
    if (Math.abs(reportBudget - crmBudget) / crmBudget < 0.1) {
      score += 5;
    } else if (Math.abs(reportBudget - crmBudget) / crmBudget < 0.3) {
      score += 3;
    }
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

// CRM固有の実装
const salesforceService = require('./salesforceService');
const dynamics365Service = require('./dynamics365Service');

async function createInSalesforce(report, userId) {
  try {
    // アカウント作成または検索
    const account = await salesforceService.findOrCreateAccount(userId, {
      name: report.customer,
      industry: report.industry
    });
    
    // 商談作成
    const opportunity = await salesforceService.createOpportunity(userId, {
      name: report.project || `${report.customer} - 営業案件`,
      accountId: account.Id,
      amount: salesforceService.parseAmount(report.budget),
      closeDate: salesforceService.parseScheduleDate(report.schedule),
      description: salesforceService.formatReportForSalesforce(report)
    });
    
    // 活動記録作成
    const activity = await salesforceService.createActivity(userId, {
      subject: `営業日報 - ${report.report_date || report.date}`,
      description: salesforceService.formatReportForSalesforce(report),
      activityDate: report.report_date || report.date,
      opportunityId: opportunity.Id
    });
    
    return {
      accountId: account.Id,
      accountName: account.Name,
      opportunityId: opportunity.Id,
      opportunityName: opportunity.Name,
      activityId: activity.id
    };
  } catch (error) {
    console.error('Create in Salesforce error:', error);
    throw error;
  }
}

async function createInDynamics365(report, userId) {
  try {
    // アカウント作成または検索
    const account = await dynamics365Service.findOrCreateAccount(userId, {
      name: report.customer,
      industry: report.industry
    });
    
    // 営業案件作成
    const opportunity = await dynamics365Service.createOpportunity(userId, {
      name: report.project || `${report.customer} - 営業案件`,
      accountId: account.accountid,
      amount: dynamics365Service.parseAmount(report.budget),
      closeDate: dynamics365Service.parseScheduleDate(report.schedule),
      description: dynamics365Service.formatReportForDynamics365(report)
    });
    
    // 活動記録作成
    const activity = await dynamics365Service.createActivity(userId, {
      subject: `営業日報 - ${report.report_date || report.date}`,
      description: dynamics365Service.formatReportForDynamics365(report),
      activityDate: report.report_date || report.date,
      opportunityId: opportunity.opportunityid
    });
    
    return {
      accountId: account.accountid,
      accountName: account.name,
      opportunityId: opportunity.opportunityid,
      opportunityName: opportunity.name,
      activityId: activity.activityid
    };
  } catch (error) {
    console.error('Create in Dynamics365 error:', error);
    throw error;
  }
}

async function appendToSalesforce(report, userId) {
  try {
    // ノートを追加
    const note = await salesforceService.addNoteToOpportunity(
      userId,
      report.salesforce_opportunity_id,
      {
        title: `追加日報 - ${report.report_date || report.date}`,
        body: salesforceService.formatReportForSalesforce(report)
      }
    );
    
    // 活動記録も追加
    const activity = await salesforceService.createActivity(userId, {
      subject: `フォローアップ - ${report.report_date || report.date}`,
      description: salesforceService.formatReportForSalesforce(report),
      activityDate: report.report_date || report.date,
      opportunityId: report.salesforce_opportunity_id
    });
    
    return {
      noteId: note.id,
      activityId: activity.id
    };
  } catch (error) {
    console.error('Append to Salesforce error:', error);
    throw error;
  }
}

async function appendToDynamics365(report, userId) {
  try {
    // メモを追加
    const note = await dynamics365Service.addNoteToOpportunity(
      userId,
      report.dynamics365_opportunity_id,
      {
        title: `追加日報 - ${report.report_date || report.date}`,
        body: dynamics365Service.formatReportForDynamics365(report)
      }
    );
    
    // 活動記録も追加
    const activity = await dynamics365Service.createActivity(userId, {
      subject: `フォローアップ - ${report.report_date || report.date}`,
      description: dynamics365Service.formatReportForDynamics365(report),
      activityDate: report.report_date || report.date,
      opportunityId: report.dynamics365_opportunity_id
    });
    
    return {
      noteId: note.annotationid,
      activityId: activity.activityid
    };
  } catch (error) {
    console.error('Append to Dynamics365 error:', error);
    throw error;
  }
}

async function searchSalesforceRecords(searchTerm) {
  // TODO: 実際のSalesforce API呼び出しを実装
  return {
    accounts: [],
    opportunities: []
  };
}

async function searchDynamics365Records(searchTerm) {
  // TODO: 実際のDynamics365 API呼び出しを実装
  return {
    accounts: [],
    opportunities: []
  };
}

async function searchSalesforceAccounts(customerName) {
  // TODO: 実際のSalesforce API呼び出しを実装
  return [];
}

async function searchSalesforceOpportunities(projectName) {
  // TODO: 実際のSalesforce API呼び出しを実装
  return [];
}

async function searchDynamics365Accounts(customerName) {
  // TODO: 実際のDynamics365 API呼び出しを実装
  return [];
}

async function searchDynamics365Opportunities(projectName) {
  // TODO: 実際のDynamics365 API呼び出しを実装
  return [];
}

module.exports = {
  createInCRM,
  appendToCRM,
  searchCRMRecords,
  linkToCRM,
  checkDuplicates,
  getSyncConfig,
  updateSyncConfig,
  detectConflicts,
  resolveConflicts,
  batchSync
};