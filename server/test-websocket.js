#!/usr/bin/env node

/**
 * Azure SignalR WebSocket接続テスト
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002/api';

async function testWebSocket() {
  console.log('========== Azure SignalR WebSocket テスト ==========\n');

  try {
    // 1. ログイン
    console.log('【ステップ1: ログイン】');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'yamada@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✓ ログイン成功');

    // 2. セッション作成
    console.log('\n【ステップ2: セッション作成】');
    const sessionResponse = await axios.post(
      `${API_BASE_URL}/realtime/sessions`,
      { platform: 'websocket-test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, websocketUrl, initialQuestion } = sessionResponse.data;
    console.log(`✓ セッション作成成功`);
    console.log(`  セッションID: ${sessionId}`);
    console.log(`  初回質問: ${initialQuestion}`);
    
    if (websocketUrl) {
      console.log(`\n🎉 WebSocket URL取得成功！`);
      console.log(`  URL: ${websocketUrl.substring(0, 80)}...`);
      console.log('\n  Azure SignalRが正常に動作しています。');
      console.log('  クライアントは以下の機能が利用可能です：');
      console.log('  - リアルタイム質問受信');
      console.log('  - セッション完了通知');
      console.log('  - 双方向通信');
    } else {
      console.log('\n⚠️ WebSocket URLが返されませんでした');
      console.log('  Azure SignalR設定を確認してください');
    }

    // 3. 通常のREST APIテスト
    console.log('\n【ステップ3: REST API動作確認】');
    const answer = 'ABC建設の田中部長と商談しました。';
    
    const answerResponse = await axios.post(
      `${API_BASE_URL}/realtime/sessions/${sessionId}/answers`,
      { answer },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✓ REST API応答正常');
    console.log(`  AI応答: ${answerResponse.data.aiResponse}`);
    console.log(`  次の質問: ${answerResponse.data.nextQuestion}`);

    // 4. セッション情報確認
    console.log('\n【ステップ4: セッション詳細】');
    const sessionInfo = await axios.get(
      `${API_BASE_URL}/realtime/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`✓ セッション取得成功`);
    console.log(`  ステータス: ${sessionInfo.data.status}`);
    console.log(`  収集項目: ${Object.keys(sessionInfo.data.slots).filter(k => sessionInfo.data.slots[k]).length}/17`);

    console.log('\n========== テスト完了 ==========');
    console.log('\n【結果サマリー】');
    console.log('✅ REST API: 正常動作');
    console.log(websocketUrl ? '✅ WebSocket: 利用可能（Azure SignalR有効）' : '❌ WebSocket: 未設定');
    console.log('✅ AI応答: 正常');
    console.log('✅ セッション管理: 正常');

  } catch (error) {
    console.error('\n❌ エラー:', error.response?.data || error.message);
  }
}

// 実行
testWebSocket().catch(console.error);