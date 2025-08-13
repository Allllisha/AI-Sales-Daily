# リアルタイム API 仕様書

## 概要

このリアルタイム API は、営業日報の情報を対話的に収集するための API です。
音声入力プラットフォーム（Twilio、Teams、モバイルアプリなど）から利用可能で、
必要なスロットが埋まるまで自動的に深掘り質問を続けます。

## 特徴

- **無制限の質問**: 既存 UI の 5 問制限とは異なり、スロットが埋まるまで継続
- **マルチプラットフォーム対応**: REST API + オプションの WebSocket（Azure SignalR）
- **既存 AI ロジックの再利用**: 深掘り質問生成は既存の実装を活用
- **独立動作**: 既存の Web UI には一切影響しない

## API エンドポイント

### 1. セッション作成

```http
POST /api/realtime/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "platform": "web|mobile|twilio|teams",
  "metadata": {
    // オプション: プラットフォーム固有のメタデータ
  }
}
```

**レスポンス:**

```json
{
	"sessionId": "uuid",
	"userId": "user_id",
	"websocketUrl": "wss://...", // Azure SignalR使用時のみ
	"initialQuestion": "お疲れ様です！今日はどのような商談がありましたか？",
	"status": "active",
	"createdAt": "2025-01-07T10:00:00Z"
}
```

### 2. 回答送信

```http
POST /api/realtime/sessions/{sessionId}/answers
Authorization: Bearer {token}
Content-Type: application/json

{
  "answer": "ABC建設と新規案件について打ち合わせしました"
}
```

**レスポンス:**

```json
{
	"aiResponse": "承知しました",
	"nextQuestion": "どのような案件でしたか？",
	"isComplete": false,
	"summary": null,
	"slots": {
		"customer": "ABC建設",
		"project": "",
		"next_action": ""
		// ...
	},
	"questionsCount": 1
}
```

### 3. セッション状態取得

```http
GET /api/realtime/sessions/{sessionId}
Authorization: Bearer {token}
```

**レスポンス:**

```json
{
	"sessionId": "uuid",
	"status": "active|completed",
	"slots": {
		"customer": "ABC建設",
		"project": "新社屋建設",
		"next_action": "見積書提出",
		"budget": "5000万円",
		"schedule": "2025年3月着工",
		"participants": "田中部長, 山田課長",
		"location": "東京本社",
		"issues": "予算調整が必要"
	},
	"questionsAnswers": [
		{
			"question": "お疲れ様です！今日はどのような商談がありましたか？",
			"answer": "ABC建設と新規案件について打ち合わせしました",
			"timestamp": "2025-01-07T10:00:00Z"
		}
	],
	"createdAt": "2025-01-07T10:00:00Z"
}
```

### 4. セッション終了

```http
POST /api/realtime/sessions/{sessionId}/end
Authorization: Bearer {token}
```

**レスポンス:**

```json
{
	"status": "completed",
	"summary": "本日ABC建設を訪問し、新社屋建設案件について協議。予算5000万円、3月着工予定。見積書を今週中に提出予定。",
	"slots": {
		/* 最終的なスロット情報 */
	},
	"questionsAnswers": [
		/* 全ての質問と回答 */
	]
}
```

## WebSocket 通信（Azure SignalR 使用時）

Azure SignalR 接続時は、リアルタイムで以下のメッセージを受信できます：

### メッセージタイプ

1. **質問メッセージ**

```json
{
	"type": "question",
	"aiResponse": "なるほどですね",
	"nextQuestion": "次のアクションは何ですか？",
	"slots": {
		/* 現在のスロット状態 */
	},
	"isComplete": false
}
```

2. **完了メッセージ**

```json
{
	"type": "session_complete",
	"aiResponse": "ありがとうございました",
	"summary": "日報サマリー...",
	"slots": {
		/* 最終スロット */
	},
	"isComplete": true
}
```

## 統合例

### 1. Twilio 音声通話との統合

```javascript
// Twilio webhook handler
app.post('/twilio/voice', (req, res) => {
  const speech = req.body.SpeechResult;

  // リアルタイムAPIに転送
  await axios.post(`/api/realtime/sessions/${sessionId}/answers`, {
    answer: speech
  });

  // TwiML レスポンス生成
  const twiml = new VoiceResponse();
  twiml.say(nextQuestion);
  twiml.gather({
    input: 'speech',
    action: '/twilio/voice'
  });

  res.type('text/xml');
  res.send(twiml.toString());
});
```

### 2. Microsoft Teams ボットとの統合

```javascript
// Teams bot handler
async function onMessage(context, next) {
	const userMessage = context.activity.text;

	// リアルタイムAPIに送信
	const response = await axios.post(
		`/api/realtime/sessions/${sessionId}/answers`,
		{ answer: userMessage }
	);

	// Teamsに返信
	await context.sendActivity(response.data.nextQuestion);
}
```

### 3. モバイルアプリとの統合

```swift
// iOS Swift example
func sendAnswer(_ answer: String) {
    let url = URL(string: "\(apiBase)/realtime/sessions/\(sessionId)/answers")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.httpBody = try! JSONEncoder().encode(["answer": answer])

    URLSession.shared.dataTask(with: request) { data, response, error in
        let result = try! JSONDecoder().decode(AnswerResponse.self, from: data!)
        if !result.isComplete {
            self.showNextQuestion(result.nextQuestion)
        } else {
            self.showSummary(result.summary)
        }
    }.resume()
}
```

## 環境変数

```env
# Azure SignalR（オプション）
AZURE_SIGNALR_CONNECTION_STRING=Endpoint=https://...

# Redis（オプション - なくてもインメモリで動作）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OpenAI/Azure OpenAI
OPENAI_API_KEY=sk-...
# または
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

## テスト方法

1. **CLI テストクライアント**

```bash
cd server
node test-realtime-client.js
```

2. **cURL でのテスト**

```bash
# セッション作成
curl -X POST http://localhost:3001/api/realtime/sessions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"platform": "curl-test"}'

# 回答送信
curl -X POST http://localhost:3001/api/realtime/sessions/{sessionId}/answers \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"answer": "ABC建設を訪問しました"}'
```

## 注意事項

- セッションは 1 時間で自動削除されます
- 必須スロット（customer, project, next_action）が埋まるまで質問は続きます
- WebSocket 接続はオプショナル - REST API のみでも完全に動作します
- 既存の Web UI とは完全に独立して動作します
