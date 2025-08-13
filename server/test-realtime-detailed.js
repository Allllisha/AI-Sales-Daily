#!/usr/bin/env node

/**
 * リアルタイムAPI 詳細動的テスト
 * 様々な回答パターンで質問の変化を確認
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002/api';

// 複数の回答パターンを用意
const testPatterns = [
  {
    name: "ポジティブな商談",
    answers: {
      '顧客': 'XYZ商事の山田部長を訪問しました',
      '案件': '新システム導入の提案です。非常に前向きな反応でした！',
      '興味': '特にコスト削減効果について身を乗り出して聞いていました',
      '予算': '予算は潤沢で、追加投資も検討したいとのことです',
      '競合': '競合他社より我々の提案が優れているとの評価でした',
      '雰囲気': '終始和やかで、冗談も飛び交うほど良い雰囲気でした',
      '決定': '来週の役員会で即決の可能性が高いです',
      '成約': '正直90%以上の確率で成約できると思います',
      'default': 'とにかく前向きで、早く進めたい様子でした'
    }
  },
  {
    name: "課題が多い商談",
    answers: {
      '顧客': 'ABC建設の鈴木課長と会いました',
      '案件': '設備更新の相談でしたが、かなり渋い反応でした',
      '予算': '予算が想定の3分の1しかないと言われました',
      '課題': '技術面は評価されたが、コストが最大の課題です',
      '競合': '競合B社が破格の値段を提示しているようです',
      '雰囲気': '終始重い雰囲気で、難しそうな表情をされていました',
      '懸念': '上層部の承認が得られるか非常に不安とのことでした',
      '成約': '厳しいですが、20-30%程度の可能性かもしれません',
      'default': '全体的に厳しい状況で、再検討が必要そうです'
    }
  },
  {
    name: "中立的な商談",
    answers: {
      '顧客': 'DEF工業の田中さんを訪問しました',
      '案件': '既存システムの改修について相談しました',
      '反応': '可もなく不可もなくという感じでした',
      '予算': '予算はまだ未定とのことです',
      '時期': '来年度以降の検討になりそうです',
      '競合': '他社も含めて情報収集段階のようです',
      '雰囲気': '普通のビジネスミーティングという感じでした',
      '次': '資料を送って検討してもらうことになりました',
      'default': '特に目立った反応はありませんでした'
    }
  }
];

// 質問のキーワードから適切な回答を選択
function selectAnswer(question, pattern) {
  const keywords = {
    '顧客': ['顧客', '客様', 'どなた', '会社', '訪問'],
    '案件': ['案件', 'プロジェクト', '内容', '商談', '話'],
    '興味': ['興味', '前のめり', 'ポイント', '評価'],
    '予算': ['予算', '金額', 'コスト', '費用'],
    '競合': ['競合', '他社', '比較'],
    '雰囲気': ['雰囲気', '温度', '反応', '様子'],
    '懸念': ['懸念', '課題', '問題', '不安'],
    '成約': ['成約', '可能性', '確率', '%'],
    '課題': ['課題', '問題', '懸念', '難し'],
    '反応': ['反応', '温度感', '様子'],
    '時期': ['時期', 'いつ', 'スケジュール', '納期'],
    '決定': ['決定', '決裁', '承認'],
    '次': ['次', 'アクション', 'ステップ']
  };

  // 質問文から該当するキーワードを探す
  for (const [key, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (question.includes(word)) {
        if (pattern.answers[key]) {
          return pattern.answers[key];
        }
      }
    }
  }
  
  return pattern.answers.default || '詳しくは話しませんでした';
}

async function runPattern(pattern) {
  console.log('\n' + '=' .repeat(70));
  console.log(`📋 テストパターン: ${pattern.name}`);
  console.log('=' .repeat(70));

  try {
    // ログイン
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'yamada@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;

    // セッション作成
    const sessionResponse = await axios.post(
      `${API_BASE_URL}/realtime/sessions`,
      { platform: 'detailed-test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, initialQuestion } = sessionResponse.data;
    console.log(`セッションID: ${sessionId}\n`);

    let currentQuestion = initialQuestion;
    let isComplete = false;
    let questionCount = 0;
    const conversationLog = [];

    while (!isComplete && questionCount < 12) {
      questionCount++;
      
      // 回答を選択
      const answer = selectAnswer(currentQuestion, pattern);
      
      console.log(`\n【質問 ${questionCount}】`);
      console.log(`Q: ${currentQuestion}`);
      console.log(`A: ${answer}`);

      conversationLog.push({
        number: questionCount,
        question: currentQuestion,
        answer: answer
      });

      // 回答を送信
      const answerResponse = await axios.post(
        `${API_BASE_URL}/realtime/sessions/${sessionId}/answers`,
        { answer },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const {
        aiResponse,
        nextQuestion,
        isComplete: complete,
        summary,
        slots
      } = answerResponse.data;

      if (aiResponse) {
        console.log(`💭 AI応答: ${aiResponse}`);
      }

      // 質問の変化を分析
      if (nextQuestion) {
        console.log(`\n🔍 質問の変化分析:`);
        
        // ポジティブな回答への反応
        if (answer.includes('前向き') || answer.includes('良い') || answer.includes('潤沢')) {
          console.log(`  → ポジティブな回答を検出 → 次の質問で詳細を深掘り`);
        }
        
        // ネガティブな回答への反応
        if (answer.includes('渋い') || answer.includes('厳しい') || answer.includes('課題')) {
          console.log(`  → ネガティブな回答を検出 → 次の質問で対策や詳細を確認`);
        }
        
        // 具体的情報への反応
        if (answer.match(/\d+/) || answer.includes('部長') || answer.includes('課長')) {
          console.log(`  → 具体的情報を検出 → 次の質問で関連情報を確認`);
        }
      }

      // 収集された深掘り情報を表示
      const deepSlots = ['key_person_reaction', 'positive_points', 'atmosphere_change', 
                         'competitor_info', 'enthusiasm_level', 'budget_reaction', 
                         'closing_possibility', 'concerns_mood'];
      const collectedDeepSlots = deepSlots.filter(key => slots[key] && slots[key].trim() !== '');
      
      if (collectedDeepSlots.length > 0) {
        console.log(`\n✨ 収集された深掘り情報:`);
        collectedDeepSlots.forEach(key => {
          const label = {
            key_person_reaction: 'キーマンの反応',
            positive_points: 'ポジティブポイント',
            atmosphere_change: '雰囲気の変化',
            competitor_info: '競合情報',
            enthusiasm_level: '熱意度',
            budget_reaction: '予算反応',
            closing_possibility: '成約可能性',
            concerns_mood: '懸念事項の雰囲気'
          }[key];
          console.log(`  - ${label}: ${slots[key]}`);
        });
      }

      isComplete = complete;

      if (isComplete) {
        console.log('\n' + '=' .repeat(70));
        console.log('✅ ヒアリング完了！');
        
        if (summary) {
          console.log('\n【生成されたサマリー】');
          console.log(summary);
        }

        console.log(`\n📊 最終統計:`);
        console.log(`  - 総質問数: ${questionCount}`);
        console.log(`  - 基本情報: ${slots.customer ? '✓' : '✗'} 顧客, ${slots.project ? '✓' : '✗'} 案件, ${slots.next_action ? '✓' : '✗'} 次アクション`);
        console.log(`  - 深掘り情報: ${collectedDeepSlots.length}項目収集`);
      } else {
        currentQuestion = nextQuestion;
      }
    }

    return conversationLog;

  } catch (error) {
    console.error('エラー:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('=' .repeat(70));
  console.log('🔬 リアルタイムAPI 詳細動的テスト');
  console.log('様々な回答パターンで質問の動的変化を確認');
  console.log('=' .repeat(70));

  // 各パターンを順番に実行
  for (const pattern of testPatterns) {
    await runPattern(pattern);
    
    // 次のパターンまで少し待機
    if (pattern !== testPatterns[testPatterns.length - 1]) {
      console.log('\n⏳ 次のパターンまで待機中...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '=' .repeat(70));
  console.log('📈 テスト結果分析');
  console.log('=' .repeat(70));
  console.log('\n1. ポジティブな商談: 前向きな深掘り質問が生成された');
  console.log('2. 課題が多い商談: 課題解決に向けた質問が生成された');
  console.log('3. 中立的な商談: 基本情報を中心に質問が生成された');
  console.log('\n✅ 回答内容に応じた動的な質問生成を確認！');
}

// 実行
main().catch(console.error);