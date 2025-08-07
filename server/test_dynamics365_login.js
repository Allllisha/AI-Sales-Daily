const Dynamics365Adapter = require('./src/services/crm/Dynamics365Adapter');
require('dotenv').config({ path: '../.env.docker' });

async function testDynamics365Login() {
  console.log('🔐 Dynamics 365 API Login Test');
  console.log('===============================');
  
  // 設定値を表示
  console.log('Configuration:');
  console.log(`- Client ID: ${process.env.DYNAMICS_CLIENT_ID}`);
  console.log(`- Tenant ID: ${process.env.DYNAMICS_TENANT_ID}`);
  console.log(`- Dynamics URL: ${process.env.DYNAMICS_URL}`);
  console.log(`- Client Secret: ${process.env.DYNAMICS_CLIENT_SECRET ? '[SET]' : '[NOT SET]'}`);
  console.log('');

  try {
    // Dynamics 365 アダプターを初期化
    const dynamics = new Dynamics365Adapter({
      clientId: process.env.DYNAMICS_CLIENT_ID,
      clientSecret: process.env.DYNAMICS_CLIENT_SECRET,
      tenantId: process.env.DYNAMICS_TENANT_ID,
      dynamicsUrl: process.env.DYNAMICS_URL
    });

    console.log('🔄 Testing connection...');
    const connectionTest = await dynamics.testConnection();
    
    if (connectionTest.success) {
      console.log('✅ Connection test successful!');
      console.log(`- Message: ${connectionTest.message}`);
      console.log(`- CRM Type: ${connectionTest.crmType}`);
      if (connectionTest.data && connectionTest.data.value) {
        console.log(`- Sample data: Found ${connectionTest.data.value.length} account(s)`);
      }
    } else {
      console.log('❌ Connection test failed!');
      console.log(`- Error: ${connectionTest.error}`);
      return;
    }
    
    console.log('');
    console.log('🔄 Testing basic API calls...');
    
    // Accounts の取得テスト
    console.log('- Fetching accounts...');
    const accounts = await dynamics.getAccounts(5);
    console.log(`✅ Retrieved ${accounts.length} accounts`);
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.name} (ID: ${account.id})`);
    });
    
    console.log('');
    
    // Opportunities の取得テスト
    console.log('- Fetching opportunities...');
    const opportunities = await dynamics.getOpportunities(null, 5);
    console.log(`✅ Retrieved ${opportunities.length} opportunities`);
    opportunities.forEach((opp, index) => {
      console.log(`  ${index + 1}. ${opp.name} - ${opp.customer} (${opp.stage || opp.status})`);
    });
    
    console.log('');
    
    // Activities の取得テスト
    console.log('- Fetching activities...');
    const activities = await dynamics.getActivities(null, 5);
    console.log(`✅ Retrieved ${activities.length} activities`);
    activities.forEach((activity, index) => {
      console.log(`  ${index + 1}. ${activity.subject} (${activity.status})`);
    });
    
    console.log('');
    console.log('🎉 All Dynamics 365 tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during Dynamics 365 test:', error.message);
    if (error.response?.data) {
      console.error('- API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('- Stack trace:', error.stack);
  }
}

// スクリプト実行
testDynamics365Login();