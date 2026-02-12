# リアルタイムAPI リファレンス

## 目次
1. [概要](#概要)
2. [認証](#認証)
3. [エンドポイント一覧](#エンドポイント一覧)
4. [API詳細仕様](#api詳細仕様)
5. [完全な使用例](#完全な使用例)
6. [エラーハンドリング](#エラーハンドリング)
7. [WebSocket対応](#websocket対応)

---

## 概要

リアルタイムAPIは、営業日報の情報を対話的に収集するためのRESTful APIです。AIが動的に質問を生成し、ユーザーの回答内容に応じて適応的に深掘り質問を行います。

### 主な特徴
- ✅ **無制限の質問**: 必要なスロットが埋まるまで継続（既存UIの5問制限なし）
- ✅ **動的な深掘り**: ユーザーの回答に応じて質問内容が変化
- ✅ **感情認識**: ポジティブ/ネガティブな反応を検出して適切な対応
- ✅ **マルチプラットフォーム**: REST APIなので様々なクライアントから利用可能
- ✅ **WebSocket対応**: Azure SignalR設定時はリアルタイム通信も可能

### ベースURL
```
開発環境: http://localhost:3002/api
本番環境: https://api.salesdaily.com/api
```

---

## 認証

### ログインエンドポイント
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### レスポンス例
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "山田太郎",
    "role": "sales"
  }
}
```

### 認証ヘッダー
全てのリアルタイムAPIエンドポイントには以下のヘッダーが必要です：
```
Authorization: Bearer {token}
```

---

## エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/realtime/sessions` | 新規セッション作成 |
| GET | `/api/realtime/sessions/{sessionId}` | セッション情報取得 |
| POST | `/api/realtime/sessions/{sessionId}/answers` | 回答送信 |
| POST | `/api/realtime/sessions/{sessionId}/end` | セッション終了 |

---

## API詳細仕様

### 1. セッション作成

新しいAIヒアリングセッションを開始します。

#### エンドポイント
```http
POST /api/realtime/sessions
```

#### リクエストヘッダー
```
Authorization: Bearer {token}
Content-Type: application/json
```

#### リクエストボディ
```json
{
  "platform": "web",      // オプション: web, mobile, twilio, teams
  "metadata": {           // オプション: プラットフォーム固有のメタデータ
    "deviceId": "xxx",
    "version": "1.0.0"
  }
}
```

#### レスポンス例（成功: 200 OK）
```json
{
  "sessionId": "442d1a75-4294-4c56-a2d4-43546ce27792",
  "userId": "3",
  "websocketUrl": null,  // Azure SignalR使用時はWebSocket URLが返される
  "initialQuestion": "本日訪問されたお客様の名前を教えてください。",
  "status": "active",
  "createdAt": "2025-08-07T10:00:00.000Z"
}
```

#### cURLコマンド例
```bash
curl -X POST http://localhost:3002/api/realtime/sessions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "web"
  }'
```

---

### 2. セッション状態取得

現在のセッション状態と収集済み情報を取得します。

#### エンドポイント
```http
GET /api/realtime/sessions/{sessionId}
```

#### リクエストヘッダー
```
Authorization: Bearer {token}
```

#### パスパラメータ
- `sessionId` (必須): セッションID（UUID形式）

#### レスポンス例（成功: 200 OK）
```json
{
  "sessionId": "442d1a75-4294-4c56-a2d4-43546ce27792",
  "status": "active",
  "slots": {
    "customer": "ABC建設",
    "project": "新社屋建設",
    "next_action": "見積書提出",
    "budget": "5000万円",
    "schedule": "来年3月着工",
    "participants": "田中部長、山田課長",
    "location": "ABC建設本社",
    "issues": "予算調整が必要",
    "key_person_reaction": "非常に前向き",
    "positive_points": "コスト削減効果に強い興味",
    "atmosphere_change": "技術説明時に身を乗り出した",
    "competitor_info": "A社も検討中",
    "enthusiasm_level": "高",
    "budget_reaction": "余裕あり",
    "concerns_mood": "",
    "next_step_mood": "積極的",
    "closing_possibility": "80%"
  },
  "questionsAnswers": [
    {
      "question": "本日訪問されたお客様の名前を教えてください。",
      "answer": "ABC建設の田中部長を訪問しました",
      "timestamp": "2025-08-07T10:00:15.000Z"
    },
    {
      "question": "田中部長との商談内容について教えてください。",
      "answer": "新社屋建設プロジェクトの相談でした",
      "timestamp": "2025-08-07T10:00:45.000Z"
    }
  ],
  "createdAt": "2025-08-07T10:00:00.000Z"
}
```

#### cURLコマンド例
```bash
curl -X GET http://localhost:3002/api/realtime/sessions/442d1a75-4294-4c56-a2d4-43546ce27792 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### 3. 回答送信

AIの質問に対する回答を送信し、次の質問またはセッション完了を受け取ります。

#### エンドポイント
```http
POST /api/realtime/sessions/{sessionId}/answers
```

#### リクエストヘッダー
```
Authorization: Bearer {token}
Content-Type: application/json
```

#### パスパラメータ
- `sessionId` (必須): セッションID

#### リクエストボディ
```json
{
  "answer": "ABC建設の田中部長を訪問しました。非常に前向きな反応でした。"
}
```

#### レスポンス例（継続時: 200 OK）
```json
{
  "aiResponse": "前向きな反応、素晴らしいですね！",
  "nextQuestion": "田中部長が特に興味を示された点は何でしたか？",
  "isComplete": false,
  "summary": null,
  "slots": {
    "customer": "ABC建設",
    "project": "",
    "next_action": "",
    "budget": "",
    "schedule": "",
    "participants": "田中部長",
    "location": "ABC建設",
    "issues": "",
    "key_person_reaction": "非常に前向き",
    "positive_points": "",
    "atmosphere_change": "",
    "competitor_info": "",
    "enthusiasm_level": "高",
    "budget_reaction": "",
    "concerns_mood": "",
    "next_step_mood": "",
    "closing_possibility": ""
  },
  "questionsCount": 1
}
```

#### レスポンス例（完了時: 200 OK）
```json
{
  "aiResponse": "ありがとうございました！",
  "nextQuestion": null,
  "isComplete": true,
  "summary": "本日、ABC建設の田中部長を訪問し、新社屋建設プロジェクトについて商談。コスト削減効果に強い興味を示され、非常に前向きな反応。予算5000万円で来年3月着工予定。来週見積書を提出予定で、成約可能性80%と高い。",
  "slots": {
    "customer": "ABC建設",
    "project": "新社屋建設",
    "next_action": "見積書提出",
    "budget": "5000万円",
    "schedule": "来年3月着工",
    "participants": "田中部長",
    "location": "ABC建設本社",
    "issues": "",
    "key_person_reaction": "非常に前向き",
    "positive_points": "コスト削減効果に強い興味",
    "atmosphere_change": "技術説明時に身を乗り出した",
    "competitor_info": "",
    "enthusiasm_level": "高",
    "budget_reaction": "余裕あり",
    "concerns_mood": "",
    "next_step_mood": "積極的",
    "closing_possibility": "80%"
  },
  "questionsCount": 8
}
```

#### cURLコマンド例
```bash
curl -X POST http://localhost:3002/api/realtime/sessions/442d1a75-4294-4c56-a2d4-43546ce27792/answers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "ABC建設の田中部長を訪問しました。非常に前向きな反応でした。"
  }'
```

---

### 4. セッション終了

セッションを手動で終了し、現在までの情報でサマリーを生成します。

#### エンドポイント
```http
POST /api/realtime/sessions/{sessionId}/end
```

#### リクエストヘッダー
```
Authorization: Bearer {token}
```

#### パスパラメータ
- `sessionId` (必須): セッションID

#### レスポンス例（成功: 200 OK）
```json
{
  "status": "completed",
  "summary": "本日、ABC建設を訪問。新社屋建設の相談を実施。詳細な要件は今後詰める予定。",
  "slots": {
    "customer": "ABC建設",
    "project": "新社屋建設",
    "next_action": "",
    "budget": "",
    "schedule": "",
    "participants": "",
    "location": "ABC建設",
    "issues": "",
    "key_person_reaction": "",
    "positive_points": "",
    "atmosphere_change": "",
    "competitor_info": "",
    "enthusiasm_level": "",
    "budget_reaction": "",
    "concerns_mood": "",
    "next_step_mood": "",
    "closing_possibility": ""
  },
  "questionsAnswers": [
    {
      "question": "本日訪問されたお客様の名前を教えてください。",
      "answer": "ABC建設を訪問しました",
      "timestamp": "2025-08-07T10:00:15.000Z"
    }
  ]
}
```

#### cURLコマンド例
```bash
curl -X POST http://localhost:3002/api/realtime/sessions/442d1a75-4294-4c56-a2d4-43546ce27792/end \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 完全な使用例

### シナリオ: 商談後の日報作成

#### Step 1: ログイン
```bash
# ログインしてトークンを取得
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yamada@example.com",
    "password": "password123"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

#### Step 2: セッション開始
```bash
# セッションを作成
SESSION=$(curl -s -X POST http://localhost:3002/api/realtime/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "cli"
  }')

SESSION_ID=$(echo $SESSION | jq -r '.sessionId')
QUESTION=$(echo $SESSION | jq -r '.initialQuestion')

echo "Session ID: $SESSION_ID"
echo "Initial Question: $QUESTION"
```

#### Step 3: 対話ループ
```bash
# 1回目の回答
RESPONSE1=$(curl -s -X POST http://localhost:3002/api/realtime/sessions/$SESSION_ID/answers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "XYZ商事の山田部長を訪問しました"
  }')

echo "AI Response: $(echo $RESPONSE1 | jq -r '.aiResponse')"
echo "Next Question: $(echo $RESPONSE1 | jq -r '.nextQuestion')"

# 2回目の回答
RESPONSE2=$(curl -s -X POST http://localhost:3002/api/realtime/sessions/$SESSION_ID/answers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "新システム導入の提案です。非常に前向きな反応でした！"
  }')

echo "AI Response: $(echo $RESPONSE2 | jq -r '.aiResponse')"
echo "Next Question: $(echo $RESPONSE2 | jq -r '.nextQuestion')"

# 3回目の回答（ポジティブな深掘り）
RESPONSE3=$(curl -s -X POST http://localhost:3002/api/realtime/sessions/$SESSION_ID/answers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "特にコスト削減効果について身を乗り出して聞いていました"
  }')

# 完了チェック
IS_COMPLETE=$(echo $RESPONSE3 | jq -r '.isComplete')
if [ "$IS_COMPLETE" = "true" ]; then
  echo "Session completed!"
  echo "Summary: $(echo $RESPONSE3 | jq -r '.summary')"
fi
```

#### Step 4: セッション情報確認
```bash
# 最終的な収集情報を確認
FINAL_STATUS=$(curl -s -X GET http://localhost:3002/api/realtime/sessions/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN")

echo "Final Slots:"
echo $FINAL_STATUS | jq '.slots'

echo "All Q&A:"
echo $FINAL_STATUS | jq '.questionsAnswers'
```

---

## エラーハンドリング

### エラーレスポンス形式
```json
{
  "error": "エラーメッセージ",
  "details": "詳細情報（オプション）"
}
```

### 主なエラーコード

| HTTPステータス | エラー内容 | 対処法 |
|--------------|-----------|--------|
| 400 | Bad Request | リクエストパラメータを確認 |
| 401 | Unauthorized | トークンの有効性を確認 |
| 404 | Session not found | セッションIDを確認 |
| 500 | Internal Server Error | サーバーログを確認 |

### エラー例

#### 401 Unauthorized
```json
{
  "error": "Authorization required"
}
```

#### 404 Not Found
```json
{
  "error": "Session not found"
}
```

#### 400 Bad Request
```json
{
  "error": "Answer is required"
}
```

---

## WebSocket対応

Azure SignalRが設定されている場合、リアルタイムでメッセージを受信できます。

### 接続URL
セッション作成時のレスポンスに含まれる`websocketUrl`を使用します。

### メッセージ形式

#### 質問メッセージ
```json
{
  "type": "question",
  "aiResponse": "なるほどですね",
  "nextQuestion": "次のアクションは何ですか？",
  "slots": { /* 現在のスロット状態 */ },
  "isComplete": false
}
```

#### 完了メッセージ
```json
{
  "type": "session_complete",
  "aiResponse": "ありがとうございました",
  "summary": "日報サマリー...",
  "slots": { /* 最終スロット */ },
  "isComplete": true
}
```

### JavaScript実装例
```javascript
// SignalR接続（Azure SignalR使用時）
const signalR = require('@microsoft/signalr');

const connection = new signalR.HubConnectionBuilder()
  .withUrl(websocketUrl)
  .build();

connection.on('message', (message) => {
  console.log('Received:', message);
  
  if (message.type === 'question') {
    console.log('Next question:', message.nextQuestion);
  } else if (message.type === 'session_complete') {
    console.log('Session completed!');
    console.log('Summary:', message.summary);
  }
});

await connection.start();
```

---

## スロット詳細

### 必須スロット
| スロット名 | 説明 | 例 |
|-----------|------|-----|
| customer | 顧客名・会社名 | "ABC建設" |
| project | 案件名・プロジェクト名 | "新社屋建設" |
| next_action | 次のアクション | "見積書提出" |

### 任意スロット（深掘り情報）
| スロット名 | 説明 | 例 |
|-----------|------|-----|
| budget | 予算 | "5000万円" |
| schedule | スケジュール・納期 | "来年3月着工" |
| participants | 参加者 | "田中部長、山田課長" |
| location | 場所・訪問先 | "ABC建設本社" |
| issues | 課題・リスク | "予算調整が必要" |
| key_person_reaction | キーマンの反応・温度感 | "非常に前向き" |
| positive_points | 先方が興味を持った点 | "コスト削減効果" |
| atmosphere_change | 雰囲気が変わった瞬間 | "技術説明時に身を乗り出した" |
| competitor_info | 競合情報 | "A社も検討中" |
| enthusiasm_level | 先方の熱意度 | "高/中/低" |
| budget_reaction | 予算への反応 | "前向き/渋い/余裕あり" |
| concerns_mood | 懸念事項の雰囲気 | "慎重な様子" |
| next_step_mood | 次ステップへの温度感 | "積極的" |
| closing_possibility | 成約可能性 | "80%" |

---

## 動的質問生成の仕組み

### 質問戦略

#### 序盤（1-3回目）
基本情報の収集を優先
- 顧客名
- 案件内容
- 次のアクション

#### 中盤（4-8回目）
回答内容に応じた動的な深掘り
- **ポジティブな回答** → 評価ポイント、成功要因を深掘り
- **ネガティブな回答** → 課題、懸念、対策を確認
- **具体的情報** → 関連する詳細を確認

#### 終盤（9回目以降）
まとめと確認
- 成約可能性の確認
- 重要なネクストステップ
- フォローすべき事項

### 回答分析パターン

| 検出パターン | キーワード例 | AIの対応 |
|------------|------------|---------|
| ポジティブ | 前向き、好感触、興味、良い、進展 | 成功要因を深掘り、具体的な評価ポイントを確認 |
| ネガティブ | 難しい、厳しい、課題、問題、懸念 | 共感を示し、詳細や対策を確認 |
| 具体的情報 | 金額、日付、人名、％ | 関連する詳細情報を確認 |

---

## 統合例

### Twilio音声通話
```javascript
app.post('/twilio/voice', async (req, res) => {
  const speech = req.body.SpeechResult;
  
  const response = await axios.post(
    `/api/realtime/sessions/${sessionId}/answers`,
    { answer: speech },
    { headers: { Authorization: `Bearer ${token}` }}
  );
  
  const twiml = new VoiceResponse();
  twiml.say(response.data.nextQuestion, { language: 'ja-JP' });
  twiml.gather({
    input: 'speech',
    language: 'ja-JP',
    action: '/twilio/voice'
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

### Microsoft Teams Bot
```javascript
async function onMessage(context) {
  const answer = context.activity.text;
  
  const response = await axios.post(
    `/api/realtime/sessions/${sessionId}/answers`,
    { answer },
    { headers: { Authorization: `Bearer ${token}` }}
  );
  
  await context.sendActivity({
    text: response.data.nextQuestion,
    suggestedActions: {
      actions: [
        { type: 'imBack', title: 'はい', value: 'はい' },
        { type: 'imBack', title: 'いいえ', value: 'いいえ' }
      ]
    }
  });
}
```

### モバイルアプリ（React Native）
```javascript
const sendAnswer = async (answer) => {
  try {
    const response = await fetch(
      `${API_BASE}/realtime/sessions/${sessionId}/answers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer })
      }
    );
    
    const data = await response.json();
    
    if (data.isComplete) {
      // セッション完了処理
      showSummary(data.summary);
    } else {
      // 次の質問を表示
      setCurrentQuestion(data.nextQuestion);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## ベストプラクティス

### 1. セッション管理
- セッションは1時間で自動削除されます
- 長時間の中断後は新しいセッションを作成してください

### 2. エラーハンドリング
- ネットワークエラーに備えてリトライ処理を実装
- セッション状態を定期的に確認

### 3. パフォーマンス
- 不要になったセッションは`/end`エンドポイントで終了
- WebSocket接続は適切にクローズ

### 4. セキュリティ
- トークンは安全に保管
- HTTPSを使用（本番環境）
- CORSの適切な設定

---

## サポート

### トラブルシューティング
- **Q: セッションが見つからない**
  - A: セッションは1時間で自動削除されます。新しいセッションを作成してください。

- **Q: 質問が繰り返される**
  - A: 回答が具体的でない場合、AIが詳細を求めることがあります。

- **Q: WebSocketに接続できない**
  - A: Azure SignalRが設定されているか確認してください。

### 問い合わせ
- GitHub Issues: https://github.com/salesdaily/api/issues
- Email: support@salesdaily.com

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| 1.0.0 | 2025-01-07 | 初版リリース |
| 1.1.0 | 2025-01-07 | 動的深掘り機能追加 |
| 1.2.0 | 2025-01-07 | 感情分析機能追加 |