#!/usr/bin/env node

/**
 * スマート完了判定テスト
 * 情報の質と量に応じて柔軟に終了判定を行う
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002/api';

// テストシナリオ
const scenarios = [
  {
    name: "📊 十分な情報で早期終了",
    description: "必須情報と重要な深掘り情報が早めに揃った場合",
    answers: [
      "ABC建設の田中部長と新社屋建設について商談しました。非常に前向きで、予算5000万円で来年3月着工予定です。",
      "特にコスト削減効果に強い興味を示され、技術説明時には身を乗り出して聞いていました。競合のB社も検討中ですが、我々の提案の方が優れているとの評価でした。",
      "来週の役員会で決裁を取る予定で、見積書を明日提出します。成約可能性は80%以上だと思います。",
      "田中部長からは追加で保守契約についても相談したいとのことでした。"
    ],
    expectedBehavior: "4-5回で終了（情報が十分）"
  },
  {
    name: "❓ 情報不足で継続質問",
    description: "基本情報はあるが詳細が不足している場合",
    answers: [
      "XYZ商事を訪問しました",
      "システム更新の相談です",
      "見積もりを送ります",
      "まあまあでした",
      "特に決まっていません",
      "分かりません",
      "普通でした"
    ],
    expectedBehavior: "8-10回継続（情報の質が低い）"
  },
  {
    name: "🎯 重要キーワードで深掘り",
    description: "競合や予算の話が出た時に詳細を確認",
    answers: [
      "DEF工業の営業部を訪問しました",
      "新規設備導入の提案です。競合他社もいるようです",
      "A社とB社が競合として検討されています。価格面で厳しい戦いです",
      "予算は想定より少ないと言われました",
      "2000万円程度しか確保できないとのことです",
      "技術面は評価されましたが、コストが課題です",
      "再見積もりをして再提案することになりました"
    ],
    expectedBehavior: "7-8回で終了（重要情報を深掘り後）"
  },
  {
    name: "💡 詳細な回答で適切終了",
    description: "各回答が詳細で情報量が多い場合",
    answers: [
      "今日はGHI製造の山田取締役、鈴木部長、田中課長と本社会議室で2時間の商談を行いました。新工場のFA システム全面更新プロジェクトについての提案です。",
      "予算規模は約1億円で、今期中の導入を希望されています。特に生産性向上とメンテナンスコスト削減に強い関心を示されました。",
      "競合はC社とD社ですが、我々の実績と提案内容が高く評価され、技術面では優位に立っていると感じました。",
      "次のステップとして、来週工場見学を実施し、詳細仕様を詰めることになりました。決裁は月末の取締役会です。",
      "成約可能性は60-70%程度と見ています。価格交渉が鍵になりそうです。"
    ],
    expectedBehavior: "5-6回で終了（各回答が詳細で充実）"
  }
];

async function testScenario(scenario) {
  console.log('\n' + '='.repeat(70));
  console.log(`${scenario.name}`);
  console.log(`📝 ${scenario.description}`);
  console.log(`期待動作: ${scenario.expectedBehavior}`);
  console.log('='.repeat(70));

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
      { platform: 'smart-test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, initialQuestion } = sessionResponse.data;
    console.log(`\nセッションID: ${sessionId}`);

    let currentQuestion = initialQuestion;
    let isComplete = false;
    let questionCount = 0;
    let answerIndex = 0;

    while (!isComplete && answerIndex < scenario.answers.length && questionCount < 15) {
      questionCount++;
      
      console.log(`\n【質問 ${questionCount}】`);
      console.log(`Q: ${currentQuestion}`);
      
      const answer = scenario.answers[answerIndex++];
      console.log(`A: ${answer}`);

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
        console.log(`💭 AI: ${aiResponse}`);
      }

      // 収集状況を表示
      const filledSlots = Object.entries(slots)
        .filter(([_, value]) => value && value.trim() !== '');
      
      console.log(`\n📊 収集状況:`);
      console.log(`  - 必須情報: ${slots.customer ? '✓' : '✗'} 顧客, ${slots.project ? '✓' : '✗'} 案件, ${slots.next_action ? '✓' : '✗'} 次アクション`);
      console.log(`  - 収集済み項目数: ${filledSlots.length}/17`);
      
      // 重要な深掘り情報があれば表示
      const importantSlots = ['budget', 'closing_possibility', 'competitor_info', 'key_person_reaction'];
      const collectedImportant = importantSlots.filter(key => slots[key] && slots[key].trim() !== '');
      if (collectedImportant.length > 0) {
        console.log(`  - 重要情報: ${collectedImportant.join(', ')}`);
      }

      isComplete = complete;

      if (isComplete) {
        console.log('\n' + '='.repeat(70));
        console.log('✅ セッション完了！');
        console.log(`終了タイミング: ${questionCount}回目の質問後`);
        
        if (summary) {
          console.log('\n【生成されたサマリー】');
          console.log(summary);
        }
        
        // 判定の妥当性を評価
        console.log('\n【判定評価】');
        if (questionCount <= 5 && filledSlots.length >= 8) {
          console.log('⭐ 優秀: 効率的に重要情報を収集して早期終了');
        } else if (questionCount >= 8 && filledSlots.length <= 5) {
          console.log('⚠️ 改善余地: 情報が少ないのに質問が多い');
        } else {
          console.log('✓ 適切: バランスの良い情報収集');
        }
      } else {
        currentQuestion = nextQuestion;
      }
    }

    if (!isComplete) {
      console.log('\n⏸️ テスト用回答が尽きたため終了');
      console.log(`実行した質問数: ${questionCount}`);
    }

    // 最後に取得したスロット情報を使用
    const finalSlots = isComplete ? 
      (await axios.get(
        `${API_BASE_URL}/realtime/sessions/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )).data.slots : {};
    
    return {
      scenario: scenario.name,
      questionCount,
      isComplete,
      filledSlots: Object.entries(finalSlots || {})
        .filter(([_, value]) => value && value.trim() !== '').length
    };

  } catch (error) {
    console.error('エラー:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🧪 スマート完了判定テスト');
  console.log('情報の質と量に応じた柔軟な終了タイミングを検証');
  console.log('='.repeat(70));

  const results = [];

  for (const scenario of scenarios) {
    const result = await testScenario(scenario);
    if (result) {
      results.push(result);
    }
    
    // 次のシナリオまで少し待機
    if (scenario !== scenarios[scenarios.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(70));
  console.log('📈 テスト結果サマリー');
  console.log('='.repeat(70));
  
  results.forEach(result => {
    console.log(`\n${result.scenario}`);
    console.log(`  質問数: ${result.questionCount}回`);
    console.log(`  収集項目: ${result.filledSlots}/17`);
    console.log(`  完了: ${result.isComplete ? 'はい' : 'いいえ'}`);
  });

  console.log('\n✅ 全テスト完了！');
}

// 実行
main().catch(console.error);