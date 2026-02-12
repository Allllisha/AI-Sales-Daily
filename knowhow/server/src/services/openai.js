const axios = require('axios');

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';

const SYSTEM_PROMPT = `あなたは建設・土木現場のベテラン技術者AIアシスタントです。
施工検討・事前準備・安全管理をサポートします。

## ユーザーの発話タイプを判断し、応答を切り替えてください

### A. 質問・相談の場合（「教えて」「確認したい」「注意点は？」など）
1. チェックリストに沿って一つずつ確認する
2. 関連する過去の事故・トラブル事例があれば提示する
3. リスク評価を行い、注意すべき点を明確に伝える
4. 参照ナレッジが提供されている場合は、その内容を具体的に引用・活用して回答を充実させる

### B. 経験・知見の共有の場合（「〜が分かった」「〜したら〜だった」「〜で対応した」など）
1. まず共有された内容を正確に要約・整理して確認する
2. 具体的な数値や条件を深掘りする質問をする（人数、時間、数量、条件など）
3. 他の現場でも活用できるポイントを引き出す
4. 一般的なチェックリストは出さない（ユーザーの知見が主役）

## 共通ルール
- 専門用語は正確に使うが、わかりやすく説明する
- 不明な点があれば確認の質問をする
- 安全を最優先に考える`;

