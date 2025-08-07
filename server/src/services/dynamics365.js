const { ConfidentialClientApplication } = require('@azure/msal-node');
const axios = require('axios');

class Dynamics365Service {
  constructor() {
    this.clientApp = null;
    this.config = {
      auth: {
        clientId: process.env.DYNAMICS_CLIENT_ID,
        clientSecret: process.env.DYNAMICS_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.DYNAMICS_TENANT_ID}`
      }
    };
    this.dynamicsUrl = process.env.DYNAMICS_URL; // https://yourorg.crm.dynamics.com
  }

  async initialize() {
    this.clientApp = new ConfidentialClientApplication(this.config);
  }

  async getAccessToken() {
    if (!this.clientApp) {
      await this.initialize();
    }

    const clientCredentialRequest = {
      scopes: [`${this.dynamicsUrl}/.default`],
    };

    try {
      const response = await this.clientApp.acquireTokenSilent(clientCredentialRequest);
      return response.accessToken;
    } catch (error) {
      console.log('Silent token acquisition failed, acquiring token using client credentials');
      const response = await this.clientApp.acquireTokenByClientCredential(clientCredentialRequest);
      return response.accessToken;
    }
  }

  async makeApiCall(endpoint, method = 'GET', data = null) {
    try {
      const accessToken = await this.getAccessToken();
      
      const config = {
        method,
        url: `${this.dynamicsUrl}/api/data/v9.2/${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json; charset=utf-8'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Dynamics 365 API call failed:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  }

  // 取引先企業を取得
  async getAccounts(limit = 50) {
    const query = `accounts?$select=accountid,name,primarycontactid,telephone1,emailaddress1&$top=${limit}&$orderby=name asc`;
    return await this.makeApiCall(query);
  }

  // 指定されたIDの取引先企業を取得
  async getAccountsByIds(accountIds) {
    if (!accountIds || accountIds.length === 0) {
      return { value: [] };
    }
    
    // IDの配列を使ってフィルタークエリを作成
    const filterConditions = accountIds.map(id => `accountid eq ${id}`).join(' or ');
    const query = `accounts?$select=accountid,name&$filter=${filterConditions}`;
    return await this.makeApiCall(query);
  }

  // 商談を取得
  async getOpportunities(accountId = null, limit = 50) {
    // シンプルなクエリから開始し、expand機能は後で追加
    let query = `opportunities?$select=opportunityid,name,_customerid_value,estimatedvalue,actualclosedate,stepname,statecode&$top=${limit}&$orderby=modifiedon desc`;
    
    if (accountId) {
      query += `&$filter=_customerid_value eq ${accountId}`;
    }
    
    return await this.makeApiCall(query);
  }

  // 活動一覧を取得
  async getActivities(regardingObjectId = null, limit = 50) {
    let query = `tasks?$select=activityid,subject,description,createdon,statecode,prioritycode,_regardingobjectid_value&$top=${limit}&$orderby=createdon desc`;
    
    if (regardingObjectId) {
      query += `&$filter=_regardingobjectid_value eq ${regardingObjectId}`;
    }
    
    return await this.makeApiCall(query);
  }

  // メモ・議事録を取得
  async getNotes(regardingObjectId = null, limit = 50) {
    let query = `annotations?$select=annotationid,subject,notetext,createdon,modifiedon,_objectid_value,filename,mimetype&$top=${limit}&$orderby=createdon desc`;
    
    if (regardingObjectId) {
      query += `&$filter=_objectid_value eq ${regardingObjectId}`;
    }
    
    return await this.makeApiCall(query);
  }

  // 会議情報を取得
  async getMeetings(regardingObjectId = null, limit = 50) {
    let query = `appointments?$select=activityid,subject,description,scheduledstart,scheduledend,actualstart,actualend,location,statecode,_regardingobjectid_value&$top=${limit}&$orderby=scheduledstart desc`;
    
    if (regardingObjectId) {
      query += `&$filter=_regardingobjectid_value eq ${regardingObjectId}`;
    }
    
    return await this.makeApiCall(query);
  }

  // 活動（日報）を作成
  async createActivity(reportData) {
    const activityData = {
      subject: `営業日報: ${reportData.customer || '商談'} - ${new Date().toLocaleDateString('ja-JP')}`,
      description: this.formatReportForDynamics(reportData),
      activitytypecode: "4210", // Task (String value required)
      statecode: 1, // Completed
      prioritycode: 1, // Normal
      scheduledstart: new Date().toISOString(),
      scheduledend: new Date().toISOString()
    };

    // 取引先企業との関連付け
    if (reportData.dynamics365_account_id) {
      activityData['regardingobjectid_account@odata.bind'] = `/accounts(${reportData.dynamics365_account_id})`;
    }

    // 商談との関連付け
    if (reportData.dynamics365_opportunity_id) {
      activityData['regardingobjectid_opportunity@odata.bind'] = `/opportunities(${reportData.dynamics365_opportunity_id})`;
    }

    return await this.makeApiCall('tasks', 'POST', activityData);
  }

  // 日報データをDynamics 365形式にフォーマット
  formatReportForDynamics(reportData) {
    const sections = [];
    
    if (reportData.customer) sections.push(`【顧客】${reportData.customer}`);
    if (reportData.project) sections.push(`【案件】${reportData.project}`);
    if (reportData.participants) sections.push(`【参加者】${reportData.participants}`);
    if (reportData.location) sections.push(`【場所】${reportData.location}`);
    if (reportData.budget) sections.push(`【予算】${reportData.budget}`);
    if (reportData.schedule) sections.push(`【スケジュール】${reportData.schedule}`);
    if (reportData.next_action) sections.push(`【次のアクション】${reportData.next_action}`);
    if (reportData.issues) sections.push(`【課題・懸念】${reportData.issues}`);
    
    // Q&A形式のデータも追加
    if (reportData.questions_answers && reportData.questions_answers.length > 0) {
      sections.push('\n【詳細】');
      reportData.questions_answers.forEach((qa, index) => {
        sections.push(`Q${index + 1}: ${qa.question}`);
        sections.push(`A${index + 1}: ${qa.answer}\n`);
      });
    }
    
    return sections.join('\n');
  }

  // 接続テスト
  async testConnection() {
    try {
      const result = await this.makeApiCall('accounts?$top=1');
      return { success: true, message: 'Dynamics 365接続成功', data: result };
    } catch (error) {
      return { success: false, message: 'Dynamics 365接続失敗', error: error.message };
    }
  }
}

module.exports = new Dynamics365Service();