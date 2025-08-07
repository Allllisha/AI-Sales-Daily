const CRMAdapter = require('./CRMAdapter');
const axios = require('axios');

/**
 * Salesforce CRMアダプター
 */
class SalesforceAdapter extends CRMAdapter {
  constructor(config) {
    super(config);
    this.config = config; // configオブジェクトを保存
    this.instanceUrl = config.instanceUrl || null;
    this.accessToken = config.accessToken || null;
    this.refreshToken = config.refreshToken || null;
    this.userId = config.userId || null; // ユーザーID（個別認証用）
    
    // Salesforce設定
    this.loginUrl = config.loginUrl || process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
    this.clientId = config.clientId || process.env.SALESFORCE_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.SALESFORCE_CLIENT_SECRET;
    this.username = config.username || process.env.SALESFORCE_USERNAME;
    this.password = config.password || process.env.SALESFORCE_PASSWORD;
    this.securityToken = config.securityToken || process.env.SALESFORCE_SECURITY_TOKEN;
    // APIバージョン（vプレフィックスなし）
    this.apiVersion = config.apiVersion || process.env.SALESFORCE_API_VERSION || '64.0';
    // vプレフィックスを除去（もし含まれている場合）
    if (this.apiVersion.startsWith('v')) {
      this.apiVersion = this.apiVersion.substring(1);
    }
  }

  /**
   * Salesforceへのログイン（Username-Password OAuth Flow）
   */
  async authenticate() {
    try {
      const params = new URLSearchParams({
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: this.username,
        password: this.password + this.securityToken
      });

      const response = await axios.post(
        `${this.loginUrl}/services/oauth2/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.instanceUrl = response.data.instance_url;
      this.refreshToken = response.data.refresh_token;

      return response.data;
    } catch (error) {
      console.error('Salesforce authentication failed:', error.response?.data || error.message);
      throw new Error('Salesforce認証に失敗しました');
    }
  }

  /**
   * Salesforce APIへのリクエスト
   */
  async makeApiCall(endpoint, method = 'GET', data = null) {
    try {
      // 認証チェック
      if (!this.accessToken || !this.instanceUrl) {
        // ユーザー認証トークンがある場合はauthenticateをスキップ
        if (!this.config?.isUserAuthenticated) {
          await this.authenticate();
        } else {
          throw new Error('User authenticated but no valid token available');
        }
      }

      const config = {
        method,
        url: `${this.instanceUrl}/services/data/v${this.apiVersion}/${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      console.log('Salesforce API call:', { method, endpoint, instanceUrl: this.instanceUrl });
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // トークンが期限切れの場合は再認証
      if (error.response?.status === 401 && !this.config?.isUserAuthenticated) {
        await this.authenticate();
        // リトライ
        return this.makeApiCall(endpoint, method, data);
      }
      
      console.error('Salesforce API call failed:', error.response?.data || error.message);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        endpoint,
        instanceUrl: this.instanceUrl
      });
      throw error;
    }
  }

  /**
   * SOQLクエリの実行
   */
  async query(soql) {
    const encodedQuery = encodeURIComponent(soql);
    return await this.makeApiCall(`query/?q=${encodedQuery}`);
  }

  async getAccounts(limit = 50) {
    const soql = `SELECT Id, Name, Phone FROM Account ORDER BY Name ASC LIMIT ${limit}`;
    const result = await this.query(soql);
    return this.normalizeAccounts(result.records || []);
  }

  async getOpportunities(accountId = null, limit = 50) {
    let soql = `SELECT Id, Name, AccountId, Account.Name, Amount, CloseDate, StageName, IsClosed 
                FROM Opportunity 
                ORDER BY LastModifiedDate DESC 
                LIMIT ${limit}`;
    
    if (accountId) {
      soql = `SELECT Id, Name, AccountId, Account.Name, Amount, CloseDate, StageName, IsClosed 
              FROM Opportunity 
              WHERE AccountId = '${accountId}'
              ORDER BY LastModifiedDate DESC 
              LIMIT ${limit}`;
    }
    
    const result = await this.query(soql);
    return this.normalizeOpportunities(result.records || []);
  }

  async getActivities(regardingObjectId = null, limit = 50) {
    // Salesforceでは Task オブジェクトを使用
    let soql = `SELECT Id, Subject, Description, CreatedDate, Status, Priority, WhatId 
                FROM Task 
                ORDER BY CreatedDate DESC 
                LIMIT ${limit}`;
    
    if (regardingObjectId) {
      soql = `SELECT Id, Subject, Description, CreatedDate, Status, Priority, WhatId 
              FROM Task 
              WHERE WhatId = '${regardingObjectId}'
              ORDER BY CreatedDate DESC 
              LIMIT ${limit}`;
    }
    
    const result = await this.query(soql);
    return this.normalizeActivities(result.records || []);
  }

