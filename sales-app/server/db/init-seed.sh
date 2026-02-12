#!/bin/bash
# Azure Database for PostgreSQL にシードデータを投入するスクリプト

echo "Starting database initialization..."

# 環境変数から接続情報を取得
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-sales_daily}
DB_USER=${DB_USER:-salesuser}
DB_PASSWORD=${DB_PASSWORD:-salespass}

# PostgreSQLに接続してスキーマを適用
echo "Applying database schema..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < /app/db/schema.sql

# マイグレーションを適用
echo "Applying migrations..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < /app/migrations/003_convert_arrays_to_text.sql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < /app/migrations/004_add_industry_field.sql

# シードデータを投入
echo "Inserting seed data..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < /app/db/seed.sql

echo "Database initialization completed!"