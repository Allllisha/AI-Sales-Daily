const SalesforceAdapter = require('./src/services/crm/SalesforceAdapter');
require('dotenv').config({ path: '../.env.docker' });

// 環境変数のデバッグ
console.log('DEBUG - Environment variables loaded:');
console.log('- SALESFORCE_CLIENT_ID exists:', !!process.env.SALESFORCE_CLIENT_ID);
console.log('- SALESFORCE_USERNAME:', process.env.SALESFORCE_USERNAME);

async function testSalesforceLogin() {
  console.log('🔐 Salesforce API Login Test');
  console.log('===============================');
  
  // 設定値を表示（パスワードとトークンは隠す）
  console.log('Configuration:');
  console.log(`- Login URL: ${process.env.SALESFORCE_LOGIN_URL}`);
  console.log(`- Username: ${process.env.SALESFORCE_USERNAME}`);
  console.log(`- Client ID: ${process.env.SALESFORCE_CLIENT_ID}`);
  console.log(`- API Version: ${process.env.SALESFORCE_API_VERSION}`);
  console.log('- Password: [HIDDEN]');
  console.log('- Security Token: [HIDDEN]');
  console.log('- Client Secret: [HIDDEN]');
  console.log('');

  try {
    // Salesforce アダプターを初期化
    const salesforce = new SalesforceAdapter({
      loginUrl: process.env.SALESFORCE_LOGIN_URL,
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
      username: process.env.SALESFORCE_USERNAME,
      password: process.env.SALESFORCE_PASSWORD,
      securityToken: process.env.SALESFORCE_SECURITY_TOKEN,
      apiVersion: process.env.SALESFORCE_API_VERSION
    });

    console.log('🔄 Attempting to authenticate with Salesforce...');
    
    // 認証テスト
    const authResult = await salesforce.authenticate();
    console.log('✅ Authentication successful!');
    console.log(`- Instance URL: ${authResult.instance_url}`);
    console.log(`- Token Type: ${authResult.token_type}`);
    console.log(`- Access Token: ${authResult.access_token.substring(0, 20)}...`);
    console.log('');

    console.log('🔄 Testing connection...');
    const connectionTest = await salesforce.testConnection();
    
    if (connectionTest.success) {
      console.log('✅ Connection test successful!');
      console.log(`- Message: ${connectionTest.message}`);
      console.log(`- CRM Type: ${connectionTest.crmType}`);
      if (connectionTest.data && connectionTest.data.records) {
        console.log(`- Sample data: Found ${connectionTest.data.records.length} account(s)`);
        if (connectionTest.data.records.length > 0) {
          console.log(`- First account: ${connectionTest.data.records[0].Name} (ID: ${connectionTest.data.records[0].Id})`);
        }
      }
    } else {
      console.log('❌ Connection test failed!');
      console.log(`- Error: ${connectionTest.error}`);
    }
    
    console.log('');
    console.log('🔄 Testing basic API calls...');
    
    // Accounts の取得テスト
    console.log('- Fetching accounts...');
    const accounts = await salesforce.getAccounts(5);
    console.log(`✅ Retrieved ${accounts.length} accounts`);
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.name} (ID: ${account.id})`);
    });
    
    console.log('');
    
    // Opportunities の取得テスト
    console.log('- Fetching opportunities...');
    const opportunities = await salesforce.getOpportunities(null, 5);
    console.log(`✅ Retrieved ${opportunities.length} opportunities`);
    opportunities.forEach((opp, index) => {
      console.log(`  ${index + 1}. ${opp.name} - ${opp.customer} (${opp.stage})`);
    });
    
    console.log('');
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during Salesforce login test:', error.message);
    if (error.response?.data) {
      console.error('- API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// スクリプト実行
testSalesforceLogin();