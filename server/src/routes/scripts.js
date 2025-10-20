const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware: requireAuth } = require('../middleware/auth');
const { callOpenAI } = require('../services/openai');

// スクリプト生成
router.post('/generate', requireAuth, async (req, res) => {
  console.log('[Scripts API] Generate request received:', {
    userId: req.userId,
    body: req.body
  });
  try {
    const { reportId, visitPurpose, objectives, focusPoints } = req.body;
    const userId = req.userId;

    // 関連する日報データを取得（マネージャーの場合は部下の日報も含める）
    let reportQuery = `
      SELECT r.*, u.name as user_name,
             rs.customer, rs.project, rs.next_action, rs.issues,
             rs.budget, rs.schedule, rs.participants, rs.location
      FROM reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.id = $1 AND (r.user_id = $2 OR r.user_id IN (
        SELECT id FROM users WHERE manager_id = $2
      ))
    `;
    const reportResult = await pool.query(reportQuery, [reportId, userId]);

    if (reportResult.rows.length === 0) {
      return res.status(404).json({
        error: '日報が見つかりません',
        details: `reportId: ${reportId}, userId: ${userId}`,
        message: 'この日報にアクセスする権限がないか、日報が存在しません'
      });
    }

    const report = reportResult.rows[0];

    // 日報のQ&A内容を取得
    const qaQuery = `
      SELECT question, answer, timestamp, order_index
      FROM report_qa
      WHERE report_id = $1
      ORDER BY order_index, created_at
    `;
    const qaResult = await pool.query(qaQuery, [reportId]);
    report.qa_content = qaResult.rows;

    // 過去の顧客履歴を取得（日報作成者のユーザーIDで取得）
    const historyQuery = `
      SELECT
        COUNT(DISTINCT r.id) as visit_count,
        AVG(CASE WHEN r.status = 'completed' THEN 100 ELSE 0 END) as success_rate
      FROM reports r
      LEFT JOIN report_slots rs ON r.id = rs.report_id
      WHERE r.user_id = $1 AND rs.customer = $2
    `;
    const historyResult = await pool.query(historyQuery, [report.user_id, report.customer || '']);
    const history = historyResult.rows[0];

    // AIでスクリプトを生成
    const scriptSections = await generateScriptWithAI(report, history, visitPurpose, objectives, focusPoints);

    // スクリプトを保存
    const insertQuery = `
      INSERT INTO talk_scripts (
        report_id, user_id, customer, situation, visit_purpose,
        objectives, script_sections, success_indicators, risk_points,
        ai_model, ai_confidence, script_name, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    // スクリプト名とタグの自動生成
    const scriptName = `${report.customer}_${visitPurpose}_${new Date().toISOString().slice(0,10)}`;
    const tags = [
      visitPurpose,
      report.customer,
      ...(objectives || []).slice(0, 3) // 目標の最初の3つをタグとして追加
    ].filter(Boolean);

    const values = [
      reportId,
      userId,
      report.customer,
      determineStage(history.visit_count),
      visitPurpose,
      JSON.stringify(objectives || []),
      JSON.stringify(scriptSections),
      JSON.stringify(extractSuccessIndicators(objectives)),
      JSON.stringify(extractRiskPoints(report)),
      'gpt-4',
      0.85,
      scriptName,
      tags
    ];

    const result = await pool.query(insertQuery, values);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Script generation error:', error);
    res.status(500).json({ error: 'スクリプト生成に失敗しました' });
  }
});

// スクリプトテンプレート取得（動的ルートより前に定義）
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const { industry, sales_stage, customer_type } = req.query;

    let query = `
      SELECT * FROM script_templates
      WHERE (is_public = true OR created_by = $1)
    `;
    const params = [req.userId];

    if (industry) {
      query += ` AND industry = $${params.length + 1}`;
      params.push(industry);
    }

    if (sales_stage) {
      query += ` AND sales_stage = $${params.length + 1}`;
      params.push(sales_stage);
    }

    if (customer_type) {
      query += ` AND customer_type = $${params.length + 1}`;
      params.push(customer_type);
    }

    query += ' ORDER BY avg_success_rate DESC NULLS LAST, usage_count DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'テンプレート取得に失敗しました' });
  }
});

// スクリプト一覧取得
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { customer, limit = 10, offset = 0 } = req.query;

    let query = `
      SELECT ts.*, r.report_date as report_date
      FROM talk_scripts ts
      LEFT JOIN reports r ON ts.report_id = r.id
      WHERE ts.user_id = $1
    `;
    const params = [userId];

    if (customer) {
      query += ` AND ts.customer ILIKE $${params.length + 1}`;
      params.push(`%${customer}%`);
    }

    query += ` ORDER BY ts.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ error: 'スクリプト取得に失敗しました' });
  }
});

