#!/bin/bash
# Azure Container Registry へのビルドとプッシュを行うスクリプト

set -e

# 環境変数の確認
if [ -z "$ACR_NAME" ]; then
    echo "Error: ACR_NAME environment variable is not set"
    echo "Usage: ACR_NAME=salesdailyacr ./scripts/build-and-push-acr.sh"
    exit 1
fi

# タグの設定（引数があればそれを使用、なければlatest）
TAG=${1:-latest}

# ACRのURL
ACR_URL="$ACR_NAME.azurecr.io"

echo "🔧 Building Docker images..."

# APIイメージのビルド
echo "📦 Building API image..."
cd server
docker build -f Dockerfile.prod -t $ACR_URL/sales-daily-api:$TAG .
docker tag $ACR_URL/sales-daily-api:$TAG $ACR_URL/sales-daily-api:latest
cd ..

echo "🔑 Logging in to ACR..."
az acr login --name $ACR_NAME

echo "🚀 Pushing images to ACR..."
docker push $ACR_URL/sales-daily-api:$TAG
docker push $ACR_URL/sales-daily-api:latest

echo "✅ Build and push completed!"
echo "Images pushed:"
echo "  - $ACR_URL/sales-daily-api:$TAG"
echo "  - $ACR_URL/sales-daily-api:latest"