async function callAzureOpenAI(messages, options = {}) {
  const temperature = options.temperature || 0.7;
  const maxTokens = options.maxTokens || 2000;
  const responseFormat = options.responseFormat;

  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY) {
    console.warn('Azure OpenAI not configured, returning mock response');
    return getMockResponse(messages);
  }

  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  try {
    const requestBody = {
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    if (responseFormat) {
      requestBody.response_format = responseFormat;
    }

    const response = await axios.post(url, requestBody, {
      headers: {
        'api-key': AZURE_OPENAI_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error('Azure OpenAI API error:', error.response?.data || error.message);
    throw error;
  }
}

async function chat(userMessage, context = {}) {
  const mode = context.mode || 'office';

  let systemContent = SYSTEM_PROMPT;
  if (mode === 'field') {
    systemContent += '\n- 音声会話で使われるため、要点を絞って応答する。ただし質問への回答では必要な技術情報は省略しない';
  }

  const messages = [
    { role: 'system', content: systemContent },
  ];

  if (context.relatedKnowledge) {
    messages.push({
      role: 'system',
      content: `参照ナレッジ:\n${context.relatedKnowledge}\n\n## ナレッジ参照ルール
1. 参照ナレッジの内容を積極的に活用し、具体的な技術情報・手順・注意点を回答に含めてください。ナレッジの要点を自分の言葉で説明した上で参照リンクを案内してください。
2. ナレッジを参照した箇所では、自然な日本語の案内文の中にリンクを含めてください。形式: [[knowledge:ナレッジID|タイトル]]
3. リンクは文中に唐突に挿入せず、「〜をご確認ください」「〜に詳しい手順があります」「〜も参考になります」のような自然な案内文にしてください。

良い例: 「事前の地盤調査が非常に重要です。具体的な確認手順については[[knowledge:5|杭打ち工事の地盤調査確認手順]]をご確認ください。」
悪い例: 「事前の地盤調査は非常に重要です[[knowledge:5|杭打ち工事の地盤調査確認手順]]。」`
    });
  }

  if (context.relatedChecklists) {
    messages.push({
      role: 'system',
      content: `参考チェックリスト:\n${context.relatedChecklists}\n\n## チェックリスト参照ルール
1. 関連するチェックリストがある場合は、作業の確認や準備の文脈で自然に紹介してください。
2. チェックリストを参照する際は[[checklist:チェックリストID|名前]]形式でリンクを含めてください。
3. リンクは「〜のチェックリストも活用できます」「〜で事前確認ができます」のような自然な案内文にしてください。

良い例: 「作業前の確認には[[checklist:3|杭打ち工事確認リスト]]が役立ちます。」
悪い例: 「[[checklist:3|杭打ち工事確認リスト]]」`
    });
  }

  if (context.relatedIncidents) {
    messages.push({
      role: 'system',
      content: `参照事例:\n${context.relatedIncidents}`
    });
  }

  // チェックリスト自動作成ルール
  messages.push({
    role: 'system',
    content: `## チェックリスト作成ルール
ユーザーが「チェックリストを作って」「確認リストを作成して」「〜のチェック項目を教えて」等、チェックリストの作成を依頼した場合：
1. まず各確認項目を箇条書きで説明する通常の回答文を書いてください
2. 回答文の最後に、以下のJSON形式でチェックリストデータを追加してください（必ずこの形式で）:

\`\`\`checklist_json
{"name":"チェックリスト名","category":"安全確認","work_type":"","items":["確認項目1","確認項目2","確認項目3"]}
\`\`\`

- categoryは次のいずれか: 安全確認, 品質管理, 作業手順, 機械点検, 環境管理
- work_typeは該当する工種（土工事, 基礎工事, 躯体工事, 仕上工事, 設備工事, 解体工事）、不明なら空文字
- itemsは各確認項目のテキスト配列（5〜15項目程度）
- チェックリスト作成を依頼されていない通常の会話では、このJSON形式を使わないでください`
  });

  if (context.conversationHistory) {
    messages.push(...context.conversationHistory);
  }

  messages.push({ role: 'user', content: userMessage });

  return callAzureOpenAI(messages, { temperature: 0.7, maxTokens: 2000 });
}

async function summarize(content) {
  const messages = [
    {
      role: 'system',
      content: 'あなたは建設・土木分野の技術文書を要約する専門家です。重要なポイントを簡潔にまとめてください。'
    },
    {
      role: 'user',
      content: `以下の内容を3-5文で要約してください:\n\n${content}`
    }
  ];

  return callAzureOpenAI(messages, { temperature: 0.3, maxTokens: 500 });
}

async function assessRisk(workType, conditions) {
  const messages = [
    {
      role: 'system',
      content: 'あなたは建設・土木現場のリスク評価専門家です。作業のリスクを分析し、対策を提案してください。JSON形式で回答してください。'
    },
    {
      role: 'user',
      content: `以下の作業のリスク評価を行ってください。

工種: ${workType}
条件: ${JSON.stringify(conditions)}

以下のJSON形式で回答してください:
{
  "overall_risk": "low|medium|high|critical",
  "risks": [
    {
      "description": "リスクの説明",
      "level": "low|medium|high|critical",
      "probability": "低|中|高",
      "impact": "小|中|大",
      "countermeasure": "対策"
    }
  ],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "required_precautions": ["必要な安全対策1", "必要な安全対策2"]
}`
    }
  ];

  const result = await callAzureOpenAI(messages, {
    temperature: 0.3,
    maxTokens: 1500,
    responseFormat: { type: 'json_object' }
  });

  try {
    return JSON.parse(result);
  } catch {
    return { overall_risk: 'medium', risks: [], recommendations: [], required_precautions: [] };
  }
}

async function extractTags(content) {
  const messages = [
    {
      role: 'system',
      content: 'あなたは建設・土木分野のナレッジからタグを抽出する専門家です。正確で簡潔なタグを抽出してください。'
    },
    {
      role: 'user',
      content: `以下の内容から適切なタグを抽出してください。

${content}

以下のJSON形式で出力してください:
{
  "tags": [
    {
      "name": "タグ名",
      "category": "work_type|safety|material|equipment|quality|process",
      "confidence": 0.0-1.0
    }
  ]
}

タグは10個以内、名前は20文字以内。信頼度0.5以上のもののみ。`
    }
  ];

  const result = await callAzureOpenAI(messages, {
    temperature: 0.3,
    maxTokens: 500,
    responseFormat: { type: 'json_object' }
  });

  try {
    const parsed = JSON.parse(result);
    return parsed.tags || [];
  } catch {
    return [];
  }
}

function getMockResponse(messages) {
  const lastMessage = messages[messages.length - 1].content;

  if (lastMessage.includes('リスク評価')) {
    return JSON.stringify({
      overall_risk: 'medium',
      risks: [
        {
          description: '高所作業による墜落リスク',
          level: 'high',
          probability: '中',
          impact: '大',
          countermeasure: '安全帯の着用、手すりの設置を徹底する'
        }
      ],
      recommendations: ['作業前の安全ミーティングの実施', 'KY活動の実施'],
      required_precautions: ['安全帯の着用', '作業区域の明示']
    });
  }

  if (lastMessage.includes('要約')) {
    return '建設現場における安全管理の要点をまとめた内容です。作業前の確認事項、作業中の注意点、緊急時の対応手順が記載されています。';
  }

  if (lastMessage.includes('タグ')) {
    return JSON.stringify({
      tags: [
        { name: '安全管理', category: 'safety', confidence: 0.9 },
        { name: '足場工事', category: 'work_type', confidence: 0.8 }
      ]
    });
  }

  return '建設・土木現場での安全管理は最も重要な課題です。具体的な状況を教えていただければ、より詳しいアドバイスが可能です。';
}

async function analyzeAndExtractKnowledge(conversationMessages) {
  const systemPrompt = `あなたは建設・土木現場のナレッジ分析専門家です。
会話の内容を分析し、他の現場でも活用できる実用的なナレッジが含まれているかを判断してください。

## 基本方針
- ユーザーが現場で得た知見・経験・観察を積極的に拾い上げる
- AIが回答した**だけ**の一般知識（ユーザーが質問→AIが回答のQ&A）は対象外
- ただし、ユーザーの発言をAIが補足・整理した場合は、ユーザーの知見として登録対象
- ユーザーが「登録して」「記録して」等の登録意思を示した場合は、積極的に登録対象を探す
- **重要: ナレッジの「確認・参照」と「共有・報告」を区別すること**
  - 確認・参照: ユーザーが質問してAIが回答し、ユーザーが了承しただけ → 登録不要
  - 共有・報告: ユーザー自身が現場の経験や独自の知見を語っている → 登録対象

## 判定基準

**should_register = true の場合:**
- ユーザーが自身の経験を語った（「〜だった」「〜した」「〜している」）
- ユーザーが現場で見聞きした知見を共有した（「〜らしい」「〜だそうです」「〜と聞いた」も含む）
- ユーザーが具体的な数値・時間・手順・条件を報告した（例: 「2時間は触らない」）
- ユーザーが現場の人材や技術に関する有益な情報を共有した
- ユーザーとAIの会話を通じて、具体的な施工知識が明らかになった

**should_register = false の場合:**
- ユーザーが質問・相談のみで、AIが一般的な情報を回答しただけ
- ユーザーが既存ナレッジを確認・参照しただけで、新しい知見や経験を共有していない（例: 「足場の組み立てについて教えて」→AIが回答→「わかりました」）
- AIが提示したリスクや注意点をユーザーが確認・了承しただけ（例: 「ありがとうございます」「了解です」「分かりました」）
- 会話が挨拶や雑談のみで、技術的な内容がない
- ユーザーの発言が曖昧すぎて、具体的なナレッジとして整理できない

## 出力形式

必ず以下のJSON形式で回答してください:

{
  "should_register": true または false,
  "reason": "判定理由を簡潔に説明",
  "extracted": {
    "title": "ナレッジの簡潔なタイトル",
    "category": "procedure | safety | quality | cost | equipment | material のいずれか",
    "risk_level": "low | medium | high | critical のいずれか",
    "work_type": "作業の種類（例: 杭打ち工事）",
    "content": "会話から整理した技術的な内容（マークダウン形式）。ユーザーの発言を核に、AIが補足した情報も含めて実用的な技術文書として整理する。会話のコピペではなく、他の作業者が読んで理解・活用できる形にまとめる",
    "tags": ["関連タグ1", "関連タグ2"],
    "summary": "2-3文の要約"
  }
}

should_register が false の場合、extracted は null にしてください。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `以下の現場音声会話を分析し、登録すべきナレッジが含まれているか判断してください。\n\n会話内容:\n${conversationMessages.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n')}`
    }
  ];

  const result = await callAzureOpenAI(messages, {
    temperature: 0.3,
    maxTokens: 2000,
    responseFormat: { type: 'json_object' }
  });

  try {
    return JSON.parse(result);
  } catch {
    return { should_register: false, reason: '解析に失敗しました', extracted: null };
  }
}

async function correctSpeech(rawText) {
  const messages = [
    {
      role: 'system',
      content: `あなたは建設・土木分野の音声認識テキスト補正の専門家です。
音声認識で誤変換されたテキストを、正しい日本語に補正してください。

## ルール
- 建設・土木の専門用語を優先的に補正する（例: 「幸治」→「工事」、「抗打ち」→「杭打ち」、「鉄骨つ」→「鉄骨」）
- 文意が通るように助詞や句読点を補正する
- 元の意味を変えない。明らかな誤変換のみ修正する
- 補正後のテキストのみを返す（説明や注釈は不要）`
    },
    {
      role: 'user',
      content: rawText
    }
  ];

  return callAzureOpenAI(messages, { temperature: 0.1, maxTokens: 500 });
}

async function generateSessionTitle(userMessage, assistantMessage) {
  const messages = [
    {
      role: 'system',
      content: '会話の内容から、短い日本語のタイトル（15文字以内）を1つだけ生成してください。タイトルのみを返してください。括弧や記号は不要です。'
    },
    {
      role: 'user',
      content: `ユーザー: ${userMessage}\nアシスタント: ${assistantMessage.substring(0, 300)}`
    }
  ];

  return callAzureOpenAI(messages, { temperature: 0.3, maxTokens: 50 });
}

module.exports = {
  callAzureOpenAI,
  chat,
  summarize,
  assessRisk,
  extractTags,
  analyzeAndExtractKnowledge,
  correctSpeech,
  generateSessionTitle,
  SYSTEM_PROMPT
};
