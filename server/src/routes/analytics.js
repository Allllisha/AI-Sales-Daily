const express = require('express');
const { authMiddleware, managerOnly } = require('../middleware/auth');
const pool = require('../db/pool');

const router = express.Router();

// 個人向け分析データ取得
router.get('/personal', authMiddleware, async (req, res) => {
  try {
    const { period = '30' } = req.query; // デフォルト30日間
    const userId = req.userId;
    console.log('Analytics request - userId:', userId, 'period:', period);
    
    // 期間の計算（日本時間で計算）
    const jstOffset = 9 * 60 * 60 * 1000; // JST is UTC+9
    const nowUTC = new Date();
    const nowJST = new Date(nowUTC.getTime() + jstOffset);
    
    // JST での今日の終了時間（23:59:59.999）
    const endDateJST = new Date(nowJST.getFullYear(), nowJST.getMonth(), nowJST.getDate(), 23, 59, 59, 999);
    const endDate = new Date(endDateJST.getTime() - jstOffset); // UTC に変換
    
    // JST での開始日の開始時間（00:00:00.000）
    const startDateJST = new Date(nowJST.getFullYear(), nowJST.getMonth(), nowJST.getDate() - parseInt(period), 0, 0, 0, 0);
    const startDate = new Date(startDateJST.getTime() - jstOffset); // UTC に変換
    
    console.log('Date range - startDate:', startDate, 'endDate:', endDate);
    
    // 基本統計の取得
    console.log('Fetching basic stats...');
    const basicStats = await getBasicStats(userId, startDate, endDate);
    console.log('Basic stats:', basicStats);
    
    // 日別レポート数の取得
    console.log('Fetching daily reports...');
    const dailyReports = await getDailyReports(userId, startDate, endDate);
    console.log('Daily reports:', dailyReports.length);
    
    // 顧客別商談数の取得
    console.log('Fetching customer analysis...');
    const customerAnalysis = await getCustomerAnalysis(userId, startDate, endDate);
    console.log('Customer analysis:', customerAnalysis.length);
    
    // 案件カテゴリ分析
    console.log('Fetching project categories...');
    const projectCategories = await getProjectCategories(userId, startDate, endDate);
    console.log('Project categories:', projectCategories.length);
    
    // 課題・リスク分析
    console.log('Fetching issues analysis...');
    const issuesAnalysis = await getIssuesAnalysis(userId, startDate, endDate);
    console.log('Issues analysis:', issuesAnalysis.length);
    
    // 関係構築情報の分析
    console.log('Fetching relationship analysis...');
    const relationshipAnalysis = await getRelationshipAnalysis(userId, startDate, endDate);
    console.log('Relationship analysis:', relationshipAnalysis.length);
    
    // アクション一覧の取得
    console.log('Fetching actions list...');
    const actionsList = await getActionsList(userId, startDate, endDate);
    console.log('Actions list:', actionsList.length);
    
    // アクション完了統計を計算（仮想的なデータとして70%を完了済みに設定）
    const totalActions = actionsList.length;
    const completedActions = Math.floor(totalActions * 0.7);
    const pendingActions = totalActions - completedActions;
    
    // 基本統計のアクション数を実際の項目数に更新
    basicStats.reports_with_actions = totalActions;
    basicStats.completed_actions = completedActions;
    basicStats.pending_actions = pendingActions;
    
    res.json({
      period: parseInt(period),
      basicStats,
      dailyReports,
      customerAnalysis,
      projectCategories,
      issuesAnalysis,
      relationshipAnalysis,
      actionsList
    });
    
  } catch (error) {
    console.error('Personal analytics error:', error);
    res.status(500).json({ error: '分析データの取得に失敗しました' });
  }
});