// 特定のスクリプト取得
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const query = `
      SELECT ts.*, r.report_date as report_date
      FROM talk_scripts ts
      LEFT JOIN reports r ON ts.report_id = r.id
      WHERE ts.id = $1 AND ts.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'スクリプトが見つかりません' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching script:', error);
    res.status(500).json({ error: 'スクリプト取得に失敗しました' });
  }
});

// スクリプトの一部更新（PATCH）
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    // 動的にUPDATEクエリを構築
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    Object.keys(updates).forEach(key => {
      if (['script_name', 'tags', 'is_favorite', 'script_sections', 'objectives', 'success_indicators', 'risk_points'].includes(key)) {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(
          typeof updates[key] === 'object' && !Array.isArray(updates[key]) 
            ? JSON.stringify(updates[key])
            : updates[key]
        );
        valueIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '更新するフィールドがありません' });
    }

    values.push(id, userId);

    const updateQuery = `
      UPDATE talk_scripts
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex} AND user_id = $${valueIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'スクリプトが見つかりません' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating script:', error);
    res.status(500).json({ error: 'スクリプト更新に失敗しました' });
  }
});

// スクリプト更新（PUT）
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { script_sections, objectives, success_indicators, risk_points } = req.body;

    const updateQuery = `
      UPDATE talk_scripts
      SET 
        script_sections = COALESCE($1, script_sections),
        objectives = COALESCE($2, objectives),
        success_indicators = COALESCE($3, success_indicators),
        risk_points = COALESCE($4, risk_points),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `;

    const values = [
      script_sections ? JSON.stringify(script_sections) : null,
      objectives ? JSON.stringify(objectives) : null,
      success_indicators ? JSON.stringify(success_indicators) : null,
      risk_points ? JSON.stringify(risk_points) : null,
      id,
      userId
    ];

    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'スクリプトが見つかりません' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating script:', error);
    res.status(500).json({ error: 'スクリプト更新に失敗しました' });
  }
});

