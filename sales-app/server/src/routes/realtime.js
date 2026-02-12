const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const signalrService = require('../config/signalr');
const sessionManager = require('../services/sessionManager');
const realtimeAI = require('../services/realtimeAI');
const jwt = require('jsonwebtoken');

/**
 * @swagger
 * /api/realtime/sessions:
 *   post:
 *     summary: 新しいAIヒアリングセッションを作成
 *     description: リアルタイムAIヒアリングのセッションを開始し、初期質問を生成します
 *     tags: [Realtime]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [web, mobile, twilio, teams]
 *                 description: 利用プラットフォーム
 *               metadata:
 *                 type: object
 *                 description: プラットフォーム固有のメタデータ
 *     responses:
 *       200:
 *         description: セッション作成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   format: uuid
 *                 userId:
 *                   type: string
 *                 websocketUrl:
 *                   type: string
 *                   nullable: true
 *                   description: Azure SignalR接続URL（設定時のみ）
 *                 initialQuestion:
 *                   type: string
 *                   description: 初期質問
 *                 status:
 *                   type: string
 *                   enum: [active]
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/sessions', async (req, res) => {
  try {
    // 認証チェック
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // セッション作成
    const sessionId = uuidv4();
    const session = await sessionManager.createSession(sessionId, userId, {
      mode: 'realtime',
      platform: req.body.platform || 'web',
      metadata: req.body.metadata || {}
    });

    // SignalR接続URLを生成
    let websocketUrl = null;
    try {
      if (process.env.AZURE_SIGNALR_CONNECTION_STRING && signalrService.serviceClient) {
        websocketUrl = await signalrService.getClientAccessUrl(userId, sessionId);
        console.log('WebSocket URL generated successfully');
      } else {
        console.log('SignalR not configured or not initialized');
      }
    } catch (error) {
      console.error('SignalR URL generation failed:', error.message);
      console.log('Continuing without WebSocket support');
    }

    // 初期質問を生成
    const initialQuestion = await realtimeAI.generateQuestion(session);

    res.json({
      sessionId,
      userId,
      websocketUrl,
      initialQuestion,
      status: 'active',
      createdAt: session.startTime
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * @swagger
 * /api/realtime/sessions/{sessionId}:
 *   get:
 *     summary: セッション状態を取得
 *     description: 指定されたセッションの現在の状態とスロット情報を取得します
 *     tags: [Realtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: セッションID
 *     responses:
 *       200:
 *         description: セッション情報
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       404:
 *         description: セッションが見つかりません
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await sessionManager.getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.id,
      status: session.status,
      slots: session.slots,
      questionsAnswers: session.questionsAnswers,
      createdAt: session.startTime
    });
  } catch (error) {
    console.error('Failed to get session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * @swagger
 * /api/realtime/sessions/{sessionId}/answers:
 *   post:
 *     summary: AIの質問に回答を送信
 *     description: ユーザーの回答を処理し、次の質問を生成またはセッションを完了します
 *     tags: [Realtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: セッションID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answer
 *             properties:
 *               answer:
 *                 type: string
 *                 description: ユーザーの回答
 *                 example: "ABC建設を訪問しました"
 *     responses:
 *       200:
 *         description: 回答処理成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 aiResponse:
 *                   type: string
 *                   description: AIの応答メッセージ
 *                   example: "ありがとうございます"
 *                 nextQuestion:
 *                   type: string
 *                   nullable: true
 *                   description: 次の質問（完了時はnull）
 *                   example: "どのような案件でしたか？"
 *                 isComplete:
 *                   type: boolean
 *                   description: セッション完了フラグ
 *                 summary:
 *                   type: string
 *                   nullable: true
 *                   description: 日報サマリー（完了時のみ）
 *                 slots:
 *                   type: object
 *                   description: 現在のスロット状態
 *                 questionsCount:
 *                   type: integer
 *                   description: これまでの質問数
 *       400:
 *         description: 不正なリクエスト
 *       404:
 *         description: セッションが見つかりません
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/sessions/:sessionId/answers', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({ error: 'Answer is required' });
    }

    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 最新の質問を取得
    const lastQuestion = session.currentQuestion || 'お疲れ様です！今日はいかがでしたか？';

    // 回答からスロット情報を抽出
    const updatedSlots = await realtimeAI.extractSlots(answer, session.slots);
    
    // セッションを更新
    await sessionManager.updateSlots(sessionId, updatedSlots);
    await sessionManager.addQuestionAnswer(sessionId, lastQuestion, answer);

    // AI応答を生成
    const aiResponse = await realtimeAI.generateResponse(answer, updatedSlots);

    // 最新のセッション情報を取得
    const updatedSession = await sessionManager.getSession(sessionId);
    
    // 改善版の完了判定：情報の質と量を総合的に評価
    const shouldComplete = sessionManager.shouldCompleteSession(updatedSession);
    
    // 重要な情報が抜けていないかチェック
    const hasMissingInfo = sessionManager.hasImportantMissingInfo(updatedSlots, updatedSession.questionsAnswers);
    
    // 最終的な完了判定
    const isComplete = shouldComplete && !hasMissingInfo;
    
    let nextQuestion = null;
    let summary = null;

    if (isComplete) {
      // 完了時はサマリーを生成
      summary = await realtimeAI.generateSummary(updatedSession);
      await sessionManager.updateSession(sessionId, { 
        status: 'completed',
        summary 
      });
    } else {
      // 次の質問を生成（重要な情報が抜けている場合は優先的に聞く）
      nextQuestion = await realtimeAI.generateQuestion(updatedSession, hasMissingInfo);
      await sessionManager.updateSession(sessionId, { 
        currentQuestion: nextQuestion 
      });
    }

    // WebSocket経由でもメッセージを送信
    try {
      if (process.env.AZURE_SIGNALR_CONNECTION_STRING && signalrService.serviceClient) {
        const message = {
          type: isComplete ? 'session_complete' : 'question',
          aiResponse,
          nextQuestion,
          summary,
          slots: updatedSlots,
          isComplete
        };
        await signalrService.sendToGroup(sessionId, message);
      }
    } catch (error) {
      console.log('SignalR send failed, continuing without WebSocket');
    }

    res.json({
      aiResponse,
      nextQuestion,
      isComplete,
      summary,
      slots: updatedSlots,
      questionsCount: session.questionsAnswers.length + 1
    });
  } catch (error) {
    console.error('Failed to process answer:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

/**
 * @swagger
 * /api/realtime/sessions/{sessionId}/end:
 *   post:
 *     summary: セッションを終了
 *     description: セッションを強制終了し、現在までの情報でサマリーを生成します
 *     tags: [Realtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: セッションID
 *     responses:
 *       200:
 *         description: セッション終了成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [completed]
 *                 summary:
 *                   type: string
 *                   description: 生成された日報サマリー
 *                 slots:
 *                   type: object
 *                   description: 最終的なスロット情報
 *                 questionsAnswers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       question:
 *                         type: string
 *                       answer:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: セッションが見つかりません
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // サマリーを生成
    const summary = await realtimeAI.generateSummary(session);
    
    // セッションを完了状態に更新
    await sessionManager.updateSession(sessionId, {
      status: 'completed',
      endTime: new Date().toISOString(),
      summary
    });

    // WebSocket経由で完了通知
    try {
      if (process.env.AZURE_SIGNALR_CONNECTION_STRING && signalrService.serviceClient) {
        await signalrService.sendToGroup(sessionId, {
          type: 'session_ended',
          summary,
          slots: session.slots
        });
      }
    } catch (error) {
      console.log('SignalR send failed, continuing without WebSocket');
    }

    res.json({
      status: 'completed',
      summary,
      slots: session.slots,
      questionsAnswers: session.questionsAnswers
    });
  } catch (error) {
    console.error('Failed to end session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// WebSocket イベントハンドラー（Azure SignalR使用時）
if (process.env.AZURE_SIGNALR_CONNECTION_STRING && signalrService.getEventHandler()) {
  router.use('/eventhandler', signalrService.getEventHandler().getMiddleware());
}

module.exports = router;