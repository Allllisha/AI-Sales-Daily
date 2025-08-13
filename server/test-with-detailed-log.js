#!/usr/bin/env node

/**
 * 詳細ログ付きリアルタイムAPIテスト
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:3002/api';
const LOG_FILE = 'realtime-api-test.log';

// ログ記録関数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

// テストシナリオ
const testScenario = {
  name: "統合テスト：様々な回答パターン",
  answers: [
    // 1. 詳細な初回回答
    "ABC建設の田中部長と新社屋建設について商談しました。非常に前向きで、予算5000万円で来年3月着工予定です。",
    // 2. 深掘り情報の追加
    "特にコスト削減効果に強い興味を示され、技術説明時には身を乗り出して聞いていました。",
    // 3. 競合情報
    "競合のB社も検討中ですが、我々の提案の方が優れているとの評価でした。",
    // 4. ネクストアクション
    "来週の役員会で決裁を取る予定で、見積書を明日提出します。",
    // 5. 成約可能性
    "成約可能性は80%以上だと思います。雰囲気も非常に良かったです。",
    // 6. 追加情報
    "田中部長からは追加で保守契約についても相談したいとのことでした。"
  ]
};

async function runDetailedTest() {
  log('========== リアルタイムAPI詳細テスト開始 ==========');
  
  try {
    // 1. ログイン
    log('\n【ステップ1: ログイン】');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'yamada@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    log(`✓ ログイン成功: トークン取得`);
    log(`  ユーザー: ${loginResponse.data.user.name} (${loginResponse.data.user.email})`);

    // 2. セッション作成
    log('\n【ステップ2: セッション作成】');
    const sessionResponse = await axios.post(
      `${API_BASE_URL}/realtime/sessions`,
      { platform: 'detailed-test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, initialQuestion } = sessionResponse.data;
    log(`✓ セッション作成成功`);
    log(`  セッションID: ${sessionId}`);
    log(`  初回質問: ${initialQuestion}`);

    // 3. 対話ループ
    log('\n【ステップ3: 対話フロー】');
    let currentQuestion = initialQuestion;
    let isComplete = false;
    let questionCount = 0;
    let answerIndex = 0;

    while (!isComplete && answerIndex < testScenario.answers.length) {
      questionCount++;
      
      log(`\n--- 質問 ${questionCount} ---`);
      log(`Q: ${currentQuestion}`);
      
      const answer = testScenario.answers[answerIndex++];
      log(`A: ${answer}`);

      // 回答送信前のセッション状態
      const beforeState = await axios.get(
        `${API_BASE_URL}/realtime/sessions/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const beforeSlots = Object.entries(beforeState.data.slots)
        .filter(([_, value]) => value && value.trim() !== '');
      log(`  送信前スロット数: ${beforeSlots.length}/17`);

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

      log(`  AI応答: ${aiResponse}`);
      
      // スロット更新状況
      const filledSlots = Object.entries(slots)
        .filter(([_, value]) => value && value.trim() !== '');
      log(`  送信後スロット数: ${filledSlots.length}/17`);
      
      // 新規追加されたスロット
      const newSlots = filledSlots.filter(([key, _]) => 
        !beforeSlots.find(([k, _]) => k === key)
      );
      if (newSlots.length > 0) {
        log(`  新規追加スロット: ${newSlots.map(([k, v]) => `${k}="${v}"`).join(', ')}`);
      }

      // 重要スロットの状態
      const importantSlots = {
        customer: slots.customer || '未設定',
        project: slots.project || '未設定',
        next_action: slots.next_action || '未設定',
        budget: slots.budget || '未設定',
        closing_possibility: slots.closing_possibility || '未設定',
        competitor_info: slots.competitor_info || '未設定'
      };
      log(`  重要情報:`);
      Object.entries(importantSlots).forEach(([key, value]) => {
        if (value !== '未設定') {
          log(`    - ${key}: ${value}`);
        }
      });

      isComplete = complete;

      if (isComplete) {
        log('\n========== セッション完了 ==========');
        log(`終了タイミング: ${questionCount}回目の質問後`);
        
        if (summary) {
          log('\n【生成されたサマリー】');
          log(summary);
        }
        
        // 最終的なセッション状態
        const finalState = await axios.get(
          `${API_BASE_URL}/realtime/sessions/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        log('\n【最終収集情報】');
        const finalSlots = Object.entries(finalState.data.slots)
          .filter(([_, value]) => value && value.trim() !== '');
        finalSlots.forEach(([key, value]) => {
          log(`  ${key}: ${value}`);
        });
        
        log(`\n【統計情報】`);
        log(`  総質問数: ${questionCount}`);
        log(`  収集項目数: ${finalSlots.length}/17`);
        log(`  完了率: ${Math.round(finalSlots.length / 17 * 100)}%`);
        
        // 判定の評価
        log('\n【判定評価】');
        if (questionCount <= 5 && finalSlots.length >= 10) {
          log('⭐ 優秀: 効率的に重要情報を収集して早期終了');
        } else if (questionCount <= 7 && finalSlots.length >= 8) {
          log('✓ 良好: バランスの良い情報収集');
        } else if (questionCount >= 10) {
          log('⚠️ 改善余地: 質問が多すぎる可能性');
        } else {
          log('✓ 適切: 標準的な情報収集');
        }
      } else {
        currentQuestion = nextQuestion;
        log(`  次の質問: ${nextQuestion}`);
      }
    }

    if (!isComplete) {
      log('\n⏸️ テスト用回答が尽きたため終了');
      log(`実行した質問数: ${questionCount}`);
      
      // 手動終了
      const endResponse = await axios.post(
        `${API_BASE_URL}/realtime/sessions/${sessionId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (endResponse.data.summary) {
        log('\n【強制終了時のサマリー】');
        log(endResponse.data.summary);
      }
    }

    log('\n========== テスト完了 ==========');
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`);
    if (error.response) {
      log(`  ステータス: ${error.response.status}`);
      log(`  詳細: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// メイン実行
async function main() {
  // ログファイルをクリア
  fs.writeFileSync(LOG_FILE, '');
  
  console.log('📝 詳細ログ付きテストを開始します...');
  console.log(`ログファイル: ${LOG_FILE}`);
  console.log('');
  
  await runDetailedTest();
  
  console.log('\n✅ テスト完了！');
  console.log(`詳細ログは ${LOG_FILE} に保存されました。`);
}

main().catch(console.error);