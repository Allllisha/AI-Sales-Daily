const axios = require('axios');

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';

async function extractTagsFromKnowledge(knowledgeData) {
  try {
    const { title, content, category, work_type } = knowledgeData;

    const fullText = `タイトル: ${title}\nカテゴリ: ${category}\n工種: ${work_type || '不明'}\n\n内容:\n${content}`;

    if (!fullText.trim()) {
      return [];
    }

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY) {
      return getDefaultTags(knowledgeData);
    }

    const prompt = `以下の建設・土木ナレッジから、適切なタグを抽出してください。

${fullText}

以下のカテゴリからタグを抽出してください:
1. work_type（工種）: 杭打ち、足場工事、コンクリート工事、土工事、トンネル工事、鉄骨工事、橋梁工事 など
2. safety（安全）: 墜落防止、重機安全、火災防止、酸欠防止 など
3. material（資材）: コンクリート、鉄筋、鉄骨、木材、アスファルト など
4. equipment（機械）: クレーン、バックホウ、ダンプ、ポンプ車 など
5. quality（品質）: 養生、検査、計測、試験 など
6. process（工程）: 準備工、本工事、仕上げ、検査 など
7. risk（リスク）: 地盤リスク、気象リスク、近隣影響 など

JSON形式で出力:
{
  "tags": [
    { "name": "タグ名", "category": "カテゴリ", "confidence": 0.0-1.0 }
  ]
}

タグは10個以内。信頼度0.5以上のもののみ。`;

    const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

    const response = await axios.post(url, {
      messages: [
        {
          role: 'system',
          content: 'あなたは建設・土木分野のナレッジからタグを抽出する専門家です。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'api-key': AZURE_OPENAI_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const result = JSON.parse(response.data.choices[0].message.content);
    return result.tags || [];

  } catch (error) {
    console.error('Error extracting tags:', error.message);
    return getDefaultTags(knowledgeData);
  }
}

function getDefaultTags(knowledgeData) {
  const tags = [];

  if (knowledgeData.work_type) {
    tags.push({ name: knowledgeData.work_type, category: 'work_type', confidence: 1.0 });
  }

  if (knowledgeData.category) {
    const categoryMap = {
      procedure: '手順',
      safety: '安全管理',
      quality: '品質管理',
      cost: 'コスト管理',
      equipment: '機械管理',
      material: '資材管理'
    };
    const catName = categoryMap[knowledgeData.category] || knowledgeData.category;
    tags.push({ name: catName, category: 'process', confidence: 0.8 });
  }

  return tags;
}

function getCategoryColor(category) {
  const colors = {
    work_type: '#3B82F6',
    safety: '#EF4444',
    material: '#10B981',
    equipment: '#F59E0B',
    quality: '#8B5CF6',
    process: '#6366F1',
    risk: '#DC2626'
  };
  return colors[category] || '#6B7280';
}

module.exports = {
  extractTagsFromKnowledge,
  getCategoryColor
};
