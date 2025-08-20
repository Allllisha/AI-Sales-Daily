const sdk = require('microsoft-cognitiveservices-speech-sdk');

// Azure Speech Config
const speechConfig = sdk.SpeechConfig.fromSubscription(
  '9e32bd62e03b4c7b8871bd0454bdaf08',
  'japaneast'
);

speechConfig.speechSynthesisLanguage = 'ja-JP';
speechConfig.speechSynthesisVoiceName = 'ja-JP-NanamiNeural';

console.log('Testing Azure Speech Services connection...');

// Test Text-to-Speech
const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

const text = 'こんにちは、音声合成のテストです。';

synthesizer.speakTextAsync(
  text,
  (result) => {
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log('✅ Text-to-Speech test successful!');
      console.log(`Audio length: ${result.audioData.byteLength} bytes`);
    } else {
      console.error('❌ Speech synthesis failed:', result.errorDetails);
    }
    synthesizer.close();
    process.exit(0);
  },
  (error) => {
    console.error('❌ Error:', error);
    synthesizer.close();
    process.exit(1);
  }
);