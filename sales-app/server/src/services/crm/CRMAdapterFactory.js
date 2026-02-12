const Dynamics365Adapter = require('./Dynamics365Adapter');
const SalesforceAdapter = require('./SalesforceAdapter');
const pool = require('../../db/pool');

/**
 * CRMアダプターファクトリークラス
 * CRMタイプに応じて適切なアダプターインスタンスを生成
 */
class CRMAdapterFactory {
  
  /**
   * 利用可能なCRMタイプ一覧
   */
  static get AVAILABLE_CRMS() {
    return {
      none: { label: 'CRM連携なし', adapter: null },
      dynamics365: { label: 'Microsoft Dynamics 365', adapter: Dynamics365Adapter },
      salesforce: { label: 'Salesforce', adapter: SalesforceAdapter },
      // 将来追加予定
      // hubspot: { label: 'HubSpot', adapter: HubSpotAdapter },
    };
  }

  /**
   * CRMアダプターインスタンスを作成
   * @param {string} crmType - CRMタイプ ('dynamics365', 'salesforce', 'hubspot', etc.)
   * @param {Object} config - CRM固有の設定
   * @returns {CRMAdapter|null} - アダプターインスタンスまたはnull（CRM連携なしの場合）
   */
  static create(crmType, config = {}) {
    if (!crmType || crmType === 'none') {
      return null; // CRM連携なし
    }

    const crmInfo = this.AVAILABLE_CRMS[crmType];
    if (!crmInfo || !crmInfo.adapter) {
      throw new Error(`Unsupported CRM type: ${crmType}`);
    }

    return new crmInfo.adapter(config);
  }

  /**
   * ユーザー固有のCRMアダプターインスタンスを作成
   * @param {string} crmType - CRMタイプ
   * @param {number} userId - ユーザーID
   * @param {Object} fallbackConfig - フォールバック用設定（環境変数など）
   * @returns {CRMAdapter|null} - アダプターインスタンス
   */
  static async createForUser(crmType, userId, fallbackConfig = {}) {
    if (!crmType || crmType === 'none') {
      return null;
    }

    try {
      // ユーザーのCRMトークンを取得
      const tokenResult = await pool.query(
        'SELECT access_token, refresh_token, instance_url, expires_at FROM user_crm_tokens WHERE user_id = $1 AND crm_type = $2',
        [userId, crmType]
      );

      let config = { ...fallbackConfig, userId };

      if (tokenResult.rows.length > 0) {
        const tokenData = tokenResult.rows[0];
        
        // トークンの有効期限チェック
        if (new Date(tokenData.expires_at) > new Date()) {
          // 有効なトークンがある場合は個別認証設定を使用
          config = {
            ...config,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            instanceUrl: tokenData.instance_url,
            isUserAuthenticated: true
          };
        }
      }

      return this.create(crmType, config);
    } catch (error) {
      console.error('Error creating user-specific CRM adapter:', error);
      // エラーの場合はフォールバック設定で作成
      return this.create(crmType, { ...fallbackConfig, userId });
    }
  }

  /**
   * 利用可能なCRM一覧を取得
   * @returns {Array} CRM情報の配列
   */
  static getAvailableCRMs() {
    return Object.entries(this.AVAILABLE_CRMS).map(([key, value]) => ({
      value: key,
      label: value.label,
      available: key === 'none' || this.isCRMConfigured(key)
    }));
  }

  /**
   * 指定されたCRMが設定済みかチェック
   * @param {string} crmType - CRMタイプ
   * @returns {boolean} 設定済みかどうか
   */
  static isCRMConfigured(crmType) {
    switch (crmType) {
      case 'dynamics365':
        return !!(
          process.env.DYNAMICS_CLIENT_ID && 
          process.env.DYNAMICS_CLIENT_SECRET && 
          process.env.DYNAMICS_TENANT_ID && 
          process.env.DYNAMICS_URL
        );
      case 'salesforce':
        return !!(
          process.env.SALESFORCE_CLIENT_ID && 
          process.env.SALESFORCE_CLIENT_SECRET && 
          process.env.SALESFORCE_USERNAME && 
          process.env.SALESFORCE_PASSWORD &&
          process.env.SALESFORCE_SECURITY_TOKEN
        );
      case 'hubspot':
        // 将来実装
        return false;
      default:
        return false;
    }
  }

  /**
   * CRMタイプの検証
   * @param {string} crmType - CRMタイプ
   * @returns {boolean} 有効なCRMタイプかどうか
   */
  static isValidCRMType(crmType) {
    return Object.keys(this.AVAILABLE_CRMS).includes(crmType);
  }

  /**
   * CRM設定の検証
   * @param {string} crmType - CRMタイプ
   * @param {Object} config - CRM設定
   * @returns {Object} 検証結果 { valid: boolean, errors: string[] }
   */
  static validateCRMConfig(crmType, config) {
    const errors = [];

    if (!this.isValidCRMType(crmType)) {
      errors.push(`Invalid CRM type: ${crmType}`);
      return { valid: false, errors };
    }

    if (crmType === 'none') {
      return { valid: true, errors: [] };
    }

    switch (crmType) {
      case 'dynamics365':
        if (!config.clientId && !process.env.DYNAMICS_CLIENT_ID) {
          errors.push('Dynamics 365 Client ID is required');
        }
        if (!config.clientSecret && !process.env.DYNAMICS_CLIENT_SECRET) {
          errors.push('Dynamics 365 Client Secret is required');
        }
        if (!config.tenantId && !process.env.DYNAMICS_TENANT_ID) {
          errors.push('Dynamics 365 Tenant ID is required');
        }
        if (!config.dynamicsUrl && !process.env.DYNAMICS_URL) {
          errors.push('Dynamics 365 URL is required');
        }
        break;
        
      case 'salesforce':
        if (!config.clientId && !process.env.SALESFORCE_CLIENT_ID) {
          errors.push('Salesforce Client ID is required');
        }
        if (!config.clientSecret && !process.env.SALESFORCE_CLIENT_SECRET) {
          errors.push('Salesforce Client Secret is required');
        }
        if (!config.username && !process.env.SALESFORCE_USERNAME) {
          errors.push('Salesforce Username is required');
        }
        if (!config.password && !process.env.SALESFORCE_PASSWORD) {
          errors.push('Salesforce Password is required');
        }
        if (!config.securityToken && !process.env.SALESFORCE_SECURITY_TOKEN) {
          errors.push('Salesforce Security Token is required');
        }
        break;
        
      // 将来のCRM追加時はここに追加
      default:
        errors.push(`Configuration validation not implemented for ${crmType}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * CRM設定のマスキング（セキュリティ用）
   * @param {Object} config - CRM設定
   * @returns {Object} マスキングされた設定
   */
  static maskConfig(config) {
    const masked = { ...config };
    
    // 機密情報をマスキング
    const sensitiveFields = ['clientSecret', 'password', 'apiKey', 'token'];
    sensitiveFields.forEach(field => {
      if (masked[field]) {
        masked[field] = '***masked***';
      }
    });

    return masked;
  }
}

module.exports = CRMAdapterFactory;