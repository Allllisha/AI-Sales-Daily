const express = require('express');
const { authMiddleware, managerOnly } = require('../middleware/auth');
const pool = require('../db/pool');
const axios = require('axios');

const router = express.Router();

/**
 * @swagger
 * /api/analytics/personal:
 *   get:
 *     summary: 個人向け分析データを取得
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 分析期間（日数）
 *     responses:
 *       200:
 *         description: 個人向け分析データ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 basicStats:
 *                   type: object
 *                   properties:
 *                     reportCount:
 *                       type: integer
 *                     customerCount:
 *                       type: integer
 *                     projectCount:
 *                       type: integer
 *                     averagePerDay:
 *                       type: number
 *                 dailyReports:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       count:
 *                         type: integer
 *                 customerAnalysis:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       customer:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       latestVisit:
 *                         type: string
 *                         format: date
 */

/**
 * @swagger
 * /api/analytics/personal/issues:
 *   get:
 *     summary: 個人の課題・リスク分析を取得
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 分析期間（日数）
 *     responses:
 *       200:
 *         description: 課題・リスク分析データ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 issuesAnalysis:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       issues:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             issue:
 *                               type: string
 *                             count:
 *                               type: integer
 *                             customer:
 *                               type: string
 *                             reportId:
 *                               type: integer
 */

/**
 * @swagger
 * /api/analytics/team:
 *   get:
 *     summary: チーム分析データを取得
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: マネージャー権限が必要です
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 分析期間（日数）
 *       - in: query
 *         name: userIds
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         description: 対象ユーザーID（複数指定可）
 *     responses:
 *       200:
 *         description: チーム分析データ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 teamStats:
 *                   type: object
 *                   properties:
 *                     totalReports:
 *                       type: integer
 *                     averagePerPerson:
 *                       type: number
 *                     totalCustomers:
 *                       type: integer
 *                     totalProjects:
 *                       type: integer
 *                 memberPerformance:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       reportCount:
 *                         type: integer
 *                       customerCount:
 *                         type: integer
 *                       lastReportDate:
 *                         type: string
 *                         format: date
 *                 dailyActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       totalReports:
 *                         type: integer
 *                       activeMembers:
 *                         type: integer
 *       403:
 *         description: 権限がありません
 */

/**
 * @swagger
 * /api/analytics/team/issues:
 *   get:
 *     summary: チームの課題・リスク分析を取得
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: マネージャー権限が必要です
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 分析期間（日数）
 *       - in: query
 *         name: userIds
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         description: 対象ユーザーID（複数指定可）
 *     responses:
 *       200:
 *         description: チームの課題・リスク分析データ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memberIssues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       issueCount:
 *                         type: integer
 *                       majorIssues:
 *                         type: array
 *                         items:
 *                           type: string
 *                 commonIssues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                       issues:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             issue:
 *                               type: string
 *                             count:
 *                               type: integer
 *                             members:
 *                               type: array
 *                               items:
 *                                 type: string
 *       403:
 *         description: 権限がありません
 */

// 個人向け分析データ取得
router.get('/personal', authMiddleware, async (req, res) => {
  try {
    const { period = '30' } = req.query; // デフォルト30日間
    const userId = req.userId;
    console.log('Analytics request - userId:', userId, 'period:', period);
    
    // 期間の計算（日本時間基準で修正）
    const now = new Date();
    // 今日の日付を含める（明日の00:00:00まで）
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    // 開始日（period日前の00:00:00から）
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - parseInt(period) + 1, 0, 0, 0, 0);
    
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
    
    // 業界分析
    console.log('Fetching industry analysis...');
    const industryAnalysis = await getIndustryAnalysis(userId, startDate, endDate);
    console.log('Industry analysis:', industryAnalysis.length);
    
    // 課題・リスク分析は後から非同期で取得
    const issuesAnalysis = [];
    
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
    
    // まず基本データを返す
    res.json({
      period: parseInt(period),
      basicStats,
      dailyReports,
      customerAnalysis,
      industryAnalysis,
      issuesAnalysis,
      relationshipAnalysis,
      actionsList
    });
    
    // 課題分析は非同期でバックグラウンド処理（結果は別エンドポイントで取得）
    getIssuesAnalysis(userId, startDate, endDate)
      .then(result => {
        console.log('Issues analysis completed:', result.length);
      })
      .catch(error => {
        console.error('Issues analysis background error:', error);
      });
    
  } catch (error) {
    console.error('Personal analytics error:', error);
    res.status(500).json({ error: '分析データの取得に失敗しました' });
  }
});

