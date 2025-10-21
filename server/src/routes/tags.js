const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { extractTagsFromReport, getCategoryColor } = require('../services/tagExtractor');
const { searchCompanyInfo } = require('../services/bingSearch');

/**
 * タグの取得または作成
 * @param {string} tagName - タグ名
 * @param {string} category - カテゴリ
 * @param {string} color - カラーコード（オプション）
 * @returns {Promise<number>} - タグID
 */
async function getOrCreateTag(tagName, category, color = null) {
  const displayColor = color || getCategoryColor(category);

  // 既存タグを検索
  const existingTag = await pool.query(
    'SELECT id FROM tags WHERE name = $1 AND category = $2',
    [tagName, category]
  );

  if (existingTag.rows.length > 0) {
    return existingTag.rows[0].id;
  }

  // 新規タグを作成
  const newTag = await pool.query(
    'INSERT INTO tags (name, category, color) VALUES ($1, $2, $3) RETURNING id',
    [tagName, category, displayColor]
  );

  return newTag.rows[0].id;
}

// 新規タグを作成
router.post('/', authMiddleware, async (req, res) => {
  console.log('POST /api/tags - Request received from userId:', req.userId);
  try {
    const { name, category, color } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'タグ名とカテゴリは必須です'
      });
    }

    // 既存タグを確認
    const existingTag = await pool.query(
      'SELECT id FROM tags WHERE name = $1 AND category = $2',
      [name, category]
    );

    if (existingTag.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'このタグは既に存在します'
      });
    }

    // カテゴリに応じたデフォルトカラー
    const defaultColor = color || getCategoryColor(category);

    // 新規タグを作成
    const result = await pool.query(
      'INSERT INTO tags (name, category, color, usage_count) VALUES ($1, $2, $3, 0) RETURNING *',
      [name, category, defaultColor]
    );

    console.log('Created new tag:', result.rows[0]);

    res.json({
      success: true,
      message: 'タグを作成しました',
      tag: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({
      success: false,
      message: 'タグの作成に失敗しました'
    });
  }
});

// すべてのタグを取得
router.get('/', authMiddleware, async (req, res) => {
  console.log('GET /api/tags - Request received from userId:', req.userId);
  try {
    const { category, limit = 100 } = req.query;
    console.log('GET /api/tags - Query params:', { category, limit });

    let query = 'SELECT * FROM tags';
    const params = [];

    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }

    query += ' ORDER BY usage_count DESC, name ASC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      tags: result.rows
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'タグの取得に失敗しました',
      tags: []
    });
  }
});

// 人気のタグを取得（使用回数順）
router.get('/popular', authMiddleware, async (req, res) => {
  console.log('GET /api/tags/popular - Request received from userId:', req.userId);
  try {
    const { limit = 20 } = req.query;
    console.log('GET /api/tags/popular - Limit:', limit);

    const result = await pool.query(
      `SELECT t.*, COUNT(rt.id) as report_count
       FROM tags t
       LEFT JOIN report_tags rt ON t.id = rt.tag_id
       GROUP BY t.id
       ORDER BY report_count DESC, t.usage_count DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      tags: result.rows
    });
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    res.status(500).json({
      success: false,
      message: '人気タグの取得に失敗しました',
      tags: []
    });
  }
});

// 特定の日報のタグを取得
router.get('/report/:reportId', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;

    const result = await pool.query(
      `SELECT t.*, rt.auto_generated, rt.confidence
       FROM tags t
       INNER JOIN report_tags rt ON t.id = rt.tag_id
       WHERE rt.report_id = $1
       ORDER BY t.category, t.name`,
      [reportId]
    );

    res.json({
      success: true,
      tags: result.rows
    });
  } catch (error) {
    console.error('Error fetching report tags:', error);
    res.status(500).json({
      success: false,
      message: '日報タグの取得に失敗しました',
      tags: []
    });
  }
});

// タグで日報を検索
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { tagIds, userId } = req.query;
    const authUserId = req.userId;
    const authUserRole = req.userRole;

    console.log('Tag search request:', { tagIds, userId, authUserId, authUserRole });

    if (!tagIds) {
      return res.status(400).json({
        success: false,
        message: 'タグIDが指定されていません'
      });
    }

    const tagIdArray = tagIds.split(',').map(id => parseInt(id));

    // マネージャーの場合は部下の日報も取得、営業の場合は自分の日報のみ
    let userFilter = 'r.user_id = $2';
    const params = [tagIdArray, userId || authUserId];

    if (authUserRole === 'manager') {
      // マネージャーの場合は部下の日報も含める
      userFilter = `(r.user_id = $2 OR r.user_id IN (
        SELECT id FROM users WHERE manager_id = $2
      ))`;
    }

    const query = `
      SELECT DISTINCT r.*,
        u.name as user_name,
        rs.customer,
        rs.project,
        array_agg(DISTINCT t.name) as tag_names
      FROM reports r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      INNER JOIN report_tags rt ON r.id = rt.report_id
      INNER JOIN tags t ON rt.tag_id = t.id
      WHERE rt.tag_id = ANY($1)
        AND ${userFilter}
      GROUP BY r.id, u.name, rs.customer, rs.project
      ORDER BY r.report_date DESC, r.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, params);

    console.log(`Tag search found ${result.rows.length} reports`);

    // タグ情報を各レポートに追加
    const reportIds = result.rows.map(r => r.id);
    if (reportIds.length > 0) {
      const tagsResult = await pool.query(
        `SELECT rt.report_id, t.id, t.name, t.category, t.color
         FROM report_tags rt
         INNER JOIN tags t ON rt.tag_id = t.id
         WHERE rt.report_id = ANY($1)
         ORDER BY t.category, t.name`,
        [reportIds]
      );

      // レポートIDごとにタグをグループ化
      const tagsByReportId = {};
      tagsResult.rows.forEach(tag => {
        if (!tagsByReportId[tag.report_id]) {
          tagsByReportId[tag.report_id] = [];
        }
        tagsByReportId[tag.report_id].push({
          id: tag.id,
          name: tag.name,
          category: tag.category,
          color: tag.color
        });
      });

      // 各レポートにタグを追加
      result.rows.forEach(report => {
        report.tags = tagsByReportId[report.id] || [];
      });
    }

    res.json({
      success: true,
      reports: result.rows
    });
  } catch (error) {
    console.error('Error searching reports by tags:', error);
    res.status(500).json({
      success: false,
      message: 'タグ検索に失敗しました',
      reports: []
    });
  }
});

