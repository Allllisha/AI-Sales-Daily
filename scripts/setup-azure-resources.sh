#!/bin/bash
# Azure リソースのセットアップスクリプト（最小コスト版）

set -e

# 設定
RESOURCE_GROUP="salesdaily"
LOCATION="japaneast"
ACR_NAME="salesdailyacr"  # 小文字英数字のみ
DB_SERVER_NAME="salesdaily-db"
DB_NAME="sales_daily"
DB_ADMIN_USER="salesadmin"
APP_PLAN_NAME="salesdaily-plan"
API_APP_NAME="salesdaily-api"
FRONTEND_APP_NAME="salesdaily-web"

echo "🚀 Starting Azure resource setup..."

# リソースグループの作成
echo "📁 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Azure Container Registry の作成（最小コスト: Basic SKU）
echo "🐳 Creating Azure Container Registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --location $LOCATION

az acr update --name $ACR_NAME --admin-enabled true

# PostgreSQL Flexible Server の作成
echo "🗄️ Creating PostgreSQL server..."
read -p "Enter a secure password for PostgreSQL admin: " -s DB_PASSWORD
echo

az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --version 14 \
  --storage-size 32 \
  --yes

# データベースの作成
echo "📊 Creating database..."
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME

# ファイアウォール規則の追加
echo "🔥 Setting up firewall rules..."
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name AllowAzureServices \
  --server-name $DB_SERVER_NAME \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# App Service プランの作成（B1プラン）
echo "📱 Creating App Service plan..."
az appservice plan create \
  --name $APP_PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux

# Web App の作成
echo "🌐 Creating Web App for API..."
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_PLAN_NAME \
  --name $API_APP_NAME \
  --deployment-container-image-name $ACR_NAME.azurecr.io/sales-daily-api:latest

# Static Web App の作成
echo "📄 Creating Static Web App for frontend..."
az staticwebapp create \
  --name $FRONTEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location eastasia

# ACR認証情報の取得
echo "🔑 Getting ACR credentials..."
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

# Web AppとACRの接続
echo "🔗 Connecting Web App to ACR..."
az webapp config container set \
  --name $API_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --container-image-name $ACR_NAME.azurecr.io/sales-daily-api:latest \
  --container-registry-url https://$ACR_NAME.azurecr.io \
  --container-registry-user $ACR_USERNAME \
  --container-registry-password $ACR_PASSWORD

echo "✅ Azure resources created successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Update .env.azure with the following values:"
echo "   - DB Host: $DB_SERVER_NAME.postgres.database.azure.com"
echo "   - DB Password: (the password you entered)"
echo "   - ACR Name: $ACR_NAME"
echo "2. Set up environment variables in App Service"
echo "3. Initialize the database with schema and seed data"
echo "4. Build and push Docker images to ACR"
echo "5. Deploy frontend to Static Web App"