  async getNotes(regardingObjectId = null, limit = 50) {
    try {
      // まずNoteオブジェクトから取得を試みる（従来のテキストメモ）
      let soql = `SELECT Id, Title, Body, CreatedDate, LastModifiedDate, ParentId 
                  FROM Note 
                  ORDER BY CreatedDate DESC 
                  LIMIT ${limit}`;
      
      if (regardingObjectId) {
        soql = `SELECT Id, Title, Body, CreatedDate, LastModifiedDate, ParentId 
                FROM Note 
                WHERE ParentId = '${regardingObjectId}'
                ORDER BY CreatedDate DESC 
                LIMIT ${limit}`;
      }
      
      const result = await this.query(soql);
      
      // Noteオブジェクトの形式を正規化（統一フォーマットに合わせる）
      const notes = (result.records || []).map(note => ({
        id: note.Id,
        subject: note.Title || 'メモ',
        noteText: note.Body || '',
        createdOn: note.CreatedDate,
        modifiedOn: note.LastModifiedDate,
        regardingObjectId: note.ParentId,
        fileName: null,
        mimeType: 'text/plain',
        _source: 'salesforce',
        _original: note
      }));
      
      return notes;
    } catch (error) {
      console.error('Salesforce getNotes error:', error);
      // エラーが発生した場合は空の配列を返す
      return [];
    }
  }

  async getMeetings(regardingObjectId = null, limit = 50) {
    // SalesforceではEventオブジェクトを使用（会議・イベント）
    let soql = `SELECT Id, Subject, Description, StartDateTime, EndDateTime, 
                       Location, ActivityDateTime, WhatId
                FROM Event 
                ORDER BY StartDateTime DESC 
                LIMIT ${limit}`;
    
    if (regardingObjectId) {
      soql = `SELECT Id, Subject, Description, StartDateTime, EndDateTime, 
                     Location, ActivityDateTime, WhatId
              FROM Event 
              WHERE WhatId = '${regardingObjectId}'
              ORDER BY StartDateTime DESC 
              LIMIT ${limit}`;
    }
    
    const result = await this.query(soql);
    return this.normalizeMeetings(result.records || []);
  }

  async createActivity(reportData) {
    const taskData = this.formatReportForCRM(reportData);
    const result = await this.makeApiCall('sobjects/Task', 'POST', taskData);
    
    // 作成されたタスクの詳細を取得
    if (result.id) {
      const createdTask = await this.makeApiCall(`sobjects/Task/${result.id}`);
      return { ...createdTask, id: result.id };
    }
    
    return result;
  }

  async testConnection() {
    try {
      await this.authenticate();
      // 簡単なクエリでテスト
      const result = await this.query('SELECT Id, Name FROM Account LIMIT 1');
      return { 
        success: true, 
        message: 'Salesforce接続成功', 
        data: result,
        crmType: 'salesforce'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Salesforce接続失敗', 
        error: error.message,
        crmType: 'salesforce'
      };
    }
  }

  normalizeAccounts(accounts) {
    return accounts.map(account => ({
      id: account.Id,
      name: account.Name,
      phone: account.Phone,
      email: null, // Email field is not available in this Salesforce instance
      _source: 'salesforce',
      _original: account
    }));
  }

  normalizeOpportunities(opportunities) {
    return opportunities.map(opp => ({
      id: opp.Id,
      name: opp.Name,
      customer: opp.Account?.Name || 'Unknown',
      customerId: opp.AccountId,
      estimatedValue: opp.Amount,
      closeDate: opp.CloseDate,
      stage: opp.StageName,
      status: opp.IsClosed ? 'Closed' : 'Open',
      _source: 'salesforce',
      _original: opp
    }));
  }

  normalizeActivities(activities) {
    return activities.map(activity => ({
      id: activity.Id,
      subject: activity.Subject,
      description: activity.Description,
      createdOn: activity.CreatedDate,
      status: activity.Status,
      priority: activity.Priority,
      regardingObjectId: activity.WhatId,
      _source: 'salesforce',
      _original: activity
    }));
  }

  normalizeNotes(notes) {
    return notes.map(note => ({
      id: note.Id || note.ContentNote?.Id,
      subject: note.Title || note.ContentNote?.Title,
      noteText: note.Content || note.ContentNote?.Content,
      createdOn: note.CreatedDate || note.ContentNote?.CreatedDate,
      modifiedOn: note.LastModifiedDate || note.ContentNote?.LastModifiedDate,
      regardingObjectId: null, // ContentNoteは複数のオブジェクトに関連付け可能
      fileName: null,
      mimeType: 'text/html', // ContentNoteはリッチテキスト
      _source: 'salesforce',
      _original: note
    }));
  }

  normalizeMeetings(meetings) {
    return meetings.map(meeting => ({
      id: meeting.Id,
      subject: meeting.Subject,
      description: meeting.Description,
      scheduledStart: meeting.StartDateTime,
      scheduledEnd: meeting.EndDateTime,
      actualStart: meeting.ActivityDateTime,
      actualEnd: null, // Salesforce Eventには実際の終了時刻フィールドがない
      location: meeting.Location,
      status: meeting.IsCompleted ? 'Completed' : 'Open',
      regardingObjectId: meeting.WhatId,
      _source: 'salesforce',
      _original: meeting
    }));
  }

  extractActivityId(activity) {
    return activity.id || activity.Id;
  }

  formatReportForCRM(reportData) {
    const taskData = {
      Subject: `営業日報: ${reportData.customer || '商談'} - ${new Date().toLocaleDateString('ja-JP')}`,
      Description: this.formatReportDescription(reportData),
      Status: 'Completed',
      Priority: 'Normal',
      ActivityDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD形式
    };

    // 取引先企業との関連付け
    if (reportData.crm_data?.account?.id) {
      taskData.WhatId = reportData.crm_data.account.id;
    }
    // 商談との関連付け（商談のほうが優先）
    if (reportData.crm_data?.opportunity?.id) {
      taskData.WhatId = reportData.crm_data.opportunity.id;
    }

    return taskData;
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

module.exports = SalesforceAdapter;