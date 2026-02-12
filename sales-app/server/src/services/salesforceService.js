const axios = require('axios');
const pool = require('../db/pool');

class SalesforceService {
  constructor() {
    this.baseUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SALESFORCE_LOGIN_URL;
    this.apiVersion = process.env.SALESFORCE_API_VERSION || 'v64.0';
  }

  // アクセストークンとインスタンスURLを取得
  async getAccessToken(userId) {
    try {
      // ユーザーのトークンを取得
      const result = await pool.query(`
        SELECT access_token, refresh_token, instance_url
        FROM user_crm_tokens
        WHERE user_id = $1 AND crm_type = 'salesforce'
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('Salesforceの認証情報が見つかりません。先にSalesforceにログインしてください。');
      }

      const token = result.rows[0];
      
      // インスタンスURLを設定
      if (token.instance_url) {
        this.baseUrl = token.instance_url;
      }
      
      // TODO: トークンの有効性チェックとリフレッシュ処理
      
      return token.access_token;
    } catch (error) {
      console.error('Get Salesforce token error:', error);
      throw error;
    }
  }

  // アカウント（取引先）を作成または検索
  async findOrCreateAccount(userId, accountData) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      // まず既存のアカウントを検索
      const searchQuery = `SELECT Id, Name, Industry, Phone, Website 
                          FROM Account 
                          WHERE Name LIKE '${accountData.name}%' 
                          LIMIT 5`;
      
      const searchUrl = `${this.baseUrl}/services/data/v${this.apiVersion}/query?q=${encodeURIComponent(searchQuery)}`;
      
      console.log('Salesforce search URL:', searchUrl);
      console.log('Using API version:', this.apiVersion);
      console.log('Base URL:', this.baseUrl);
      
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (searchResponse.data.records && searchResponse.data.records.length > 0) {
        // 既存のアカウントが見つかった場合
        return searchResponse.data.records[0];
      }
      
      // 新規作成
      const createUrl = `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/Account`;
      
      const createResponse = await axios.post(createUrl, {
        Name: accountData.name,
        Industry: accountData.industry || '未分類',
        Description: `営業日報システムから自動作成 - ${new Date().toLocaleDateString('ja-JP')}`
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 作成されたアカウントの詳細を取得
      const getUrl = `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/Account/${createResponse.data.id}`;
      const getResponse = await axios.get(getUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return getResponse.data;
      
    } catch (error) {
      console.error('Salesforce findOrCreateAccount error:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('URL:', error.config?.url);
      throw error;
    }
  }

  // 商談を作成
  async createOpportunity(userId, opportunityData) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      const createUrl = `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/Opportunity`;
      
      // CloseDateを適切な形式に変換
      let closeDate = opportunityData.closeDate;
      if (closeDate && typeof closeDate === 'string') {
        // 日本語の日付文字列から最初の日付を抽出
        const dateMatch = closeDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (dateMatch) {
          const year = dateMatch[1];
          const month = dateMatch[2].padStart(2, '0');
          const day = dateMatch[3].padStart(2, '0');
          closeDate = `${year}-${month}-${day}`;
        } else if (!closeDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // 既にYYYY-MM-DD形式でない場合は、90日後を設定
          closeDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
      } else {
        // CloseDateが未指定の場合は90日後を設定
        closeDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      
      const data = {
        Name: opportunityData.name,
        AccountId: opportunityData.accountId,
        StageName: opportunityData.stageName || 'Prospecting',
        CloseDate: closeDate,
        Amount: opportunityData.amount || null,
        Description: opportunityData.description,
        LeadSource: 'Other'
      };
      
      const response = await axios.post(createUrl, data, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Create opportunity response:', response.data);
      
      // 作成された商談の詳細を取得
      const opportunityId = response.data.id || response.data.Id;
      if (!opportunityId) {
        console.error('No opportunity ID in response:', response.data);
        throw new Error('Failed to get opportunity ID from Salesforce response');
      }
      
      const getUrl = `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/Opportunity/${opportunityId}`;
      const getResponse = await axios.get(getUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('Get opportunity response:', getResponse.data);
      return getResponse.data;
      
    } catch (error) {
      console.error('Salesforce createOpportunity error:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Request URL:', error.config?.url);
      console.error('Request Data:', JSON.stringify(error.config?.data, null, 2));
      throw error;
    }
  }

  // 活動（Task）を作成
  async createActivity(userId, activityData) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      const createUrl = `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/Task`;
      
      const data = {
        Subject: activityData.subject,
        Description: activityData.description,
        ActivityDate: activityData.activityDate || new Date().toISOString().split('T')[0],
        Status: 'Completed',
        Priority: 'Normal'
        // Typeフィールドは削除（Salesforceでは使用できない）
      };
      
      // 商談IDがある場合のみ関連付け
      if (activityData.opportunityId) {
        data.WhatId = activityData.opportunityId;
        console.log('Setting WhatId to:', activityData.opportunityId);
      }
      
      console.log('Creating task with data:', JSON.stringify(data, null, 2));
      
      const response = await axios.post(createUrl, data, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Task created successfully:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('Salesforce createActivity error:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Request URL:', error.config?.url);
      console.error('Request Data:', JSON.stringify(error.config?.data, null, 2));
      
      // エラーメッセージを改善
      if (error.response?.data) {
        const errorMessage = error.response.data[0]?.message || error.response.data.message || 'タスクの作成に失敗しました';
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  // ノート（ContentNote）を商談に追加
  async addNoteToOpportunity(userId, opportunityId, noteData) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      // 1. ContentNoteを作成
      const createNoteUrl = `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/ContentNote`;
      
      const noteContent = {
        Title: noteData.title,
        Content: Buffer.from(noteData.body).toString('base64')
      };
      
      const noteResponse = await axios.post(createNoteUrl, noteContent, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 2. ContentDocumentLinkで商談に関連付け
      const linkUrl = `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/ContentDocumentLink`;
      
      const linkData = {
        ContentDocumentId: noteResponse.data.id,
        LinkedEntityId: opportunityId,
        ShareType: 'V', // Viewer
        Visibility: 'AllUsers'
      };
      
      await axios.post(linkUrl, linkData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return noteResponse.data;
      
    } catch (error) {
      console.error('Salesforce addNoteToOpportunity error:', error.response?.data || error);
      throw error;
    }
  }

  // 日報をCRMに新規作成
  async createReportInCRM(userId, report, crmData) {
    try {
      console.log('Starting createReportInCRM with:', { userId, crmData });
      
      // 1. 取引先を作成または検索
      const account = await this.findOrCreateAccount(userId, {
        name: crmData.customer || report.slots?.customer || '未設定企業'
      });
      console.log('Account created/found:', account);

      // 2. 商談を作成
      const opportunity = await this.createOpportunity(userId, {
        name: crmData.project || report.slots?.project || `${new Date().toLocaleDateString('ja-JP')}の商談`,
        accountId: account.Id,
        amount: crmData.amount || report.slots?.budget,
        closeDate: crmData.schedule || report.slots?.schedule || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      
      console.log('Created opportunity:', opportunity);
      console.log('Opportunity Id:', opportunity.Id);

      // 3. 活動（タスク）を作成
      console.log('About to create task with opportunity:', opportunity);
      const task = await this.createActivity(userId, {
        subject: `営業日報 - ${new Date(report.report_date).toLocaleDateString('ja-JP')}`,
        description: this.formatReportForCRM(report),
        opportunityId: opportunity?.Id || opportunity?.id,
        activityDate: report.report_date
      });

      // 4. メモを追加（詳細情報）
      if (report.slots?.issues || report.slots?.next_action) {
        const oppId = opportunity?.Id || opportunity?.id;
        if (oppId) {
          await this.addNoteToOpportunity(userId, oppId, {
            title: '追加情報',
            body: `課題: ${report.slots?.issues || 'なし'}\n次のアクション: ${report.slots?.next_action || 'なし'}`
          });
        }
      }

      return {
        accountId: account?.Id || account?.id,
        accountName: account?.Name || account?.name,
        opportunityId: opportunity?.Id || opportunity?.id,
        opportunityName: opportunity?.Name || opportunity?.name,
        taskId: task?.id || task?.Id,
        syncDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('createReportInCRM error:', error);
      throw error;
    }
  }

  // 日報をCRMの既存レコードに更新
  async updateReportInCRM(userId, report, crmData) {
    try {
      console.log('Starting updateReportInCRM with crmData:', JSON.stringify(crmData, null, 2));
      console.log('Report slots:', JSON.stringify(report.slots, null, 2));
      
      const accessToken = await this.getAccessToken(userId);
      
      // 既存の商談への紐付け変更を検出
      const previousCrmData = report.crm_data ? 
        (typeof report.crm_data === 'string' ? JSON.parse(report.crm_data) : report.crm_data) : 
        null;
      
      const isChangingOpportunity = previousCrmData?.opportunityId && 
        crmData.opportunityId && 
        previousCrmData.opportunityId !== crmData.opportunityId;
      
      console.log('Previous opportunity:', previousCrmData?.opportunityId);
      console.log('New opportunity:', crmData.opportunityId);
      console.log('Is changing opportunity:', isChangingOpportunity);
      
      // 別の商談への紐付け変更の場合は、商談自体は更新しない
      // 同じ商談への更新の場合のみ、日報データで商談を更新
      if (crmData.opportunityId && !isChangingOpportunity) {
        try {
          const updateData = {};
          
          // 商談名の更新（最新のreport.slotsを優先）
          const projectName = report.slots?.project;
          console.log('DEBUG: report.slots?.project =', report.slots?.project);
          console.log('DEBUG: projectName =', projectName);
          if (projectName) {
            updateData.Name = projectName;
            console.log('UPDATING Salesforce opportunity name to:', projectName);
          }
          
          // 金額の更新（最新のreport.slotsを優先）
          const amount = report.slots?.budget || crmData.amount;
          if (amount && amount !== null && amount !== 'null' && amount !== 'undefined') {
            // 金額から数値を抽出（例: "¥1,000万円" -> 10000000）
            const numericAmount = typeof amount === 'string' 
              ? parseFloat(amount.replace(/[^\d.]/g, '')) * (amount.includes('万') ? 10000 : 1)
              : amount;
            if (!isNaN(numericAmount) && numericAmount > 0) {
              updateData.Amount = numericAmount;
            }
          }
          
          // 完了予定日の更新（最新のreport.slotsを優先）
          const closeDate = report.slots?.schedule || crmData.schedule;
          if (closeDate && closeDate !== 'null' && closeDate !== 'undefined') {
            try {
              // 日付形式を確認・変換
              const dateObj = new Date(closeDate);
              if (!isNaN(dateObj.getTime())) {
                updateData.CloseDate = dateObj.toISOString().split('T')[0];
              } else {
                console.log('Invalid date format for CloseDate:', closeDate);
              }
            } catch (e) {
              console.log('Error parsing CloseDate:', closeDate, e);
            }
          }
          
          // 更新するフィールドがある場合のみAPIを呼び出す
          if (Object.keys(updateData).length > 0) {
            // nullやundefinedの値を除外
            const cleanedData = {};
            for (const [key, value] of Object.entries(updateData)) {
              if (value !== null && value !== undefined && value !== 'null' && value !== 'undefined') {
                cleanedData[key] = value;
              }
            }
            
            if (Object.keys(cleanedData).length > 0) {
              console.log('PATCH URL:', `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/Opportunity/${crmData.opportunityId}`);
              console.log('PATCH Data being sent to Salesforce:', JSON.stringify(cleanedData, null, 2));
              
              const patchResponse = await axios.patch(
                `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/Opportunity/${crmData.opportunityId}`,
                cleanedData,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              console.log('PATCH Response status:', patchResponse.status);
              console.log('Opportunity updated successfully with data:', cleanedData);
            } else {
              console.log('No valid fields to update for opportunity after cleaning');
            }
          } else {
            console.log('No fields to update for opportunity');
          }
        } catch (oppError) {
          // 商談が見つからない場合でも処理を続行
          if (oppError.response?.status === 404) {
            console.warn('Opportunity not found, will create new task without opportunity link:', crmData.opportunityId);
            // opportunityIdをクリアして処理を続行
            crmData.opportunityId = null;
          } else {
            // その他のエラーは再スロー
            throw oppError;
          }
        }
      }

      // 新しいタスクを追加
      const task = await this.createActivity(userId, {
        subject: `営業日報更新 - ${new Date(report.report_date).toLocaleDateString('ja-JP')}`,
        description: this.formatReportForCRM(report),
        opportunityId: crmData.opportunityId,
        activityDate: report.report_date
      });

      // 更新された商談情報を取得（常に最新の情報を取得）
      let updatedOpportunity = null;
      if (crmData.opportunityId) {
        try {
          const opportunityUrl = `${this.baseUrl}/services/data/v${this.apiVersion}/sobjects/Opportunity/${crmData.opportunityId}?fields=Id,Name,Amount,CloseDate,AccountId,Account.Name`;
          const opportunityResponse = await axios.get(opportunityUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          updatedOpportunity = opportunityResponse.data;
          console.log('FETCHED latest opportunity from Salesforce:');
          console.log('  ID:', updatedOpportunity?.Id);
          console.log('  Name:', updatedOpportunity?.Name);
          console.log('  Amount:', updatedOpportunity?.Amount);
          console.log('  CloseDate:', updatedOpportunity?.CloseDate);
          console.log('  Account:', updatedOpportunity?.Account?.Name);
        } catch (fetchError) {
          console.log('Could not fetch updated opportunity:', fetchError.message);
        }
      }
      
      // 別案件への紐付け変更の場合は、選択した案件の情報をそのまま返す
      if (isChangingOpportunity && updatedOpportunity) {
        return {
          ...crmData,
          opportunityName: updatedOpportunity.Name || crmData.opportunityName,
          opportunityId: updatedOpportunity.Id || crmData.opportunityId,
          accountName: updatedOpportunity.Account?.Name || crmData.accountName,
          accountId: updatedOpportunity.AccountId || crmData.accountId,
          taskId: task.id || task.Id,
        };
      }
      
      // 同じ案件への更新の場合は、日報データで更新された情報を返す
      const latestProjectName = report.slots?.project || crmData.project;
      
      return {
        ...crmData,
        // Salesforceから取得した最新の商談名、またはローカルの最新プロジェクト名を使用
        opportunityName: updatedOpportunity?.Name || latestProjectName || crmData.opportunityName,
        opportunityId: crmData.opportunityId,
        project: latestProjectName, // ローカルのプロジェクト名も更新
        taskId: task.id || task.Id,
        syncDate: new Date().toISOString(),
        updated: true
      };
    } catch (error) {
      console.error('updateReportInCRM error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // エラーメッセージを改善
      if (error.response?.data) {
        const errorMessage = Array.isArray(error.response.data) 
          ? error.response.data[0]?.message 
          : error.response.data.message || 'CRM更新に失敗しました';
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  // 日報をCRM用にフォーマット
  formatReportForCRM(report) {
    const sections = [];
    
    if (report.slots) {
      sections.push('【営業日報】');
      sections.push(`日付: ${new Date(report.report_date).toLocaleDateString('ja-JP')}`);
      if (report.slots.customer) sections.push(`顧客: ${report.slots.customer}`);
      if (report.slots.project) sections.push(`案件: ${report.slots.project}`);
      if (report.slots.participants) sections.push(`参加者: ${report.slots.participants}`);
      if (report.slots.location) sections.push(`場所: ${report.slots.location}`);
      sections.push('');
      
      if (report.questions_answers && report.questions_answers.length > 0) {
        sections.push('【詳細内容】');
        report.questions_answers.forEach((qa, index) => {
          sections.push(`Q${index + 1}: ${qa.question}`);
          sections.push(`A: ${qa.answer}`);
          sections.push('');
        });
      }
      
      if (report.slots.issues) {
        sections.push(`【課題】\n${report.slots.issues}`);
      }
      
      if (report.slots.next_action) {
        sections.push(`【次のアクション】\n${report.slots.next_action}`);
      }
    }
    
    return sections.join('\n');
  }

  // アカウントを検索
  async searchAccounts(userId, searchTerm) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      const query = `SELECT Id, Name, Industry, Phone, Website, BillingCity 
                    FROM Account 
                    WHERE Name LIKE '%${searchTerm}%' 
                    ORDER BY LastModifiedDate DESC 
                    LIMIT 20`;
      
      const url = `${this.baseUrl}/services/data/v${this.apiVersion}/query?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return response.data.records || [];
      
    } catch (error) {
      console.error('Salesforce searchAccounts error:', error.response?.data || error);
      throw error;
    }
  }

  // 商談を検索
  async searchOpportunities(userId, searchTerm, accountId = null) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      let query = `SELECT Id, Name, AccountId, Account.Name, Amount, StageName, CloseDate 
                  FROM Opportunity 
                  WHERE Name LIKE '%${searchTerm}%'`;
      
      if (accountId) {
        query += ` AND AccountId = '${accountId}'`;
      }
      
      query += ` ORDER BY LastModifiedDate DESC LIMIT 20`;
      
      const url = `${this.baseUrl}/services/data/v${this.apiVersion}/query?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return response.data.records || [];
      
    } catch (error) {
      console.error('Salesforce searchOpportunities error:', error.response?.data || error);
      throw error;
    }
  }

  // 日報データをSalesforce用にフォーマット
  formatReportForSalesforce(report) {
    const qaText = report.questions_answers
      ?.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join('\n\n');
    
    const description = `
【営業日報】
日付: ${report.report_date || report.date}
作成者: ${report.user_name}

【商談概要】
顧客: ${report.customer || ''}
案件: ${report.project || ''}
予算: ${report.budget || ''}
スケジュール: ${report.schedule || ''}
場所: ${report.location || ''}
参加者: ${report.participants || ''}

【次のアクション】
${report.next_action || ''}

【課題・リスク】
${report.issues || ''}

【質疑応答】
${qaText || ''}

【備考】
${report.personal_info || ''}
${report.relationship_notes || ''}
    `.trim();
    
    return description;
  }

  // 予算額をパース
  parseAmount(budgetString) {
    if (!budgetString) return null;
    
    // 円記号や「万」「億」などを処理
    const normalized = budgetString
      .replace(/[￥¥,、]/g, '')
      .replace(/万/g, '0000')
      .replace(/億/g, '00000000');
    
    const amount = parseFloat(normalized);
    return isNaN(amount) ? null : amount;
  }

  // 日付をパース
  parseScheduleDate(scheduleString) {
    if (!scheduleString) {
      // デフォルトで3ヶ月後
      const date = new Date();
      date.setMonth(date.getMonth() + 3);
      return date.toISOString().split('T')[0];
    }
    
    // 様々な日付形式を処理
    const patterns = [
      /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/,
      /(\d{1,2})[月/-](\d{1,2})/
    ];
    
    for (const pattern of patterns) {
      const match = scheduleString.match(pattern);
      if (match) {
        if (match.length === 4) {
          // 年月日
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else if (match.length === 3) {
          // 月日のみ（今年として処理）
          const year = new Date().getFullYear();
          return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        }
      }
    }
    
    // パースできない場合は3ヶ月後
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split('T')[0];
  }
}

module.exports = SalesforceService;