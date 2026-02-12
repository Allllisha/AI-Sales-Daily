#!/bin/bash

# Azure Container Registry と Azure Web App へのデプロイスクリプト
# リアルタイムAPI（SignalR対応）とフロントエンドの両方を含む

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 設定
ACR_NAME="salesdailyacr"
RESOURCE_GROUP="salesdaily"
WEB_APP_NAME="salesdaily-web"
LOCATION="japaneast"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Sales Daily - Azure デプロイスクリプト${NC}"
echo -e "${GREEN}======================================${NC}"

# 1. Azure CLIログイン確認
echo -e "\n${YELLOW}1. Azure CLI ログイン確認...${NC}"
az account show > /dev/null 2>&1 || {
    echo -e "${RED}Azureにログインしてください${NC}"
    az login
}

# 2. リソースグループ作成（存在しない場合）
echo -e "\n${YELLOW}2. リソースグループ確認...${NC}"
az group create --name $RESOURCE_GROUP --location $LOCATION 2>/dev/null || echo "リソースグループは既に存在します"

# 3. Azure Container Registry作成（存在しない場合）
echo -e "\n${YELLOW}3. Azure Container Registry確認...${NC}"
az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1 || {
    echo "ACRを作成中..."
    az acr create --name $ACR_NAME --resource-group $RESOURCE_GROUP --sku Basic --admin-enabled true
}

# 4. ACRログイン
echo -e "\n${YELLOW}4. ACRにログイン...${NC}"
az acr login --name $ACR_NAME

# 5. Docker イメージのビルド
echo -e "\n${YELLOW}5. Docker イメージをビルド...${NC}"

# APIサーバー（リアルタイムAPI含む）- フロントエンドも含む統合イメージ
echo -e "${GREEN}統合イメージ（API+フロントエンド）をビルド中...${NC}"
docker build --platform linux/amd64 -t salesdaily-api:latest -f ./server/Dockerfile .

# フロントエンド（スタンドアロン用）
echo -e "${GREEN}フロントエンドイメージをビルド中...${NC}"
docker build --platform linux/amd64 -t salesdaily-frontend:latest ./client

# 6. タグ付け
echo -e "\n${YELLOW}6. イメージにタグ付け...${NC}"
docker tag salesdaily-api:latest $ACR_NAME.azurecr.io/salesdaily-api:latest
docker tag salesdaily-frontend:latest $ACR_NAME.azurecr.io/salesdaily-frontend:latest

# 7. ACRにプッシュ
echo -e "\n${YELLOW}7. ACRにイメージをプッシュ...${NC}"
docker push $ACR_NAME.azurecr.io/salesdaily-api:latest
docker push $ACR_NAME.azurecr.io/salesdaily-frontend:latest

# 8. Web App作成または更新
echo -e "\n${YELLOW}8. Azure Web App設定...${NC}"

# App Service Plan作成（存在しない場合）
az appservice plan show --name salesdaily-plan --resource-group $RESOURCE_GROUP > /dev/null 2>&1 || {
    echo "App Service Planを作成中..."
    az appservice plan create --name salesdaily-plan --resource-group $RESOURCE_GROUP --sku B1 --is-linux
}

# Web App作成（存在しない場合）
az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1 || {
    echo "Web Appを作成中..."
    az webapp create --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --plan salesdaily-plan --deployment-container-image-name $ACR_NAME.azurecr.io/salesdaily-api:latest
}

# 9. ACR認証情報を取得してWeb Appに設定
echo -e "\n${YELLOW}9. ACR認証設定...${NC}"
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

az webapp config container set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $ACR_NAME.azurecr.io/salesdaily-api:latest \
    --docker-registry-server-url https://$ACR_NAME.azurecr.io \
    --docker-registry-server-user $ACR_USERNAME \
    --docker-registry-server-password $ACR_PASSWORD

# 10. 環境変数設定
echo -e "\n${YELLOW}10. 環境変数を設定...${NC}"

# Load .env.production if it exists
if [ -f .env.production ]; then
    echo -e "${GREEN}.env.productionから環境変数を読み込んでいます...${NC}"
    source .env.production
else
    echo -e "${RED}警告: .env.productionファイルが見つかりません${NC}"
    echo -e "${YELLOW}.env.production.templateを参考に作成してください${NC}"
fi

# 必須の環境変数を設定
az webapp config appsettings set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --settings WEBSITES_PORT=3001 NODE_ENV=production

# Database URL
if [ ! -z "$DATABASE_URL" ]; then
    az webapp config appsettings set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --settings DATABASE_URL="$DATABASE_URL"
fi

# JWT Secret
if [ ! -z "$JWT_SECRET" ]; then
    az webapp config appsettings set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --settings JWT_SECRET="$JWT_SECRET"
fi

# Azure OpenAI
if [ ! -z "$AZURE_OPENAI_API_KEY" ]; then
    az webapp config appsettings set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --settings \
        AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
        AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
        AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2024-12-01-preview}" \
        AZURE_OPENAI_DEPLOYMENT_NAME="${AZURE_OPENAI_DEPLOYMENT_NAME:-gpt-4o}"
fi

# Redis
if [ ! -z "$REDIS_URL" ]; then
    az webapp config appsettings set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --settings REDIS_URL="$REDIS_URL"
fi

# Azure AI Foundry (Optional)
if [ ! -z "$AZURE_AI_FOUNDRY_ENDPOINT" ]; then
    az webapp config appsettings set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --settings \
        AZURE_AI_FOUNDRY_ENDPOINT="$AZURE_AI_FOUNDRY_ENDPOINT" \
        AZURE_BING_SEARCH_AGENT_ID="$AZURE_BING_SEARCH_AGENT_ID" \
        AZURE_TENANT_ID="$AZURE_TENANT_ID" \
        AZURE_CLIENT_ID="$AZURE_CLIENT_ID" \
        AZURE_CLIENT_SECRET="$AZURE_CLIENT_SECRET"
fi

# 11. WebSocketサポート有効化（SignalR用）
echo -e "\n${YELLOW}11. WebSocketを有効化...${NC}"
az webapp config set --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --web-sockets-enabled true

# 12. CORS設定
echo -e "\n${YELLOW}12. CORS設定...${NC}"
az webapp cors add --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --allowed-origins "*"

# 13. Web App再起動
echo -e "\n${YELLOW}13. Web Appを再起動...${NC}"
az webapp restart --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP

# 14. デプロイ完了
echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}デプロイ完了！${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "\nWeb App URL: ${GREEN}https://$WEB_APP_NAME.azurewebsites.net${NC}"
echo -e "\nAPI エンドポイント:"
echo -e "  - REST API: ${GREEN}https://$WEB_APP_NAME.azurewebsites.net/api${NC}"
echo -e "  - リアルタイムAPI: ${GREEN}https://$WEB_APP_NAME.azurewebsites.net/api/realtime${NC}"
echo -e "  - WebSocket (SignalR): ${GREEN}wss://$WEB_APP_NAME.azurewebsites.net/api/realtime/ws${NC}"

echo -e "\n${YELLOW}次のステップ:${NC}"
echo -e "1. 環境変数を本番用の値に更新してください"
echo -e "2. Azure PostgreSQLまたはCosmos DBを設定してください"
echo -e "3. Azure Cache for Redisを設定してください"
echo -e "4. フロントエンドをAzure App Serviceにデプロイしてください"