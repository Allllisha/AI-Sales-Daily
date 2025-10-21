const axios = require('axios');

// Azure OpenAI設定
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';

/**
 * 日報からタグを自動抽出する
 * @param {Object} reportData - 日報データ
 * @param {Array} reportData.questions_answers - 質問と回答の配列
 * @param {Object} reportData.slots - スロットデータ
 * @returns {Promise<Array>} - 抽出されたタグ配列
 */
async function extractTagsFromReport(reportData) {
  try {
    const { questions_answers = [], slots = {}, mode = 'hearing' } = reportData;

    // 日報の内容をテキストにまとめる
    const qaText = questions_answers
      .filter(qa => qa && qa.answer)  // 空の回答を除外
      .map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join('\n\n');

    const slotsText = Object.entries(slots)
      .filter(([key, value]) => value && value !== '' && typeof value === 'string')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const fullText = `${qaText}\n\n【抽出情報】\n${slotsText}`;

    // データが空の場合はスキップ
    if (!fullText.trim() || fullText.trim() === '【抽出情報】') {
      console.log(`No content to extract tags from (mode: ${mode})`);
      return [];
    }

    console.log(`Extracting tags from report content (mode: ${mode}, text length: ${fullText.length})...`);

    const prompt = `以下の営業日報から、適切なタグを抽出してください。

【日報内容】
${fullText}

【抽出するタグのカテゴリ】
1. company（企業名）: 取引先企業名、顧客企業名
2. person（人物）: 重要な担当者名、キーパーソン名
3. topic（話題）: 商談や面談で話した内容・話題
   - ビジネス話題: 価格交渉、技術相談、納期調整、契約更新、見積提出、仕様確認、納品、検収など
   - 関係構築話題: ゴルフ、釣り、旅行、家族、趣味、スポーツ、食事、お酒、音楽、映画、読書など
   ※顧客との関係構築に関する趣味や雑談の話題も重要なので積極的に抽出する
4. emotion（感情）: 商談の雰囲気（例: 前向き、懸念あり、要検討、好感触、慎重、積極的など）
5. stage（ステージ）: 営業ステージ（例: 初回訪問、提案中、見積中、成約、失注、商談中など）
6. industry（業界）: 顧客の業界（例: 建設業、製造業、IT業、小売業、金融業など）
7. product（製品・サービス）: 提案した製品やサービス名

【日本語カテゴリ】
8. ステータス: 顧客の状態（例: 新規顧客、既存顧客、休眠顧客など）
9. 業界: 顧客の業界（例: 建設業界、IT・通信、製造業、金融業など）
10. 規模: 案件の規模（例: 大型案件、中型案件、小型案件など）
11. アクション: 次に取るべき行動（例: フォローアップ必要、資料送付、再訪問など）
12. フェーズ: 営業フェーズ（例: 商談中、見積提出済、契約締結、受注など）
13. 優先度: 緊急度や重要度（例: 最優先、短納期、要注意など）
14. 見込み: 成約の見込み（例: 成約見込み高、検討中、厳しいなど）

【出力形式】
以下のJSON形式で出力してください：
{
  "tags": [
    {
      "name": "タグ名",
      "category": "カテゴリ",
      "confidence": 0.0-1.0の信頼度
    }
  ]
}

【重要な指示】
- 各カテゴリから最も関連性の高いタグを抽出
- タグ名は簡潔に（20文字以内）
- 信頼度は抽出の確信度を0.0-1.0で表現
- 明確に読み取れないタグは含めない
- 同じ意味のタグは統合する（例: 「ABC建設」と「ABC建設株式会社」は「ABC建設」に統一）
- 日本語カテゴリは日本語で、英語カテゴリは英語でカテゴリ名を出力すること
- JSONのみを出力し、説明文は不要`;

    // Azure OpenAI APIを呼び出し
    const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content: 'あなたは営業日報からタグを抽出する専門家です。正確で簡潔なタグを抽出してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
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
    console.log('AI tag extraction response:', content);

    const result = JSON.parse(content);
    const tags = result.tags || [];

    console.log(`Extracted ${tags.length} tags from report`);
    return tags;

  } catch (error) {
    console.error('Error extracting tags:', error);
    // エラーの場合は空配列を返す
    return [];
  }
}

/**
 * カテゴリに応じたデフォルトカラーを取得
 * @param {string} category - タグカテゴリ
 * @returns {string} - HEXカラーコード
 */
function getCategoryColor(category) {
  const colors = {
    // 英語カテゴリ
    company: '#3B82F6',   // 青
    person: '#10B981',     // 緑
    topic: '#F59E0B',      // オレンジ
    emotion: '#EF4444',    // 赤
    stage: '#8B5CF6',      // 紫
    industry: '#6366F1',   // インディゴ
    product: '#EC4899',    // ピンク
    // 日本語カテゴリ
    'ステータス': '#3B82F6',  // 青
    '業界': '#6366F1',        // インディゴ
    '規模': '#10B981',        // 緑
    'アクション': '#F59E0B',  // オレンジ
    'フェーズ': '#8B5CF6',    // 紫
    '優先度': '#EF4444',      // 赤
    '見込み': '#EC4899'       // ピンク
  };
  return colors[category] || '#6B7280'; // デフォルトはグレー
}

module.exports = {
  extractTagsFromReport,
  getCategoryColor
};
