#!/bin/bash

# ===================================
# Sales Daily 本番環境デプロイスクリプト
# ===================================
# 
# 使用方法:
# 1. Azure CLIにログイン: az login
# 2. 環境変数を設定: source .env.production
# 3. スクリプト実行: ./deploy-production.sh
#

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===================================
# 設定値
# ===================================
RESOURCE_GROUP="salesdaily"
LOCATION="japaneast"
ACR_NAME="salesdailyacr"
WEB_APP_NAME="salesdaily-web"
FRONTEND_APP_NAME="salesdaily-frontend"
POSTGRES_SERVER_NAME="salesdaily-db"
REDIS_NAME="salesdaily-redis"
SIGNALR_NAME="salesdaily-signalr"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Sales Daily - 本番環境デプロイ${NC}"
echo -e "${BLUE}======================================${NC}"

# ===================================
# 前提条件チェック
# ===================================
echo -e "\n${YELLOW}前提条件チェック...${NC}"

# Azure CLIログイン確認
az account show > /dev/null 2>&1 || {
    echo -e "${RED}Azure CLIにログインしてください${NC}"
    az login
}

# 必要な環境変数チェック
required_vars=(
    "AZURE_OPENAI_API_KEY"
    "AZURE_OPENAI_ENDPOINT"
    "AZURE_SIGNALR_CONNECTION_STRING"
    "JWT_SECRET"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=($var)
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${RED}以下の環境変数が設定されていません:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    echo -e "${YELLOW}.env.productionファイルを確認して、source .env.productionを実行してください${NC}"
    exit 1
fi

# ===================================
# 1. リソースグループ作成
# ===================================
echo -e "\n${YELLOW}1. リソースグループ作成...${NC}"
az group create --name $RESOURCE_GROUP --location $LOCATION 2>/dev/null || echo "リソースグループは既に存在します"

# ===================================
# 2. Azure Container Registry
# ===================================
echo -e "\n${YELLOW}2. Azure Container Registry設定...${NC}"
az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1 || {
    echo "ACRを作成中..."
    az acr create --name $ACR_NAME --resource-group $RESOURCE_GROUP --sku Basic --admin-enabled true
}

# ACRログイン
echo "ACRにログイン中..."
az acr login --name $ACR_NAME

# ===================================
# 3. PostgreSQL Database（必要な場合）
# ===================================
echo -e "\n${YELLOW}3. Azure Database for PostgreSQL確認...${NC}"
az postgres flexible-server show --name $POSTGRES_SERVER_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1 || {
    echo -e "${YELLOW}PostgreSQLサーバーが見つかりません。作成しますか？ (y/n)${NC}"
    read -r response
    if [[ "$response" == "y" ]]; then
        echo "PostgreSQLサーバーを作成中..."
        az postgres flexible-server create \
            --name $POSTGRES_SERVER_NAME \
            --resource-group $RESOURCE_GROUP \
            --location $LOCATION \
            --admin-user salesadmin \
            --admin-password "SalesDaily2024!" \
            --sku-name Standard_B1ms \
            --version 14 \
            --storage-size 32 \
            --public-access 0.0.0.0
        
        # データベース作成
        az postgres flexible-server db create \
            --server-name $POSTGRES_SERVER_NAME \
            --resource-group $RESOURCE_GROUP \
            --database-name sales_daily
    fi
}

# ===================================
# 4. Azure Cache for Redis（必要な場合）
# ===================================
echo -e "\n${YELLOW}4. Azure Cache for Redis確認...${NC}"
az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1 || {
    echo -e "${YELLOW}Redisキャッシュが見つかりません。作成しますか？ (y/n)${NC}"
    read -r response
    if [[ "$response" == "y" ]]; then
        echo "Redisキャッシュを作成中..."
        az redis create \
            --name $REDIS_NAME \
            --resource-group $RESOURCE_GROUP \
            --location $LOCATION \
            --sku Basic \
            --vm-size c0
    fi
}

# ===================================
# 5. Docker イメージビルド
# ===================================
echo -e "\n${YELLOW}5. Dockerイメージをビルド...${NC}"

# サーバーイメージ
echo -e "${GREEN}APIサーバーイメージをビルド中...${NC}"
docker build -t salesdaily-api:latest ./server

# クライアントイメージ
echo -e "${GREEN}フロントエンドイメージをビルド中...${NC}"
docker build \
    --build-arg VITE_API_URL=https://${WEB_APP_NAME}.azurewebsites.net/api \
    --build-arg VITE_WS_URL=wss://${WEB_APP_NAME}.azurewebsites.net/api/realtime/ws \
    -t salesdaily-frontend:latest ./client

# ===================================
# 6. ACRにプッシュ
# ===================================
echo -e "\n${YELLOW}6. ACRにイメージをプッシュ...${NC}"

# タグ付け
docker tag salesdaily-api:latest $ACR_NAME.azurecr.io/salesdaily-api:latest
docker tag salesdaily-frontend:latest $ACR_NAME.azurecr.io/salesdaily-frontend:latest

# プッシュ
docker push $ACR_NAME.azurecr.io/salesdaily-api:latest
docker push $ACR_NAME.azurecr.io/salesdaily-frontend:latest

# ===================================
# 7. App Service Plan作成
# ===================================
echo -e "\n${YELLOW}7. App Service Plan設定...${NC}"
az appservice plan show --name salesdaily-plan --resource-group $RESOURCE_GROUP > /dev/null 2>&1 || {
    echo "App Service Planを作成中..."
    az appservice plan create \
        --name salesdaily-plan \
        --resource-group $RESOURCE_GROUP \
        --sku B2 \
        --is-linux
}

# ===================================
# 8. Web App作成・更新
# ===================================
echo -e "\n${YELLOW}8. Web App設定...${NC}"

# Web App作成
az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1 || {
    echo "Web Appを作成中..."
    az webapp create \
        --name $WEB_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --plan salesdaily-plan \
        --deployment-container-image-name $ACR_NAME.azurecr.io/salesdaily-api:latest
}

# ACR認証設定
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

az webapp config container set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $ACR_NAME.azurecr.io/salesdaily-api:latest \
    --docker-registry-server-url https://$ACR_NAME.azurecr.io \
    --docker-registry-server-user $ACR_USERNAME \
    --docker-registry-server-password $ACR_PASSWORD

# ===================================
# 9. 環境変数設定
# ===================================
echo -e "\n${YELLOW}9. 環境変数を設定...${NC}"

# PostgreSQL接続文字列を取得（存在する場合）
if az postgres flexible-server show --name $POSTGRES_SERVER_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
    POSTGRES_HOST=$(az postgres flexible-server show --name $POSTGRES_SERVER_NAME --resource-group $RESOURCE_GROUP --query fullyQualifiedDomainName -o tsv)
    DATABASE_URL="postgresql://salesadmin:SalesDaily2024!@${POSTGRES_HOST}:5432/sales_daily?sslmode=require"
else
    DATABASE_URL="${DATABASE_URL:-your_database_url_here}"
fi

# Redis接続文字列を取得（存在する場合）
if az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
    REDIS_KEY=$(az redis list-keys --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query primaryKey -o tsv)
    REDIS_HOST=$(az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query hostName -o tsv)
    REDIS_URL="redis://:${REDIS_KEY}@${REDIS_HOST}:6380?ssl=true"
else
    REDIS_URL="${REDIS_URL:-your_redis_url_here}"
fi

# 環境変数設定
az webapp config appsettings set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --settings \
    NODE_ENV=production \
    PORT=3002 \
    JWT_SECRET="${JWT_SECRET}" \
    DATABASE_URL="${DATABASE_URL}" \
    REDIS_URL="${REDIS_URL}" \
    AZURE_OPENAI_API_KEY="${AZURE_OPENAI_API_KEY}" \
    AZURE_OPENAI_ENDPOINT="${AZURE_OPENAI_ENDPOINT}" \
    AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2024-12-01-preview}" \
    AZURE_OPENAI_DEPLOYMENT_NAME="${AZURE_OPENAI_DEPLOYMENT_NAME:-gpt-4o}" \
    AZURE_SIGNALR_CONNECTION_STRING="${AZURE_SIGNALR_CONNECTION_STRING}" \
    CORS_ORIGINS="https://${FRONTEND_APP_NAME}.azurewebsites.net,https://${WEB_APP_NAME}.azurewebsites.net" \
    WEBSITES_PORT=3002