// スクリプト利用結果を記録
router.post('/:id/results', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const {
      location,
      used_sections,
      skipped_sections,
      actual_responses,
      success_level,
      achieved_objectives,
      feedback,
      next_improvements
    } = req.body;

    // スクリプトの存在確認
    const scriptCheck = await pool.query(
      'SELECT id FROM talk_scripts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (scriptCheck.rows.length === 0) {
      return res.status(404).json({ error: 'スクリプトが見つかりません' });
    }

    // 利用結果を保存
    const insertQuery = `
      INSERT INTO script_results (
        script_id, user_id, location, used_sections, skipped_sections,
        actual_responses, success_level, achieved_objectives, feedback,
        next_improvements
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id, userId, location,
      JSON.stringify(used_sections || []),
      JSON.stringify(skipped_sections || []),
      JSON.stringify(actual_responses || {}),
      success_level,
      JSON.stringify(achieved_objectives || []),
      feedback,
      next_improvements
    ];

    const result = await pool.query(insertQuery, values);

    // スクリプトの利用統計を更新
    const updateStatsQuery = `
      UPDATE talk_scripts
      SET 
        usage_count = usage_count + 1,
        success_count = success_count + CASE WHEN $1 >= 4 THEN 1 ELSE 0 END
      WHERE id = $2
    `;
    await pool.query(updateStatsQuery, [success_level, id]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error recording script result:', error);
    res.status(500).json({ error: '利用結果の記録に失敗しました' });
  }
});

// スクリプト複製
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 元のスクリプトを取得
    const originalQuery = `
      SELECT * FROM talk_scripts 
      WHERE id = $1 AND user_id = $2
    `;
    const originalResult = await pool.query(originalQuery, [id, userId]);
    
    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'スクリプトが見つかりません' });
    }

    const original = originalResult.rows[0];

    // 複製を作成
    const duplicateQuery = `
      INSERT INTO talk_scripts (
        report_id, user_id, customer, situation, visit_purpose,
        objectives, script_sections, success_indicators, risk_points,
        ai_model, ai_confidence, script_name, tags, parent_script_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;

    const newScriptName = `${original.script_name}_コピー_${new Date().toISOString().slice(0,10)}`;
    
    const values = [
      original.report_id,
      userId,
      original.customer,
      original.situation,
      original.visit_purpose,
      typeof original.objectives === 'string' ? original.objectives : JSON.stringify(original.objectives),
      typeof original.script_sections === 'string' ? original.script_sections : JSON.stringify(original.script_sections),
      typeof original.success_indicators === 'string' ? original.success_indicators : JSON.stringify(original.success_indicators),
      typeof original.risk_points === 'string' ? original.risk_points : JSON.stringify(original.risk_points),
      original.ai_model,
      original.ai_confidence,
      newScriptName,
      original.tags,
      id // parent_script_id として元のスクリプトIDを保存
    ];

    const result = await pool.query(duplicateQuery, values);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error duplicating script:', error);
    res.status(500).json({ error: 'スクリプトの複製に失敗しました' });
  }
});

