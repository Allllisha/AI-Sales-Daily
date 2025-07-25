# Sales Daily Azure デプロイメント完了

## デプロイされたリソース

### リソースグループ
- **名前**: salesdaily
- **リージョン**: japaneast

### 作成されたリソース

1. **Azure Container Registry**
   - 名前: salesdailyacr
   - SKU: Basic
   
2. **Azure Database for PostgreSQL Flexible Server**
   - 名前: salesdaily-db
   - SKU: Standard_B1ms
   - データベース: salesdb
   
3. **Azure App Service Plan**
   - 名前: salesdaily-plan
   - SKU: B1 (Basic)
   
4. **Azure App Service (API)**
   - 名前: salesdaily-api
   - URL: https://salesdaily-api.azurewebsites.net
   - コンテナイメージ: salesdailyacr.azurecr.io/salesdaily-api:latest
   
5. **Azure Static Web Apps (フロントエンド)**
   - 名前: salesdaily-web
   - URL: https://thankful-sea-049e1e300.1.azurestaticapps.net

## アクセス情報

### アプリケーションURL
- **Static Web App**: https://thankful-sea-049e1e300.1.azurestaticapps.net
- **App Service**: https://salesdaily-web.azurewebsites.net

### デフォルトユーザー
- **マネージャー**: 
  - Email: yamada@example.com
  - Password: password123
  
- **営業担当者**:
  - tanaka@example.com / password123
  - suzuki@example.com / password123
  - sato@example.com / password123
  - takahashi@example.com / password123

## 重要な注意事項

⚠️ **セキュリティ**: 本番環境では必ずパスワードを変更してください。

## デプロイ確認

1. APIヘルスチェック:
   ```bash
   curl https://salesdaily-api.azurewebsites.net/health
   ```

2. フロントエンドアクセス:
   https://thankful-sea-049e1e300.1.azurestaticapps.net

## 今後の設定推奨事項

1. カスタムドメインの設定
2. SSL証明書の設定（Static Web Appは自動的に提供）
3. バックアップの設定
4. 監視とアラートの設定
5. スケーリング設定の最適化