// 日報にタグを追加
router.post('/report/:reportId', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { tags } = req.body; // [{ name, category, confidence }]

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'タグデータが不正です'
      });
    }

    // 日報の所有者確認
    const reportCheck = await pool.query(
      'SELECT user_id FROM reports WHERE id = $1',
      [reportId]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '日報が見つかりません'
      });
    }

    const addedTags = [];

    for (const tag of tags) {
      const { name, category, confidence = 1.0, autoGenerated = true } = tag;

      // タグを取得または作成
      const tagId = await getOrCreateTag(name, category);

      // 日報とタグを紐付け（重複は無視）
      try {
        await pool.query(
          `INSERT INTO report_tags (report_id, tag_id, auto_generated, confidence)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (report_id, tag_id) DO NOTHING`,
          [reportId, tagId, autoGenerated, confidence]
        );

        addedTags.push({ id: tagId, name, category });
      } catch (err) {
        console.log(`Tag ${name} already exists for report ${reportId}`);
      }
    }

    res.json({
      success: true,
      message: `${addedTags.length}個のタグを追加しました`,
      tags: addedTags
    });
  } catch (error) {
    console.error('Error adding tags to report:', error);
    res.status(500).json({
      success: false,
      message: 'タグの追加に失敗しました'
    });
  }
});

// 日報からタグを削除
router.delete('/report/:reportId/tag/:tagId', authMiddleware, async (req, res) => {
  try {
    const { reportId, tagId } = req.params;

    await pool.query(
      'DELETE FROM report_tags WHERE report_id = $1 AND tag_id = $2',
      [reportId, tagId]
    );

    res.json({
      success: true,
      message: 'タグを削除しました'
    });
  } catch (error) {
    console.error('Error deleting tag from report:', error);
    res.status(500).json({
      success: false,
      message: 'タグの削除に失敗しました'
    });
  }
});