# ===================================
# 10. WebSocket有効化
# ===================================
echo -e "\n${YELLOW}10. WebSocketを有効化...${NC}"
az webapp config set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --web-sockets-enabled true

# ===================================
# 11. HTTPS Only設定
# ===================================
echo -e "\n${YELLOW}11. HTTPSのみを有効化...${NC}"
az webapp update --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --https-only true

# ===================================
# 12. ログ設定
# ===================================
echo -e "\n${YELLOW}12. ログを設定...${NC}"
az webapp log config --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP \
    --docker-container-logging filesystem \
    --level verbose \
    --detailed-error-messages true \
    --failed-request-tracing true

# ===================================
# 13. フロントエンドWeb App設定
# ===================================
echo -e "\n${YELLOW}13. フロントエンドWeb App設定...${NC}"
az webapp show --name $FRONTEND_APP_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1 || {
    echo -e "${YELLOW}フロントエンドWeb Appを作成しますか？ (y/n)${NC}"
    read -r response
    if [[ "$response" == "y" ]]; then
        echo "フロントエンドWeb Appを作成中..."
        az webapp create \
            --name $FRONTEND_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --plan salesdaily-plan \
            --deployment-container-image-name $ACR_NAME.azurecr.io/salesdaily-frontend:latest
        
        # ACR認証設定
        az webapp config container set \
            --name $FRONTEND_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --docker-custom-image-name $ACR_NAME.azurecr.io/salesdaily-frontend:latest \
            --docker-registry-server-url https://$ACR_NAME.azurecr.io \
            --docker-registry-server-user $ACR_USERNAME \
            --docker-registry-server-password $ACR_PASSWORD
    fi
}

