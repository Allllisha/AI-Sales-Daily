# 建築営業向け AI日報システム

営業担当者が移動中でも3分で日報作成できるAI支援システムです。

## 機能

- 🎤 音声入力対応（iPhone最適化）
- 🤖 AIヒアリングによる簡単入力
- 📊 営業・マネージャー向け分析機能
- 📱 PWA対応でオフラインでも使用可能

## セットアップ

### 必要な環境

- Node.js 18以上
- PostgreSQL 14以上

### インストール手順

1. 依存関係のインストール
```bash
npm run install:all
```

2. PostgreSQLデータベースの作成
```bash
createdb sales_daily
```

3. 環境変数の設定
```bash
# server/.envファイルを作成
cp server/.env.example server/.env
# 必要な値を設定してください
```

4. データベースのマイグレーション
```bash
cd server
npm run db:migrate
```

5. 初期データの投入（オプション）
```bash
cd server
npm run db:seed
```

### 開発サーバーの起動

```bash
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3001

## テストユーザー

初期データを投入した場合、以下のユーザーが利用可能です：

- マネージャー: manager@example.com / manager123
- 営業担当者: tanaka@example.com / sales123
- 営業担当者: suzuki@example.com / sales123

## 技術スタック

- フロントエンド: React + Vite + PWA
- バックエンド: Node.js + Express
- データベース: PostgreSQL
- 認証: JWT
- AI: Azure OpenAI（将来実装）