// タグ統計情報を取得（マネージャー向け）
router.get('/stats', authMiddleware, async (req, res) => {
  console.log('GET /api/tags/stats - Request received from userId:', req.userId);
  try {
    const userId = req.userId;
    const { period = '30' } = req.query; // 日数
    console.log('GET /api/tags/stats - Period:', period);

    let userFilter = 'r.user_id = $1';
    const params = [userId];

    if (req.userRole === 'manager') {
      // マネージャーの場合は部下の日報も含める
      userFilter = `(r.user_id = $1 OR r.user_id IN (
        SELECT id FROM users WHERE manager_id = $1
      ))`;
    }

    // カテゴリ別タグ統計
    const categoryStats = await pool.query(
      `SELECT t.category, COUNT(DISTINCT rt.report_id) as report_count, COUNT(rt.id) as usage_count
       FROM tags t
       INNER JOIN report_tags rt ON t.id = rt.tag_id
       INNER JOIN reports r ON rt.report_id = r.id
       WHERE ${userFilter}
         AND r.report_date >= CURRENT_DATE - INTERVAL '${period} days'
       GROUP BY t.category
       ORDER BY COUNT(rt.id) DESC`,
      params
    );

    // トップタグ
    const topTags = await pool.query(
      `SELECT t.id, t.name, t.category, t.color, COUNT(rt.id) as usage_count
       FROM tags t
       INNER JOIN report_tags rt ON t.id = rt.tag_id
       INNER JOIN reports r ON rt.report_id = r.id
       WHERE ${userFilter}
         AND r.report_date >= CURRENT_DATE - INTERVAL '${period} days'
       GROUP BY t.id, t.name, t.category, t.color
       ORDER BY COUNT(rt.id) DESC
       LIMIT 20`,
      params
    );

    // カテゴリ別トップタグ（各カテゴリTop 10）
    const categoryRankings = {};
    const categories = ['company', 'person', 'topic', 'emotion', 'stage', 'industry', 'product'];

    for (const category of categories) {
      const result = await pool.query(
        `SELECT t.id, t.name, t.category, t.color, COUNT(rt.id) as usage_count
         FROM tags t
         INNER JOIN report_tags rt ON t.id = rt.tag_id
         INNER JOIN reports r ON rt.report_id = r.id
         WHERE ${userFilter}
           AND r.report_date >= CURRENT_DATE - INTERVAL '${period} days'
           AND t.category = $${params.length + 1}
         GROUP BY t.id, t.name, t.category, t.color
         ORDER BY COUNT(rt.id) DESC
         LIMIT 10`,
        [...params, category]
      );
      categoryRankings[category] = result.rows;
    }

    // 前期比較データ
    const previousPeriodStats = await pool.query(
      `SELECT t.category, COUNT(DISTINCT rt.report_id) as report_count, COUNT(rt.id) as usage_count
       FROM tags t
       INNER JOIN report_tags rt ON t.id = rt.tag_id
       INNER JOIN reports r ON rt.report_id = r.id
       WHERE ${userFilter}
         AND r.report_date >= CURRENT_DATE - INTERVAL '${parseInt(period) * 2} days'
         AND r.report_date < CURRENT_DATE - INTERVAL '${period} days'
       GROUP BY t.category
       ORDER BY COUNT(rt.id) DESC`,
      params
    );

    // 前期比較の計算
    const comparison = categoryStats.rows.map(current => {
      const previous = previousPeriodStats.rows.find(p => p.category === current.category);
      if (!previous) {
        return { ...current, change: 0, previousCount: 0 };
      }
      const change = ((parseInt(current.usage_count) - parseInt(previous.usage_count)) / parseInt(previous.usage_count) * 100).toFixed(1);
      return {
        ...current,
        change: parseFloat(change),
        previousCount: parseInt(previous.usage_count)
      };
    });

    res.json({
      success: true,
      stats: {
        categoryStats: comparison,
        topTags: topTags.rows,
        categoryRankings: categoryRankings,
        period: parseInt(period)
      }
    });
  } catch (error) {
    console.error('Error fetching tag stats:', error);
    res.status(500).json({
      success: false,
      message: 'タグ統計の取得に失敗しました',
      stats: {
        categoryStats: [],
        topTags: [],
        period: parseInt(req.query.period || 30)
      }
    });
  }
});

