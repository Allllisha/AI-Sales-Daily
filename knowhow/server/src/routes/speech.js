const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/speech/token:
 *   get:
 *     summary: Azure Speech Tokenの取得
 *     tags: [Speech]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Speech token
 */
router.get('/token', authMiddleware, async (req, res) => {
  try {
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION || 'japaneast';

    if (!speechKey) {
      return res.status(503).json({ error: 'Azure Speech Serviceが設定されていません' });
    }

    const axios = require('axios');
    const tokenResponse = await axios.post(
      `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      null,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    res.json({
      token: tokenResponse.data,
      region: speechRegion
    });
  } catch (error) {
    console.error('Speech token error:', error.message);
    res.status(500).json({ error: 'Speech Tokenの取得に失敗しました' });
  }
});

/**
 * @swagger
 * /api/speech/synthesize:
 *   post:
 *     summary: Azure Neural TTSで音声合成
 *     tags: [Speech]
 *     security:
 *       - bearerAuth: []
 */
router.post('/synthesize', authMiddleware, async (req, res) => {
  try {
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION || 'japaneast';

    if (!speechKey) {
      return res.status(503).json({ error: 'Azure Speech Serviceが設定されていません' });
    }

    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'テキストが必要です' });
    }

    // Azure Neural Voice options for ja-JP:
    // ja-JP-NanamiNeural (女性、デフォルト、自然で柔らかい)
    // ja-JP-KeitaNeural (男性、落ち着いた声)
    // ja-JP-AoiNeural (女性、明るい)
    // ja-JP-DaichiNeural (男性、力強い)
    // ja-JP-MayuNeural (女性、穏やか)
    // ja-JP-NaokiNeural (男性、フレンドリー)
    // ja-JP-ShioriNeural (女性、若い)
    const voiceName = voice || 'ja-JP-NanamiNeural';

    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ja-JP'>
      <voice name='${voiceName}'>
        <prosody rate='0%' pitch='0%'>
          ${text.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))}
        </prosody>
      </voice>
    </speak>`;

    const axios = require('axios');
    const audioResponse = await axios.post(
      `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      ssml,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          'User-Agent': 'knowhow-app'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioResponse.data.length
    });
    res.send(Buffer.from(audioResponse.data));
  } catch (error) {
    console.error('Speech synthesis error:', error.response?.data ? Buffer.from(error.response.data).toString() : error.message);
    res.status(500).json({ error: '音声合成に失敗しました' });
  }
});

module.exports = router;
