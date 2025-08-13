require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_TOKEN = process.env.TEST_TOKEN || '';

async function testRealtimeAPI() {
  console.log('Testing Realtime API...');
  console.log('API URL:', API_URL);
  
  try {
    // 1. ログインしてトークンを取得
    let token = TEST_TOKEN;
    if (!token) {
      console.log('1. Logging in...');
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'tanaka@example.com',
        password: 'password123'
      });
      token = loginResponse.data.token;
      console.log('✓ Login successful');
    }

    // 2. セッション作成
    console.log('\n2. Creating session...');
    const sessionResponse = await axios.post(
      `${API_URL}/api/realtime/sessions`,
      { platform: 'web' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const { sessionId, initialQuestion, websocketUrl } = sessionResponse.data;
    console.log('✓ Session created:', sessionId);
    console.log('  Initial question:', initialQuestion);
    console.log('  WebSocket URL:', websocketUrl ? 'Available' : 'Not available');

    // 3. セッション状態を確認
    console.log('\n3. Getting session state...');
    const stateResponse = await axios.get(
      `${API_URL}/api/realtime/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✓ Session state:', stateResponse.data.status);
    console.log('  Slots:', JSON.stringify(stateResponse.data.slots, null, 2));

    // 4. 回答を送信
    console.log('\n4. Sending answer...');
    const answerResponse = await axios.post(
      `${API_URL}/api/realtime/sessions/${sessionId}/answers`,
      { answer: 'ABC建設を訪問しました。新規の設備導入について相談を受けました。' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✓ Answer processed');
    console.log('  AI response:', answerResponse.data.aiResponse);
    console.log('  Next question:', answerResponse.data.nextQuestion);
    console.log('  Is complete:', answerResponse.data.isComplete);
    console.log('  Updated slots:', JSON.stringify(answerResponse.data.slots, null, 2));

    // 5. セッションを終了
    console.log('\n5. Ending session...');
    const endResponse = await axios.post(
      `${API_URL}/api/realtime/sessions/${sessionId}/end`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✓ Session ended');
    console.log('  Summary:', endResponse.data.summary);
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    process.exit(1);
  }
}

// 本番環境でテスト
if (process.argv[2] === 'production') {
  process.env.API_URL = 'https://salesdaily-api.azurewebsites.net';
  console.log('Testing against PRODUCTION environment');
}

testRealtimeAPI();