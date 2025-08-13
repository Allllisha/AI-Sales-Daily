const axios = require('axios');
const sessionManager = require('./sessionManager');

// Azure OpenAI設定
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';

class RealtimeAIService {
  async generateQuestion(session, hasMissingInfo = false) {
    const { slots, questionsAnswers } = session;
    const emptySlots = sessionManager.getEmptySlots(slots);

    // 初回質問は固定の挨拶にする
    if (questionsAnswers.length === 0) {
      return 'お疲れ様です！今日はどのような商談がありましたか？';
    }

    // 会話履歴を構築
    const conversationHistory = questionsAnswers.map(qa => 
      `Q: ${qa.question}\nA: ${qa.answer}`
    ).join('\n\n');

    // 直前の回答を分析
    const lastAnswer = questionsAnswers.length > 0 
      ? questionsAnswers[questionsAnswers.length - 1].answer 
      : '';
      
    // 回答の内容から感情や重要度を推測
    const hasPositiveSignal = lastAnswer.match(/前向き|好感触|興味|良い|進展|決まり|合意|了承/);
    const hasNegativeSignal = lastAnswer.match(/難しい|厳しい|課題|問題|懸念|不安|渋い|保留/);
    const hasSpecificInfo = lastAnswer.match(/\d+[万円億]|来週|今月|来月|部長|課長|社長/);
    
    // 重要な情報が抜けている場合の優先質問
    let priorityQuestion = '';
    if (hasMissingInfo) {
      if (lastAnswer.match(/競合|他社/) && !slots.competitor_info) {
        priorityQuestion = '競合他社についてもう少し詳しく教えていただけますか？';
      } else if (lastAnswer.match(/予算|金額|円/) && !slots.budget) {
        priorityQuestion = '予算の規模感について具体的に教えていただけますか？';
      } else if (lastAnswer.match(/前向き|好感触|良い/) && !slots.closing_possibility) {
        priorityQuestion = '成約の可能性はどのくらいとお考えですか？';
      } else if (lastAnswer.match(/課題|問題|懸念/) && !slots.issues) {
        priorityQuestion = 'その課題について、もう少し詳しく状況を教えてください。';
      }
    }
    
    const prompt = `
あなたは営業日報作成を支援するAIアシスタントです。
ユーザーとの自然な会話を通じて、営業活動の詳細と雰囲気・温度感を聞き出してください。

${priorityQuestion ? `優先的に聞くべき質問: ${priorityQuestion}` : ''}

現在収集済みの情報:
${JSON.stringify(slots, null, 2)}

これまでの会話履歴:
${conversationHistory}

直前の回答: "${lastAnswer}"
${hasPositiveSignal ? '→ ポジティブな反応が見られます。この流れを深掘りしてください。' : ''}
${hasNegativeSignal ? '→ 課題や懸念が示されています。詳細や対策を聞いてください。' : ''}
${hasSpecificInfo ? '→ 具体的な情報が出ています。関連する詳細を確認してください。' : ''}

会話回数: ${questionsAnswers.length}

質問生成の戦略:
1. 【会話序盤（1-3回目）】基本情報を収集
   - まだ収集していない: 顧客名、案件内容、次のアクション
   
2. 【会話中盤（4-8回目）】ユーザーの回答に応じた動的な深掘り
   - 前向きな回答 → 「それは素晴らしいですね！具体的にどの点が評価されましたか？」
   - 課題が示された → 「その課題について、先方はどんな解決策を求めていましたか？」
   - 具体名が出た → その人物の反応や役割について質問
   - 金額が出た → 予算の妥当性や決裁プロセスについて
   
3. 【会話終盤（9回目以降）】まとめと確認
   - 成約可能性の率直な感覚（%）
   - 最も重要なネクストステップ
   - フォローすべき懸念事項

重要：
- 直前の回答の内容を必ず踏まえて関連質問をする
- 「それは〜ですね」など、相手の回答を受け止める言葉から始める
- ユーザーが詳しく答えた部分はさらに深掘り
- 簡潔に答えた部分は別の角度から質問

次の質問（30-40文字、直前の回答を踏まえて）:`;

    try {
      const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
      
      const response = await axios.post(url, {
        messages: [
          { role: 'system', content: 'You are a helpful assistant for creating sales reports.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }, {
        headers: {
          'api-key': AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to generate question:', error);
      
      // フォールバック質問
      if (!slots.customer) return 'どちらの企業様を訪問されましたか？';
      if (!slots.project) return 'どのような案件でしたか？';
      if (!slots.next_action) return '次のアクションは何ですか？';
      if (!slots.budget) return '予算感はいかがでしたか？';
      if (!slots.schedule) return 'スケジュールはどのような感じでしょうか？';
      
      return '他に共有したいことはありますか？';
    }
  }

  async extractSlots(answer, currentSlots) {
    const prompt = `
以下の回答から営業日報の情報を抽出してください。

回答: "${answer}"

現在の情報:
${JSON.stringify(currentSlots, null, 2)}

以下の項目を抽出してJSON形式で返してください:
- customer: 顧客名・会社名
- project: 案件名・プロジェクト名
- next_action: 次のアクション（複数ある場合はカンマ区切り）
- budget: 予算
- schedule: スケジュール・納期
- participants: 参加者（複数の場合はカンマ区切り）
- location: 場所・訪問先
- issues: 課題・リスク（複数ある場合はカンマ区切り）
- key_person_reaction: キーマンの反応・温度感
- positive_points: 先方が興味を持った点・前のめりになった瞬間
- atmosphere_change: 雰囲気が変わった瞬間
- competitor_info: 競合情報・比較検討状況
- enthusiasm_level: 先方の熱意度（高/中/低）
- budget_reaction: 予算への反応（前向き/渋い/余裕あり）
- concerns_mood: 懸念事項の雰囲気・温度感
- next_step_mood: 次ステップへの温度感・確度
- closing_possibility: 成約可能性（%）

回答に含まれない項目は現在の値を維持してください。
JSONのみを返してください。`;

    try {
      const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
      
      const response = await axios.post(url, {
        messages: [
          { role: 'system', content: 'You are a JSON extractor. Return only valid JSON.' },
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

      let content = response.data.choices[0].message.content.trim();
      // ```json や ``` を削除
      content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const extracted = JSON.parse(content);
      
      // 現在のスロットとマージ
      return {
        ...currentSlots,
        ...Object.entries(extracted).reduce((acc, [key, value]) => {
          if (value && value !== '' && value !== currentSlots[key]) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Failed to extract slots:', error);
      return currentSlots;
    }
  }

  async generateResponse(answer, slots) {
    const prompt = `
ユーザーの回答: "${answer}"

以下の情報が抽出されました:
${JSON.stringify(slots, null, 2)}

ユーザーの回答に対して、共感的で自然な応答を20文字以内で生成してください。
例: "承知しました", "なるほどですね", "ありがとうございます"

応答:`;

    try {
      const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
      
      const response = await axios.post(url, {
        messages: [
          { role: 'system', content: 'You are a empathetic assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.7,
      }, {
        headers: {
          'api-key': AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to generate response:', error);
      return 'ありがとうございます';
    }
  }

  async generateSummary(session) {
    const { slots, questionsAnswers } = session;

    const prompt = `
以下の情報から営業日報のサマリーを生成してください。

収集した情報:
${JSON.stringify(slots, null, 2)}

会話履歴:
${questionsAnswers.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n')}

200文字以内で、要点をまとめた日報サマリーを作成してください:`;

    try {
      const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
      
      const response = await axios.post(url, {
        messages: [
          { role: 'system', content: 'You are a professional report writer.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.5,
      }, {
        headers: {
          'api-key': AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return '本日の営業活動の記録';
    }
  }
}

module.exports = new RealtimeAIService();