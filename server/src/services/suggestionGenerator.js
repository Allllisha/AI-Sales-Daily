const axios = require('axios');
const pool = require('../db/pool');

// Azure OpenAI設定
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';

/**
 * 次回商談の提案を生成
 * @param {number} reportId - 日報ID
 * @returns {Promise<Object>} AI提案
 */
async function generateSuggestions(reportId) {
  try {
    console.log('[AI Suggestions] Starting generation for report:', reportId);

    // 現在の日報を取得（report_slotsテーブルをJOIN）
    const currentReport = await pool.query(`
      SELECT
        r.*,
        rs.customer,
        rs.project,
        rs.next_action,
        rs.budget,
        rs.schedule,
        rs.participants,
        rs.location,
        rs.issues,
        rs.industry
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.id = $1
    `, [reportId]);

    if (currentReport.rows.length === 0) {
      throw new Error('Report not found');
    }

    const report = currentReport.rows[0];
    console.log('[AI Suggestions] Current report:', {
      id: report.id,
      user_id: report.user_id,
      customer: report.customer,
      project: report.project,
      report_date: report.report_date
    });

    // 同じ顧客の過去の日報を取得（最新5件、自分自身を除く）
    // 案件名は完全一致しないことが多いため、顧客名のみでフィルタリング
    const pastReports = await getPastReports(
      report.user_id,
      report.customer,
      null, // 案件名は使用しない
      reportId
    );

    console.log('[AI Suggestions] Past reports found:', pastReports.length);
    if (pastReports.length > 0) {
      console.log('[AI Suggestions] Past reports:', pastReports.map(r => ({
        id: r.id,
        date: r.report_date,
        customer: r.customer
      })));
    }

    // 過去の日報がない場合
    if (pastReports.length === 0) {
      console.log('[AI Suggestions] No past reports found, returning empty state');
      return {
        next_topics: [],
        reasoning: 'まだ過去の日報がありません。最初の商談として、顧客のニーズと課題をしっかり聞き取ることに集中しましょう。',
        generated_at: new Date().toISOString(),
        has_past_reports: false
      };
    }

    // Azure OpenAI を使用してAI提案を生成
    if (AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_KEY) {
      return await generateWithAI(report, pastReports);
    }

    // モックレスポンス（開発用）
    return generateMockSuggestions(report, pastReports);

  } catch (error) {
    console.error('Error generating suggestions:', error);
    throw error;
  }
}

/**
 * 過去の日報を取得
 */
async function getPastReports(userId, customer, project, excludeReportId) {
  try {
    console.log('[AI Suggestions] Getting past reports with params:', {
      userId,
      customer,
      project,
      excludeReportId
    });

    let query = `
      SELECT
        r.id,
        r.report_date,
        rs.customer,
        rs.project,
        rs.next_action,
        rs.issues,
        rs.budget,
        rs.schedule,
        rs.industry
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1
      AND r.id != $2
      AND r.status = 'completed'
    `;

    const params = [userId, excludeReportId];
    let paramIndex = 3;

    // 顧客名でフィルタリング
    if (customer) {
      query += ` AND rs.customer = $${paramIndex}`;
      params.push(customer);
      paramIndex++;
    }

    // 案件名でフィルタリング（オプション）
    if (project) {
      query += ` AND rs.project = $${paramIndex}`;
      params.push(project);
    }

    query += ` ORDER BY r.report_date DESC LIMIT 5`;

    console.log('[AI Suggestions] Query:', query);
    console.log('[AI Suggestions] Params:', params);

    const result = await pool.query(query, params);
    console.log('[AI Suggestions] Query result rows:', result.rows.length);

    return result.rows;

  } catch (error) {
    console.error('[AI Suggestions] Error fetching past reports:', error);
    return [];
  }
}

/**
 * Azure OpenAI APIを使用してAI提案を生成
 */
