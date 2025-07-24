const axios = require('axios');

async function testCorrection() {
  try {
    // First login to get token
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'tanaka@example.com',
      password: 'sales123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token obtained');
    
    // Test correction
    const testText = '今日は大成建設との商談がありましたまぁそこではあまり具体的な話はできなかったんですけれどもまあその先方の人がすごいいい人でお互いにあのゴルフの話をしてすごい盛り上がっ盛り上がりました';
    
    const correctionResponse = await axios.post(
      'http://localhost:3001/api/ai/correct-text',
      { text: testText },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Original text:', testText);
    console.log('Corrected text:', correctionResponse.data.correctedText);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testCorrection();