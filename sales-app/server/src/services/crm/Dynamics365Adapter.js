const CRMAdapter = require('./CRMAdapter');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const axios = require('axios');

/**
 * Microsoft Dynamics 365 CRMアダプター
 */
class Dynamics365Adapter extends CRMAdapter {
  constructor(config) {
    super(config);
    this.clientApp = null;
    this.msalConfig = {
      auth: {
        clientId: config.clientId || process.env.DYNAMICS_CLIENT_ID,
        clientSecret: config.clientSecret || process.env.DYNAMICS_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${config.tenantId || process.env.DYNAMICS_TENANT_ID}`
      }
    };
    this.dynamicsUrl = config.dynamicsUrl || process.env.DYNAMICS_URL;
  }

  async initialize() {
    if (!this.clientApp) {
      this.clientApp = new ConfidentialClientApplication(this.msalConfig);
    }
  }

  async getAccessToken() {
    await this.initialize();

    const clientCredentialRequest = {
      scopes: [`${this.dynamicsUrl}/.default`],
    };

    try {
      const response = await this.clientApp.acquireTokenSilent(clientCredentialRequest);
      return response.accessToken;
    } catch (error) {
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
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  }

  async getAccounts(limit = 50) {
    const query = `accounts?$select=accountid,name,primarycontactid,telephone1,emailaddress1&$top=${limit}&$orderby=name asc`;
    const result = await this.makeApiCall(query);
    return this.normalizeAccounts(result.value || []);
  }

  async getOpportunities(accountId = null, limit = 50) {
    let query = `opportunities?$select=opportunityid,name,_customerid_value,estimatedvalue,actualclosedate,stepname,statecode&$top=${limit}&$orderby=modifiedon desc`;
    
    if (accountId) {
      query += `&$filter=_customerid_value eq ${accountId}`;
    }
    
    const result = await this.makeApiCall(query);
    const opportunities = result.value || [];

    // 顧客名を取得するため、別途APIコール
    const customerIds = [...new Set(opportunities.map(opp => opp._customerid_value).filter(Boolean))];
    let customersMap = {};

    if (customerIds.length > 0) {
      try {
        const customersResult = await this.getAccountsByIds(customerIds);
        customersMap = customersResult.reduce((map, account) => {
          map[account.id] = account.name;
          return map;
        }, {});
      } catch (error) {
        console.warn('Failed to fetch customer names:', error.message);
      }
    }

    return this.normalizeOpportunities(opportunities, customersMap);
  }

  async getAccountsByIds(accountIds) {
    if (!accountIds || accountIds.length === 0) {
      return [];
    }
    
    const filterConditions = accountIds.map(id => `accountid eq ${id}`).join(' or ');
    const query = `accounts?$select=accountid,name&$filter=${filterConditions}`;
    const result = await this.makeApiCall(query);
    
    return this.normalizeAccounts(result.value || []);
  }

  async getActivities(regardingObjectId = null, limit = 50) {
    let query = `tasks?$select=activityid,subject,description,createdon,statecode,prioritycode,_regardingobjectid_value&$top=${limit}&$orderby=createdon desc`;
    
    if (regardingObjectId) {
      query += `&$filter=_regardingobjectid_value eq ${regardingObjectId}`;
    }
    
    const result = await this.makeApiCall(query);
    return this.normalizeActivities(result.value || []);
  }

  async getNotes(regardingObjectId = null, limit = 50) {
    let query = `annotations?$select=annotationid,subject,notetext,createdon,modifiedon,_objectid_value,filename,mimetype&$top=${limit}&$orderby=createdon desc`;
    
    if (regardingObjectId) {
      query += `&$filter=_objectid_value eq ${regardingObjectId}`;
    }
    
    const result = await this.makeApiCall(query);
    return this.normalizeNotes(result.value || []);
  }

  async getMeetings(regardingObjectId = null, limit = 50) {
    let query = `appointments?$select=activityid,subject,description,scheduledstart,scheduledend,actualstart,actualend,location,statecode,_regardingobjectid_value&$top=${limit}&$orderby=scheduledstart desc`;
    
    if (regardingObjectId) {
      query += `&$filter=_regardingobjectid_value eq ${regardingObjectId}`;
    }
    
    const result = await this.makeApiCall(query);
    return this.normalizeMeetings(result.value || []);
  }

  async createActivity(reportData) {
    const activityData = this.formatReportForCRM(reportData);
    const result = await this.makeApiCall('tasks', 'POST', activityData);
    return result;
  }

  async testConnection() {
    try {
      const result = await this.makeApiCall('accounts?$top=1');
      return { 
        success: true, 
        message: 'Dynamics 365接続成功', 
        data: result,
        crmType: 'dynamics365'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Dynamics 365接続失敗', 
        error: error.message,
        crmType: 'dynamics365'
      };
    }
  }

  normalizeAccounts(accounts) {
    return accounts.map(account => ({
      id: account.accountid,
      name: account.name,
      phone: account.telephone1,
      email: account.emailaddress1,
      _source: 'dynamics365',
      _original: account
    }));
  }

  normalizeOpportunities(opportunities, customersMap = {}) {
    return opportunities.map(opp => ({
      id: opp.opportunityid,
      name: opp.name,
      customer: customersMap[opp._customerid_value] || 'Unknown',
      customerId: opp._customerid_value,
      estimatedValue: opp.estimatedvalue,
      closeDate: opp.actualclosedate,
      stage: opp.stepname,
      status: opp.statecode === 0 ? 'Open' : 'Closed',
      _source: 'dynamics365',
      _original: opp
    }));
  }

  normalizeActivities(activities) {
    return activities.map(activity => ({
      id: activity.activityid,
      subject: activity.subject,
      description: activity.description,
      createdOn: activity.createdon,
      status: activity.statecode === 0 ? 'Open' : activity.statecode === 1 ? 'Completed' : 'Cancelled',
      priority: activity.prioritycode === 0 ? 'Low' : activity.prioritycode === 1 ? 'Normal' : 'High',
      regardingObjectId: activity._regardingobjectid_value,
      _source: 'dynamics365',
      _original: activity
    }));
  }

  normalizeNotes(notes) {
    return notes.map(note => ({
      id: note.annotationid,
      subject: note.subject,
      noteText: note.notetext,
      createdOn: note.createdon,
      modifiedOn: note.modifiedon,
      regardingObjectId: note._objectid_value,
      fileName: note.filename,
      mimeType: note.mimetype,
      _source: 'dynamics365',
      _original: note
    }));
  }

  normalizeMeetings(meetings) {
    return meetings.map(meeting => ({
      id: meeting.activityid,
      subject: meeting.subject,
      description: meeting.description,
      scheduledStart: meeting.scheduledstart,
      scheduledEnd: meeting.scheduledend,
      actualStart: meeting.actualstart,
      actualEnd: meeting.actualend,
      location: meeting.location,
      status: meeting.statecode === 0 ? 'Open' : meeting.statecode === 1 ? 'Completed' : 'Cancelled',
      regardingObjectId: meeting._regardingobjectid_value,
      _source: 'dynamics365',
      _original: meeting
    }));
  }

  extractActivityId(activity) {
    return activity.activityid;
  }

  formatReportForCRM(reportData) {
    const activityData = {
      subject: `営業日報: ${reportData.customer || '商談'} - ${new Date().toLocaleDateString('ja-JP')}`,
      description: this.formatReportDescription(reportData),
      activitytypecode: "4210", // Task (String value required)
      statecode: 1, // Completed
      prioritycode: 1, // Normal
      scheduledstart: new Date().toISOString(),
      scheduledend: new Date().toISOString()
    };

    // 取引先企業との関連付け
    if (reportData.crm_data?.account?.id) {
      activityData['regardingobjectid_account@odata.bind'] = `/accounts(${reportData.crm_data.account.id})`;
    }

    // 商談との関連付け
    if (reportData.crm_data?.opportunity?.id) {
      activityData['regardingobjectid_opportunity@odata.bind'] = `/opportunities(${reportData.crm_data.opportunity.id})`;
    }

    return activityData;
  }

  formatReportDescription(reportData) {
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
}

module.exports = Dynamics365Adapter;