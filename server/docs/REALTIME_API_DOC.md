# リアルタイムAPI 完全ドキュメント

## 目次
1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [認証](#認証)
4. [エンドポイント詳細](#エンドポイント詳細)
5. [セッションフロー](#セッションフロー)
6. [テスト方法](#テスト方法)
7. [実装の詳細](#実装の詳細)
8. [トラブルシューティング](#トラブルシューティング)

---

## 概要

リアルタイムAPIは、営業日報の情報を対話的に収集するためのRESTful APIです。AIが動的に質問を生成し、ユーザーの回答内容に応じて適応的に深掘り質問を行います。

### 主な特徴
- ✅ **無制限の質問**: 必要なスロットが埋まるまで継続（既存UIの5問制限なし）
- ✅ **動的な深掘り**: ユーザーの回答に応じて質問内容が変化
- ✅ **感情認識**: ポジティブ/ネガティブな反応を検出して適切な対応
- ✅ **17項目の情報収集**: 基本情報8項目 + 深掘り情報9項目
- ✅ **マルチプラットフォーム**: REST APIなので様々なクライアントから利用可能
- ✅ **セッション管理**: Redis/In-memoryでセッション状態を保持

### ベースURL
```
開発環境: http://localhost:3002/api
本番環境: https://api.salesdaily.com/api
```

---

## アーキテクチャ

### システム構成図
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  REST API    │────▶│  Azure      │
│  (Various)  │◀────│   Server     │◀────│  OpenAI     │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │Session Store │
                    │(Redis/Memory)│
                    └──────────────┘
```

### コンポーネント

#### 1. **REST APIサーバー** (`/server/src/routes/realtime.js`)
- Express.jsベースのAPIエンドポイント
- JWT認証
- セッション管理

#### 2. **セッションマネージャー** (`/server/src/services/sessionManager.js`)
- セッション作成・更新・削除
- 1時間の自動タイムアウト
- 17項目のスロット管理

#### 3. **AI サービス** (`/server/src/services/realtimeAI.js`)
- Azure OpenAI APIとの通信
- 動的質問生成
- 感情分析と適応的応答
- スロット抽出

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

### レスポンス
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

## エンドポイント詳細

### 1. セッション作成
新しいAIヒアリングセッションを開始します。

```http
POST /api/realtime/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "platform": "web",      // オプション: web, mobile, twilio, teams
  "metadata": {           // オプション: プラットフォーム固有のメタデータ
    "deviceId": "xxx",
    "version": "1.0.0"
  }
}
```

#### レスポンス（成功: 200 OK）
```json
{
  "sessionId": "442d1a75-4294-4c56-a2d4-43546ce27792",
  "userId": "3",
  "websocketUrl": null,
  "initialQuestion": "本日訪問されたお客様の名前を教えてください。",
  "status": "active",
  "createdAt": "2025-08-07T10:00:00.000Z"
}
```

#### cURLコマンド
```bash
curl -X POST http://localhost:3002/api/realtime/sessions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "web"
  }'
```

### 2. セッション状態取得
現在のセッション状態と収集済み情報を取得します。

```http
GET /api/realtime/sessions/{sessionId}
Authorization: Bearer {token}
```

#### レスポンス（成功: 200 OK）
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
    }
  ],
  "createdAt": "2025-08-07T10:00:00.000Z"
}
```

#### cURLコマンド
```bash
curl -X GET http://localhost:3002/api/realtime/sessions/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. 回答送信
AIの質問に対する回答を送信し、次の質問またはセッション完了を受け取ります。

```http
POST /api/realtime/sessions/{sessionId}/answers
Authorization: Bearer {token}
Content-Type: application/json

{
  "answer": "ABC建設の田中部長を訪問しました。非常に前向きな反応でした。"
}
```

#### レスポンス（継続時: 200 OK）
```json
{
  "aiResponse": "前向きな反応、素晴らしいですね！",
  "nextQuestion": "田中部長が特に興味を示された点は何でしたか？",
  "isComplete": false,
  "summary": null,
  "slots": {
    "customer": "ABC建設",
    "key_person_reaction": "非常に前向き"
  },
  "questionsCount": 1
}
```

#### レスポンス（完了時: 200 OK）
```json
{
  "aiResponse": "ありがとうございました！",
  "nextQuestion": null,
  "isComplete": true,
  "summary": "本日、ABC建設の田中部長を訪問し、新社屋建設プロジェクトについて商談。コスト削減効果に強い興味を示され、非常に前向きな反応。予算5000万円で来年3月着工予定。来週見積書を提出予定で、成約可能性80%と高い。",
  "slots": {
    "customer": "ABC建設",
    "project": "新社屋建設",
    "closing_possibility": "80%"
  },
  "questionsCount": 8
}
```

#### cURLコマンド
```bash
curl -X POST http://localhost:3002/api/realtime/sessions/SESSION_ID/answers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "ABC建設の田中部長を訪問しました。非常に前向きな反応でした。"
  }'
```

### 4. セッション終了
セッションを手動で終了し、現在までの情報でサマリーを生成します。

```http
POST /api/realtime/sessions/{sessionId}/end
Authorization: Bearer {token}
```

#### レスポンス（成功: 200 OK）
```json
{
  "status": "completed",
  "summary": "本日、ABC建設を訪問。新社屋建設の相談を実施。詳細な要件は今後詰める予定。",
  "slots": {
    "customer": "ABC建設",
    "project": "新社屋建設"
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

#### cURLコマンド
```bash
curl -X POST http://localhost:3002/api/realtime/sessions/SESSION_ID/end \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## セッションフロー

### 完全な対話フロー例

```bash
#!/bin/bash

# 1. ログイン
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yamada@example.com",
    "password": "password123"
  }' | jq -r '.token')

echo "Token: $TOKEN"

# 2. セッション開始
SESSION=$(curl -s -X POST http://localhost:3002/api/realtime/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"platform": "cli"}')

SESSION_ID=$(echo $SESSION | jq -r '.sessionId')
QUESTION=$(echo $SESSION | jq -r '.initialQuestion')

echo "Session ID: $SESSION_ID"
echo "Initial Question: $QUESTION"

# 3. 対話ループ
while true; do
  # ユーザーからの入力を取得
  read -p "Your answer: " USER_ANSWER
  
  # 回答を送信
  RESPONSE=$(curl -s -X POST http://localhost:3002/api/realtime/sessions/$SESSION_ID/answers \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"answer\": \"$USER_ANSWER\"}")
  
  # レスポンスを解析
  IS_COMPLETE=$(echo $RESPONSE | jq -r '.isComplete')
  AI_RESPONSE=$(echo $RESPONSE | jq -r '.aiResponse')
  NEXT_QUESTION=$(echo $RESPONSE | jq -r '.nextQuestion')
  
  echo "AI: $AI_RESPONSE"
  
  if [ "$IS_COMPLETE" = "true" ]; then
    SUMMARY=$(echo $RESPONSE | jq -r '.summary')
    echo "Summary: $SUMMARY"
    break
  else
    echo "Next Question: $NEXT_QUESTION"
  fi
done

# 4. 最終状態確認
FINAL=$(curl -s -X GET http://localhost:3002/api/realtime/sessions/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN")

echo "Final slots:"
echo $FINAL | jq '.slots'
```

---

## テスト方法

### 1. 基本テスト
```bash
# サーバー起動
npm run dev

# 別ターミナルで基本テスト実行
node test-realtime.js
```

### 2. 動的テスト（対話的）
```bash
# 手動モード
node test-realtime-dynamic.js --manual

# 自動モード（複数シナリオ）
node test-realtime-dynamic.js
```

### 3. 詳細テスト（3つのシナリオ）
```bash
node test-realtime-detailed.js
```

### テストシナリオ

#### ポジティブな商談シナリオ
- 前向きな反応を示す回答
- AIが成功要因を深掘り
- 高い成約可能性

#### 課題がある商談シナリオ
- 懸念や課題を含む回答
- AIが解決策や詳細を確認
- 低い成約可能性

#### 中立的な商談シナリオ
- 可もなく不可もない回答
- AIが基本情報を収集
- 継続的なフォローが必要

---

## 実装の詳細

### スロット管理（17項目）

#### 必須スロット（8項目）
| スロット名 | 説明 | 例 |
|-----------|------|-----|
| customer | 顧客名・会社名 | "ABC建設" |
| project | 案件名・プロジェクト名 | "新社屋建設" |
| next_action | 次のアクション | "見積書提出" |
| budget | 予算 | "5000万円" |
| schedule | スケジュール・納期 | "来年3月着工" |
| participants | 参加者 | "田中部長、山田課長" |
| location | 場所・訪問先 | "ABC建設本社" |
| issues | 課題・リスク | "予算調整が必要" |

#### 深掘りスロット（9項目）
| スロット名 | 説明 | 例 |
|-----------|------|-----|
| key_person_reaction | キーマンの反応・温度感 | "非常に前向き" |
| positive_points | 先方が興味を持った点 | "コスト削減効果" |
| atmosphere_change | 雰囲気が変わった瞬間 | "技術説明時に身を乗り出した" |
| competitor_info | 競合情報 | "A社も検討中" |
| enthusiasm_level | 先方の熱意度 | "高/中/低" |
| budget_reaction | 予算への反応 | "余裕あり" |
| concerns_mood | 懸念事項の雰囲気 | "慎重な様子" |
| next_step_mood | 次ステップへの温度感 | "積極的" |
| closing_possibility | 成約可能性 | "80%" |

### 動的質問生成アルゴリズム

#### 感情分析パターン
```javascript
// ポジティブシグナル
/前向き|好感触|興味|良い|進展|決まり|合意|了承/

// ネガティブシグナル
/難しい|厳しい|課題|問題|懸念|不安|渋い|保留/

// 具体的情報
/\d+[万円億]|来週|今月|来月|部長|課長|社長/
```

#### 質問戦略

1. **序盤（1-3回目）**: 基本情報の収集
   - 顧客名、案件内容、次のアクション

2. **中盤（4-8回目）**: 動的な深掘り
   - ポジティブ → 成功要因を深掘り
   - ネガティブ → 課題と対策を確認
   - 具体的情報 → 関連詳細を確認

3. **終盤（9回目以降）**: まとめと確認
   - 成約可能性の確認
   - 重要なネクストステップ
   - フォローすべき事項

### セッション管理

```javascript
// セッションデータ構造
{
  sessionId: 'UUID',
  userId: 'user_id',
  status: 'active|completed',
  slots: {
    // 17項目のスロット
  },
  questionsAnswers: [
    {
      question: '質問内容',
      answer: '回答内容',
      timestamp: 'ISO8601'
    }
  ],
  createdAt: 'ISO8601',
  updatedAt: 'ISO8601'
}
```

### エラーハンドリング

| HTTPステータス | エラー内容 | 対処法 |
|--------------|-----------|--------|
| 400 | Bad Request | リクエストパラメータを確認 |
| 401 | Unauthorized | トークンの有効性を確認 |
| 404 | Session not found | セッションIDを確認 |
| 500 | Internal Server Error | サーバーログを確認 |

---

## トラブルシューティング

### よくある問題と解決方法

#### Q: セッションが見つからない
**A:** セッションは1時間で自動削除されます。新しいセッションを作成してください。

#### Q: 質問が繰り返される
**A:** 回答が具体的でない場合、AIが詳細を求めることがあります。より具体的な情報を提供してください。

#### Q: JSON parseエラーが発生する
**A:** AIレスポンスにmarkdownコードブロックが含まれる場合があります。最新版では自動的に除去されます。

#### Q: 深掘り質問がされない
**A:** 17項目のスロットが実装されているか確認してください。また、動的質問生成が有効になっているか確認してください。

### デバッグ方法

1. **ログ確認**
```bash
tail -f server.log
```

2. **セッション状態確認**
```bash
curl -X GET http://localhost:3002/api/realtime/sessions/SESSION_ID \
  -H "Authorization: Bearer TOKEN" | jq '.'
```

3. **Azure OpenAI接続確認**
```bash
# 環境変数確認
echo $AZURE_OPENAI_ENDPOINT
echo $AZURE_OPENAI_API_KEY
echo $AZURE_OPENAI_DEPLOYMENT_NAME
```

### パフォーマンス最適化

1. **セッションクリーンアップ**
   - 1時間ごとに期限切れセッションを削除
   - Redis使用時はTTL設定を活用

2. **AI応答キャッシュ**
   - 類似質問の応答をキャッシュ
   - 頻出パターンをテンプレート化

3. **バッチ処理**
   - 複数セッションの同時処理
   - Azure OpenAI APIの並列呼び出し

---

## 統合例

### Twilio音声通話統合
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

### Microsoft Teams Bot統合
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

### モバイルアプリ統合（React Native）
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
      showSummary(data.summary);
    } else {
      setCurrentQuestion(data.nextQuestion);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| 1.0.0 | 2025-01-07 | 初版リリース |
| 1.1.0 | 2025-01-07 | 動的深掘り機能追加（9項目の深掘りスロット） |
| 1.2.0 | 2025-01-07 | 感情分析と適応的質問生成 |
| 1.3.0 | 2025-01-07 | JSON parseエラー修正、会話履歴活用改善 |

---

## サポート

### 問い合わせ先
- GitHub Issues: https://github.com/salesdaily/api/issues
- Email: support@salesdaily.com

### 参考資料
- [Azure OpenAI Documentation](https://docs.microsoft.com/azure/cognitive-services/openai/)
- [Express.js Documentation](https://expressjs.com/)
- [JWT Authentication Guide](https://jwt.io/introduction/)