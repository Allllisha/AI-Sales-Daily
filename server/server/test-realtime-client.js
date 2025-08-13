#!/usr/bin/env node

/**
 * リアルタイムAPI テストクライアント
 * 
 * 使い方:
 * 1. サーバーを起動: npm run dev
 * 2. 別ターミナルで実行: node test-realtime-client.js
 * 
 * このクライアントは以下をシミュレートします:
 * - セッション作成
 * - 質問に対する回答送信
 * - スロットが埋まるまで継続
 * - WebSocket接続（Azure SignalR設定時）
 */

const axios = require('axios');
const readline = require('readline');

// 設定
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // テスト用トークン

// readlineインターフェース
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 質問プロンプト
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(`\n🤖 AI: ${question}\n👤 あなた: `, (answer) => {
      resolve(answer);
    });
  });
};

// メイン処理
async function main() {
  console.log('=' * 50);
  console.log('リアルタイムAPI テストクライアント');
  console.log('=' * 50);

  try {
    // 1. ログイン（テスト用）
    console.log('\n📝 ログイン中...');
    let token = AUTH_TOKEN;
    
    if (!token) {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      token = loginResponse.data.token;
    }

    // 2. セッション作成
    console.log('🚀 セッション作成中...');
    const sessionResponse = await axios.post(
      `${API_BASE_URL}/realtime/sessions`,
      { platform: 'cli-test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, initialQuestion, websocketUrl } = sessionResponse.data;
    console.log(`✅ セッションID: ${sessionId}`);
    
    if (websocketUrl) {
      console.log('🔌 WebSocket URL取得（Azure SignalR使用時のみ）');
    }

    // 3. 質問と回答のループ
    let currentQuestion = initialQuestion;
    let isComplete = false;
    let questionCount = 0;

    console.log('\n💬 AIヒアリング開始（全スロットが埋まるまで続きます）');
    console.log('━' * 40);

    while (!isComplete) {
      questionCount++;
      console.log(`\n[質問 ${questionCount}]`);
      
      // ユーザーに質問
      const answer = await askQuestion(currentQuestion);

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

      // AI応答を表示
      if (aiResponse) {
        console.log(`💭 AI: ${aiResponse}`);
      }

      // スロット状態を表示
      console.log('\n📊 現在の情報:');
      Object.entries(slots).forEach(([key, value]) => {
        if (value) {
          console.log(`  • ${key}: ${value}`);
        }
      });

      isComplete = complete;

      if (isComplete) {
        console.log('\n' + '=' * 50);
        console.log('✨ ヒアリング完了！');
        console.log('=' * 50);
        
        if (summary) {
          console.log('\n📝 日報サマリー:');
          console.log(summary);
        }

        // セッション詳細を取得
        const sessionDetails = await axios.get(
          `${API_BASE_URL}/realtime/sessions/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('\n📋 収集した情報:');
        console.log(JSON.stringify(sessionDetails.data.slots, null, 2));
        
        console.log(`\n✅ 合計質問数: ${questionCount}`);
      } else {
        currentQuestion = nextQuestion;
      }
    }

  } catch (error) {
    console.error('\n❌ エラー:', error.response?.data || error.message);
  } finally {
    rl.close();
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// 実行
main().catch(console.error);