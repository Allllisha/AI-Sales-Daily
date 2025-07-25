# Sales Daily - Azure デプロイ手順

## 前提条件

- Azure アカウント
- Azure CLI インストール済み
- Node.js 18以上
- Docker（ローカルテスト用）

## 1. Azureリソースの作成

### 1.1 リソースグループの作成
```bash
az group create --name salesdaily --location japaneast
```

### 1.2 Azure Database for PostgreSQL の作成
```bash
# PostgreSQL サーバーの作成
az postgres flexible-server create \
  --resource-group salesdaily \
  --name salesdaily-db \
  --location japaneast \
  --admin-user salesadmin \
  --admin-password <your-secure-password> \
  --sku-name Standard_B2s \
  --version 14 \
  --storage-size 32

# データベースの作成
az postgres flexible-server db create \
  --resource-group salesdaily \
  --server-name salesdaily-db \
  --database-name sales_daily

# ファイアウォール規則の追加（Azureサービスからのアクセスを許可）
az postgres flexible-server firewall-rule create \
  --resource-group salesdaily \
  --name AllowAzureServices \
  --server-name salesdaily-db \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 1.3 Azure Container Registry の作成
```bash
# ACRの作成
az acr create \
  --resource-group salesdaily \
  --name salesdailyacr \
  --sku Basic \
  --location japaneast

# 管理者ユーザーを有効化
az acr update \
  --name salesdailyacr \
  --admin-enabled true

# ログイン情報の取得
az acr credential show \
  --name salesdailyacr \
  --query "{username:username, password:passwords[0].value}"
```

### 1.4 Azure App Service の作成（API用）
```bash
# App Service プランの作成
az appservice plan create \
  --name salesdaily-plan \
  --resource-group salesdaily \
  --location japaneast \
  --sku B1 \
  --is-linux

# Web App の作成（コンテナ用）
az webapp create \
  --resource-group salesdaily \
  --plan salesdaily-plan \
  --name salesdaily-api \
  --deployment-container-image-name salesdailyacr.azurecr.io/salesdaily-api:latest
```

### 1.5 Azure Static Web Apps の作成（フロントエンド用）
```bash
az staticwebapp create \
  --name salesdaily-web \
  --resource-group salesdaily \
  --location eastasia \
  --sku Free
```

## 2. 環境変数の設定

### 2.1 API (App Service) の環境変数設定
```bash
# .env.azure ファイルを作成し、適切な値を設定
cp .env.azure.example .env.azure
# エディタで .env.azure を編集

# App Service に環境変数を設定
az webapp config appsettings set \
  --resource-group salesdaily \
  --name salesdaily-api \
  --settings @env-settings.json
```

### 2.2 env-settings.json の例
```json
[
  {
    "name": "DATABASE_URL",
    "value": "postgresql://salesadmin:password@salesdaily-db.postgres.database.azure.com:5432/sales_daily?sslmode=require"
  },
  {
    "name": "AZURE_OPENAI_API_KEY",
    "value": "your-api-key"
  },
  {
    "name": "AZURE_OPENAI_ENDPOINT",
    "value": "https://your-resource.openai.azure.com/"
  },
  {
    "name": "JWT_SECRET",
    "value": "your-secure-secret"
  },
  {
    "name": "NODE_ENV",
    "value": "production"
  }
]
```

## 3. データベースの初期化

### 3.1 スキーマとシードデータの適用
```bash
# ローカルから接続して初期化
export PGPASSWORD=<your-password>

# スキーマの適用
psql -h salesdaily-db.postgres.database.azure.com \
     -U salesadmin \
     -d sales_daily \
     -f server/db/schema.sql

# マイグレーションの適用
psql -h salesdaily-db.postgres.database.azure.com \
     -U salesadmin \
     -d sales_daily \
     -f server/migrations/003_convert_arrays_to_text.sql

psql -h salesdaily-db.postgres.database.azure.com \
     -U salesadmin \
     -d sales_daily \
     -f server/migrations/004_add_industry_field.sql

# シードデータの投入
psql -h salesdaily-db.postgres.database.azure.com \
     -U salesadmin \
     -d sales_daily \
     -f server/db/seed.sql
```

## 4. アプリケーションのデプロイ

### 4.1 Docker イメージのビルドとプッシュ
```bash
# ACRにログイン
az acr login --name salesdailyacr

# サーバーディレクトリに移動
cd server

# Docker イメージのビルド
docker build -f Dockerfile.prod -t salesdailyacr.azurecr.io/salesdaily-api:latest .

# ACRにプッシュ
docker push salesdailyacr.azurecr.io/salesdaily-api:latest

# App ServiceとACRの接続設定
az webapp config container set \
  --name salesdaily-api \
  --resource-group salesdaily \
  --container-image-name salesdailyacr.azurecr.io/salesdaily-api:latest \
  --container-registry-url https://salesdailyacr.azurecr.io

# ACRの認証情報を設定
az webapp config container set \
  --name salesdaily-api \
  --resource-group salesdaily \
  --container-registry-user <acr-username> \
  --container-registry-password <acr-password>
```

### 4.2 フロントエンドのデプロイ
```bash
# クライアントディレクトリに移動
cd client

# 環境変数の設定
echo "VITE_API_URL=https://salesdaily-api.azurewebsites.net" > .env.production

# ビルド
npm run build

# Static Web Apps へのデプロイ
# GitHubリポジトリと連携するか、Azure Static Web Apps CLIを使用
npm install -g @azure/static-web-apps-cli
swa deploy ./dist --env production
```

## 5. 動作確認

### 5.1 ヘルスチェック
```bash
# API の確認
curl https://salesdaily-api.azurewebsites.net/health

# フロントエンドの確認
# ブラウザで https://salesdaily-web.azurestaticapps.net にアクセス
```

### 5.2 ログイン確認
デフォルトのユーザー情報：
- **マネージャー**: yamada@example.com / password123
- **営業担当者**: 
  - tanaka@example.com / password123
  - suzuki@example.com / password123
  - sato@example.com / password123
  - takahashi@example.com / password123

## 6. トラブルシューティング

### データベース接続エラー
- SSL接続が必須なので、接続文字列に `?sslmode=require` を含める
- ファイアウォール規則を確認

### CORS エラー
- API側で FRONTEND_URL 環境変数が正しく設定されているか確認
- staticwebapp.config.json の rewrite ルールを確認

### 環境変数が反映されない
```bash
# App Service の再起動
az webapp restart --name salesdaily-api --resource-group salesdaily
```

## 7. 運用管理

### ログの確認
```bash
# API ログの確認
az webapp log tail --name salesdaily-api --resource-group salesdaily
```

### バックアップ
```bash
# データベースのバックアップ
az postgres flexible-server backup list \
  --resource-group salesdaily \
  --server-name salesdaily-db
```

### スケーリング
```bash
# App Service のスケールアップ
az appservice plan update \
  --name salesdaily-plan \
  --resource-group salesdaily \
  --sku B2
```

## セキュリティ推奨事項

1. **本番環境では必ずパスワードを変更**
2. **Azure Key Vault を使用して機密情報を管理**
3. **Azure AD 認証の導入を検討**
4. **WAF (Web Application Firewall) の設定**
5. **定期的なセキュリティパッチの適用**