// タグを更新
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, color } = req.body;

    const result = await pool.query(
      `UPDATE tags
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           color = COALESCE($3, color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, category, color, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'タグが見つかりません'
      });
    }

    res.json({
      success: true,
      tag: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({
      success: false,
      message: 'タグの更新に失敗しました'
    });
  }
});

// タグを削除
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // タグと関連するreport_tagsレコードを削除（CASCADE設定済み）
    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'タグが見つかりません'
      });
    }

    res.json({
      success: true,
      message: 'タグを削除しました'
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      success: false,
      message: 'タグの削除に失敗しました'
    });
  }
});

// タグを統合
router.post('/merge', authMiddleware, async (req, res) => {
  try {
    const { sourceTagIds, targetTagId } = req.body;

    if (!sourceTagIds || !Array.isArray(sourceTagIds) || sourceTagIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '統合元のタグIDが指定されていません'
      });
    }

    if (!targetTagId) {
      return res.status(400).json({
        success: false,
        message: '統合先のタグIDが指定されていません'
      });
    }

    // トランザクション開始
    await pool.query('BEGIN');

    try {
      // sourceTagsのreport_tagsをtargetTagIdに更新
      // 重複する場合は無視（ON CONFLICT DO NOTHING）
      for (const sourceTagId of sourceTagIds) {
        // まず、report_tagsを更新
        await pool.query(
          `UPDATE report_tags
           SET tag_id = $1
           WHERE tag_id = $2
             AND report_id NOT IN (
               SELECT report_id
               FROM report_tags
               WHERE tag_id = $1
             )`,
          [targetTagId, sourceTagId]
        );

        // 重複するreport_tagsを削除
        await pool.query(
          `DELETE FROM report_tags
           WHERE tag_id = $1
             AND report_id IN (
               SELECT report_id
               FROM report_tags
               WHERE tag_id = $2
             )`,
          [sourceTagId, targetTagId]
        );

        // sourceTagを削除
        await pool.query(
          'DELETE FROM tags WHERE id = $1',
          [sourceTagId]
        );
      }

      // targetTagのusage_countを再計算
      await pool.query(
        `UPDATE tags
         SET usage_count = (
           SELECT COUNT(*) FROM report_tags WHERE tag_id = $1
         )
         WHERE id = $1`,
        [targetTagId]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'タグを統合しました'
      });
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error merging tags:', error);
    res.status(500).json({
      success: false,
      message: 'タグの統合に失敗しました'
    });
  }
});

/**
 * GET /api/tags/:tagId/detail
 * タグ詳細情報を取得（Web情報キャッシュを含む）
 */
router.get('/:tagId/detail', authMiddleware, async (req, res) => {
  try {
    const { tagId } = req.params;
    const userId = req.userId;

    console.log('[Tags API] Getting tag details:', { tagId, userId });

    // タグ情報を取得
    const tagResult = await pool.query(
      'SELECT * FROM tags WHERE id = $1',
      [tagId]
    );

    if (tagResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tag not found'
      });
    }

    const tag = tagResult.rows[0];

    // Web情報キャッシュを取得
    const webInfoResult = await pool.query(
      'SELECT * FROM tag_web_info WHERE tag_id = $1',
      [tagId]
    );

    const webInfo = webInfoResult.rows.length > 0 ? webInfoResult.rows[0] : null;

    // このタグが使用されている日報を取得（ユーザーがアクセス可能なものだけ）
    let userFilter = 'r.user_id = $2';
    const params = [tagId, userId];

    if (req.userRole === 'manager') {
      userFilter = `(r.user_id = $2 OR r.user_id IN (
        SELECT id FROM users WHERE manager_id = $2
      ))`;
    }

    const reportsResult = await pool.query(`
      SELECT DISTINCT
        r.id,
        r.report_date,
        r.status,
        r.created_at,
        u.name as user_name,
        rs.customer,
        rs.project
      FROM reports r
      INNER JOIN report_tags rt ON r.id = rt.report_id
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE rt.tag_id = $1
        AND ${userFilter}
      ORDER BY r.report_date DESC
      LIMIT 50
    `, params);

    // タグの使用統計
    const statsResult = await pool.query(`
      SELECT
        COUNT(DISTINCT rt.report_id) as report_count,
        COUNT(DISTINCT r.user_id) as user_count,
        MIN(r.report_date) as first_used,
        MAX(r.report_date) as last_used
      FROM report_tags rt
      INNER JOIN reports r ON rt.report_id = r.id
      WHERE rt.tag_id = $1
        AND ${userFilter}
    `, params);

    const stats = statsResult.rows[0];

    // 全てのタグカテゴリで関連する全てのタグをカテゴリ別に取得
    let relatedTags = {};
    if (tag.category) {
      // 自分のカテゴリを除外して、このタグと共起する他のカテゴリのタグを取得
      const relatedTagsResult = await pool.query(`
        SELECT
          t.id,
          t.name,
          t.category,
          t.color,
          COUNT(DISTINCT rt1.report_id) as usage_count
        FROM tags t
        INNER JOIN report_tags rt1 ON t.id = rt1.tag_id
        INNER JOIN report_tags rt2 ON rt1.report_id = rt2.report_id
        INNER JOIN reports r ON rt1.report_id = r.id
        WHERE rt2.tag_id = $1
          AND t.id != $1
          AND t.category != $3
          AND ${userFilter}
        GROUP BY t.id, t.name, t.category, t.color
        ORDER BY t.category, usage_count DESC, t.name ASC
      `, [...params, tag.category]);

      // カテゴリ別にグループ化（実際のカテゴリ名を使用）
      const allRelatedTags = relatedTagsResult.rows.map(row => ({
        ...row,
        usage_count: parseInt(row.usage_count)
      }));

      // カテゴリごとに最大10件に制限
      const categoriesMap = {};
      allRelatedTags.forEach(tag => {
        if (!categoriesMap[tag.category]) {
          categoriesMap[tag.category] = [];
        }
        if (categoriesMap[tag.category].length < 10) {
          categoriesMap[tag.category].push(tag);
        }
      });

      relatedTags = categoriesMap;
    }

    res.json({
      success: true,
      tag,
      web_info: webInfo,
      reports: reportsResult.rows,
      related_tags: relatedTags,
      stats: {
        report_count: parseInt(stats.report_count) || 0,
        user_count: parseInt(stats.user_count) || 0,
        first_used: stats.first_used,
        last_used: stats.last_used
      }
    });

  } catch (error) {
    console.error('[Tags API] Error getting tag details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tag details'
    });
  }
});

/**
 * POST /api/tags/:tagId/fetch-info
 * Bing Searchを使用してタグ（企業名）の最新情報を取得
 */
router.post('/:tagId/fetch-info', authMiddleware, async (req, res) => {
  try {
    const { tagId } = req.params;
    const userId = req.userId;
    const { force = false } = req.body;

    console.log('[Tags API] Fetching web info for tag:', { tagId, userId, force });

    // タグ情報を取得
    const tagResult = await pool.query(
      'SELECT * FROM tags WHERE id = $1',
      [tagId]
    );

    if (tagResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tag not found'
      });
    }

    const tag = tagResult.rows[0];

    // 企業タグでない場合はエラーを返す
    if (tag.category !== 'company') {
      return res.status(400).json({
        success: false,
        error: 'Web情報の取得は企業タグのみ対応しています',
        message: `タグのカテゴリが「${tag.category}」のため、Web情報を取得できません。企業タグを選択してください。`
      });
    }

    // forceがfalseの場合、既存のキャッシュをチェック
    if (!force) {
      const cacheResult = await pool.query(
        'SELECT * FROM tag_web_info WHERE tag_id = $1',
        [tagId]
      );

      if (cacheResult.rows.length > 0) {
        const cachedInfo = cacheResult.rows[0];
        console.log('[Tags API] Returning cached web info (last fetched:', cachedInfo.last_fetched_at, ')');

        return res.json({
          success: true,
          tag,
          web_info: cachedInfo,
          cached: true,
          message: 'DBに保存されたデータを返しました'
        });
      }
    }

    const companyName = tag.name;

    // Bing Searchで情報を取得
    console.log('[Tags API] Searching for company:', companyName, force ? '(forced refresh)' : '(no cache found)');
    const searchResult = await searchCompanyInfo(companyName);

    if (!searchResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch company information'
      });
    }

    // データベースに保存（upsert）
    const upsertResult = await pool.query(`
      INSERT INTO tag_web_info (
        tag_id,
        company_info,
        latest_news,
        related_people,
        recent_topics,
        last_fetched_at
      ) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, NOW())
      ON CONFLICT (tag_id)
      DO UPDATE SET
        company_info = EXCLUDED.company_info,
        latest_news = EXCLUDED.latest_news,
        related_people = EXCLUDED.related_people,
        recent_topics = EXCLUDED.recent_topics,
        last_fetched_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [
      tagId,
      JSON.stringify(searchResult.company_info || {}),
      JSON.stringify(searchResult.latest_news || []),
      JSON.stringify(searchResult.related_people || []),
      JSON.stringify(searchResult.recent_topics || [])
    ]);

    const savedInfo = upsertResult.rows[0];

    console.log('[Tags API] Web info saved successfully');

    res.json({
      success: true,
      tag,
      web_info: savedInfo,
      search_result: searchResult
    });

  } catch (error) {
    console.error('[Tags API] Error fetching web info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch web information',
      message: error.message
    });
  }
});

/**
 * DELETE /api/tags/:tagId/web-info
 * タグのWeb情報キャッシュを削除
 */
router.delete('/:tagId/web-info', authMiddleware, async (req, res) => {
  try {
    const { tagId } = req.params;

    console.log('[Tags API] Deleting web info cache for tag:', tagId);

    await pool.query(
      'DELETE FROM tag_web_info WHERE tag_id = $1',
      [tagId]
    );

    res.json({
      success: true,
      message: 'Web情報キャッシュを削除しました'
    });

  } catch (error) {
    console.error('[Tags API] Error deleting web info:', error);
    res.status(500).json({
      success: false,
      error: 'Web情報キャッシュの削除に失敗しました'
    });
  }
});

module.exports = router;
module.exports.getOrCreateTag = getOrCreateTag;