// 基本統計を取得
async function getBasicStats(userId, startDate, endDate) {
  try {
    console.log('getBasicStats called with:', { userId, startDate, endDate });
    
    // まず全ての日報を確認
    const allReports = await pool.query('SELECT id, user_id, report_date, status FROM reports WHERE user_id = $1', [userId]);
    console.log('All reports for user:', allReports.rows);
    
    // 基本統計を単純なクエリで取得
    const result = await pool.query(`
      SELECT 
        COUNT(r.id) as total_reports,
        COUNT(CASE WHEN r.status = 'draft' THEN 1 END) as draft_reports,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_reports,
        COUNT(DISTINCT rs.customer) FILTER (WHERE rs.customer IS NOT NULL AND rs.customer != '') as unique_customers,
        COUNT(CASE WHEN rs.next_action IS NOT NULL AND rs.next_action != '' THEN 1 END) as reports_with_actions,
        COUNT(CASE WHEN rs.issues IS NOT NULL AND array_length(rs.issues, 1) > 0 THEN 1 END) as reports_with_issues
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
    `, [userId, startDate, endDate]);
    
    console.log('getBasicStats query result:', result.rows[0]);
    console.log('Query parameters used:', { userId, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
    
    // デバッグ: 期間内の日報を直接確認
    const debugReports = await pool.query(`
      SELECT r.id, r.user_id, r.report_date, r.status, r.created_at 
      FROM reports r 
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
    `, [userId, startDate, endDate]);
    console.log('Reports in date range:', debugReports.rows);
    
    // さらに詳細なデバッグ: report_slotsテーブルとのJOINを確認
    const joinDebug = await pool.query(`
      SELECT r.id, r.user_id, r.report_date, r.status, rs.customer, rs.project
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
    `, [userId, startDate, endDate]);
    console.log('Reports with slots JOIN:', joinDebug.rows);
    
    return result.rows[0] || {
      total_reports: 0,
      draft_reports: 0,
      completed_reports: 0,
      unique_customers: 0,
      reports_with_actions: 0,
      reports_with_issues: 0
    };
  } catch (error) {
    console.error('Error in getBasicStats:', error);
    return {
      total_reports: 0,
      draft_reports: 0,
      completed_reports: 0,
      unique_customers: 0,
      reports_with_actions: 0,
      reports_with_issues: 0
    };
  }
}

// 日別レポート数を取得
async function getDailyReports(userId, startDate, endDate) {
  try {
    // 日別日報数を取得
    const reportsResult = await pool.query(`
      SELECT 
        DATE(r.report_date) as date,
        COUNT(r.id) as count
      FROM reports r
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
      GROUP BY DATE(r.report_date)
      ORDER BY DATE(r.report_date)
    `, [userId, startDate, endDate]);
    
    // 日別アクション数を取得（仮想的な完了数として日報数の半分を設定）
    const actionsResult = await pool.query(`
      SELECT 
        DATE(r.report_date) as date,
        COUNT(
          CASE 
            WHEN rs.next_action IS NOT NULL 
            AND rs.next_action != '' 
            AND rs.next_action != '[]' 
            THEN 1 
          END
        ) as action_count
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
      GROUP BY DATE(r.report_date)
      ORDER BY DATE(r.report_date)
    `, [userId, startDate, endDate]);

    // 日別取引先数を取得
    const customersResult = await pool.query(`
      SELECT 
        DATE(r.report_date) as date,
        COUNT(DISTINCT rs.customer) as customer_count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
      AND rs.customer IS NOT NULL AND rs.customer != ''
      GROUP BY DATE(r.report_date)
      ORDER BY DATE(r.report_date)
    `, [userId, startDate, endDate]);
    
    // 日付範囲を埋める（データがない日は0に）- JST対応
    const dailyData = [];
    const jstOffset = 9 * 60 * 60 * 1000; // JST is UTC+9
    const startJST = new Date(startDate.getTime() + jstOffset);
    const endJST = new Date(endDate.getTime() + jstOffset);
    const currentDate = new Date(startJST.getFullYear(), startJST.getMonth(), startJST.getDate());
    
    while (currentDate <= endJST) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // 日報数を検索
      const foundReport = reportsResult.rows.find(row => {
        const rowDateJST = new Date(row.date.getTime() + jstOffset);
        const dbDateStr = rowDateJST.toISOString().split('T')[0];
        return dbDateStr === dateStr;
      });
      
      // アクション数を検索
      const foundAction = actionsResult.rows.find(row => {
        const rowDateJST = new Date(row.date.getTime() + jstOffset);
        const dbDateStr = rowDateJST.toISOString().split('T')[0];
        return dbDateStr === dateStr;
      });

      // 取引先数を検索
      const foundCustomer = customersResult.rows.find(row => {
        const rowDateJST = new Date(row.date.getTime() + jstOffset);
        const dbDateStr = rowDateJST.toISOString().split('T')[0];
        return dbDateStr === dateStr;
      });
      
      // 仮想的な完了数（アクション数の70%を完了とする）
      const actionCount = foundAction ? parseInt(foundAction.action_count) : 0;
      const completedActions = Math.floor(actionCount * 0.7);
      const customerCount = foundCustomer ? parseInt(foundCustomer.customer_count) : 0;
      
      dailyData.push({
        date: dateStr,
        count: foundReport ? parseInt(foundReport.count) : 0,
        actionCount: actionCount,
        completedActions: completedActions,
        customerCount: customerCount
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dailyData;
  } catch (error) {
    console.error('Error in getDailyReports:', error);
    return [];
  }
}

// 顧客別商談数を取得
async function getCustomerAnalysis(userId, startDate, endDate) {
  try {
    const result = await pool.query(`
      SELECT 
        rs.customer,
        COUNT(r.id) as report_count,
        COUNT(DISTINCT CASE WHEN rs.next_action IS NOT NULL AND rs.next_action != '' THEN r.id END) as action_count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3 
      AND rs.customer IS NOT NULL AND rs.customer != ''
      GROUP BY rs.customer
      ORDER BY report_count DESC
      LIMIT 10
    `, [userId, startDate, endDate]);
    
    return result.rows.map(row => ({
      customer: row.customer,
      reportCount: parseInt(row.report_count),
      actionCount: parseInt(row.action_count)
    }));
  } catch (error) {
    console.error('Error in getCustomerAnalysis:', error);
    return [];
  }
}

// 案件カテゴリ分析
async function getProjectCategories(userId, startDate, endDate) {
  try {
    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN rs.project ILIKE '%新規%' OR rs.project ILIKE '%立ち上げ%' OR rs.project ILIKE '%開始%' THEN '新規案件'
          WHEN rs.project ILIKE '%システム%' OR rs.project ILIKE '%IT%' OR rs.project ILIKE '%デジタル%' OR rs.project ILIKE '%アプリ%' OR rs.project ILIKE '%ソフト%' THEN 'IT・システム'
          WHEN rs.project ILIKE '%改善%' OR rs.project ILIKE '%効率%' OR rs.project ILIKE '%最適%' OR rs.project ILIKE '%自動化%' OR rs.project ILIKE '%DX%' THEN '業務改善'
          WHEN rs.project ILIKE '%導入%' OR rs.project ILIKE '%実装%' OR rs.project ILIKE '%採用%' THEN 'ツール・サービス導入'
          WHEN rs.project ILIKE '%拡大%' OR rs.project ILIKE '%展開%' OR rs.project ILIKE '%拡張%' OR rs.project ILIKE '%増設%' THEN '事業拡大'
          WHEN rs.project ILIKE '%更新%' OR rs.project ILIKE '%リニューアル%' OR rs.project ILIKE '%刷新%' OR rs.project ILIKE '%再構築%' THEN 'リニューアル・更新'
          WHEN rs.project ILIKE '%研修%' OR rs.project ILIKE '%教育%' OR rs.project ILIKE '%トレーニング%' OR rs.project ILIKE '%支援%' THEN '教育・支援'
          WHEN rs.project ILIKE '%保守%' OR rs.project ILIKE '%メンテナンス%' OR rs.project ILIKE '%運用%' THEN '保守・運用'
          ELSE 'その他'
        END as category,
        COUNT(r.id) as count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3 
      AND rs.project IS NOT NULL AND rs.project != ''
      GROUP BY category
      ORDER BY count DESC
    `, [userId, startDate, endDate]);
    
    return result.rows.map(row => ({
      category: row.category,
      count: parseInt(row.count)
    }));
  } catch (error) {
    console.error('Error in getProjectCategories:', error);
    return [];
  }
}

// 課題・リスク分析
async function getIssuesAnalysis(userId, startDate, endDate) {
  try {
    const result = await pool.query(`
      WITH issue_items AS (
        SELECT 
          r.id,
          unnest(rs.issues) as issue_text
        FROM reports r
        JOIN report_slots rs ON r.id = rs.report_id
        WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3 
        AND rs.issues IS NOT NULL AND array_length(rs.issues, 1) > 0
      ),
      issue_categories AS (
        SELECT '人手不足' as category, issue_text FROM issue_items WHERE issue_text ILIKE '%人手不足%' OR issue_text ILIKE '%人材不足%'
        UNION ALL
        SELECT '知識・スキル不足' as category, issue_text FROM issue_items WHERE issue_text ILIKE '%知見%' OR issue_text ILIKE '%知識%' OR issue_text ILIKE '%スキル%'
        UNION ALL
        SELECT '理解・把握困難' as category, issue_text FROM issue_items WHERE issue_text ILIKE '%把握%' OR issue_text ILIKE '%理解%' OR issue_text ILIKE '%分からない%'
        UNION ALL
        SELECT 'ボトルネック・制約' as category, issue_text FROM issue_items WHERE issue_text ILIKE '%ボトルネック%' OR issue_text ILIKE '%障害%' OR issue_text ILIKE '%制約%'
        UNION ALL
        SELECT 'コスト・予算' as category, issue_text FROM issue_items WHERE issue_text ILIKE '%コスト%' OR issue_text ILIKE '%費用%' OR issue_text ILIKE '%予算%'
        UNION ALL
        SELECT '時間・スケジュール' as category, issue_text FROM issue_items WHERE 
          issue_text ILIKE '%時間%' OR issue_text ILIKE '%期間%' OR issue_text ILIKE '%スケジュール%' OR 
          issue_text ILIKE '%間に合う%' OR issue_text ILIKE '%間に合わ%' OR issue_text ILIKE '%終わる%' OR 
          issue_text ILIKE '%リリース%' OR issue_text ILIKE '%納期%' OR issue_text ILIKE '%期限%' OR
          issue_text ILIKE '%心配%' OR issue_text ILIKE '%不安%'
        UNION ALL
        SELECT '効率・生産性' as category, issue_text FROM issue_items WHERE issue_text ILIKE '%効率%' OR issue_text ILIKE '%生産性%'
      )
      SELECT 
        category as issue_type,
        COUNT(DISTINCT issue_text) as count
      FROM issue_categories
      GROUP BY category
      ORDER BY count DESC
    `, [userId, startDate, endDate]);
    
    return result.rows.map(row => ({
      issueType: row.issue_type,
      count: parseInt(row.count)
    }));
  } catch (error) {
    console.error('Error in getIssuesAnalysis:', error);
    return [];
  }
}

// 関係構築情報の分析
async function getRelationshipAnalysis(userId, startDate, endDate) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN rs.personal_info IS NOT NULL AND array_length(rs.personal_info, 1) > 0 THEN r.id END) as reports_with_personal_info,
        COUNT(DISTINCT CASE WHEN rs.relationship_notes IS NOT NULL AND array_length(rs.relationship_notes, 1) > 0 THEN r.id END) as reports_with_relationship_notes
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
    `, [userId, startDate, endDate]);
    
    // 趣味・興味の分析
    const hobbiesResult = await pool.query(`
      SELECT 
        unnest(rs.personal_info) as hobby,
        COUNT(*) as count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3 
      AND rs.personal_info IS NOT NULL AND array_length(rs.personal_info, 1) > 0
      GROUP BY hobby
      ORDER BY count DESC
      LIMIT 10
    `, [userId, startDate, endDate]);
    
    return {
      reportsWithPersonalInfo: parseInt(result.rows[0]?.reports_with_personal_info || 0),
      reportsWithRelationshipNotes: parseInt(result.rows[0]?.reports_with_relationship_notes || 0),
      topHobbies: hobbiesResult.rows.map(row => ({
        hobby: row.hobby,
        count: parseInt(row.count)
      }))
    };
  } catch (error) {
    console.error('Error in getRelationshipAnalysis:', error);
    return {
      reportsWithPersonalInfo: 0,
      reportsWithRelationshipNotes: 0,
      topHobbies: []
    };
  }
}

// チーム向け分析データ取得（マネージャー用）
router.get('/team', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { period = '30', userIds } = req.query;
    const managerId = req.userId;
    
    // 期間の計算（日本時間で計算）
    const jstOffset = 9 * 60 * 60 * 1000; // JST is UTC+9
    const nowUTC = new Date();
    const nowJST = new Date(nowUTC.getTime() + jstOffset);
    
    // JST での今日の終了時間（23:59:59.999）
    const endDateJST = new Date(nowJST.getFullYear(), nowJST.getMonth(), nowJST.getDate(), 23, 59, 59, 999);
    const endDate = new Date(endDateJST.getTime() - jstOffset); // UTC に変換
    
    // JST での開始日の開始時間（00:00:00.000）
    const startDateJST = new Date(nowJST.getFullYear(), nowJST.getMonth(), nowJST.getDate() - parseInt(period), 0, 0, 0, 0);
    const startDate = new Date(startDateJST.getTime() - jstOffset); // UTC に変換
    
    console.log('Team analytics request - managerId:', managerId, 'period:', period, 'userIds:', userIds);
    console.log('Date range - startDate:', startDate, 'endDate:', endDate);
    
    // 対象ユーザーを決定
    let targetUserIds = [];
    if (userIds && userIds.length > 0) {
      // 特定のユーザーが指定された場合
      targetUserIds = Array.isArray(userIds) ? userIds.map(id => parseInt(id)) : [parseInt(userIds)];
    } else {
      // チーム全体の場合、部下のIDを取得
      const teamResult = await pool.query('SELECT id FROM users WHERE manager_id = $1', [managerId]);
      targetUserIds = teamResult.rows.map(row => row.id);
    }
    
    console.log('Target user IDs:', targetUserIds);
    
    if (targetUserIds.length === 0) {
      return res.json({
        period: parseInt(period),
        teamStats: {
          total_reports: 0,
          total_members: 0,
          draft_reports: 0,
          completed_reports: 0,
          unique_customers: 0,
          reports_with_actions: 0
        },
        memberStats: [],
        dailyReports: [],
        customerAnalysis: [],
        projectCategories: []
      });
    }
    
    // チーム全体の基本統計
    const teamStats = await getTeamBasicStats(targetUserIds, startDate, endDate);
    
    // メンバー別統計
    const memberStats = await getMemberStats(targetUserIds, startDate, endDate);
    
    // 日別レポート数（チーム全体）
    const dailyReports = await getTeamDailyReports(targetUserIds, startDate, endDate);
    
    // 顧客別商談数（チーム全体）
    const customerAnalysis = await getTeamCustomerAnalysis(targetUserIds, startDate, endDate);
    
    // 案件カテゴリ分析（チーム全体）
    const projectCategories = await getTeamProjectCategories(targetUserIds, startDate, endDate);
    
    // チーム全体のアクション一覧取得
    const teamActionsList = await getTeamActionsList(targetUserIds, startDate, endDate);
    
    // アクション統計を計算
    const totalTeamActions = teamActionsList.length;
    const completedTeamActions = Math.floor(totalTeamActions * 0.7); // 仮の完了率
    const pendingTeamActions = totalTeamActions - completedTeamActions;
    
    // チーム統計にアクション数を追加
    teamStats.total_actions = totalTeamActions;
    teamStats.completed_actions = completedTeamActions;
    teamStats.pending_actions = pendingTeamActions;
    
    res.json({
      period: parseInt(period),
      teamStats,
      memberStats,
      dailyReports,
      customerAnalysis,
      projectCategories,
      teamActionsList
    });
    
  } catch (error) {
    console.error('Team analytics error:', error);
    res.status(500).json({ error: 'チーム分析データの取得に失敗しました' });
  }
});

// チーム基本統計を取得
async function getTeamBasicStats(userIds, startDate, endDate) {
  try {
    const placeholders = userIds.map((_, i) => `$${i + 3}`).join(',');
    
    const result = await pool.query(`
      SELECT 
        COUNT(r.id) as total_reports,
        COUNT(CASE WHEN r.status = 'draft' THEN 1 END) as draft_reports,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_reports,
        COUNT(DISTINCT CASE WHEN rs.customer IS NOT NULL AND rs.customer != '' THEN rs.customer END) as unique_customers,
        COUNT(CASE WHEN rs.next_action IS NOT NULL AND rs.next_action != '' THEN 1 END) as reports_with_actions
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id IN (${placeholders}) AND r.report_date BETWEEN $1 AND $2
    `, [startDate, endDate, ...userIds]);
    
    return {
      ...result.rows[0],
      total_members: userIds.length
    };
  } catch (error) {
    console.error('Error in getTeamBasicStats:', error);
    return {
      total_reports: 0,
      total_members: userIds.length,
      draft_reports: 0,
      completed_reports: 0,
      unique_customers: 0,
      reports_with_actions: 0
    };
  }
}

// メンバー別統計を取得
async function getMemberStats(userIds, startDate, endDate) {
  try {
    const placeholders = userIds.map((_, i) => `$${i + 3}`).join(',');
    
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        COUNT(r.id) as report_count,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_count,
        COUNT(DISTINCT rs.customer) FILTER (WHERE rs.customer IS NOT NULL AND rs.customer != '') as customer_count
      FROM users u
      LEFT JOIN reports r ON u.id = r.user_id AND r.report_date BETWEEN $1 AND $2
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE u.id IN (${placeholders})
      GROUP BY u.id, u.name
      ORDER BY report_count DESC
    `, [startDate, endDate, ...userIds]);
    
    return result.rows.map(row => ({
      userId: row.id,
      name: row.name,
      reportCount: parseInt(row.report_count),
      completedCount: parseInt(row.completed_count),
      customerCount: parseInt(row.customer_count),
      completionRate: row.report_count > 0 ? Math.round((row.completed_count / row.report_count) * 100) : 0
    }));
  } catch (error) {
    console.error('Error in getMemberStats:', error);
    return [];
  }
}

// チーム日別レポート数を取得
async function getTeamDailyReports(userIds, startDate, endDate) {
  try {
    const placeholders = userIds.map((_, i) => `$${i + 3}`).join(',');
    
    // 日別日報数を取得
    const reportsResult = await pool.query(`
      SELECT 
        DATE(r.report_date) as date,
        COUNT(r.id) as count
      FROM reports r
      WHERE r.user_id IN (${placeholders}) AND r.report_date BETWEEN $1 AND $2
      GROUP BY DATE(r.report_date)
      ORDER BY DATE(r.report_date)
    `, [startDate, endDate, ...userIds]);
    
    // 日別アクション数を取得
    const actionsResult = await pool.query(`
      SELECT 
        DATE(r.report_date) as date,
        COUNT(
          CASE 
            WHEN rs.next_action IS NOT NULL 
            AND rs.next_action != '' 
            AND rs.next_action != '[]' 
            THEN 1 
          END
        ) as action_count
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id IN (${placeholders}) AND r.report_date BETWEEN $1 AND $2
      GROUP BY DATE(r.report_date)
      ORDER BY DATE(r.report_date)
    `, [startDate, endDate, ...userIds]);

    // 日別取引先数を取得
    const customersResult = await pool.query(`
      SELECT 
        DATE(r.report_date) as date,
        COUNT(DISTINCT rs.customer) as customer_count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id IN (${placeholders}) AND r.report_date BETWEEN $1 AND $2
      AND rs.customer IS NOT NULL AND rs.customer != ''
      GROUP BY DATE(r.report_date)
      ORDER BY DATE(r.report_date)
    `, [startDate, endDate, ...userIds]);
    
    // 日付範囲を埋める（データがない日は0に）- JST対応
    const dailyData = [];
    const jstOffset = 9 * 60 * 60 * 1000;
    const startJST = new Date(startDate.getTime() + jstOffset);
    const endJST = new Date(endDate.getTime() + jstOffset);
    const currentDate = new Date(startJST.getFullYear(), startJST.getMonth(), startJST.getDate());
    
    while (currentDate <= endJST) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // 日報数を検索
      const foundReport = reportsResult.rows.find(row => {
        const rowDateJST = new Date(row.date.getTime() + jstOffset);
        const dbDateStr = rowDateJST.toISOString().split('T')[0];
        return dbDateStr === dateStr;
      });
      
      // アクション数を検索
      const foundAction = actionsResult.rows.find(row => {
        const rowDateJST = new Date(row.date.getTime() + jstOffset);
        const dbDateStr = rowDateJST.toISOString().split('T')[0];
        return dbDateStr === dateStr;
      });

      // 取引先数を検索
      const foundCustomer = customersResult.rows.find(row => {
        const rowDateJST = new Date(row.date.getTime() + jstOffset);
        const dbDateStr = rowDateJST.toISOString().split('T')[0];
        return dbDateStr === dateStr;
      });
      
      // 仮想的な完了数（アクション数の70%を完了とする）
      const actionCount = foundAction ? parseInt(foundAction.action_count) : 0;
      const completedActions = Math.floor(actionCount * 0.7);
      const customerCount = foundCustomer ? parseInt(foundCustomer.customer_count) : 0;
      
      dailyData.push({
        date: dateStr,
        count: foundReport ? parseInt(foundReport.count) : 0,
        actionCount: actionCount,
        completedActions: completedActions,
        customerCount: customerCount
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dailyData;
  } catch (error) {
    console.error('Error in getTeamDailyReports:', error);
    return [];
  }
}

// チーム顧客別商談数を取得
async function getTeamCustomerAnalysis(userIds, startDate, endDate) {
  try {
    const placeholders = userIds.map((_, i) => `$${i + 3}`).join(',');
    
    const result = await pool.query(`
      SELECT 
        rs.customer,
        COUNT(r.id) as report_count,
        COUNT(DISTINCT r.user_id) as member_count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id IN (${placeholders}) AND r.report_date BETWEEN $1 AND $2
      AND rs.customer IS NOT NULL AND rs.customer != ''
      GROUP BY rs.customer
      ORDER BY report_count DESC
      LIMIT 10
    `, [startDate, endDate, ...userIds]);
    
    return result.rows.map(row => ({
      customer: row.customer,
      reportCount: parseInt(row.report_count),
      memberCount: parseInt(row.member_count)
    }));
  } catch (error) {
    console.error('Error in getTeamCustomerAnalysis:', error);
    return [];
  }
}

// チーム案件カテゴリ分析
async function getTeamProjectCategories(userIds, startDate, endDate) {
  try {
    const placeholders = userIds.map((_, i) => `$${i + 3}`).join(',');
    
    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN rs.project ILIKE '%新規%' OR rs.project ILIKE '%立ち上げ%' OR rs.project ILIKE '%開始%' THEN '新規案件'
          WHEN rs.project ILIKE '%システム%' OR rs.project ILIKE '%IT%' OR rs.project ILIKE '%デジタル%' OR rs.project ILIKE '%アプリ%' OR rs.project ILIKE '%ソフト%' THEN 'IT・システム'
          WHEN rs.project ILIKE '%改善%' OR rs.project ILIKE '%効率%' OR rs.project ILIKE '%最適%' OR rs.project ILIKE '%自動化%' OR rs.project ILIKE '%DX%' THEN '業務改善'
          WHEN rs.project ILIKE '%導入%' OR rs.project ILIKE '%実装%' OR rs.project ILIKE '%採用%' THEN 'ツール・サービス導入'
          WHEN rs.project ILIKE '%拡大%' OR rs.project ILIKE '%展開%' OR rs.project ILIKE '%拡張%' OR rs.project ILIKE '%増設%' THEN '事業拡大'
          WHEN rs.project ILIKE '%更新%' OR rs.project ILIKE '%リニューアル%' OR rs.project ILIKE '%刷新%' OR rs.project ILIKE '%再構築%' THEN 'リニューアル・更新'
          WHEN rs.project ILIKE '%研修%' OR rs.project ILIKE '%教育%' OR rs.project ILIKE '%トレーニング%' OR rs.project ILIKE '%支援%' THEN '教育・支援'
          WHEN rs.project ILIKE '%保守%' OR rs.project ILIKE '%メンテナンス%' OR rs.project ILIKE '%運用%' THEN '保守・運用'
          ELSE 'その他'
        END as category,
        COUNT(r.id) as count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id IN (${placeholders}) AND r.report_date BETWEEN $1 AND $2
      AND rs.project IS NOT NULL AND rs.project != ''
      GROUP BY category
      ORDER BY count DESC
    `, [startDate, endDate, ...userIds]);
    
    return result.rows.map(row => ({
      category: row.category,
      count: parseInt(row.count)
    }));
  } catch (error) {
    console.error('Error in getTeamProjectCategories:', error);
    return [];
  }
}

