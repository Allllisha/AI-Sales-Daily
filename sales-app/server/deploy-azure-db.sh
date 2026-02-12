#!/bin/bash

# ===================================
# Azure PostgreSQL マイグレーション＆シード実行スクリプト
# ===================================

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Azure PostgreSQL接続情報
POSTGRES_SERVER="salesdaily-db"
RESOURCE_GROUP="salesdaily"
DB_NAME="sales_daily"
DB_USER="salesadmin"
DB_PASSWORD="SalesDaily2024!"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Azure PostgreSQL セットアップ${NC}"
echo -e "${BLUE}======================================${NC}"

# PostgreSQLサーバーのFQDN取得
echo -e "\n${YELLOW}PostgreSQLサーバー情報を取得中...${NC}"
POSTGRES_HOST=$(az postgres flexible-server show \
  --name $POSTGRES_SERVER \
  --resource-group $RESOURCE_GROUP \
  --query fullyQualifiedDomainName -o tsv)

if [ -z "$POSTGRES_HOST" ]; then
  echo -e "${RED}PostgreSQLサーバーが見つかりません${NC}"
  exit 1
fi

echo -e "${GREEN}PostgreSQLサーバー: $POSTGRES_HOST${NC}"

# DATABASE_URL設定
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${POSTGRES_HOST}:5432/${DB_NAME}?sslmode=require"

# Node.js環境変数設定
export NODE_ENV="production"

echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}マイグレーション実行${NC}"
echo -e "${BLUE}======================================${NC}"

# マイグレーションファイルリスト（実行順序）
MIGRATIONS=(
  "001_unified_data_model.sql"
  "003_unify_date_columns.sql"
  "004_extend_text_columns.sql"
  "005_create_user_crm_tokens.sql"
  "006_allow_multiple_daily_reports.sql"
  "007_add_crm_ids_to_slots.sql"
  "008_add_crm_integration.sql"
  "009_add_crm_data_column.sql"
  "010_create_meeting_sessions.sql"
  "012_update_crm_mappings_multiple.sql"
)

# 各マイグレーションを順次実行
for migration in "${MIGRATIONS[@]}"; do
  echo -e "\n${YELLOW}実行中: $migration${NC}"
  
  # Node.jsスクリプトでマイグレーション実行
  node /Users/anemoto/sales_daily/server/src/db/runMigration.js "$migration"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $migration 完了${NC}"
  else
    echo -e "${RED}✗ $migration 失敗${NC}"
    echo -e "${YELLOW}エラーが発生しました。続行しますか？ (y/n)${NC}"
    read -r response
    if [[ "$response" != "y" ]]; then
      exit 1
    fi
  fi
done

echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}シードデータ投入${NC}"
echo -e "${BLUE}======================================${NC}"

echo -e "\n${YELLOW}シードデータを投入しますか？ (y/n)${NC}"
read -r response

if [[ "$response" == "y" ]]; then
  echo -e "${YELLOW}デモデータを作成中...${NC}"
  
  # シードデータ実行
  cd /Users/anemoto/sales_daily/server
  node src/db/seed.js
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ シードデータ投入完了${NC}"
  else
    echo -e "${RED}✗ シードデータ投入失敗${NC}"
  fi
fi

echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}データベース状態確認${NC}"
echo -e "${BLUE}======================================${NC}"

# psqlでテーブル一覧確認
echo -e "\n${YELLOW}テーブル一覧:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $POSTGRES_HOST -U $DB_USER -d $DB_NAME -c "\dt" 2>/dev/null || echo "テーブル一覧取得失敗"

# ユーザー数確認
echo -e "\n${YELLOW}登録ユーザー数:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $POSTGRES_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as user_count FROM users;" 2>/dev/null || echo "ユーザー数取得失敗"

# レポート数確認
echo -e "\n${YELLOW}レポート数:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $POSTGRES_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as report_count FROM reports;" 2>/dev/null || echo "レポート数取得失敗"

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}🎉 データベースセットアップ完了！${NC}"
echo -e "${GREEN}======================================${NC}"

echo -e "\n${BLUE}接続情報:${NC}"
echo -e "  Host: ${GREEN}$POSTGRES_HOST${NC}"
echo -e "  Database: ${GREEN}$DB_NAME${NC}"
echo -e "  User: ${GREEN}$DB_USER${NC}"
echo -e "  SSL: ${GREEN}Required${NC}"

echo -e "\n${BLUE}デモアカウント:${NC}"
echo -e "  マネージャー: manager@example.com / password123"
echo -e "  営業担当者1: tanaka@example.com / password123"
echo -e "  営業担当者2: suzuki@example.com / password123"

echo -e "\n${YELLOW}次のステップ:${NC}"
echo -e "  1. Web Appの環境変数にDATABASE_URLを設定"
echo -e "  2. アプリケーションからの接続テスト"
echo -e "  3. 本番データの移行（必要に応じて）"