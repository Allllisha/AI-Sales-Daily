const axios = require('axios');

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';

const FIELD_SYSTEM_PROMPT = `あなたは建設・土木現場のベテラン技術者AIアシスタントです。
現場作業者の安全と作業品質をサポートします。
音声でのやりとりを想定しているため、回答は簡潔に、重要なポイントを先に伝えてください。
以下のルールに従ってください：
1. 安全に関する注意事項は最優先で伝える
2. 過去の事故事例やヒヤリハットがあれば言及する
3. 具体的で実践的なアドバイスをする
4. 不明な点は確認の質問をする
5. 専門用語を使う場合は補足説明を加える`;

const OFFICE_SYSTEM_PROMPT = `あなたは建設・土木の施工管理をサポートするAIアシスタントです。
事務所での施工検討・事前準備を支援します。
以下のルールに従ってください：
1. チェックリストに沿って体系的に確認する
2. 関連するナレッジや過去事例を積極的に提示する
3. リスク評価結果を明確に伝える
4. 必要な書類・手続きについても言及する
5. 詳しい説明と根拠を示す`;

class RealtimeAIService {
  async generateResponse(userMessage, session) {
    const { mode, conversationHistory, workType, relatedKnowledge, relatedIncidents, relatedChecklists } = session;

    const systemPrompt = mode === 'field' ? FIELD_SYSTEM_PROMPT : OFFICE_SYSTEM_PROMPT;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (workType) {
      messages.push({
        role: 'system',
        content: `現在の工種: ${workType}`
      });
    }

    if (relatedKnowledge && relatedKnowledge.length > 0) {
      const knowledgeText = relatedKnowledge
        .map(k => `【${k.title}】\n${k.summary || k.content.substring(0, 200)}`)
        .join('\n\n');
      messages.push({
        role: 'system',
        content: `参照ナレッジ:\n${knowledgeText}`
      });
    }

    if (relatedChecklists && relatedChecklists.length > 0) {
      const checklistText = relatedChecklists
        .map(c => `【${c.name}】(チェックリストID: ${c.id}, 工種: ${c.work_type || '未設定'})\n${(c.description || '').substring(0, 150)}`)
        .join('\n\n');
      messages.push({
        role: 'system',
        content: `参考チェックリスト:\n${checklistText}\n\n関連するチェックリストがある場合は[[checklist:チェックリストID|名前]]形式で参照してください。「〜のチェックリストも活用できます」のような自然な案内文にしてください。`
      });
    }

    if (relatedIncidents && relatedIncidents.length > 0) {
      const incidentText = relatedIncidents
        .map(i => `【${i.title}】${i.severity}レベル\n${i.description.substring(0, 150)}`)
        .join('\n\n');
      messages.push({
        role: 'system',
        content: `関連事例（注意喚起）:\n${incidentText}`
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

    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    messages.push({ role: 'user', content: userMessage });

    try {
      const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

      const response = await axios.post(url, {
        messages,
        max_tokens: mode === 'field' ? 300 : 1000,
        temperature: 0.7,
      }, {
        headers: {
          'api-key': AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to generate response:', error.message);
      return '申し訳ございません。一時的にAI応答を生成できませんでした。もう一度お試しください。';
    }
  }

  async detectWorkType(userMessage) {
    const workTypeKeywords = {
      '杭打ち': ['杭', '杭打ち', 'くい', '基礎杭'],
      '足場工事': ['足場', 'あしば', '仮設足場', '枠組足場'],
      'コンクリート工事': ['コンクリート', 'こんくりーと', '打設', 'コンクリ', 'RC'],
      '土工事': ['掘削', '盛土', '切土', '土工', '根切り'],
      'トンネル工事': ['トンネル', '掘進', 'シールド', 'NATM'],
      '鉄骨工事': ['鉄骨', '鋼構造', '建方', '溶接'],
      '橋梁工事': ['橋梁', '橋', '架設', '桁'],
      '配管工事': ['配管', 'パイプ', '給排水'],
      '舗装工事': ['舗装', 'アスファルト', '路面'],
      '解体工事': ['解体', '撤去', '取り壊し'],
    };

    for (const [workType, keywords] of Object.entries(workTypeKeywords)) {
      if (keywords.some(kw => userMessage.includes(kw))) {
        return workType;
      }
    }

    return null;
  }

  async generateSummary(session) {
    const { conversationHistory, workType, mode } = session;

    if (!conversationHistory || conversationHistory.length === 0) {
      return 'セッション内容がありません。';
    }

    const historyText = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'ユーザー' : 'AI'}: ${msg.content}`)
      .join('\n');

    const prompt = `以下の${mode === 'field' ? '現場' : '事務所'}での対話内容を要約してください。

工種: ${workType || '不明'}

対話内容:
${historyText}

以下の形式で要約してください:
1. 概要（1-2文）
2. 主な確認事項
3. 注意すべきリスク
4. 次のアクション`;

    try {
      const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

      const response = await axios.post(url, {
        messages: [
          { role: 'system', content: '建設・土木現場の対話記録を的確に要約する専門家です。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }, {
        headers: {
          'api-key': AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return '要約の生成に失敗しました。';
    }
  }
}

module.exports = new RealtimeAIService();