async function generateWithAI(currentReport, pastReports) {
  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  // プロンプトを構築
  const prompt = buildPrompt(currentReport, pastReports);

  try {
    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: 'あなたは経験豊富な営業コーチです。過去の商談履歴を分析して、次回の商談で話すべき重要なトピックを提案してください。提案は具体的で実行可能なものにしてください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'api-key': AZURE_OPENAI_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      next_topics: parsed.next_topics || [],
      reasoning: parsed.reasoning || '',
      generated_at: new Date().toISOString(),
      has_past_reports: true
    };

  } catch (error) {
    console.error('Azure OpenAI API error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * プロンプトを構築
 */
function buildPrompt(currentReport, pastReports) {
  let prompt = `以下の過去の商談履歴を分析して、次回の商談で話すべき重要なトピックを3-5個提案してください。\n\n`;

  prompt += `【顧客情報】\n`;
  prompt += `会社名: ${currentReport.customer || '未設定'}\n`;
  prompt += `案件名: ${currentReport.project || '未設定'}\n`;
  prompt += `業界: ${currentReport.industry || '未設定'}\n\n`;

  prompt += `【前回の商談内容（最新）】\n`;
  prompt += `日付: ${currentReport.report_date}\n`;
  if (currentReport.next_action) {
    prompt += `次のアクション: ${currentReport.next_action}\n`;
  }
  if (currentReport.issues) {
    prompt += `課題・リスク: ${currentReport.issues}\n`;
  }
  if (currentReport.budget) {
    prompt += `予算: ${currentReport.budget}\n`;
  }
  if (currentReport.schedule) {
    prompt += `スケジュール: ${currentReport.schedule}\n`;
  }
  prompt += `\n`;

  // 過去の日報を追加
  if (pastReports.length > 0) {
    prompt += `【過去の商談履歴】\n`;
    pastReports.forEach((report, index) => {
      prompt += `\n${index + 1}. ${report.report_date}\n`;
      if (report.next_action) {
        prompt += `   次のアクション: ${report.next_action}\n`;
      }
      if (report.issues) {
        prompt += `   課題・リスク: ${report.issues}\n`;
      }
    });
    prompt += `\n`;
  }

  prompt += `【出力形式】\n`;
  prompt += `以下のJSON形式で提案してください：\n`;
  prompt += `{\n`;
  prompt += `  "next_topics": [\n`;
  prompt += `    "トピック1",\n`;
  prompt += `    "トピック2",\n`;
  prompt += `    "トピック3"\n`;
  prompt += `  ],\n`;
  prompt += `  "reasoning": "提案理由を簡潔に説明"\n`;
  prompt += `}\n\n`;
  prompt += `※トピックは具体的で実行可能なものにしてください。\n`;
  prompt += `※過去の課題や未完了のアクションを考慮してください。\n`;

  return prompt;
}

/**
 * モック提案を生成（開発用）
 */
function generateMockSuggestions(currentReport, pastReports) {
  const topics = [];

  // 予算に関する提案
  if (currentReport.budget) {
    topics.push('予算の最終確認と承認プロセスの確認');
  } else {
    topics.push('予算感のヒアリングと投資対効果の説明');
  }

  // 課題に関する提案
  if (currentReport.issues) {
    const issuePreview = currentReport.issues.length > 50
      ? currentReport.issues.substring(0, 50) + '...'
      : currentReport.issues;
    topics.push(`前回の課題「${issuePreview}」の解決策の提示`);
  }

  // 次のアクションに関する提案
  if (currentReport.next_action) {
    const actionPreview = currentReport.next_action.length > 50
      ? currentReport.next_action.substring(0, 50) + '...'
      : currentReport.next_action;
    topics.push(`「${actionPreview}」の進捗確認`);
  }

  // スケジュールに関する提案
  if (currentReport.schedule) {
    topics.push('導入スケジュールの詳細確認と調整');
  } else {
    topics.push('導入時期とスケジュールの確認');
  }

  // 競合に関する提案
  topics.push('競合他社との差別化ポイントの再説明');

  return {
    next_topics: topics.slice(0, 5),
    reasoning: `前回の商談内容を踏まえて、次回は${topics[0]}を中心に進めることをお勧めします。また、過去${pastReports.length}件の商談履歴から、顧客の関心事項を整理しました。`,
    generated_at: new Date().toISOString(),
    has_past_reports: true
  };
}

module.exports = {
  generateSuggestions
};
