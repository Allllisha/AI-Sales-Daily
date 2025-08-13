#!/usr/bin/env node

/**
 * リアルタイムAPI フルテストクライアント
 * 全スロットが埋まるまでの完全なやり取りをテスト
 */

const axios = require('axios');
const readline = require('readline');

const API_BASE_URL = 'http://localhost:3002/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(`\n🤖 AI: ${question}\n👤 あなた: `, (answer) => {
      resolve(answer);
    });
  });
};

async function main() {
  console.log('=' .repeat(60));
  console.log('リアルタイムAPI フルテストクライアント');
  console.log('全スロットが埋まるまで質問が続きます');
  console.log('=' .repeat(60));

  try {
    // 1. ログイン
    console.log('\n📝 ログイン中...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'yamada@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ ログイン成功');

    // 2. セッション作成
    console.log('\n🚀 セッション作成中...');
    const sessionResponse = await axios.post(
      `${API_BASE_URL}/realtime/sessions`,
      { platform: 'cli-full-test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, initialQuestion } = sessionResponse.data;
    console.log(`✅ セッションID: ${sessionId}`);
    console.log('━' .repeat(60));

    // 3. 対話ループ
    let currentQuestion = initialQuestion;
    let isComplete = false;
    let questionCount = 0;
    const conversationLog = [];

    console.log('\n💬 AIヒアリング開始');
    console.log('━' .repeat(60));

    while (!isComplete) {
      questionCount++;
      console.log(`\n[質問 ${questionCount}]`);
      
      // ユーザーに質問
      const answer = await askQuestion(currentQuestion);
      
      // ログに記録
      conversationLog.push({
        questionNumber: questionCount,
        question: currentQuestion,
        answer: answer,
        timestamp: new Date().toISOString()
      });

      // 回答を送信
      console.log('\n⏳ 処理中...');
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
        slots,
        questionsCount
      } = answerResponse.data;

      // AI応答を表示
      if (aiResponse) {
        console.log(`\n💭 AI応答: ${aiResponse}`);
      }

      // 現在のスロット状態を表示
      console.log('\n📊 現在収集された情報:');
      console.log('─' .repeat(40));
      Object.entries(slots).forEach(([key, value]) => {
        const label = {
          customer: '顧客名',
          project: '案件名',
          next_action: '次のアクション',
          budget: '予算',
          schedule: 'スケジュール',
          participants: '参加者',
          location: '場所',
          issues: '課題・リスク'
        }[key] || key;
        
        if (value) {
          console.log(`  ${label}: ${value}`);
        } else {
          console.log(`  ${label}: [未入力]`);
        }
      });
      console.log('─' .repeat(40));

      isComplete = complete;

      if (isComplete) {
        console.log('\n' + '=' .repeat(60));
        console.log('🎉 ヒアリング完了！');
        console.log('=' .repeat(60));
        
        if (summary) {
          console.log('\n📝 生成された日報サマリー:');
          console.log('─' .repeat(40));
          console.log(summary);
          console.log('─' .repeat(40));
        }

        // 最終的なセッション情報を取得
        const sessionDetails = await axios.get(
          `${API_BASE_URL}/realtime/sessions/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('\n📋 最終的に収集された情報:');
        console.log(JSON.stringify(sessionDetails.data.slots, null, 2));
        
        console.log('\n📊 統計情報:');
        console.log(`  総質問数: ${questionCount}`);
        console.log(`  セッションID: ${sessionId}`);
        console.log(`  開始時刻: ${sessionDetails.data.createdAt}`);
        
        // 会話ログ全体を表示
        console.log('\n' + '=' .repeat(60));
        console.log('💬 完全な会話ログ');
        console.log('=' .repeat(60));
        conversationLog.forEach((log, index) => {
          console.log(`\n[${index + 1}] ${log.timestamp}`);
          console.log(`Q: ${log.question}`);
          console.log(`A: ${log.answer}`);
        });
        
      } else {
        currentQuestion = nextQuestion;
        console.log('\n' + '─' .repeat(60));
      }
    }

  } catch (error) {
    console.error('\n❌ エラー:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('詳細:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    rl.close();
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 中断されました');
  process.exit(0);
});

// 実行
console.log('\n📌 ヒント: 以下のような回答例で試してみてください:');
console.log('  - 顧客: "ABC建設を訪問しました"');
console.log('  - 案件: "新社屋建設プロジェクトです"');
console.log('  - 次: "来週見積書を提出します"');
console.log('  - 予算: "約5000万円です"');
console.log('  - 納期: "来年3月完成予定です"');
console.log('  - 参加者: "田中部長と山田課長でした"');
console.log('  - 課題: "予算調整が必要かもしれません"');
console.log('\n開始するには Enter を押してください...');

readline.createInterface({
  input: process.stdin,
  output: process.stdout
}).question('', () => {
  main().catch(console.error);
});