// 課題キーワード分析を別エンドポイントで取得
router.get('/personal/issues', authMiddleware, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const userId = req.userId;
    
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - parseInt(period) + 1, 0, 0, 0, 0);
    
    const issuesAnalysis = await getIssuesAnalysis(userId, startDate, endDate);
    
    res.json({ issuesAnalysis });
  } catch (error) {
    console.error('Issues analysis error:', error);
    res.status(500).json({ error: '課題分析の取得に失敗しました' });
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
        COUNT(CASE WHEN rs.issues IS NOT NULL AND rs.issues != '' THEN 1 END) as reports_with_issues
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
    
    // 日付範囲を埋める（データがない日は0に）
    const dailyData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // 日報数を検索
      const foundReport = reportsResult.rows.find(row => {
        const dbDateStr = new Date(row.date).toISOString().split('T')[0];
        return dbDateStr === dateStr;
      });
      
      // アクション数を検索
      const foundAction = actionsResult.rows.find(row => {
        const dbDateStr = new Date(row.date).toISOString().split('T')[0];
        return dbDateStr === dateStr;
      });

      // 取引先数を検索
      const foundCustomer = customersResult.rows.find(row => {
        const dbDateStr = new Date(row.date).toISOString().split('T')[0];
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

// 業界分析
async function getIndustryAnalysis(userId, startDate, endDate) {
  try {
    const result = await pool.query(`
      SELECT 
        rs.industry,
        COUNT(r.id) as count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3 
      AND rs.industry IS NOT NULL AND rs.industry != ''
      GROUP BY rs.industry
      ORDER BY count DESC
    `, [userId, startDate, endDate]);
    
    return result.rows.map(row => ({
      industry: row.industry,
      count: parseInt(row.count)
    }));
  } catch (error) {
    console.error('Error in getIndustryAnalysis:', error);
    return [];
  }
}

// 課題・リスク分析（AI動的キーワード抽出）
async function getIssuesAnalysis(userId, startDate, endDate) {
  try {
    // 全ての課題テキストを取得（テキスト型）
    const result = await pool.query(`
      SELECT rs.issues as issues_text
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3 
      AND rs.issues IS NOT NULL AND rs.issues != ''
    `, [userId, startDate, endDate]);
    
    if (result.rows.length === 0) {
      return [];
    }
    
    // 全課題テキストを結合
    const allIssuesText = result.rows
      .map(row => row.issues_text)
      .filter(issues => issues && issues.trim())
      .join(', ');
    
    if (!allIssuesText.trim()) {
      return [];
    }
    
    // AIを使ってキーワードを動的に抽出
    const keywords = await extractKeywordsWithAI(allIssuesText);
    
    if (!keywords || keywords.length === 0) {
      return [];
    }
    
    // 抽出されたキーワードの出現頻度をカウント
    const keywordCounts = {};
    
    for (const keyword of keywords) {
      // 全体のテキストからキーワードの出現回数をカウント
      const regex = new RegExp(keyword, 'gi');
      const matches = allIssuesText.match(regex);
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        keywordCounts[keyword] = count;
      }
    }
    
    // 頻度順にソートして上位8個まで取得
    const sortedKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([keyword, count]) => ({ keyword, count }));
    
    return sortedKeywords;
    
  } catch (error) {
    console.error('Error in getIssuesAnalysis:', error);
    return [];
  }
}

// AIを使って課題テキストから重要なキーワードを動的に抽出
async function extractKeywordsWithAI(issuesText) {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
    
    if (!endpoint || !apiKey || !deploymentName) {
      console.log('Azure OpenAI not configured, using fallback keyword extraction');
      return extractKeywordsFallback(issuesText);
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: `あなたは営業日報の課題分析の専門家です。与えられた課題テキストから、重要なキーワードを抽出してください。

抽出ルール：
1. 課題の核心となる重要な名詞・技術用語を抽出
2. 一般的すぎる単語（「こと」「もの」「場合」など）は除外
3. 具体的で意味のあるキーワードのみを選択
4. 最大10個までのキーワードを抽出（最終的に上位8個を使用）
5. 頻度が高く、ビジネス上重要なキーワードを優先

回答形式：
["キーワード1", "キーワード2", "キーワード3", ...]

例：
入力: "AIシステムの精度が低い、図面の読み取り性能が悪い、コストが高い"
出力: ["AI", "システム", "精度", "図面", "読み取り", "性能", "コスト"]`
          },
          {
            role: 'user',
            content: `以下の課題テキストからキーワードを抽出してください：\n\n${issuesText}`
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      }
    );

    const extractedText = response.data.choices[0].message.content.trim();
    console.log('AI keyword extraction result:', extractedText);
    
    // JSONとしてパース
    try {
      const jsonMatch = extractedText.match(/\[(.*)\]/) || extractedText.match(/(\[[\s\S]*?\])/);
      const jsonText = jsonMatch ? jsonMatch[0] : extractedText;
      const keywords = JSON.parse(jsonText);
      
      // 配列であることを確認し、文字列のみをフィルタ
      if (Array.isArray(keywords)) {
        return keywords.filter(k => typeof k === 'string' && k.trim().length > 0);
      }
      
      return [];
    } catch (parseError) {
      console.error('Failed to parse AI keyword extraction result:', parseError);
      return extractKeywordsFallback(issuesText);
    }
    
  } catch (error) {
    console.error('Error in AI keyword extraction:', error.message);
    return extractKeywordsFallback(issuesText);
  }
}

