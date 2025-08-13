# 🚀 Sales Daily 本番環境デプロイチェックリスト

## 📋 デプロイ前の準備

### 1. 環境変数の準備
- [ ] `.env.production` ファイルをコピーして設定
  ```bash
  cp .env.production .env.production.local
  # 実際の値を設定
  ```

- [ ] 必須環境変数の確認
  - `JWT_SECRET`: 強力なランダム文字列に変更
  - `AZURE_OPENAI_API_KEY`: 確認済み
  - `AZURE_OPENAI_ENDPOINT`: 確認済み
  - `AZURE_SIGNALR_CONNECTION_STRING`: 確認済み

### 2. Azureリソースの準備
- [ ] Azure CLIログイン
  ```bash
  az login
  az account set --subscription "YOUR_SUBSCRIPTION_ID"
  ```

- [ ] リソースグループ確認
  ```bash
  az group show --name salesdaily
  ```

## 🏗️ インフラストラクチャ

### 3. データベース設定
- [ ] Azure Database for PostgreSQL作成
  ```bash
  # デプロイスクリプトで自動作成、または手動で作成
  az postgres flexible-server create --name salesdaily-db ...
  ```

- [ ] データベース初期化
  ```bash
  # マイグレーション実行
  npm run migrate:prod
  ```

### 4. Redis Cache設定
- [ ] Azure Cache for Redis作成
- [ ] 接続文字列取得

## 📦 アプリケーションデプロイ

### 5. Dockerイメージ準備
- [ ] ローカルでビルドテスト
  ```bash
  docker-compose -f docker-compose.prod.yml build
  ```

### 6. 本番デプロイ実行
- [ ] デプロイスクリプト実行
  ```bash
  chmod +x deploy-production.sh
  source .env.production.local
  ./deploy-production.sh
  ```

## ✅ デプロイ後の確認

### 7. ヘルスチェック
- [ ] API Health: `https://salesdaily-web.azurewebsites.net/health`
- [ ] Ping: `https://salesdaily-web.azurewebsites.net/ping`
- [ ] Swagger: `https://salesdaily-web.azurewebsites.net/api-docs`

### 8. 機能テスト
- [ ] ログイン機能
- [ ] 日報作成（通常）
- [ ] AIヒアリング機能
- [ ] リアルタイムAPI（WebSocket）
- [ ] CRM連携（設定されている場合）

### 9. パフォーマンス確認
- [ ] レスポンスタイム測定
- [ ] エラー率確認
- [ ] ログ確認
  ```bash
  az webapp log tail --name salesdaily-web --resource-group salesdaily
  ```

## 🔒 セキュリティ

### 10. セキュリティ設定
- [ ] HTTPS Only有効化
- [ ] CORS設定確認
- [ ] 環境変数の暗号化確認
- [ ] ファイアウォールルール設定

## 📊 監視設定

### 11. Application Insights（推奨）
- [ ] Application Insights有効化
  ```bash
  az monitor app-insights component create \
    --app salesdaily-insights \
    --location japaneast \
    --resource-group salesdaily
  ```

- [ ] アラート設定
  - エラー率 > 1%
  - レスポンスタイム > 3秒
  - 可用性 < 99%

## 🔄 CI/CD設定（オプション）

### 12. GitHub Actions設定
- [ ] シークレット設定
  - `AZURE_CREDENTIALS`
  - `ACR_USERNAME`
  - `ACR_PASSWORD`

- [ ] ワークフロー作成
  ```yaml
  .github/workflows/deploy.yml
  ```

## 📝 ドキュメント

### 13. ドキュメント更新
- [ ] README.md更新
- [ ] API仕様書更新
- [ ] 運用手順書作成

## 🎯 最終確認

### 14. 本番稼働前チェック
- [ ] 全エンドポイントの動作確認
- [ ] 負荷テスト実施
- [ ] バックアップ設定
- [ ] ロールバック手順確認

## 📞 サポート連絡先

### 問題発生時
- Azure Support: [Azureポータル](https://portal.azure.com)
- 開発チーム: [内部連絡先]

## 🔧 トラブルシューティング

### よくある問題

#### 1. コンテナが起動しない
```bash
# ログ確認
az webapp log tail --name salesdaily-web --resource-group salesdaily

# 環境変数確認
az webapp config appsettings list --name salesdaily-web --resource-group salesdaily
```

#### 2. データベース接続エラー
- ファイアウォールルール確認
- 接続文字列確認
- SSL設定確認

#### 3. SignalRエラー
- 接続文字列確認
- CORS設定確認
- WebSocket有効化確認

---

## ✨ デプロイ成功！

すべてのチェックが完了したら、本番環境の準備完了です！

### アクセスURL
- **API**: https://salesdaily-web.azurewebsites.net
- **Frontend**: https://salesdaily-frontend.azurestaticapps.net
- **Docs**: https://salesdaily-web.azurewebsites.net/api-docs