// スクリプト削除
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const deleteQuery = `
      DELETE FROM talk_scripts 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await pool.query(deleteQuery, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'スクリプトが見つかりません' });
    }

    res.json({ message: 'スクリプトを削除しました', id: result.rows[0].id });

  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ error: 'スクリプトの削除に失敗しました' });
  }
});

// ヘルパー関数

// AIでスクリプトを生成
async function generateScriptWithAI(report, history, visitPurpose, objectives, focusPoints) {
  // 日報の会話内容を整形
  let conversationSummary = '';
  if (report.qa_content && report.qa_content.length > 0) {
    conversationSummary = report.qa_content.map(qa => {
      if (qa.question && qa.answer) {
        return `Q: ${qa.question}\nA: ${qa.answer}`;
      }
      return '';
    }).filter(s => s).join('\n');
  }

  // 訪問目的に応じた特別な指示を追加
  const purposeInstructions = getPurposeSpecificInstructions(visitPurpose);

  const prompt = `
    以下の情報から、【${visitPurpose}】に最適化された営業トークスクリプトを生成してください。
    前回の訪問内容を深く理解し、顧客が話した具体的な内容を踏まえて、継続性のある提案をしてください。
    
    【前回の訪問情報】
    顧客: ${report.customer || '未設定'}
    案件: ${report.project || '未設定'}
    次アクション: ${report.next_action || '未設定'}
    課題: ${report.issues || '特になし'}
    予算: ${report.budget || '未確認'}
    スケジュール: ${report.schedule || '未確認'}
    参加者: ${report.participants || '未確認'}
    場所: ${report.location || '未確認'}
    
    【前回の会話内容】
    ${conversationSummary || '記録なし'}
    
    【顧客履歴】
    訪問回数: ${history.visit_count || 0}回
    成約率: ${history.success_rate ? parseFloat(history.success_rate).toFixed(1) : '0.0'}%
    
    【今回の訪問目的】
    ${visitPurpose}
    
    【達成目標】
    ${objectives && objectives.length > 0 ? objectives.join('、') : '情報収集'}
    
    【重点ポイント】
    ${focusPoints && focusPoints.length > 0 ? focusPoints.join('、') : 'なし'}
    
    【生成ルール】
    0. 【最重要】達成目標として指定された項目は必ずスクリプトに組み込み、それぞれの目標を達成するための具体的な質問や提案を含める
    1. SPIN話法（Situation, Problem, Implication, Need-payoff）を基本とする
    2. 顧客の課題に寄り添う共感的なアプローチ
    3. 具体的な数字やメリットを含める
    4. 次のアクションを明確にする
    5. 日本のビジネス文化に適した丁寧な表現
    6. 前回の会話内容を必ず参照し、継続性のある話題から始める
    7. 顧客が前回話した具体的な懸念事項や興味に対して具体的な回答を用意する
    8. 前回未確認だった項目（予算、スケジュール等）を自然に確認する
    9. 【重要】個人名（田中様、山田さん等）は一切使用せず、会社名＋「様」または「御社」を使用する
    10. 【重要】参加者名は記載せず、役職や部署名のみを使用する（例：「営業部の方」「ご担当者様」）
    11. 【重要】重点ポイントで指定された項目（${focusPoints && focusPoints.length > 0 ? focusPoints.join('、') : 'なし'}）は特に重視し、スクリプト全体に反映させる

    【訪問目的別の特別指示】
    ${purposeInstructions}
    
    以下のJSON形式で出力してください：
    {
      "opening": {
        "main": "メインの挨拶文",
        "alternatives": ["代替案1", "代替案2"],
        "key_points": ["ポイント1", "ポイント2"]
      },
      "needs_discovery": {
        "questions": ["質問1", "質問2", "質問3"],
        "response_patterns": {
          "予算不明時": "予算を聞き出す質問",
          "決裁者不明時": "決裁者を特定する質問",
          "競合確認": "競合状況を確認する質問"
        }
      },
      "value_proposition": {
        "main_benefits": ["メリット1", "メリット2", "メリット3"],
        "proof_points": ["実績1", "実績2"],
        "differentiators": ["差別化ポイント1", "差別化ポイント2"]
      },
      "objection_handling": {
        "価格が高い": "価格に関する反論処理",
        "時期尚早": "タイミングに関する反論処理",
        "他社検討中": "競合に関する反論処理",
        "社内調整が必要": "意思決定に関する反論処理"
      },
      "closing": {
        "trial_close": "温度感を確認する質問",
        "next_action": "次のステップの提案",
        "commitment": "コミットメントを得る言葉",
        "follow_up": "フォローアップの約束"
      }
    }
  `;

  let response;
  try {
    response = await callOpenAI(prompt, 'gpt-4', {
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    // レスポンスからJSONを抽出（```json...```の形式にも対応）
    let jsonString = response;
    if (typeof response === 'string') {
      // コードブロックマーカーを除去
      jsonString = response.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      // 先頭と末尾の空白を除去
      jsonString = jsonString.trim();
    }

    return JSON.parse(jsonString);
  } catch (error) {
    console.error('AI generation error:', error);
    console.error('Response that failed to parse:', response?.substring(0, 500));
    // フォールバックテンプレート
    return getDefaultTemplate(visitPurpose);
  }
}

// 営業ステージを判定
function determineStage(visitCount) {
  if (visitCount <= 1) return '初回訪問';
  if (visitCount <= 3) return '関係構築';
  if (visitCount <= 5) return '提案段階';
  return 'クロージング';
}

// 成功指標を抽出
function extractSuccessIndicators(objectives) {
  const indicators = [];
  if (objectives) {
    if (objectives.includes('予算確認')) indicators.push('予算感の把握');
    if (objectives.includes('決裁者特定')) indicators.push('決裁フローの確認');
    if (objectives.includes('競合確認')) indicators.push('競合状況の把握');
    if (objectives.includes('ニーズ確認')) indicators.push('具体的な課題の特定');
  }
  if (indicators.length === 0) {
    indicators.push('次回アポイントの取得');
  }
  return indicators;
}

// リスクポイントを抽出
function extractRiskPoints(report) {
  const risks = [];
  if (report.issues) {
    if (report.issues.includes('予算')) risks.push('予算制約');
    if (report.issues.includes('競合')) risks.push('競合他社の存在');
    if (report.issues.includes('時期')) risks.push('導入時期の不確定');
  }
  return risks;
}

// 訪問目的別の特別指示を生成
function getPurposeSpecificInstructions(visitPurpose) {
  const purposeMap = {
    '初回訪問': `
    - オープニング：会社紹介と信頼関係構築を重視
    - ニーズ確認：幅広い質問で課題を探索的に聞き出す
    - 価値提案：汎用的なメリットを複数提示し、反応を見る
    - クロージング：次回の具体的な提案機会をセッティング
    - 重点：信頼関係構築、課題の発見、決裁プロセスの把握`,
    
    'フォローアップ': `
    - オープニング：前回の内容の確認と進展状況の確認から開始
    - ニーズ確認：前回判明した課題の深掘りと優先順位の確認
    - 価値提案：前回の反応を踏まえた具体的な解決策の提示
    - クロージング：具体的な検討ステップの提案
    - 重点：継続性、具体化、信頼の深化`,
    
    '提案': `
    - オープニング：提案の概要と本日のゴールを明確に提示
    - ニーズ確認：提案内容と課題のマッチング確認
    - 価値提案：具体的な導入プラン、ROI、実績を詳細に説明
    - クロージング：導入に向けた具体的なスケジュール提案
    - 重点：具体性、実現可能性、投資対効果の明確化`,
    
    '価格交渉': `
    - オープニング：価値の再確認から開始
    - ニーズ確認：予算制約の具体的な内容と背景を確認
    - 価値提案：ROIと長期的なメリットを強調、柔軟な支払い条件の提示
    - クロージング：Win-Winとなる条件の探索と合意形成
    - 重点：価値の正当化、柔軟性、相互利益の追求`,
    
    'クロージング': `
    - オープニング：決定に必要な最終確認事項の整理
    - ニーズ確認：残っている懸念事項の最終確認と解消
    - 価値提案：導入後のサポート体制と成功までのロードマップ提示
    - クロージング：契約条件の最終確認と署名への誘導
    - 重点：決断の後押し、不安の解消、成功イメージの共有`,
    
    'アフターフォロー': `
    - オープニング：導入後の状況確認と感謝の表明
    - ニーズ確認：利用状況と新たな課題の確認
    - 価値提案：追加機能やアップグレードの提案
    - クロージング：継続的な関係構築と紹介の依頼
    - 重点：顧客満足度の確認、追加提案、関係維持`
  };
  
  return purposeMap[visitPurpose] || `
    - 訪問目的「${visitPurpose}」に応じた適切なアプローチ
    - 前回の内容との継続性を保つ
    - 顧客の期待に応える内容構成
    - 次のステップを明確にする`;
}

// デフォルトテンプレート
function getDefaultTemplate(purpose) {
  return {
    opening: {
      main: "お忙しい中、お時間をいただきありがとうございます。",
      alternatives: ["本日はよろしくお願いいたします。"],
      key_points: ["前回の内容を簡潔に振り返る", "今回の目的を明確に伝える"]
    },
    needs_discovery: {
      questions: [
        "現在、どのような課題をお持ちでしょうか？",
        "理想的にはどのような状態を目指されていますか？",
        "この課題はいつ頃までに解決したいとお考えですか？"
      ],
      response_patterns: {
        "予算不明時": "ご予算感はどの程度をお考えでしょうか？",
        "決裁者不明時": "最終的なご判断は、どなたがされますか？",
        "競合確認": "他にご検討されているサービスはございますか？"
      }
    },
    value_proposition: {
      main_benefits: ["コスト削減", "業務効率化", "売上向上"],
      proof_points: ["導入実績100社以上", "平均30%の効率改善"],
      differentiators: ["24時間サポート", "業界特化の機能"]
    },
    objection_handling: {
      "価格が高い": "初期投資は必要ですが、3年で投資回収可能です。",
      "時期尚早": "早期導入により競合優位性を確保できます。",
      "他社検討中": "弊社の強みは〇〇でして、御社のニーズに最適です。",
      "社内調整が必要": "社内説明用の資料をご用意させていただきます。"
    },
    closing: {
      trial_close: "ここまでのご説明で、ご不明な点はございますか？",
      next_action: "次回、より詳細な提案をさせていただければと思います。",
      commitment: "まずは資料をお送りさせていただいてもよろしいでしょうか？",
      follow_up: "来週、改めてご連絡させていただきます。"
    }
  };
}

module.exports = router;