// フォールバック：シンプルなキーワード抽出
function extractKeywordsFallback(text) {
  // 基本的な名詞・技術用語を抽出
  const commonKeywords = [
    'AI', 'システム', '技術', 'コスト', '費用', '予算', '時間', '期間', '納期',
    '人手', '人材', 'スタッフ', '知識', 'スキル', '性能', '精度', '品質', '効率',
    '図面', '読み取り', '処理', '作業', '改善', '最適化', '自動化', '選定', '判断',
    '課題', '問題', '懸念', 'リスク', '導入', '活用', '検討', '理解', '把握'
  ];
  
  const foundKeywords = [];
  for (const keyword of commonKeywords) {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }
  
  return foundKeywords;
}

// 関係構築情報の分析
async function getRelationshipAnalysis(userId, startDate, endDate) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN rs.personal_info IS NOT NULL AND rs.personal_info != '' THEN r.id END) as reports_with_personal_info,
        COUNT(DISTINCT CASE WHEN rs.relationship_notes IS NOT NULL AND rs.relationship_notes != '' THEN r.id END) as reports_with_relationship_notes
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
    `, [userId, startDate, endDate]);
    
    // 趣味・興味の分析
    const hobbiesResult = await pool.query(`
      SELECT 
        trim(unnest(string_to_array(rs.personal_info, ','))) as hobby,
        COUNT(*) as count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3 
      AND rs.personal_info IS NOT NULL AND rs.personal_info != ''
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
    
    // 期間の計算（日本時間基準で修正）
    const now = new Date();
    // 今日の日付を含める（明日の00:00:00まで）
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    // 開始日（period日前の00:00:00から）
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - parseInt(period) + 1, 0, 0, 0, 0);
    
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
    const industryAnalysis = await getTeamIndustryAnalysis(targetUserIds, startDate, endDate);
    
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
    
    // チーム課題・リスク分析は後から非同期で取得
    const issuesAnalysis = [];
    
    res.json({
      period: parseInt(period),
      teamStats,
      memberStats,
      dailyReports,
      customerAnalysis,
      industryAnalysis,
      teamActionsList,
      issuesAnalysis
    });
    
    // 課題分析は非同期でバックグラウンド処理
    getTeamIssuesAnalysis(targetUserIds, startDate, endDate)
      .then(result => {
        console.log('Team issues analysis completed:', result.length);
      })
      .catch(error => {
        console.error('Team issues analysis background error:', error);
      });
    
  } catch (error) {
    console.error('Team analytics error:', error);
    res.status(500).json({ error: 'チーム分析データの取得に失敗しました' });
  }
});

