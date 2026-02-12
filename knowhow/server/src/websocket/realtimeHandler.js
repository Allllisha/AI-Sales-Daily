const sdk = require('microsoft-cognitiveservices-speech-sdk');
const pool = require('../db/pool');
const realtimeAI = require('../services/realtimeAI');
const { semanticSearch } = require('../services/searchService');

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
        this.speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
        this.speechConfig.speechRecognitionLanguage = 'ja-JP';
        this.speechConfig.speechSynthesisLanguage = 'ja-JP';
        this.speechConfig.speechSynthesisVoiceName = 'ja-JP-NanamiNeural';
      } catch (error) {
        console.error('Failed to initialize Speech Config:', error);
        this.speechConfig = null;
      }
    }
  }

  handleConnection(socket) {
    console.log('Client connected:', socket.id, 'userId:', socket.userId);

    const session = {
      id: socket.id,
      userId: socket.userId,
      dbSessionId: null,
      audioStream: null,
      recognizer: null,
      synthesizer: null,
      conversationHistory: [],
      currentTranscript: '',
      isProcessing: false,
      silenceTimer: null,
      lastSpeechTime: Date.now(),
      accumulatedText: '',
      mode: null,
      workType: null,
      siteId: null,
      relatedKnowledge: [],
      relatedIncidents: [],
      messageOrder: 0
    };

    this.sessions.set(socket.id, session);

    // Initialize speech recognition
    this.initializeSpeechRecognition(socket, session);

    // Event handlers
    socket.on('start-session', (data) => this.startSession(socket, session, data));
    socket.on('end-session', () => this.endSession(socket, session));
    socket.on('audio-data', (data) => this.processAudioData(socket, session, data));
    socket.on('text-input', (data) => this.handleTextInput(socket, session, data));
    socket.on('start-listening', () => this.startListening(socket, session));
    socket.on('stop-listening', () => this.stopListening(socket, session));
    socket.on('pause-recognition', () => this.pauseRecognition(socket, session));
    socket.on('resume-recognition', () => this.resumeRecognition(socket, session));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  initializeSpeechRecognition(socket, session) {
    if (!this.speechConfig) {
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

    // Continuous recognition setup
    const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);

    recognizer.properties.setProperty(
      sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
      '3000'
    );

    // Partial recognition results
    recognizer.recognizing = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
        if (session.isPaused) return;

        session.lastSpeechTime = Date.now();

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

    // Final recognition results
    recognizer.recognized = async (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        if (session.isPaused) return;

        const transcript = e.result.text;
        const confidence = e.result.properties?.getProperty('Confidence') || null;
        console.log('Recognized speech:', transcript);

        session.lastSpeechTime = Date.now();
        session.accumulatedText += transcript + ' ';

        socket.emit('final-transcript', {
          text: transcript,
          isFinal: true,
          confidence: confidence ? parseFloat(confidence) : null
        });

        if (session.silenceTimer) {
          clearTimeout(session.silenceTimer);
        }

        // Wait 2.5s of silence before processing
        session.silenceTimer = setTimeout(async () => {
          if (!session.isProcessing && session.accumulatedText.trim()) {
            const fullText = session.accumulatedText.trim();
            session.accumulatedText = '';
            await this.processUserInput(socket, session, fullText, confidence ? parseFloat(confidence) : null);
          }
        }, 2500);
      }
    };

    recognizer.sessionStopped = (s, e) => {
      console.log('Recognition session stopped');
      if (session.isListening) {
        recognizer.startContinuousRecognitionAsync();
      }
    };

    recognizer.canceled = (s, e) => {
      console.error('Recognition canceled:', e.errorDetails);
      if (e.errorCode !== sdk.CancellationErrorCode.NoError) {
        socket.emit('error', { message: `Recognition error: ${e.errorDetails}` });
      }
      if (session.isListening && e.errorCode === sdk.CancellationErrorCode.NoError) {
        setTimeout(() => {
          recognizer.startContinuousRecognitionAsync();
        }, 1000);
      }
    };

    session.recognizer = recognizer;

    // Speech synthesizer
    session.synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);
  }

  async startSession(socket, session, data) {
    const { mode, site_id, work_type } = data || {};

    session.mode = mode || 'office';
    session.siteId = site_id || null;
    session.workType = work_type || null;

    try {
      // Create DB session
      const result = await pool.query(
        `INSERT INTO voice_sessions (user_id, mode, site_id, work_type, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING *`,
        [session.userId, session.mode, session.siteId, session.workType]
      );

      session.dbSessionId = result.rows[0].id;

      // Generate initial greeting
      const greeting = session.mode === 'field'
        ? 'お疲れ様です。現場の状況を教えてください。どのような作業を行いますか？'
        : 'お疲れ様です。施工検討を始めましょう。工種を教えてください。';

      // Save initial message to DB
      session.messageOrder++;
      await pool.query(
        `INSERT INTO voice_session_messages (session_id, role, content, order_index)
         VALUES ($1, 'assistant', $2, $3)`,
        [session.dbSessionId, greeting, session.messageOrder]
      );

      session.conversationHistory.push({ role: 'assistant', content: greeting });

      socket.emit('session-started', {
        sessionId: session.dbSessionId,
        mode: session.mode,
        greeting
      });

      // Send initial audio
      if (session.synthesizer) {
        this.synthesizeAndSend(socket, session, greeting).catch(err => {
          console.error('Initial audio synthesis error:', err);
        });
      }
    } catch (error) {
      console.error('Start session error:', error);
      socket.emit('error', { message: 'Failed to start session' });
    }
  }

  async endSession(socket, session) {
    if (!session.dbSessionId) return;

    try {
      // Generate session summary
      const summary = await realtimeAI.generateSummary({
        conversationHistory: session.conversationHistory,
        workType: session.workType,
        mode: session.mode
      });

      // Update session status
      await pool.query(
        `UPDATE voice_sessions SET status = 'completed', completed_at = NOW()
         WHERE id = $1`,
        [session.dbSessionId]
      );

      socket.emit('session-ended', {
        sessionId: session.dbSessionId,
        summary
      });
    } catch (error) {
      console.error('End session error:', error);
      socket.emit('error', { message: 'Failed to end session' });
    }
  }

  startListening(socket, session) {
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

      if (session.silenceTimer) {
        clearTimeout(session.silenceTimer);
        session.silenceTimer = null;
      }

      // Process any accumulated text
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
    if (session.recognizer && session.isListening) {
      session.isPaused = true;
    }
  }

  resumeRecognition(socket, session) {
    if (session.recognizer && session.isListening) {
      session.isPaused = false;
    }
  }

  processAudioData(socket, session, audioData) {
    if (session.audioStream) {
      const buffer = Buffer.from(audioData);
      session.audioStream.write(buffer);
    }
  }

  async handleTextInput(socket, session, data) {
    const { text } = data || {};
    if (!text || !text.trim()) return;

    socket.emit('final-transcript', {
      text: text.trim(),
      isFinal: true
    });

    await this.processUserInput(socket, session, text.trim());
  }

  async processUserInput(socket, session, userText, confidence) {
    if (session.isProcessing) return;
    session.isProcessing = true;

    try {
      // Detect work type from user input if not set
      if (!session.workType) {
        const detectedWorkType = await realtimeAI.detectWorkType(userText);
        if (detectedWorkType) {
          session.workType = detectedWorkType;
          if (session.dbSessionId) {
            await pool.query(
              'UPDATE voice_sessions SET work_type = $1 WHERE id = $2',
              [session.workType, session.dbSessionId]
            ).catch(err => console.error('Failed to update work_type:', err.message));
          }
        }
      }

      // Search for related knowledge, incidents, and checklists
      let relatedKnowledge = [];
      let relatedIncidents = [];
      let relatedChecklists = [];
      let knowledgeIds = [];

      try {
        const { results: searchResults } = await semanticSearch(userText, {
          top: 3,
          filter: session.workType ? `work_type eq '${session.workType}'` : undefined
        });

        if (searchResults.length > 0) {
          relatedKnowledge = searchResults;
          knowledgeIds = searchResults.map(k => k.id);
        } else {
          // Fallback to DB search (user's useful marks prioritized)
          const searchParam = `%${userText.substring(0, 50)}%`;
          const dbParams = session.workType
            ? [searchParam, session.workType, session.userId]
            : [searchParam, session.userId];
          const userIdIdx = dbParams.length;

          const dbKnowledge = await pool.query(
            `SELECT id, title, content, summary, category,
                    CASE WHEN EXISTS (
                      SELECT 1 FROM usage_logs ul
                      WHERE ul.knowledge_id = knowledge_items.id AND ul.user_id = $${userIdIdx} AND ul.action_type = 'useful_mark'
                    ) THEN true ELSE false END as marked_useful_by_me
             FROM knowledge_items
             WHERE status = 'published'
             AND (title ILIKE $1 OR content ILIKE $1)
             ${session.workType ? "AND work_type = $2" : ''}
             ORDER BY marked_useful_by_me DESC, useful_count DESC LIMIT 3`,
            dbParams
          );
          if (dbKnowledge.rows.length > 0) {
            relatedKnowledge = dbKnowledge.rows;
            knowledgeIds = dbKnowledge.rows.map(k => String(k.id));
          }
        }

        // Search for related incidents
        const dbIncidents = await pool.query(
          `SELECT title, description, severity, countermeasure, work_type FROM incident_cases
           WHERE title ILIKE $1 OR description ILIKE $1
           ${session.workType ? "AND work_type = $2" : ''}
           ORDER BY severity DESC LIMIT 2`,
          session.workType
            ? [`%${userText.substring(0, 50)}%`, session.workType]
            : [`%${userText.substring(0, 50)}%`]
        );
        relatedIncidents = dbIncidents.rows;

        // Search for related checklists
        const checklistSearchParam = `%${userText.substring(0, 50)}%`;
        const checklistParams = session.workType
          ? [checklistSearchParam, session.workType]
          : [checklistSearchParam];

        const dbChecklists = await pool.query(
          `SELECT id, name, description, work_type FROM checklists
           WHERE (name ILIKE $1 OR description ILIKE $1 OR work_type ILIKE $1)
           ${session.workType ? "AND work_type ILIKE '%' || $2 || '%'" : ''}
           LIMIT 3`,
          checklistParams
        );
        relatedChecklists = dbChecklists.rows;
      } catch (searchError) {
        console.error('Knowledge search error:', searchError.message);
      }

      // Confidence check - ask for re-input if low
      if (confidence !== null && confidence !== undefined && confidence < 0.5) {
        const lowConfResponse = 'すみません、よく聞き取れませんでした。もう一度お話しいただけますか？';
        session.conversationHistory.push({ role: 'user', content: userText });
        session.conversationHistory.push({ role: 'assistant', content: lowConfResponse });

        socket.emit('ai-response-text', {
          text: lowConfResponse,
          relatedKnowledge: [],
          lowConfidence: true
        });

        if (session.synthesizer) {
          this.synthesizeAndSend(socket, session, lowConfResponse).catch(err => {
            console.error('Synthesis error:', err);
          });
        }

        session.isProcessing = false;
        return;
      }

      // Add user message to history
      session.conversationHistory.push({ role: 'user', content: userText });

      // Generate AI response with knowledge context
      let aiResponse = await realtimeAI.generateResponse(userText, {
        mode: session.mode,
        conversationHistory: session.conversationHistory.slice(-8),
        workType: session.workType,
        relatedKnowledge,
        relatedIncidents,
        relatedChecklists
      });

      // チェックリスト自動登録
      const checklistMatch = aiResponse.match(/```checklist_json\s*\n([\s\S]*?)\n```/);
      if (checklistMatch) {
        try {
          const checklistData = JSON.parse(checklistMatch[1].trim());
          if (checklistData.name && checklistData.items && checklistData.items.length > 0) {
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              const description = checklistData.category ? `[${checklistData.category}] ${checklistData.description || ''}`.trim() : (checklistData.description || '');
              const clResult = await client.query(
                `INSERT INTO checklists (name, description, work_type, created_by)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [checklistData.name, description, checklistData.work_type || '', session.userId]
              );
              const checklistId = clResult.rows[0].id;

              for (let i = 0; i < checklistData.items.length; i++) {
                await client.query(
                  `INSERT INTO checklist_items (checklist_id, content, order_index, priority)
                   VALUES ($1, $2, $3, 'required')`,
                  [checklistId, checklistData.items[i], i + 1]
                );
              }
              await client.query('COMMIT');

              // JSON部分を削除してリンクに差し替え
              aiResponse = aiResponse.replace(/```checklist_json\s*\n[\s\S]*?\n```/,
                `\n\nこのチェックリストをシステムに登録しました。[[checklist:${checklistId}|${checklistData.name}]]から確認・実行できます。`);
            } catch (dbErr) {
              await client.query('ROLLBACK');
              console.error('Checklist auto-create error:', dbErr);
              aiResponse = aiResponse.replace(/```checklist_json\s*\n[\s\S]*?\n```/, '');
            } finally {
              client.release();
            }
          }
        } catch (parseErr) {
          console.error('Checklist JSON parse error:', parseErr);
          aiResponse = aiResponse.replace(/```checklist_json\s*\n[\s\S]*?\n```/, '');
        }
      }

      session.conversationHistory.push({ role: 'assistant', content: aiResponse });

      // Save messages to DB
      if (session.dbSessionId) {
        try {
          session.messageOrder++;
          await pool.query(
            `INSERT INTO voice_session_messages (session_id, role, content, confidence, related_knowledge_ids, order_index)
             VALUES ($1, 'user', $2, $3, $4, $5)`,
            [session.dbSessionId, userText, confidence || null, knowledgeIds.length > 0 ? knowledgeIds : null, session.messageOrder]
          );

          session.messageOrder++;
          await pool.query(
            `INSERT INTO voice_session_messages (session_id, role, content, related_knowledge_ids, order_index)
             VALUES ($1, 'assistant', $2, $3, $4)`,
            [session.dbSessionId, aiResponse, knowledgeIds.length > 0 ? knowledgeIds : null, session.messageOrder]
          );
        } catch (dbError) {
          console.error('Failed to save session messages:', dbError.message);
        }
      }

      // Log knowledge usage
      if (knowledgeIds.length > 0 && session.userId) {
        for (const kid of knowledgeIds) {
          pool.query(
            `INSERT INTO usage_logs (user_id, knowledge_id, action_type, context_site_id, context_work_type, search_query)
             VALUES ($1, $2, 'voice_query', $3, $4, $5)`,
            [session.userId, kid, session.siteId, session.workType, userText.substring(0, 200)]
          ).catch(err => console.error('Usage log error:', err.message));
        }
      }

      // Emit response with knowledge references
      socket.emit('ai-response-text', {
        text: aiResponse,
        relatedKnowledge: relatedKnowledge.map(k => ({
          id: k.id,
          title: k.title,
          category: k.category,
          score: k.score
        })),
        relatedIncidents: relatedIncidents.map(i => ({
          title: i.title,
          severity: i.severity
        }))
      });

      // Synthesize audio (non-blocking)
      if (session.synthesizer) {
        this.synthesizeAndSend(socket, session, aiResponse).catch(err => {
          console.error('Speech synthesis error:', err);
        });
      }
    } catch (error) {
      console.error('Error processing input:', error);
      socket.emit('error', { message: `Processing error: ${error.message}` });

      socket.emit('ai-response-text', {
        text: 'すみません、処理中にエラーが発生しました。もう一度お話しください。',
        relatedKnowledge: []
      });
    } finally {
      session.isProcessing = false;
    }
  }

  async synthesizeAndSend(socket, session, text) {
    return new Promise((resolve, reject) => {
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
        <voice name="ja-JP-NanamiNeural">
          <prosody rate="1.1">${text}</prosody>
        </voice>
      </speak>`;

      session.synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const audioBase64 = Buffer.from(result.audioData).toString('base64');
            socket.emit('ai-audio', {
              audio: audioBase64,
              format: 'wav'
            });
            resolve();
          } else {
            console.error('Speech synthesis failed:', result.errorDetails);
            reject(new Error('Speech synthesis failed'));
          }
        },
        (error) => {
          console.error('Speech synthesis error:', error);
          reject(error);
        }
      );
    });
  }

  handleDisconnect(socket) {
    const session = this.sessions.get(socket.id);
    if (session) {
      if (session.silenceTimer) {
        clearTimeout(session.silenceTimer);
      }
      if (session.recognizer) {
        session.recognizer.close();
      }
      if (session.synthesizer) {
        session.synthesizer.close();
      }
      if (session.audioStream) {
        session.audioStream.close();
      }

      // Mark session as completed if active
      if (session.dbSessionId) {
        pool.query(
          `UPDATE voice_sessions SET status = 'completed', completed_at = NOW()
           WHERE id = $1 AND status = 'active'`,
          [session.dbSessionId]
        ).catch(err => console.error('Failed to close session:', err.message));
      }

      this.sessions.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  }
}

module.exports = RealtimeVoiceHandler;