// チーム全体のアクション一覧取得
async function getTeamActionsList(userIds, startDate, endDate) {
  try {
    const placeholders = userIds.map((_, i) => `$${i + 3}`).join(',');
    
    const result = await pool.query(`
      SELECT 
        rs.next_action,
        rs.customer,
        r.report_date,
        r.id as report_id,
        r.user_id,
        u.name as user_name,
        false as completed
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id IN (${placeholders}) AND r.report_date BETWEEN $1 AND $2
      AND rs.next_action IS NOT NULL 
      AND rs.next_action != ''
      AND rs.next_action != '[]'
      ORDER BY r.report_date DESC
    `, [startDate, endDate, ...userIds]);
    
    const actions = [];
    result.rows.forEach(row => {
      try {
        let nextActions = [];
        
        // データベースの値を正しく解析
        if (Array.isArray(row.next_action)) {
          nextActions = row.next_action;
        } else if (typeof row.next_action === 'string') {
          const actionStr = row.next_action.trim();
          
          // JSON配列形式の文字列かどうかをチェック
          if (actionStr.startsWith('[') && actionStr.endsWith(']')) {
            try {
              nextActions = JSON.parse(actionStr);
            } catch (e) {
              nextActions = [actionStr];
            }
          } else if (actionStr.startsWith('{') && actionStr.endsWith('}')) {
            // セット記法形式の場合（{"item1","item2"}）
            try {
              const arrayStr = actionStr.replace(/^{/, '[').replace(/}$/, ']');
              nextActions = JSON.parse(arrayStr);
            } catch (e) {
              nextActions = [actionStr];
            }
          } else {
            nextActions = [actionStr];
          }
        }
        
        // 配列でない場合は配列に変換
        if (!Array.isArray(nextActions)) {
          nextActions = [nextActions];
        }
        
        // 各アクションを個別に追加
        nextActions.forEach(action => {
          if (action && typeof action === 'string' && action.trim()) {
            const actionText = action.trim();
            actions.push({
              text: actionText,
              customer: row.customer || '未設定',
              reportDate: row.report_date,
              reportId: row.report_id,
              userId: row.user_id,
              userName: row.user_name,
              completed: false,
              dueDate: null
            });
          }
        });
      } catch (parseError) {
        console.error('Error parsing team action:', parseError, 'Value:', row.next_action);
        if (row.next_action && typeof row.next_action === 'string' && row.next_action.trim()) {
          actions.push({
            text: row.next_action.trim(),
            customer: row.customer || '未設定',
            reportDate: row.report_date,
            reportId: row.report_id,
            userId: row.user_id,
            userName: row.user_name,
            completed: false,
            dueDate: null
          });
        }
      }
    });
    
    return actions;
  } catch (error) {
    console.error('Error in getTeamActionsList:', error);
    return [];
  }
}

