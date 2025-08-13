#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002/api';

async function test() {
  console.log('リアルタイムAPI簡易テスト');
  console.log('=' .repeat(50));

  try {
    // 1. ログイン
    console.log('\n1. ログイン中...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'yamada@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ ログイン成功');

    // 2. セッション作成
    console.log('\n2. セッション作成中...');
    const sessionResponse = await axios.post(
      `${API_BASE_URL}/realtime/sessions`,
      { platform: 'test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { sessionId, initialQuestion } = sessionResponse.data;
    console.log(`✅ セッションID: ${sessionId}`);
    console.log(`✅ 初期質問: ${initialQuestion}`);

    // 3. 回答送信テスト
    console.log('\n3. 回答送信テスト...');
    const answers = [
      'ABC建設を訪問しました',
      '新社屋建設の相談です',
      '見積書を来週提出します'
    ];

    for (let i = 0; i < answers.length; i++) {
      console.log(`\n質問 ${i + 1}: ${i === 0 ? initialQuestion : '(前の質問への返答)'}`);
      console.log(`回答: ${answers[i]}`);

      const answerResponse = await axios.post(
        `${API_BASE_URL}/realtime/sessions/${sessionId}/answers`,
        { answer: answers[i] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { aiResponse, nextQuestion, isComplete, slots } = answerResponse.data;
      
      console.log(`AI応答: ${aiResponse}`);
      if (nextQuestion) {
        console.log(`次の質問: ${nextQuestion}`);
      }
      
      console.log('現在のスロット:');
      Object.entries(slots).forEach(([key, value]) => {
        if (value) console.log(`  ${key}: ${value}`);
      });

      if (isComplete) {
        console.log('\n✅ セッション完了！');
        break;
      }
    }

    // 4. セッション状態確認
    console.log('\n4. 最終セッション状態...');
    const statusResponse = await axios.get(
      `${API_BASE_URL}/realtime/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('最終スロット状態:');
    console.log(JSON.stringify(statusResponse.data.slots, null, 2));

    console.log('\n✅ テスト完了！');

  } catch (error) {
    console.error('❌ エラー:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('サーバーエラーの詳細:', error.response.data);
    }
  }
}

test();