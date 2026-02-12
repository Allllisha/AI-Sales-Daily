const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { OpenAI } = require('openai');

class RealtimeVoiceHandler {
  constructor(io) {
    this.io = io;
    this.sessions = new Map();
    
    // Azure Speech Config
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION || 'japaneast';
    
    if (!speechKey) {
      console.error('AZURE_SPEECH_KEY is not configured - Speech features will be disabled');
      this.speechConfig = null;
    } else {
      console.log('Azure Speech configured for region:', speechRegion);
      try {
        this.speechConfig = sdk.SpeechConfig.fromSubscription(
          speechKey,
          speechRegion
        );
        this.speechConfig.speechRecognitionLanguage = 'ja-JP';
        this.speechConfig.speechSynthesisLanguage = 'ja-JP';
        this.speechConfig.speechSynthesisVoiceName = 'ja-JP-NanamiNeural';
      } catch (error) {
        console.error('Failed to initialize Speech Config:', error);
        this.speechConfig = null;
      }
    }
    
    // Azure OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
      defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
    });
  }

  handleConnection(socket) {
    console.log('Client connected:', socket.id);
    
    const session = {
      id: socket.id,
      audioStream: null,
      recognizer: null,
      synthesizer: null,
      conversationHistory: [],
      currentTranscript: '',
      isProcessing: false,
      silenceTimer: null,
      lastSpeechTime: Date.now(),
      accumulatedText: '',
      questionCount: 0,  // 質問回数カウンター
      reportData: {
        customer: null,
        project: null,
        budget: null,
        schedule: null,
        next_action: null,
        participants: null,
        location: null,
        issues: null
      }
    };
    
    this.sessions.set(socket.id, session);
    
    // 音声認識の初期化
    this.initializeSpeechRecognition(socket, session);
    
    // イベントハンドラー
    socket.on('start-listening', (data) => this.startListening(socket, session, data));
    socket.on('stop-listening', () => this.stopListening(socket, session));
    socket.on('pause-recognition', () => this.pauseRecognition(socket, session));
    socket.on('resume-recognition', () => this.resumeRecognition(socket, session));
    socket.on('audio-data', (data) => this.processAudioData(socket, session, data));
    socket.on('update-report-data', (data) => this.updateReportData(socket, session, data));
    socket.on('request-initial-audio', (data) => this.sendInitialAudio(socket, session, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  initializeSpeechRecognition(socket, session) {
    if (!this.speechConfig) {
      console.error('Speech recognition not available - AZURE_SPEECH_KEY not configured');
      session.recognizer = null;
      session.audioStream = null;
      session.synthesizer = null;
      return;
    }
    
    // Push Stream Audio Input
    const pushStream = sdk.AudioInputStream.createPushStream(
      sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
    );
    
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    session.audioStream = pushStream;
    
    // 連続認識の設定
    const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
    
    // 音声認識の詳細設定
    recognizer.properties.setProperty(
      sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
      '3000'  // 3秒の沈黙まで待つ
    );
    
    // 部分的な認識結果
    recognizer.recognizing = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
        // 一時停止中は処理しない
        if (session.isPaused) {
          return;
        }
        
        // 発話時間を更新
        session.lastSpeechTime = Date.now();
        
        // 既存のタイマーをクリア（話し続けている間はタイマーをリセット）
        if (session.silenceTimer) {
          clearTimeout(session.silenceTimer);
          session.silenceTimer = null;
        }
        
        socket.emit('partial-transcript', {
          text: e.result.text,
          isFinal: false
        });
      }
    };
    
    // 完全な認識結果
    recognizer.recognized = async (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        // 一時停止中は処理しない
        if (session.isPaused) {
          return;
        }
        
        const transcript = e.result.text;
        console.log('Recognized speech:', transcript);
        
        // 発話時間を更新
        session.lastSpeechTime = Date.now();
        
        // テキストを蓄積
        session.accumulatedText += transcript + ' ';
        
        socket.emit('final-transcript', {
          text: transcript,
          isFinal: true
        });
        
        // 既存のタイマーをクリア
        if (session.silenceTimer) {
          clearTimeout(session.silenceTimer);
        }
        
        // 2.5秒の沈黙後にAI応答を生成
        session.silenceTimer = setTimeout(async () => {
          if (!session.isProcessing && session.accumulatedText.trim()) {
            const fullText = session.accumulatedText.trim();
            console.log('Processing accumulated text after silence:', fullText);
            session.accumulatedText = ''; // リセット
            await this.processUserInput(socket, session, fullText);
          }
        }, 2500); // 2.5秒の沈黙を待つ
      } else if (e.result.reason === sdk.ResultReason.NoMatch) {
        console.log('No speech recognized');
      }
    };
    
    // エラーハンドリング
    recognizer.sessionStopped = (s, e) => {
      console.log('Session stopped:', e.sessionId);
      // セッションが停止しても自動的に再開
      if (session.isListening) {
        console.log('Restarting recognition...');
        recognizer.startContinuousRecognitionAsync();
      }
    };
    
    recognizer.canceled = (s, e) => {
      console.error('Recognition canceled:', e.errorDetails);
      if (e.errorCode !== sdk.CancellationErrorCode.NoError) {
        socket.emit('error', { message: `認識エラー: ${e.errorDetails}` });
      }
      // エラー後も自動的に再開を試みる
      if (session.isListening && e.errorCode === sdk.CancellationErrorCode.NoError) {
        setTimeout(() => {
          console.log('Restarting recognition after cancel...');
          recognizer.startContinuousRecognitionAsync();
        }, 1000);
      }
    };
    
    session.recognizer = recognizer;
    
    // 音声合成の初期化
    const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);
    session.synthesizer = synthesizer;
    
    console.log('Speech synthesis voice set to: ja-JP-NanamiNeural');
  }

  startListening(socket, session, data) {
    // カスタム設定がある場合はセッションに保存
    if (data && data.customSettings) {
      session.customSettings = data.customSettings;
      session.customQuestionIndex = 0;  // カスタム質問のインデックスをリセット
      console.log('Custom settings applied on start-listening:', data.customSettings.greeting);
    }
    
    if (session.recognizer) {
      session.isListening = true;
      session.recognizer.startContinuousRecognitionAsync(
        () => {
          console.log('Started continuous recognition');
          socket.emit('listening-started');
        },
        (err) => {
          console.error('Error starting recognition:', err);
          socket.emit('error', { message: 'Failed to start listening' });
        }
      );
    }
  }

  stopListening(socket, session) {
    if (session.recognizer) {
      session.isListening = false;
      
      // タイマーをクリア
      if (session.silenceTimer) {
        clearTimeout(session.silenceTimer);
        session.silenceTimer = null;
      }
      
      // 蓄積されたテキストがあれば処理
      if (session.accumulatedText.trim() && !session.isProcessing) {
        const fullText = session.accumulatedText.trim();
        session.accumulatedText = '';
        this.processUserInput(socket, session, fullText);
      }
      
      session.recognizer.stopContinuousRecognitionAsync(
        () => {
          console.log('Stopped continuous recognition');
          socket.emit('listening-stopped');
        },
        (err) => {
          console.error('Error stopping recognition:', err);
        }
      );
    }
  }

  pauseRecognition(socket, session) {
    // AI音声再生中は認識を一時停止
    if (session.recognizer && session.isListening) {
      session.isPaused = true;
      console.log('Recognition paused during AI speech');
    }
  }

  resumeRecognition(socket, session) {
    // AI音声再生終了後に認識を再開
    if (session.recognizer && session.isListening) {
      session.isPaused = false;
      console.log('Recognition resumed after AI speech');
    }
  }

  processAudioData(socket, session, audioData) {
    if (session.audioStream) {
      // Convert audio data to proper format if needed
      const buffer = Buffer.from(audioData);
      session.audioStream.write(buffer);
      
      // Debug log
      if (!session.loggedAudioData) {
        console.log('Receiving audio data, buffer size:', buffer.length);
        session.loggedAudioData = true;
      }
    }
  }

  detectSentenceEnd(text) {
    // 文末検出を無効化（タイマーのみで判定）
    return false;
  }

  async processUserInput(socket, session, userText) {
    if (session.isProcessing) return;
    
    session.isProcessing = true;
    
    try {
      console.log('Processing user input:', userText);
      
      // テキスト補正とスロット抽出を1つのAPI呼び出しで統合実行
      const { correctedText, extractedSlots, corrections } = await this.processTextAndExtractSlots(userText, session.reportData);
      console.log('Corrected text and slots extracted:', { correctedText, extractedSlots, corrections });
      
      // 訂正がある場合は、既存のデータを更新
      let hasCorrections = false;
      if (corrections && corrections.length > 0) {
        hasCorrections = true;
        for (const correction of corrections) {
          if (correction.field && session.reportData[correction.field]) {
            console.log(`Applying correction: ${correction.field}: "${session.reportData[correction.field]}" → "${correction.newValue}"`);
            session.reportData[correction.field] = correction.newValue;
          }
        }
      }
      
      // 抽出されたスロットを統合（訂正の場合は上書きモード）
      this.mergeExtractedSlots(session.reportData, extractedSlots, hasCorrections);
      
      // 補正されたテキストを会話履歴に追加
      session.conversationHistory.push({ role: 'user', content: correctedText });
      
      // AI応答生成
      const aiResponse = await this.generateAIResponse(session);
      console.log('AI response generated:', aiResponse);
      
      // AI応答を履歴に追加
      session.conversationHistory.push({ role: 'assistant', content: aiResponse });
      
      // 補正されたテキストとAI応答を送信（ストリーミング的に即座に送信）
      socket.emit('ai-response-text', {
        text: aiResponse,
        correctedUserText: correctedText,  // 補正されたユーザーテキストも送信
        reportData: session.reportData
      });
      
      // 音声合成は非同期で実行（応答を待たない）
      this.synthesizeAndSend(socket, session, aiResponse).catch(err => {
        console.error('Speech synthesis error (non-blocking):', err);
      });
      
    } catch (error) {
      console.error('Error processing input:', error);
      console.error('Error details:', error.message, error.stack);
      socket.emit('error', { message: `処理エラー: ${error.message}` });
      
      // エラー時でも処理を継続できるようにする
      socket.emit('ai-response-text', {
        text: 'すみません、処理中にエラーが発生しました。もう一度お話しください。',
        reportData: session.reportData
      });
    } finally {
      session.isProcessing = false;
    }
  }

  async processTextAndExtractSlots(text, currentReportData) {
    try {
      // ローカルで簡単なフィラー除去（高速化）
      const quickCleaned = text
        .replace(/えっと、?|えーと、?|あの、?|その、?|まあ、?|ええと、?/g, '')
        .replace(/。。+/g, '。')
        .replace(/、、+/g, '、')
        .trim();
      
      // 訂正パターンの検出（拡張版）
      const correctionPatterns = [
        /(.+?)(?:では|じゃ)なく(?:て)?[、]?(.+)/,
        /(.+?)(?:じゃなくて|ではなくて)[、]?(.+)/,
        /間違(?:い|え)ました[、。]?(.+)/,
        /(?:訂正|修正)します[、。]?(.+)/,
        /(?:違います|違って)[、。]?(.+)/,
        /やっぱり(.+)/,
        /(.+?)に(?:変更|訂正)(?:します|してください)?/,
        /実は(.+)/,
        /(.+?)の間違いです/,
        /すみません[、]?(.+)/
      ];

      let hasCorrectionIntent = false;
      for (const pattern of correctionPatterns) {
        if (pattern.test(quickCleaned)) {
          hasCorrectionIntent = true;
          break;
        }
      }
      
      // 現在の日付を取得（日本時間）
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // 1つのAPI呼び出しでテキスト補正とスロット抽出を同時実行
      const combinedPrompt = `以下の音声認識テキストを処理してください：

入力テキスト：「${quickCleaned}」

現在の日付：${currentYear}年${currentMonth}月

現在の収集済み情報：
${JSON.stringify(currentReportData, null, 2)}

${hasCorrectionIntent ? `
【重要】訂正の検出:
ユーザーが訂正表現を使っています（「〜ではなく」「間違えました」「やっぱり」「実は」など）。
以前の情報を訂正しようとしています。

訂正処理のルール：
1. 訂正対象のフィールドを特定してください
2. 該当フィールドの値を完全に新しい値で置き換えてください
3. 蓄積型フィールド（issues、next_action等）も訂正時は完全に置き換えます

訂正が検出された場合、corrections フィールドに以下の形式で返してください:
"corrections": [{
  "field": "訂正対象のフィールド名",
  "oldValue": "訂正前の値",
  "newValue": "訂正後の値"
}]

例：
- 「課題は予算ではなく人手不足です」→ issuesを「人手不足」に完全置き換え
- 「顧客は田中建設ではなく山田工務店でした」→ customerを「山田工務店」に置き換え
` : ''}

以下のタスクを実行してください：

1. テキスト補正：
   - 句読点を適切に追加
   - 自然な日本語に補正
   - フィラーワードは既に除去済み

2. 情報抽出：
   以下の項目を抽出（見つからない場合はnull）：
   
   【単一値項目】（既存値がある場合は新しい値で上書きしない）
   - customer: 顧客名（会社名）
   - project: 案件内容・プロジェクト名
   - budget: 予算（金額）
   - schedule: 納期・スケジュール（日付の場合、現在の年${currentYear}年を基準に、適切な年を推定してYYYY-MM-DD形式で返してください。例：「9月30日」→「${currentYear}-09-30」、「来年3月」→「${currentYear + 1}-03」）
   - location: 場所
   - decision_makers: 決定権者
   
   【蓄積型項目】（既存値があっても新しい情報は追加で抽出）
   - next_action: 次のアクション（複数可）
   - participants: 参加者（配列形式）
   - issues: 課題・リスク（「予算が厳しい」と既にある場合でも、「人手不足」が新たに判明したら追加）
   - concerns: 懸念事項（複数可）
   - competition: 競合情報（複数可）

${hasCorrectionIntent ? '3. 訂正処理：訂正が検出された場合は、該当フィールドを新しい値で更新してください。' : ''}

以下のJSON形式で返してください：
{
  "correctedText": "補正されたテキスト",
  "extractedSlots": {
    "customer": "抽出された値またはnull",
    ...
  }${hasCorrectionIntent ? ',\n  "corrections": [訂正情報の配列]' : ''}
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: '音声認識テキストの補正と営業情報の抽出を行う専門家です。JSONのみを返してください。' 
          },
          { role: 'user', content: combinedPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 700,
        temperature: 0.3
      });

      const result = JSON.parse(completion.choices[0].message.content);
      
      console.log('Combined API result:', result);
      
      // 訂正処理
      let finalSlots = result.extractedSlots || {};
      
      if (result.corrections && Array.isArray(result.corrections)) {
        for (const correction of result.corrections) {
          if (correction.field && currentReportData[correction.field]) {
            console.log(`訂正検出: ${correction.field}: "${correction.oldValue}" → "${correction.newValue}"`);
            // 現在のデータから古い値を削除し、新しい値を設定
            finalSlots[correction.field] = correction.newValue;
          }
        }
      }
      
      return {
        correctedText: result.correctedText || quickCleaned,
        extractedSlots: finalSlots,
        corrections: result.corrections
      };
      
    } catch (error) {
      console.error('Combined processing failed:', error);
      
      // フォールバック：簡易補正のみ
      const fallbackText = text
        .replace(/えっと、?|えーと、?|あの、?|その、?|まあ、?/g, '')
        .trim();
      
      return {
        correctedText: fallbackText,
        extractedSlots: {}
      };
    }
  }

  mergeExtractedSlots(reportData, extractedSlots, isCorrection = false) {
    // 蓄積型フィールド（リスト形式で追加していくもの）
    const accumulativeFields = ['participants', 'issues', 'next_action', 'concerns', 'competition'];
    
    // 抽出された情報をreportDataに統合
    Object.keys(extractedSlots).forEach(key => {
      const value = extractedSlots[key];
      if (value) {
        // 訂正モードの場合は全てのフィールドを上書き
        if (isCorrection) {
          // 蓄積型フィールドも訂正時は完全に置き換え
          if (accumulativeFields.includes(key)) {
            // 新しいデータを配列化
            let newData = [];
            if (Array.isArray(value)) {
              newData = value;
            } else if (typeof value === 'string') {
              // カンマ区切りの文字列を配列に変換
              newData = value.split(/[,、]/).map(item => item.trim()).filter(item => item);
            }
            reportData[key] = newData;
          } else {
            // 単一値フィールドはそのまま上書き
            reportData[key] = value;
          }
        } else {
          // 通常モード（追加モード）
          if (accumulativeFields.includes(key)) {
            // 既存データを配列化
            let existingData = [];
            if (reportData[key]) {
              if (Array.isArray(reportData[key])) {
                existingData = reportData[key];
              } else if (typeof reportData[key] === 'string') {
                // カンマ区切りの文字列を配列に変換
                existingData = reportData[key].split(/[,、]/).map(item => item.trim()).filter(item => item);
              }
            }
            
            // 新しいデータを配列化
            let newData = [];
            if (Array.isArray(value)) {
              newData = value;
            } else if (typeof value === 'string') {
              // カンマ区切りの文字列を配列に変換
              newData = value.split(/[,、]/).map(item => item.trim()).filter(item => item);
            }
            
            // 重複を除いて統合
            const combinedData = [...new Set([...existingData, ...newData])];
            
            // 配列として保存（フロントエンドでの表示用）
            if (combinedData.length > 0) {
              reportData[key] = combinedData;
            }
          } else if (!reportData[key]) {
            // 単一値フィールドは既存の値がない場合のみ更新
            reportData[key] = value;
          }
        }
      }
    });
  }

  async extractSlots(text, reportData, session) {
    // AIを使った高度な情報抽出
    try {
      const extractionPrompt = `以下のテキストから営業日報に必要な情報を抽出してください：

テキスト：「${text}」

現在の情報：
${JSON.stringify(reportData, null, 2)}

以下の項目を抽出してください（見つからない場合はnull）：
- customer: 顧客名（会社名）
- project: 案件内容・プロジェクト名
- budget: 予算（金額）
- schedule: 納期・スケジュール
- next_action: 次のアクション
- participants: 参加者（配列形式で。「高橋さん」「根本」のように人名を抽出）
- location: 場所
- issues: 課題・リスク
- decision_makers: 決定権者
- concerns: 懸念事項
- competition: 競合情報

参加者は「相手側は〇〇さん、自社は△△」のような形式から両方を抽出して配列にしてください。

JSON形式で返してください。`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'あなたは営業情報を正確に抽出する専門家です。' },
          { role: 'user', content: extractionPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.3
      });

      const extracted = JSON.parse(completion.choices[0].message.content);
      
      // 抽出された情報をreportDataに統合
      Object.keys(extracted).forEach(key => {
        if (extracted[key]) {
          // participantsは配列なので特別処理
          if (key === 'participants') {
            if (Array.isArray(extracted[key])) {
              // 新しい参加者を既存の配列に追加（重複を避ける）
              const existingParticipants = Array.isArray(reportData[key]) ? reportData[key] : [];
              const newParticipants = extracted[key].filter(p => !existingParticipants.includes(p));
              reportData[key] = [...existingParticipants, ...newParticipants];
            } else if (typeof extracted[key] === 'string') {
              // 文字列の場合は配列に変換
              const existingParticipants = Array.isArray(reportData[key]) ? reportData[key] : [];
              if (!existingParticipants.includes(extracted[key])) {
                reportData[key] = [...existingParticipants, extracted[key]];
              }
            }
          } else if (!reportData[key]) {
            // 他のフィールドは既存の値がない場合のみ更新
            reportData[key] = extracted[key];
          }
        }
      });

      console.log('AI extracted slots:', extracted);
      
    } catch (error) {
      console.error('AI extraction failed, using regex fallback:', error);
      
      // フォールバック：正規表現ベースの抽出
      // 顧客名の抽出（より包括的なパターン）
      const customerPatterns = [
        /([^、。\s]+(?:社|建設|工業|製作所|商事|電機|コーポレーション|カンパニー))/,
        /(?:お客様|顧客|クライアント)[はがのと]*([^、。\s]+)/,
        /([^、。\s]+)(?:さん|様)(?:と|との|で)/
      ];
      
      for (const pattern of customerPatterns) {
        const match = text.match(pattern);
        if (match && !reportData.customer) {
          reportData.customer = match[1];
          break;
        }
      }
      
      // 案件内容の抽出
      const projectPatterns = [
        /(?:案件|プロジェクト|件名|内容)[はがのと]*([^、。]+)/,
        /(?:について|に関して|の件で)([^、。]+)/
      ];
      
      for (const pattern of projectPatterns) {
        const match = text.match(pattern);
        if (match && !reportData.project) {
          reportData.project = match[1];
          break;
        }
      }
      
      // 予算の抽出
      const budgetMatch = text.match(/(\d+[\d,]*)\s*(?:万|千万|億)?円/);
      if (budgetMatch && !reportData.budget) {
        reportData.budget = budgetMatch[0];
      }
      
      // 期限の抽出
      const schedulePatterns = [
        /(\d+月\d+日|\d+月末|来月|今月末|年度末)/,
        /(?:納期|期限|締切)[はがのと]*([^、。]+)/
      ];
      
      for (const pattern of schedulePatterns) {
        const match = text.match(pattern);
        if (match && !reportData.schedule) {
          reportData.schedule = match[1];
          break;
        }
      }
      
      // 次のアクションの抽出
      const actionPatterns = [
        /(?:次|今後|次回)[のは]([^、。]+)/,
        /(?:アクション|タスク|やること)[はがのと]*([^、。]+)/
      ];
      
      for (const pattern of actionPatterns) {
        const match = text.match(pattern);
        if (match && !reportData.next_action) {
          reportData.next_action = match[1];
          break;
        }
      }
      
      // 場所の抽出
      const locationMatch = text.match(/(本社|支社|工場|現場|オフィス|会議室|オンライン|Web会議|リモート)/);
      if (locationMatch && !reportData.location) {
        reportData.location = locationMatch[0];
      }
    }
  }

  async generateAIResponse(session) {
    const { reportData, conversationHistory, questionCount, customSettings } = session;
    
    try {
      // 質問回数をインクリメント
      session.questionCount++;
      
      // カスタム質問がある場合はそれを使用
      if (customSettings && customSettings.customQuestions && customSettings.customQuestions.length > 0) {
        // 必須スロットの確認（カスタム設定から）
        const requiredSlots = customSettings.requiredSlots || [];
        const allRequiredFilled = requiredSlots.every(slot => reportData[slot]);
        
        // カスタム質問のインデックスを管理
        if (!session.customQuestionIndex) {
          session.customQuestionIndex = 0;
        }
        
        // 全ての必須スロットが埋まった、または全質問を終えた場合は終了
        if (allRequiredFilled || session.customQuestionIndex >= customSettings.customQuestions.length) {
          return customSettings.completionMessage || '内容把握いたしました。日報作成お疲れ様でした！';
        }
        
        // 次のカスタム質問を取得
        const nextQuestion = customSettings.customQuestions[session.customQuestionIndex];
        session.customQuestionIndex++;
        
        // カスタム質問のテキストを返す
        return nextQuestion.text;
      }
      
      // デフォルトの処理
      // 必須情報が揃っているかチェック
      const hasEssentialInfo = reportData.customer && reportData.project && 
                               (reportData.next_action || reportData.budget || reportData.schedule);
      
      // 12回以上の質問、または必須情報が揃った場合は終了
      if (session.questionCount >= 12 || (session.questionCount >= 5 && hasEssentialInfo)) {
        return '内容把握いたしました。日報作成お疲れ様でした！';
      }
      
      // 未入力のスロットを確認（優先度順）
      const emptySlots = [];
      if (!reportData.customer) emptySlots.push('顧客名');
      if (!reportData.project) emptySlots.push('案件内容');
      if (!reportData.next_action) emptySlots.push('次のアクション');
      if (!reportData.budget) emptySlots.push('予算');
      if (!reportData.schedule) emptySlots.push('納期・スケジュール');
      if (!reportData.participants || reportData.participants.length === 0) emptySlots.push('参加者');
      if (!reportData.location) emptySlots.push('場所');
      if (!reportData.issues) emptySlots.push('課題・リスク');
      
      // システムプロンプト（残り質問回数を考慮）
      const remainingQuestions = 12 - session.questionCount;
      const systemPrompt = `あなたは営業日報作成を支援する経験豊富な上司です。
残り${remainingQuestions}回の質問で必要な情報を効率的に収集してください。

【収集すべき最重要情報】
- 顧客名（会社名）
- 案件内容・プロジェクト詳細
- 次のアクション、予算、納期のいずれか

【現在の収集状況】
${JSON.stringify(reportData, null, 2)}

【未入力の項目】
${emptySlots.slice(0, 3).join('、') || 'なし'}

【直前の会話】
最新の回答を必ず理解し、既に答えた内容を再度聞かないでください。
ユーザーが既に回答した内容：${JSON.stringify(reportData, null, 2)}

【応答の指示】
- ユーザーの回答に共感を示してから質問する（重要）
- 既に収集した情報は再度聞かない（重要）
- 未入力の項目から優先的に質問
- 最重要項目（顧客、案件、次のアクション）を優先
- 自然な会話を心がける
- 相手の状況や感情に寄り添う表現を使う
- 鉤括弧（「」）は使わず、自然な日本語で応答する

例：
- [顧客名]との商談、お疲れ様でした。[次に聞くべき項目]はどのような予定ですか？
- [言及された内容]は興味深いですね。具体的にはどのような内容でしたか？
- [相手の特徴]を把握されているんですね。[次に聞くべき項目]について教えてください。`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6) // 最近の6つのメッセージ
      ];

      console.log('Calling OpenAI API with messages:', messages.length);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 500,
        temperature: 0.7
      });

      const response = completion.choices[0].message.content;
      console.log('OpenAI response:', response);
      
      return response || 'なるほど、承知しました。';
      
    } catch (error) {
      console.error('OpenAI API error:', error);
      console.error('OpenAI error details:', JSON.stringify(error.response?.data || error.message));
      
      // フォールバック応答
      if (!reportData.customer) {
        return 'お客様のお名前を教えていただけますか？';
      } else if (!reportData.project) {
        return '案件の内容について詳しく教えてください。';
      } else if (!reportData.next_action) {
        return '次のアクションは何を予定していますか？';
      } else {
        return 'なるほど、承知しました。他に何かありますか？';
      }
    }
  }

  async correctUserText(text) {
    try {
      // まず、ローカルで簡単なフィラー除去（高速化）
      let quickCorrected = text
        .replace(/えっと、?|えーと、?|あの、?|その、?|まあ、?|ええと、?/g, '')
        .replace(/。。+/g, '。')
        .replace(/、、+/g, '、')
        .trim();
      
      // AIによる補正（簡潔なプロンプトで高速化）
      const prompt = `以下のテキストに句読点を適切に追加し、自然な日本語に補正してください。テキストのみを返してください：
${quickCorrected}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',  // GPT-4oモデルを使用
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,  // トークン数を削減
        temperature: 0.1  // より決定的な出力
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to correct user text:', error);
      // エラー時は簡易補正したテキストを返す
      return text.replace(/えっと、?|えーと、?|あの、?|その、?|まあ、?/g, '').trim();
    }
  }

  async synthesizeAndSend(socket, session, text) {
    return new Promise((resolve, reject) => {
      console.log('[Synthesis] Starting synthesis for text:', text.substring(0, 50) + '...');
      
      // SSMLを使用して話速を調整 (rate: 0.9 = 90%速度, 1.0 = 標準, 1.1 = 110%速度)
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
        <voice name="ja-JP-NanamiNeural">
          <prosody rate="1.1">${text}</prosody>
        </voice>
      </speak>`;
      
      session.synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            // 音声データを送信
            const audioData = result.audioData;
            const audioBase64 = Buffer.from(audioData).toString('base64');
            console.log('[Synthesis] Audio generated, size:', audioBase64.length, 'bytes (base64)');
            
            socket.emit('ai-audio', {
              audio: audioBase64,
              format: 'wav'
            });
            console.log('[Synthesis] Audio sent to client:', socket.id);
            resolve();
          } else {
            console.error('[Synthesis] Speech synthesis failed:', result.errorDetails);
            reject(new Error('Speech synthesis failed'));
          }
        },
        (error) => {
          console.error('[Synthesis] Speech synthesis error:', error);
          reject(error);
        }
      );
    });
  }

  updateReportData(socket, session, data) {
    if (session && data) {
      const { field, value } = data;
      if (field && session.reportData) {
        session.reportData[field] = value;
        console.log(`Updated report data: ${field} = ${value}`);
        
        // 更新確認を送信
        socket.emit('report-data-updated', {
          field,
          value,
          success: true
        });
      }
    }
  }

  async sendInitialAudio(socket, session, data) {
    // カスタム設定から挨拶文を取得、またはデフォルトを使用
    let initialMessage = 'お疲れ様です！今日はどのような商談がありましたか？';
    
    if (data && data.customSettings) {
      const { customSettings } = data;
      session.customSettings = customSettings; // セッションに保存
      
      // カスタム挨拶文がある場合は使用
      if (customSettings.greeting) {
        initialMessage = customSettings.greeting;
      }
      
      console.log('[Initial Audio] Using custom settings with greeting:', initialMessage);
    }
    
    console.log('[Initial Audio] Generating initial audio message for client:', socket.id);
    
    try {
      if (!session.synthesizer) {
        console.error('[Initial Audio] Synthesizer not initialized for session:', socket.id);
        return;
      }
      
      console.log('[Initial Audio] Calling synthesizeAndSend with message:', initialMessage);
      await this.synthesizeAndSend(socket, session, initialMessage);
      console.log('[Initial Audio] Successfully sent initial audio to client:', socket.id);
    } catch (error) {
      console.error('[Initial Audio] Failed to send initial audio:', error);
    }
  }

  handleDisconnect(socket) {
    const session = this.sessions.get(socket.id);
    if (session) {
      // クリーンアップ
      if (session.recognizer) {
        session.recognizer.close();
      }
      if (session.synthesizer) {
        session.synthesizer.close();
      }
      if (session.audioStream) {
        session.audioStream.close();
      }
      this.sessions.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  }
}

module.exports = RealtimeVoiceHandler;