// チーム向け課題キーワード分析を別エンドポイントで取得
router.get('/team/issues', authMiddleware, managerOnly, async (req, res) => {
  try {
    const { period = '30', userIds } = req.query;
    const managerId = req.userId;
    
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - parseInt(period) + 1, 0, 0, 0, 0);
    
    // 対象ユーザーを決定
    let targetUserIds = [];
    if (userIds && userIds.length > 0) {
      targetUserIds = Array.isArray(userIds) ? userIds.map(id => parseInt(id)) : [parseInt(userIds)];
    } else {
      const teamResult = await pool.query('SELECT id FROM users WHERE manager_id = $1', [managerId]);
      targetUserIds = teamResult.rows.map(row => row.id);
    }
    
    const issuesAnalysis = await getTeamIssuesAnalysis(targetUserIds, startDate, endDate);
    
    res.json({ issuesAnalysis });
  } catch (error) {
    console.error('Team issues analysis error:', error);
    res.status(500).json({ error: 'チーム課題分析の取得に失敗しました' });
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

// チーム業界分析
async function getTeamIndustryAnalysis(userIds, startDate, endDate) {
  try {
    const placeholders = userIds.map((_, i) => `$${i + 3}`).join(',');
    
    const result = await pool.query(`
      SELECT 
        rs.industry,
        COUNT(r.id) as count
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id IN (${placeholders}) AND r.report_date BETWEEN $1 AND $2
      AND rs.industry IS NOT NULL AND rs.industry != ''
      GROUP BY rs.industry
      ORDER BY count DESC
    `, [startDate, endDate, ...userIds]);
    
    return result.rows.map(row => ({
      industry: row.industry,
      count: parseInt(row.count)
    }));
  } catch (error) {
    console.error('Error in getTeamIndustryAnalysis:', error);
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
      // next_actionは現在文字列型（カンマ区切り）
      if (row.next_action && typeof row.next_action === 'string') {
        const actionStr = row.next_action.trim();
        
        // アクションを分割（括弧付きのフォーマットにも対応）
        let nextActions = [];
        
        // 括弧内にカンマ区切りのアクションがある場合の処理
        const parenthesesMatch = actionStr.match(/([^（(]+)[（(](.+)[）)]/u);
        if (parenthesesMatch) {
          // メインアクション + 括弧内のサブアクション
          const mainAction = parenthesesMatch[1].trim();
          const subActions = parenthesesMatch[2].split(/[、,]/).map(item => item.trim()).filter(item => item.length > 0);
          
          if (mainAction) {
            // メインアクションとサブアクションを結合して個別のアクションとして扱う
            subActions.forEach(subAction => {
              nextActions.push(`${mainAction}：${subAction}`);
            });
          }
        } else {
          // 通常のカンマ区切り形式
          nextActions = actionStr.split(/[、,]/).map(item => item.trim()).filter(item => item.length > 0);
        }
        
        nextActions.forEach(actionText => {
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
        });
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
      ORDER BY r.report_date DESC
    `, [userId, startDate, endDate]);
    
    const actions = [];
    result.rows.forEach(row => {
      try {
        // next_actionは現在文字列型（カンマ区切り）
        if (row.next_action && typeof row.next_action === 'string') {
          const actionStr = row.next_action.trim();
          
          // アクションを分割（括弧付きのフォーマットにも対応）
          let nextActions = [];
          
          // 括弧内にカンマ区切りのアクションがある場合の処理
          const parenthesesMatch = actionStr.match(/([^（(]+)[（(](.+)[）)]/u);
          if (parenthesesMatch) {
            // メインアクション + 括弧内のサブアクション
            const mainAction = parenthesesMatch[1].trim();
            const subActions = parenthesesMatch[2].split(/[、,]/).map(item => item.trim()).filter(item => item.length > 0);
            
            if (mainAction) {
              // メインアクションとサブアクションを結合して個別のアクションとして扱う
              subActions.forEach(subAction => {
                nextActions.push(`${mainAction}：${subAction}`);
              });
            }
          } else {
            // 通常のカンマ区切り形式
            nextActions = actionStr.split(/[、,]/).map(item => item.trim()).filter(item => item.length > 0);
          }
          
          nextActions.forEach(action => {
            if (action) {
              actions.push({
                text: action,
                customer: row.customer || '未設定',
                reportDate: row.report_date,
                reportId: row.report_id,
                completed: false,
                dueDate: null
              });
            }
          });
        }
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

// チーム課題・リスク分析
async function getTeamIssuesAnalysis(userIds, startDate, endDate) {
  try {
    console.log('getTeamIssuesAnalysis called with userIds:', userIds);
    
    // チームメンバーの全ての課題データを取得（テキスト型）
    const placeholders = userIds.map((_, i) => `$${i + 3}`).join(',');
    const result = await pool.query(`
      SELECT rs.issues as issues_text
      FROM reports r
      JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id IN (${placeholders})
      AND r.report_date BETWEEN $1 AND $2
      AND rs.issues IS NOT NULL 
      AND rs.issues != ''
    `, [startDate, endDate, ...userIds]);
    
    console.log(`Found ${result.rows.length} reports with issues for team analysis`);
    
    // 全ての課題テキストを結合
    const allIssuesText = result.rows
      .map(row => row.issues_text)
      .filter(issues => issues && issues.trim())
      .join(', ');
    
    console.log('Combined issues text length:', allIssuesText.length);
    
    if (!allIssuesText.trim()) {
      console.log('No issues text found for team analysis');
      return [];
    }
    
    // AIを使って動的にキーワードを抽出
    const keywords = await extractKeywordsWithAI(allIssuesText);
    console.log('Extracted keywords for team:', keywords);
    
    // キーワードごとの出現回数をカウント
    const keywordCounts = {};
    keywords.forEach(keyword => {
      // 全体のテキストからキーワードの出現回数をカウント
      const regex = new RegExp(keyword, 'gi');
      const matches = allIssuesText.match(regex);
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        keywordCounts[keyword] = count;
      }
    });
    
    // 出現回数でソートして上位8個まで取得
    const sortedKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([keyword, count]) => ({ keyword, count }));
    
    console.log('Final team issues analysis result:', sortedKeywords);
    return sortedKeywords;
    
  } catch (error) {
    console.error('Error in getTeamIssuesAnalysis:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', { 
      userIds, 
      startDate: startDate?.toISOString(), 
      endDate: endDate?.toISOString() 
    });
    return [];
  }
}

module.exports = router;