// アクション一覧の取得
async function getActionsList(userId, startDate, endDate) {
  try {
    const result = await pool.query(`
      SELECT 
        rs.next_action,
        rs.customer,
        r.report_date,
        r.id as report_id,
        false as completed
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
      AND rs.next_action IS NOT NULL 
      AND rs.next_action != ''
      AND rs.next_action != '[]'
      ORDER BY r.report_date DESC
    `, [userId, startDate, endDate]);
    
    const actions = [];
    result.rows.forEach(row => {
      try {
        let nextActions = [];
        
        // データベースの値を正しく解析
        if (Array.isArray(row.next_action)) {
          nextActions = row.next_action;
        } else if (typeof row.next_action === 'string') {
          const actionStr = row.next_action.trim();
          
          // JSON配列形式の文字列かどうかをチェック
          if (actionStr.startsWith('[') && actionStr.endsWith(']')) {
            try {
              nextActions = JSON.parse(actionStr);
            } catch (e) {
              nextActions = [actionStr];
            }
          } else if (actionStr.startsWith('{') && actionStr.endsWith('}')) {
            // セット記法形式の場合（{"item1","item2"}）
            try {
              // セット記法をJSON配列に変換
              const arrayStr = actionStr.replace(/^{/, '[').replace(/}$/, ']');
              nextActions = JSON.parse(arrayStr);
            } catch (e) {
              nextActions = [actionStr];
            }
          } else {
            // 普通の文字列
            nextActions = [actionStr];
          }
        }
        
        // 配列でない場合は配列に変換
        if (!Array.isArray(nextActions)) {
          nextActions = [nextActions];
        }
        
        // 各アクションを個別に追加
        nextActions.forEach(action => {
          if (action && typeof action === 'string' && action.trim()) {
            const actionText = action.trim();
            actions.push({
              text: actionText,
              customer: row.customer || '未設定',
              reportDate: row.report_date,
              reportId: row.report_id,
              completed: false,
              dueDate: null // 将来的には期限設定機能を追加
            });
          }
        });
      } catch (parseError) {
        console.error('Error parsing next_action:', parseError, 'Value:', row.next_action);
        // エラーの場合も文字列として扱う
        if (row.next_action && typeof row.next_action === 'string' && row.next_action.trim()) {
          actions.push({
            text: row.next_action.trim(),
            customer: row.customer || '未設定',
            reportDate: row.report_date,
            reportId: row.report_id,
            completed: false,
            dueDate: null
          });
        }
      }
    });
    
    return actions;
  } catch (error) {
    console.error('Error in getActionsList:', error);
    return [];
  }
}

module.exports = router;