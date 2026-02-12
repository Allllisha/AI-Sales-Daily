const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, managerOrAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/analytics/usage:
 *   get:
 *     summary: ナレッジ活用状況
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/usage', authMiddleware, managerOrAdmin, async (req, res) => {
  try {
    // period → days 変換（フロントエンドは period を送信）
    const { period, days: rawDays } = req.query;
    let days = parseInt(rawDays) || 30;
    if (period === 'week') days = 7;
    else if (period === 'month') days = 30;
    else if (period === 'quarter') days = 90;
    else if (period === 'all') days = 3650;

    // Overall usage stats（フロントエンド期待: stats.total_knowledge, stats.monthly_views, stats.active_users, stats.total_incidents）
    const totalStats = await pool.query(
      `SELECT
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) FILTER (WHERE action_type = 'view') as monthly_views,
        COUNT(*) FILTER (WHERE action_type = 'search') as searches,
        COUNT(*) FILTER (WHERE action_type = 'voice_query') as voice_queries,
        COUNT(*) FILTER (WHERE action_type = 'useful_mark') as useful_marks
       FROM usage_logs
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1`,
      [days]
    );

    // 総ナレッジ数
    const knowledgeCount = await pool.query(
      `SELECT COUNT(*) as total_knowledge FROM knowledge_items WHERE status = 'published'`
    );

    // 事例数
    const incidentCount = await pool.query(
      `SELECT COUNT(*) as total_incidents FROM incident_cases`
    );

    // Daily trend（フロントエンド期待: date, views, searches）
    const dailyTrend = await pool.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE action_type = 'view') as views,
        COUNT(*) FILTER (WHERE action_type = 'search') as searches,
        COUNT(*) FILTER (WHERE action_type = 'useful_mark') as useful
       FROM usage_logs
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );

    // カテゴリ別分布（フロントエンド期待: category, count）
    const categoryDist = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM knowledge_items
       WHERE status = 'published' AND category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC`
    );

    // Most viewed knowledge（フロントエンド期待: id, title, category, work_type, view_count）
    const topKnowledge = await pool.query(
      `SELECT ki.id, ki.title, ki.category, ki.work_type,
              ki.view_count, ki.useful_count
       FROM knowledge_items ki
       WHERE ki.status = 'published'
       ORDER BY ki.view_count DESC
       LIMIT 10`
    );

    // ユーザー別ナレッジ活用ランキング（部下を含む、活動ゼロも表示）
    // admin: 全ユーザー、site_manager: 自分＋部下（再帰的）
    const isAdmin = req.userRole === 'admin';
    const userRankings = await pool.query(
      `WITH RECURSIVE subordinates AS (
        SELECT id FROM users WHERE manager_id = $2
        UNION ALL
        SELECT u.id FROM users u
        INNER JOIN subordinates s ON u.manager_id = s.id
      ),
      target_users AS (
        ${isAdmin
          ? 'SELECT id FROM users'
          : 'SELECT id FROM subordinates UNION SELECT $2::int AS id'}
      )
      SELECT u.id, u.name, u.department, u.role, u.manager_id,
             COALESCE(COUNT(ul.id) FILTER (WHERE ul.action_type = 'view'), 0) as views,
             COALESCE(COUNT(ul.id) FILTER (WHERE ul.action_type = 'search'), 0) as searches,
             COALESCE(COUNT(ul.id) FILTER (WHERE ul.action_type = 'useful_mark'), 0) as useful_marks,
             COALESCE(COUNT(DISTINCT ul.knowledge_id) FILTER (WHERE ul.knowledge_id IS NOT NULL), 0) as unique_knowledge
       FROM users u
       LEFT JOIN usage_logs ul ON ul.user_id = u.id
         AND ul.created_at >= NOW() - INTERVAL '1 day' * $1
       WHERE u.id IN (SELECT id FROM target_users)
       GROUP BY u.id, u.name, u.department, u.role, u.manager_id
       ORDER BY COALESCE(COUNT(ul.id), 0) DESC`,
      [days, req.userId]
    );

    const rawStats = totalStats.rows[0];
    res.json({
      stats: {
        active_users: parseInt(rawStats.active_users) || 0,
        monthly_views: parseInt(rawStats.monthly_views) || 0,
        searches: parseInt(rawStats.searches) || 0,
        voice_queries: parseInt(rawStats.voice_queries) || 0,
        useful_marks: parseInt(rawStats.useful_marks) || 0,
        total_knowledge: parseInt(knowledgeCount.rows[0].total_knowledge) || 0,
        total_incidents: parseInt(incidentCount.rows[0].total_incidents) || 0,
      },
      trend: dailyTrend.rows.map(r => {
        const d = new Date(r.date);
        return {
          date: `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`,
          views: parseInt(r.views) || 0,
          searches: parseInt(r.searches) || 0,
          useful: parseInt(r.useful) || 0,
        };
      }),
      categories: categoryDist.rows.map(r => ({
        category: r.category,
        count: parseInt(r.count) || 0,
      })),
      popular: topKnowledge.rows.map(r => ({
        ...r,
        view_count: parseInt(r.view_count) || 0,
        useful_count: parseInt(r.useful_count) || 0,
      })),
      user_rankings: userRankings.rows.map(r => ({
        id: r.id,
        name: r.name,
        department: r.department,
        role: r.role,
        views: parseInt(r.views) || 0,
        searches: parseInt(r.searches) || 0,
        useful_marks: parseInt(r.useful_marks) || 0,
        unique_knowledge: parseInt(r.unique_knowledge) || 0,
        total_actions: (parseInt(r.views) || 0) + (parseInt(r.searches) || 0) + (parseInt(r.useful_marks) || 0),
      })),
    });
  } catch (error) {
    console.error('Get usage analytics error:', error);
    res.status(500).json({ error: '利用状況の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/analytics/users/{id}:
 *   get:
 *     summary: ユーザー別学習進捗
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;
    let days = 30;
    if (period === 'week') days = 7;
    else if (period === 'month') days = 30;
    else if (period === 'quarter') days = 90;
    else if (period === 'all') days = 3650;

    // Only allow self or manager/admin
    if (parseInt(id) !== req.userId && !['site_manager', 'admin'].includes(req.userRole)) {
      return res.status(403).json({ error: 'アクセス権限がありません' });
    }

    // ユーザー情報
    const userInfo = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, s.name as site_name
       FROM users u LEFT JOIN sites s ON u.site_id = s.id WHERE u.id = $1`,
      [id]
    );
    if (userInfo.rows.length === 0) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // 期間内の集計
    const userStats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE action_type = 'view') as knowledge_views,
        COUNT(*) FILTER (WHERE action_type = 'search') as searches,
        COUNT(*) FILTER (WHERE action_type = 'voice_query') as voice_queries,
        COUNT(*) FILTER (WHERE action_type = 'useful_mark') as useful_marks,
        COUNT(*) FILTER (WHERE action_type = 'checklist_use') as checklist_uses,
        COUNT(DISTINCT knowledge_id) FILTER (WHERE knowledge_id IS NOT NULL) as unique_knowledge_viewed
       FROM usage_logs
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2`,
      [id, days]
    );

    // 日別トレンド
    const dailyTrend = await pool.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE action_type = 'view') as views,
        COUNT(*) FILTER (WHERE action_type = 'search') as searches,
        COUNT(*) FILTER (WHERE action_type = 'useful_mark') as useful
       FROM usage_logs
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [id, days]
    );

    // よく閲覧したナレッジ
    const topKnowledge = await pool.query(
      `SELECT ki.id, ki.title, ki.category, ki.work_type,
              COUNT(*) as view_count,
              MAX(ul.created_at) as last_viewed
       FROM usage_logs ul
       JOIN knowledge_items ki ON ul.knowledge_id = ki.id
       WHERE ul.user_id = $1 AND ul.action_type = 'view'
         AND ul.created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY ki.id, ki.title, ki.category, ki.work_type
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
      [id, days]
    );

    // 検索キーワード
    const topSearches = await pool.query(
      `SELECT search_query, COUNT(*) as count
       FROM usage_logs
       WHERE user_id = $1 AND action_type = 'search'
         AND search_query IS NOT NULL
         AND created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY search_query
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
      [id, days]
    );

    // 最近のアクティビティ
    const recentActivity = await pool.query(
      `SELECT ul.action_type, ul.created_at, ul.search_query,
              ki.id as knowledge_id, ki.title as knowledge_title
       FROM usage_logs ul
       LEFT JOIN knowledge_items ki ON ul.knowledge_id = ki.id
       WHERE ul.user_id = $1
       ORDER BY ul.created_at DESC
       LIMIT 10`,
      [id]
    );

    const raw = userStats.rows[0];
    res.json({
      user: userInfo.rows[0],
      stats: {
        knowledge_views: parseInt(raw.knowledge_views) || 0,
        searches: parseInt(raw.searches) || 0,
        voice_queries: parseInt(raw.voice_queries) || 0,
        useful_marks: parseInt(raw.useful_marks) || 0,
        checklist_uses: parseInt(raw.checklist_uses) || 0,
        unique_knowledge_viewed: parseInt(raw.unique_knowledge_viewed) || 0,
      },
      trend: dailyTrend.rows.map(r => {
        const d = new Date(r.date);
        return {
          date: `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`,
          views: parseInt(r.views) || 0,
          searches: parseInt(r.searches) || 0,
          useful: parseInt(r.useful) || 0,
        };
      }),
      top_knowledge: topKnowledge.rows.map(r => ({
        ...r,
        view_count: parseInt(r.view_count) || 0,
      })),
      top_searches: topSearches.rows.map(r => ({
        search_query: r.search_query,
        count: parseInt(r.count) || 0,
      })),
      recent_activity: recentActivity.rows,
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ error: 'ユーザー分析の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/analytics/risks:
 *   get:
 *     summary: リスク傾向分析
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/risks', authMiddleware, managerOrAdmin, async (req, res) => {
  try {
    // フロントエンド期待: distribution[].risk_level, distribution[].count
    // ナレッジのリスクレベル分布を返す
    const riskDist = await pool.query(
      `SELECT risk_level, COUNT(*) as count
       FROM knowledge_items
       WHERE status = 'published' AND risk_level IS NOT NULL
       GROUP BY risk_level
       ORDER BY CASE risk_level
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
       END`
    );

    // Incident severity distribution (追加情報)
    const severityDist = await pool.query(
      `SELECT severity, COUNT(*) as count
       FROM incident_cases
       GROUP BY severity
       ORDER BY CASE severity
         WHEN 'critical' THEN 1
         WHEN 'serious' THEN 2
         WHEN 'moderate' THEN 3
         WHEN 'minor' THEN 4
       END`
    );

    // Incidents by work type
    const byWorkType = await pool.query(
      `SELECT work_type, COUNT(*) as count,
              COUNT(*) FILTER (WHERE severity IN ('serious', 'critical')) as high_severity_count
       FROM incident_cases
       WHERE work_type IS NOT NULL
       GROUP BY work_type
       ORDER BY count DESC`
    );

    // Monthly trend
    const monthlyTrend = await pool.query(
      `SELECT
        DATE_TRUNC('month', occurred_at) as month,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE severity IN ('serious', 'critical')) as high_severity
       FROM incident_cases
       WHERE occurred_at IS NOT NULL AND occurred_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', occurred_at)
       ORDER BY month ASC`
    );

    res.json({
      distribution: riskDist.rows.map(r => ({
        risk_level: r.risk_level,
        count: parseInt(r.count) || 0,
      })),
      severity_distribution: severityDist.rows.map(r => ({
        severity: r.severity,
        count: parseInt(r.count) || 0,
      })),
      by_work_type: byWorkType.rows.map(r => ({
        work_type: r.work_type,
        count: parseInt(r.count) || 0,
        high_severity_count: parseInt(r.high_severity_count) || 0,
      })),
      monthly_trend: monthlyTrend.rows.map(r => ({
        month: r.month,
        count: parseInt(r.count) || 0,
        high_severity: parseInt(r.high_severity) || 0,
      })),
    });
  } catch (error) {
    console.error('Get risk analytics error:', error);
    res.status(500).json({ error: 'リスク分析の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/analytics/knowledge-gaps:
 *   get:
 *     summary: ナレッジギャップ分析
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/knowledge-gaps', authMiddleware, managerOrAdmin, async (req, res) => {
  try {
    // Searches with no results (potential gaps)
    const noResultSearches = await pool.query(
      `SELECT search_query, COUNT(*) as search_count
       FROM usage_logs
       WHERE action_type = 'search'
         AND search_query IS NOT NULL
         AND knowledge_id IS NULL
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY search_query
       ORDER BY search_count DESC
       LIMIT 20`
    );

    // Work types with incidents but few knowledge items
    const gapsByWorkType = await pool.query(
      `SELECT
        COALESCE(ic.work_type, ki.work_type) as work_type,
        COUNT(DISTINCT ic.id) as incident_count,
        COUNT(DISTINCT ki.id) as knowledge_count
       FROM incident_cases ic
       FULL OUTER JOIN knowledge_items ki ON ic.work_type = ki.work_type AND ki.status = 'published'
       WHERE COALESCE(ic.work_type, ki.work_type) IS NOT NULL
       GROUP BY COALESCE(ic.work_type, ki.work_type)
       HAVING COUNT(DISTINCT ic.id) > COUNT(DISTINCT ki.id)
       ORDER BY COUNT(DISTINCT ic.id) - COUNT(DISTINCT ki.id) DESC`
    );

    // Categories with low knowledge count
    const categoryGaps = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM knowledge_items
       WHERE status = 'published'
       GROUP BY category
       ORDER BY count ASC`
    );

    // Pending drafts that need review
    const pendingReviews = await pool.query(
      `SELECT ki.id, ki.title, ki.category, ki.work_type, ki.created_at, u.name as author_name
       FROM knowledge_items ki
       LEFT JOIN users u ON ki.author_id = u.id
       WHERE ki.status IN ('draft', 'review')
       ORDER BY ki.created_at ASC
       LIMIT 10`
    );

    res.json({
      unresolved_searches: noResultSearches.rows.map(r => ({
        search_query: r.search_query,
        search_count: parseInt(r.search_count) || 0,
      })),
      gaps_by_work_type: gapsByWorkType.rows.map(r => ({
        work_type: r.work_type,
        incident_count: parseInt(r.incident_count) || 0,
        knowledge_count: parseInt(r.knowledge_count) || 0,
      })),
      category_distribution: categoryGaps.rows.map(r => ({
        category: r.category,
        count: parseInt(r.count) || 0,
      })),
      pending_reviews: pendingReviews.rows,
    });
  } catch (error) {
    console.error('Get knowledge gaps error:', error);
    res.status(500).json({ error: 'ナレッジギャップ分析の取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/analytics/export/csv:
 *   get:
 *     summary: 分析データCSVエクスポート
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/export/csv', authMiddleware, managerOrAdmin, async (req, res) => {
  try {
    const { period } = req.query;
    let days = 30;
    if (period === 'week') days = 7;
    else if (period === 'month') days = 30;
    else if (period === 'quarter') days = 90;
    else if (period === 'all') days = 3650;

    const isAdmin = req.userRole === 'admin';
    const result = await pool.query(
      `WITH RECURSIVE subordinates AS (
        SELECT id FROM users WHERE manager_id = $2
        UNION ALL
        SELECT u.id FROM users u
        INNER JOIN subordinates s ON u.manager_id = s.id
      ),
      target_users AS (
        ${isAdmin
          ? 'SELECT id FROM users'
          : 'SELECT id FROM subordinates UNION SELECT $2::int AS id'}
      )
      SELECT u.id, u.name, u.email, u.department, u.role,
             COALESCE(COUNT(ul.id) FILTER (WHERE ul.action_type = 'view'), 0) as views,
             COALESCE(COUNT(ul.id) FILTER (WHERE ul.action_type = 'search'), 0) as searches,
             COALESCE(COUNT(ul.id) FILTER (WHERE ul.action_type = 'useful_mark'), 0) as useful_marks,
             COALESCE(COUNT(DISTINCT ul.knowledge_id) FILTER (WHERE ul.knowledge_id IS NOT NULL), 0) as unique_knowledge
       FROM users u
       LEFT JOIN usage_logs ul ON ul.user_id = u.id
         AND ul.created_at >= NOW() - INTERVAL '1 day' * $1
       WHERE u.id IN (SELECT id FROM target_users)
       GROUP BY u.id, u.name, u.email, u.department, u.role
       ORDER BY COALESCE(COUNT(ul.id), 0) DESC`,
      [days, req.userId]
    );

    const roleLabels = {
      admin: '管理者', site_manager: '現場長', expert: 'ベテラン', worker: '作業員',
    };

    const escapeCsv = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

    const header = ['ID', '名前', 'メール', '部署', '役割', '閲覧数', '検索数', '高評価数', '閲覧ナレッジ数'];
    const rows = result.rows.map(r => [
      r.id,
      r.name,
      r.email,
      r.department || '',
      roleLabels[r.role] || r.role || '',
      r.views,
      r.searches,
      r.useful_marks,
      r.unique_knowledge,
    ]);

    const csvContent = '\uFEFF' + [
      header.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics_export.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export analytics CSV error:', error);
    res.status(500).json({ error: '分析データのCSVエクスポートに失敗しました' });
  }
});

/**
 * @swagger
 * /api/analytics/export/pdf:
 *   get:
 *     summary: 月次レポートHTML（PDF印刷用）
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/export/pdf', authMiddleware, managerOrAdmin, async (req, res) => {
  try {
    const { period } = req.query;
    let days = 30;
    let periodLabel = '今月';
    if (period === 'week') { days = 7; periodLabel = '今週'; }
    else if (period === 'month') { days = 30; periodLabel = '今月'; }
    else if (period === 'quarter') { days = 90; periodLabel = '直近3ヶ月'; }
    else if (period === 'all') { days = 3650; periodLabel = '全期間'; }

    const totalStats = await pool.query(
      `SELECT
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) FILTER (WHERE action_type = 'view') as views,
        COUNT(*) FILTER (WHERE action_type = 'search') as searches,
        COUNT(*) FILTER (WHERE action_type = 'useful_mark') as useful_marks
       FROM usage_logs
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1`,
      [days]
    );

    const knowledgeCount = await pool.query(
      `SELECT COUNT(*) as total FROM knowledge_items WHERE status = 'published'`
    );

    const topKnowledge = await pool.query(
      `SELECT ki.title, ki.category, ki.view_count, ki.useful_count
       FROM knowledge_items ki
       WHERE ki.status = 'published'
       ORDER BY ki.view_count DESC
       LIMIT 10`
    );

    const categoryLabels = {
      procedure: '手順', safety: '安全', quality: '品質',
      cost: 'コスト', equipment: '設備', material: '資材',
    };

    const s = totalStats.rows[0];
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

    const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const topRows = topKnowledge.rows.map((r, i) =>
      `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.title)}</td>
        <td>${escapeHtml(categoryLabels[r.category] || r.category || '')}</td>
        <td>${r.view_count || 0}</td>
        <td>${r.useful_count || 0}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>ナレッジ活用レポート - ${escapeHtml(periodLabel)}</title>
<style>
  body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1e293b; }
  h1 { font-size: 24px; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 8px; }
  .date { color: #64748b; font-size: 14px; margin-bottom: 32px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: 700; color: #2563eb; }
  .stat-label { font-size: 13px; color: #64748b; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  tr:hover { background: #f8fafc; }
  h2 { font-size: 18px; color: #1e293b; margin-top: 32px; margin-bottom: 12px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<h1>ナレッジ活用レポート</h1>
<p class="date">期間: ${escapeHtml(periodLabel)} / 出力日: ${escapeHtml(dateStr)}</p>

<div class="stats-grid">
  <div class="stat-card"><div class="stat-value">${knowledgeCount.rows[0].total || 0}</div><div class="stat-label">総ナレッジ数</div></div>
  <div class="stat-card"><div class="stat-value">${s.views || 0}</div><div class="stat-label">閲覧数</div></div>
  <div class="stat-card"><div class="stat-value">${s.active_users || 0}</div><div class="stat-label">アクティブユーザー</div></div>
  <div class="stat-card"><div class="stat-value">${s.useful_marks || 0}</div><div class="stat-label">高評価数</div></div>
</div>

<h2>人気ナレッジ Top 10</h2>
<table>
  <thead><tr><th>#</th><th>タイトル</th><th>カテゴリ</th><th>閲覧数</th><th>高評価</th></tr></thead>
  <tbody>${topRows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">データなし</td></tr>'}</tbody>
</table>

<p class="no-print" style="margin-top: 32px; text-align: center;">
  <button onclick="window.print()" style="padding: 10px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">PDF / 印刷</button>
</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Export analytics PDF error:', error);
    res.status(500).json({ error: 'レポート生成に失敗しました' });
  }
});

module.exports = router;