# ===================================
# 14. Web App再起動
# ===================================
echo -e "\n${YELLOW}14. Web Appを再起動...${NC}"
az webapp restart --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP

# ===================================
# 完了
# ===================================
echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}🎉 デプロイ完了！${NC}"
echo -e "${GREEN}======================================${NC}"

echo -e "\n${BLUE}📍 エンドポイント:${NC}"
echo -e "  API Server: ${GREEN}https://${WEB_APP_NAME}.azurewebsites.net${NC}"
echo -e "  Health Check: ${GREEN}https://${WEB_APP_NAME}.azurewebsites.net/health${NC}"
echo -e "  Swagger Docs: ${GREEN}https://${WEB_APP_NAME}.azurewebsites.net/api-docs${NC}"
echo -e "  REST API: ${GREEN}https://${WEB_APP_NAME}.azurewebsites.net/api${NC}"
echo -e "  Realtime API: ${GREEN}https://${WEB_APP_NAME}.azurewebsites.net/api/realtime${NC}"

if az webapp show --name $FRONTEND_APP_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
    echo -e "  Frontend: ${GREEN}https://${FRONTEND_APP_NAME}.azurewebsites.net${NC}"
fi

echo -e "\n${BLUE}📊 リソース状況:${NC}"
echo -e "  Resource Group: $RESOURCE_GROUP"
echo -e "  ACR: $ACR_NAME"
echo -e "  Web App: $WEB_APP_NAME"
echo -e "  App Service Plan: salesdaily-plan"

echo -e "\n${YELLOW}🔍 ログ確認コマンド:${NC}"
echo -e "  az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP"

echo -e "\n${YELLOW}📝 次のステップ:${NC}"
echo -e "  1. https://${WEB_APP_NAME}.azurewebsites.net/health でヘルスチェック"
echo -e "  2. フロントエンドからAPIへの接続確認"
echo -e "  3. カスタムドメインの設定（必要に応じて）"
echo -e "  4. Application Insightsの設定（監視強化）"