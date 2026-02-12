const axios = require('axios');
const pool = require('../db/pool');

class Dynamics365Service {
  constructor() {
    this.baseUrl = process.env.DYNAMICS_URL || process.env.DYNAMICS365_URL;
    this.apiVersion = process.env.DYNAMICS365_API_VERSION || 'v9.2';
  }

  // アクセストークンとインスタンスURLを取得
  async getAccessToken(userId) {
    try {
      // ユーザーのトークンを取得
      const result = await pool.query(`
        SELECT access_token, refresh_token, instance_url, expires_at
        FROM user_crm_tokens
        WHERE user_id = $1 AND crm_type = 'dynamics365'
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('Dynamics 365の認証情報が見つかりません。先にDynamics 365にログインしてください。');
      }

      let token = result.rows[0];
      
      // インスタンスURLを設定
      if (token.instance_url) {
        this.baseUrl = token.instance_url;
      }
      
      // トークンの有効期限をチェック
      const now = new Date();
      const expiresAt = token.expires_at ? new Date(token.expires_at) : null;
      
      console.log('Token check - Current time:', now.toISOString());
      console.log('Token check - Expires at:', expiresAt ? expiresAt.toISOString() : 'null');
      console.log('Token check - Has refresh token:', !!token.refresh_token);
      
      // トークンが期限切れまたは期限が近い場合（5分前）はリフレッシュ
      if (!expiresAt || expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
        console.log('Token expired or expiring soon, refreshing...');
        
        if (!token.refresh_token) {
          throw new Error('リフレッシュトークンがありません。Dynamics 365に再度ログインしてください。');
        }
        
        token = await this.refreshAccessToken(userId, token.refresh_token);
      }
      
      return token.access_token;
    } catch (error) {
      console.error('Get Dynamics365 token error:', error);
      throw error;
    }
  }

  // アクセストークンをリフレッシュ
  async refreshAccessToken(userId, refreshToken) {
    try {
      const tokenUrl = `https://login.microsoftonline.com/${process.env.DYNAMICS365_TENANT_ID || process.env.DYNAMICS_TENANT_ID}/oauth2/v2.0/token`;
      
      // ベースURLからスコープを構築
      const scopeUrl = this.baseUrl || process.env.DYNAMICS365_URL || process.env.DYNAMICS_URL || 'https://org61965acd.crm7.dynamics.com';
      
      console.log('Refresh token - URL:', tokenUrl);
      console.log('Refresh token - Scope:', `${scopeUrl}/.default offline_access`);
      
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', process.env.DYNAMICS365_CLIENT_ID || process.env.DYNAMICS_CLIENT_ID);
      params.append('client_secret', process.env.DYNAMICS365_CLIENT_SECRET || process.env.DYNAMICS_CLIENT_SECRET);
      params.append('refresh_token', refreshToken);
      params.append('scope', `${scopeUrl}/.default offline_access`);
      
      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const newToken = response.data;
      
      // 新しいトークンをデータベースに保存
      const expiresAt = new Date(Date.now() + newToken.expires_in * 1000);
      
      await pool.query(`
        UPDATE user_crm_tokens
        SET access_token = $1, 
            refresh_token = $2,
            expires_at = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4 AND crm_type = 'dynamics365'
      `, [newToken.access_token, newToken.refresh_token || refreshToken, expiresAt, userId]);
      
      console.log('Token refreshed successfully');
      
      return {
        access_token: newToken.access_token,
        refresh_token: newToken.refresh_token || refreshToken,
        expires_at: expiresAt
      };
    } catch (error) {
      console.error('Refresh token error:', error.response?.data || error);
      console.error('Refresh token error details:', {
        status: error.response?.status,
        error: error.response?.data?.error,
        error_description: error.response?.data?.error_description
      });
      
      // リフレッシュトークンも無効な場合は再ログインが必要
      if (error.response?.status === 400 || error.response?.status === 401) {
        throw new Error('リフレッシュトークンが無効です。Dynamics 365に再度ログインしてください。');
      }
      
      throw error;
    }
  }

  // 取引先企業を作成または検索
  async findOrCreateAccount(userId, accountData) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      // まず既存のアカウントを検索
      const searchUrl = `${this.baseUrl}/api/data/${this.apiVersion}/accounts?$filter=contains(name,'${accountData.name}')&$top=5`;
      
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.include-annotations="*"'
        }
      });
      
      if (searchResponse.data.value && searchResponse.data.value.length > 0) {
        // 既存のアカウントが見つかった場合
        console.log('Found existing account:', searchResponse.data.value[0].name);
        return searchResponse.data.value[0];
      }
      
      // 新規作成
      console.log('Creating new account:', accountData.name);
      const createUrl = `${this.baseUrl}/api/data/${this.apiVersion}/accounts`;
      
      const accountCreateData = {
        name: accountData.name,
        description: `営業日報システムから自動作成 - ${new Date().toLocaleDateString('ja-JP')}`,
        // 以下のフィールドは環境によってサポートされない可能性があるため、コメントアウト
        // accountcategorycode: 1, // Preferred Customer（優先顧客）
        // customertypecode: 3, // Customer（顧客）
        // accountratingcode: 1, // Default（デフォルト）
        telephone1: accountData.phone || '',  // 電話番号があれば設定
        websiteurl: accountData.website || '',  // ウェブサイトがあれば設定
        address1_city: accountData.city || '',  // 都市があれば設定
      };
      
      // 業界コードがある場合のみ設定
      if (accountData.industry) {
        accountCreateData.industrycode = this.mapIndustryCode(accountData.industry);
      }
      
      // 空のフィールドは削除
      Object.keys(accountCreateData).forEach(key => {
        if (accountCreateData[key] === '' || accountCreateData[key] === null || accountCreateData[key] === undefined) {
          delete accountCreateData[key];
        }
      });
      
      console.log('Creating Dynamics 365 account with URL:', createUrl);
      console.log('Account data:', JSON.stringify(accountCreateData, null, 2));
      
      const createResponse = await axios.post(createUrl, accountCreateData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'return=representation'
        }
      });
      
      return createResponse.data;
      
    } catch (error) {
      console.error('Dynamics365 findOrCreateAccount error:');
      if (error.response?.data?.error) {
        console.error('Error details:', JSON.stringify(error.response.data.error, null, 2));
      } else {
        console.error('Error:', error.response?.data || error.message);
      }
      
      // Dynamics 365のエラーメッセージを整形
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'アカウントの作成に失敗しました';
      
      throw new Error(errorMessage);
    }
  }

  // 営業案件を作成
  async createOpportunity(userId, opportunityData) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      const createUrl = `${this.baseUrl}/api/data/${this.apiVersion}/opportunities`;
      
      const data = {
        // 基本情報
        name: opportunityData.name,  // トピック
        'parentaccountid@odata.bind': `/accounts(${opportunityData.accountId})`,  // 見込み顧客
        description: opportunityData.description || '',  // 説明
        
        // 営業情報
        opportunityratingcode: 2, // 評価: Warm（温かい見込み）
        salesstage: 0, // 営業ステージ: Qualify（見込み評価）
        purchasetimeframe: 1, // 購入時期: This Quarter（今四半期）
        purchaseprocess: 1, // 購入プロセス: Individual（個人決定）
        
        // ステータス
        statecode: 0, // Open
        statuscode: 1, // In Progress
        
        // その他のフィールド（オプション）- 2000文字制限があるため要約
        currentsituation: opportunityData.description ? 
          opportunityData.description.substring(0, 2000) : '',  // 現在の状況（最初の2000文字）
        customerneed: opportunityData.description && opportunityData.description.includes('【商談内容・ヒアリング詳細】') ? 
          '詳細はメモをご確認ください' : '営業日報システムから作成',  // 顧客のニーズ
        proposedsolution: '継続的な商談を進めています'  // 提案ソリューション
      };
      
      // 金額が設定されている場合のみ追加
      if (opportunityData.estimatedValue) {
        const valueStr = (opportunityData.estimatedValue || '').toString();
        const valueNum = parseFloat(valueStr.replace(/[^0-9.-]/g, ''));
        if (!isNaN(valueNum) && valueNum > 0) {
          data.estimatedvalue = valueNum;
        }
      }
      
      // スケジュールが設定されている場合のみ追加
      if (opportunityData.estimatedCloseDate) {
        const closeDate = new Date(opportunityData.estimatedCloseDate);
        if (!isNaN(closeDate.getTime())) {
          data.estimatedclosedate = closeDate.toISOString().split('T')[0];
        }
      } else {
        // デフォルトで90日後
        data.estimatedclosedate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
      
      console.log('Creating opportunity with data:', JSON.stringify(data, null, 2));
      
      const response = await axios.post(createUrl, data, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'return=representation'
        }
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Dynamics365 createOpportunity error:');
      if (error.response?.data?.error) {
        console.error('Error details:', JSON.stringify(error.response.data.error, null, 2));
      } else {
        console.error('Error:', error.response?.data || error.message);
      }
      
      // Dynamics 365のエラーメッセージを整形
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          '営業案件の作成に失敗しました';
      
      throw new Error(errorMessage);
    }
  }

  // 活動（タスク）を作成
  async createActivity(userId, activityData) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      const createUrl = `${this.baseUrl}/api/data/${this.apiVersion}/tasks`;
      
      const data = {
        subject: activityData.subject,
        description: activityData.description,
        scheduledend: activityData.activityDate || new Date().toISOString(),
        statecode: 0, // Open (タスクをOpenで作成)
        statuscode: 2, // Not Started
        prioritycode: 1, // Normal
        'regardingobjectid_opportunity@odata.bind': `/opportunities(${activityData.opportunityId})`
      };
      
      const response = await axios.post(createUrl, data, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        }
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Dynamics365 createActivity error:', error.response?.data || error);
      throw error;
    }
  }

  // メモ（注釈）を営業案件に追加
  async addNoteToOpportunity(userId, opportunityId, noteData) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      const createUrl = `${this.baseUrl}/api/data/${this.apiVersion}/annotations`;
      
      const data = {
        subject: noteData.title,
        notetext: noteData.body,
        'objectid_opportunity@odata.bind': `/opportunities(${opportunityId})`,
        isdocument: false
      };
      
      const response = await axios.post(createUrl, data, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        }
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Dynamics365 addNoteToOpportunity error:', error.response?.data || error);
      throw error;
    }
  }

  // 日報をCRMに新規作成
  async createReportInCRM(userId, report, crmData) {
    try {
      console.log('Creating report in Dynamics365...');
      console.log('Report data:', {
        hasQA: !!(report.questions_answers && report.questions_answers.length > 0),
        qaCount: report.questions_answers?.length || 0,
        slots: Object.keys(report.slots || {}),
        sampleQA: report.questions_answers?.[0]
      });
      
      // 1. 取引先企業を作成または検索
      const account = await this.findOrCreateAccount(userId, {
        name: crmData.customer || report.slots?.customer || '未設定企業'
      });

      // 2. 営業案件を作成（詳細情報を含む）
      const formattedDescription = this.formatReportForCRM(report);
      console.log('Formatted description length:', formattedDescription.length);
      console.log('Formatted description preview:', formattedDescription.substring(0, 500));
      console.log('Full formatted description:', formattedDescription);
      
      const opportunity = await this.createOpportunity(userId, {
        name: crmData.project || report.slots?.project || `${new Date().toLocaleDateString('ja-JP')}の商談`,
        accountId: account.accountid,
        estimatedValue: crmData.budget || report.slots?.budget,  // amount -> budget
        estimatedCloseDate: crmData.schedule || report.slots?.schedule,
        description: formattedDescription  // 詳細情報を説明欄に追加
      });

      // 3. 活動（タスク）を作成 - 次のアクションを明確に記載
      const activitySubject = report.slots?.next_action 
        ? `【次のアクション】${report.slots.next_action}` 
        : `営業日報 - ${new Date(report.report_date).toLocaleDateString('ja-JP')}`;
      
      const activity = await this.createActivity(userId, {
        subject: activitySubject,
        description: formattedDescription,  // 同じフォーマット済みの内容を使用
        opportunityId: opportunity.opportunityid,
        activityDate: report.report_date
      });

      // 4. メモを追加（ヒアリング内容を含む詳細情報）
      if (report.questions_answers && report.questions_answers.length > 0) {
        const qaNotesBody = this.formatReportForCRM(report);
        await this.addNoteToOpportunity(userId, opportunity.opportunityid, {
          title: '営業日報詳細（AIヒアリング内容含む）',
          body: qaNotesBody
        });
      }
      
      // 5. 追加メモ（課題と次のアクション）
      if (report.slots?.issues || report.slots?.next_action) {
        await this.addNoteToOpportunity(userId, opportunity.opportunityid, {
          title: '重要事項',
          body: `課題: ${report.slots?.issues || 'なし'}\n次のアクション: ${report.slots?.next_action || 'なし'}`
        });
      }

      return {
        accountId: account.accountid,
        accountName: account.name,
        opportunityId: opportunity.opportunityid,
        opportunityName: opportunity.name,
        activityId: activity.activityid,
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
      const accessToken = await this.getAccessToken(userId);
      
      // 更新する商談名を決定
      const updatedOpportunityName = crmData.project || report.slots?.project || crmData.opportunityName;
      
      // 既存の営業案件を更新
      if (crmData.opportunityId) {
        const updateUrl = `${this.baseUrl}/api/data/${this.apiVersion}/opportunities(${crmData.opportunityId})`;
        
        const updateData = {
          name: updatedOpportunityName
        };
        
        // 金額が設定されている場合のみ追加（数値に変換）
        if (crmData.amount || report.slots?.budget) {
          const budgetStr = (crmData.amount || report.slots?.budget || '').toString();
          const budgetNum = parseFloat(budgetStr.replace(/[^0-9.-]/g, ''));
          if (!isNaN(budgetNum)) {
            updateData.estimatedvalue = budgetNum;
          }
        }
        
        // スケジュールが設定されている場合のみ追加（日付形式に変換）
        if (crmData.schedule || report.slots?.schedule) {
          const scheduleStr = crmData.schedule || report.slots?.schedule;
          // 日付文字列をISO形式に変換
          const scheduleDate = new Date(scheduleStr);
          if (!isNaN(scheduleDate.getTime())) {
            updateData.estimatedclosedate = scheduleDate.toISOString().split('T')[0];
          }
        }
        
        console.log('Updating opportunity:', {
          url: updateUrl,
          data: updateData
        });
        
        try {
          await axios.patch(updateUrl, updateData, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0'
            }
          });
        } catch (patchError) {
          console.error('Opportunity update error:', patchError.response?.data?.error || patchError.response?.data);
          console.error('Error details:', {
            message: patchError.response?.data?.error?.message,
            code: patchError.response?.data?.error?.code,
            details: patchError.response?.data?.error?.details
          });
          throw patchError;
        }
      }

      // 新しい活動を追加
      const formattedUpdateDescription = this.formatReportForCRM(report);
      console.log('Update - Formatted description length:', formattedUpdateDescription.length);
      console.log('Update - Has Q&A:', !!(report.questions_answers && report.questions_answers.length > 0));
      
      const activity = await this.createActivity(userId, {
        subject: `営業日報更新 - ${new Date(report.report_date).toLocaleDateString('ja-JP')}`,
        description: formattedUpdateDescription,
        opportunityId: crmData.opportunityId,
        activityDate: report.report_date
      });
      
      // 更新時もヒアリング内容をメモに追加
      if (report.questions_answers && report.questions_answers.length > 0) {
        await this.addNoteToOpportunity(userId, crmData.opportunityId, {
          title: `営業日報更新 - ${new Date(report.report_date).toLocaleDateString('ja-JP')}`,
          body: formattedUpdateDescription
        });
      }

      // 更新された情報を含めて返す
      return {
        ...crmData,
        // 更新された値で上書き
        opportunityName: updatedOpportunityName,  // 更新した名前を使用
        project: updatedOpportunityName,  // 同じ値
        activityId: activity.activityid,
        syncDate: new Date().toISOString(),
        updated: true
      };
    } catch (error) {
      console.error('updateReportInCRM error:', error);
      throw error;
    }
  }

  // 日報をCRM用にフォーマット
  formatReportForCRM(report) {
    const sections = [];
    
    // スロットデータを取得（report_slotsテーブルから）
    const slots = report.slots || {};
    
    sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
    sections.push('【営業日報サマリー】');
    sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
    sections.push(`📅 日付: ${new Date(report.report_date || report.date).toLocaleDateString('ja-JP')}`);
    
    if (slots.customer) sections.push(`🏢 顧客: ${slots.customer}`);
    if (slots.project) sections.push(`📋 案件: ${slots.project}`);
    if (slots.participants) sections.push(`👥 参加者: ${slots.participants}`);
    if (slots.location) sections.push(`📍 場所: ${slots.location}`);
    if (slots.budget) sections.push(`💰 予算: ${slots.budget}`);
    if (slots.schedule) sections.push(`📆 スケジュール: ${slots.schedule}`);
    
    sections.push('');
    
    // ヒアリング内容（Q&A）
    if (report.questions_answers && report.questions_answers.length > 0) {
      sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
      sections.push('【商談内容・ヒアリング詳細】');
      sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
      report.questions_answers.forEach((qa, index) => {
        sections.push(`\n質問${index + 1}: ${qa.question}`);
        sections.push(`回答: ${qa.answer}`);
      });
      sections.push('');
    }
    
    // 課題・リスク
    if (slots.issues) {
      sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
      sections.push('【課題・リスク】');
      sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
      sections.push(slots.issues);
      sections.push('');
    }
    
    // 次のアクション
    if (slots.next_action) {
      sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
      sections.push('【次のアクション】');
      sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
      sections.push(`✅ ${slots.next_action}`);
      sections.push('');
    }
    
    // 個人情報メモ
    if (slots.personal_info) {
      sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
      sections.push('【メモ・備考】');
      sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
      sections.push(slots.personal_info);
    }
    
    // 関係性構築ノート
    if (slots.relationship_notes) {
      sections.push('\n【関係性構築ノート】');
      sections.push(slots.relationship_notes);
    }
    
    sections.push('\n━━━━━━━━━━━━━━━━━━━━━━━━━');
    sections.push('営業日報システムより自動連携');
    sections.push(`連携日時: ${new Date().toLocaleString('ja-JP')}`);
    sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return sections.join('\n');
  }

  // 取引先企業を検索
  async searchAccounts(userId, searchTerm) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      const url = `${this.baseUrl}/api/data/${this.apiVersion}/accounts?$filter=contains(name,'${searchTerm}')&$select=accountid,name,industrycode,address1_city,telephone1,websiteurl&$orderby=modifiedon desc&$top=20`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.include-annotations="*"'
        }
      });
      
      return response.data.value || [];
      
    } catch (error) {
      console.error('Dynamics365 searchAccounts error:', error.response?.data || error);
      throw error;
    }
  }

  // 営業案件を検索
  async searchOpportunities(userId, searchTerm, accountId = null) {
    const accessToken = await this.getAccessToken(userId);
    
    try {
      let filter = `contains(name,'${searchTerm}')`;
      
      if (accountId) {
        filter += ` and _parentaccountid_value eq ${accountId}`;
      }
      
      const url = `${this.baseUrl}/api/data/${this.apiVersion}/opportunities?$filter=${filter}&$select=opportunityid,name,estimatedvalue,estimatedclosedate,statecode&$expand=parentaccountid($select=name)&$orderby=modifiedon desc&$top=20`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Prefer': 'odata.include-annotations="*"'
        }
      });
      
      return response.data.value || [];
      
    } catch (error) {
      console.error('Dynamics365 searchOpportunities error:', error.response?.data || error);
      throw error;
    }
  }

  // 業界コードをマッピング
  mapIndustryCode(industry) {
    const industryMap = {
      '建設業': 7,
      '保険業': 9,
      '金融業': 6,
      '製造業': 11,
      'IT業': 5,
      '医療・介護': 8,
      '教育': 5,
      '小売業': 13,
      '不動産業': 12,
      '公共・自治体': 7
    };
    
    return industryMap[industry] || 1; // デフォルトは「会計」
  }

  // 日報データをDynamics365用にフォーマット
  formatReportForDynamics365(report) {
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
    if (!budgetString) return 0;
    
    // 円記号や「万」「億」などを処理
    const normalized = budgetString
      .replace(/[￥¥,、]/g, '')
      .replace(/万/g, '0000')
      .replace(/億/g, '00000000');
    
    const amount = parseFloat(normalized);
    return isNaN(amount) ? 0 : amount;
  }

  // 日付をパース
  parseScheduleDate(scheduleString) {
    if (!scheduleString) {
      // デフォルトで3ヶ月後
      const date = new Date();
      date.setMonth(date.getMonth() + 3);
      return date.toISOString();
    }
    
    // 様々な日付形式を処理
    const patterns = [
      /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/,
      /(\d{1,2})[月/-](\d{1,2})/
    ];
    
    for (const pattern of patterns) {
      const match = scheduleString.match(pattern);
      if (match) {
        let date;
        if (match.length === 4) {
          // 年月日
          date = new Date(match[1], match[2] - 1, match[3]);
        } else if (match.length === 3) {
          // 月日のみ（今年として処理）
          const year = new Date().getFullYear();
          date = new Date(year, match[1] - 1, match[2]);
        }
        
        if (date && !isNaN(date)) {
          return date.toISOString();
        }
      }
    }
    
    // パースできない場合は3ヶ月後
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString();
  }
}

module.exports = Dynamics365Service;