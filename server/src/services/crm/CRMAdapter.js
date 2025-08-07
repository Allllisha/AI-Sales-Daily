/**
 * CRMアダプター基底クラス
 * 各CRM（Dynamics365, Salesforce, HubSpotなど）の統一インターフェース
 */
class CRMAdapter {
  constructor(config) {
    this.config = config;
    this.crmType = this.constructor.name.toLowerCase().replace('adapter', '');
  }

  /**
   * 取引先企業一覧を取得
   * @param {number} limit - 取得件数制限
   * @returns {Promise<Array>} 統一フォーマットの企業リスト
   */
  async getAccounts(limit = 50) {
    throw new Error(`getAccounts not implemented in ${this.constructor.name}`);
  }

  /**
   * 商談一覧を取得
   * @param {string} accountId - 取引先企業ID（オプション）
   * @param {number} limit - 取得件数制限
   * @returns {Promise<Array>} 統一フォーマットの商談リスト
   */
  async getOpportunities(accountId = null, limit = 50) {
    throw new Error(`getOpportunities not implemented in ${this.constructor.name}`);
  }

  /**
   * 活動一覧を取得
   * @param {string} regardingObjectId - 関連オブジェクトID（オプション）
   * @param {number} limit - 取得件数制限
   * @returns {Promise<Array>} 統一フォーマットの活動リスト
   */
  async getActivities(regardingObjectId = null, limit = 50) {
    throw new Error(`getActivities not implemented in ${this.constructor.name}`);
  }

  /**
   * メモ・議事録一覧を取得
   * @param {string} regardingObjectId - 関連オブジェクトID（オプション）
   * @param {number} limit - 取得件数制限
   * @returns {Promise<Array>} 統一フォーマットのメモリスト
   */
  async getNotes(regardingObjectId = null, limit = 50) {
    throw new Error(`getNotes not implemented in ${this.constructor.name}`);
  }

  /**
   * 会議情報一覧を取得
   * @param {string} regardingObjectId - 関連オブジェクトID（オプション）
   * @param {number} limit - 取得件数制限
   * @returns {Promise<Array>} 統一フォーマットの会議リスト
   */
  async getMeetings(regardingObjectId = null, limit = 50) {
    throw new Error(`getMeetings not implemented in ${this.constructor.name}`);
  }

  /**
   * 活動（日報）を作成
   * @param {Object} reportData - 日報データ
   * @returns {Promise<Object>} 作成結果
   */
  async createActivity(reportData) {
    throw new Error(`createActivity not implemented in ${this.constructor.name}`);
  }

  /**
   * 日報をCRMに同期
   * @param {Object} reportData - 日報データ
   * @returns {Promise<Object>} 同期結果
   */
  async syncReport(reportData) {
    try {
      const activity = await this.createActivity(reportData);
      
      return {
        external_activity_id: this.extractActivityId(activity),
        sync_status: 'synced',
        last_sync_at: new Date(),
        external_data: {
          activity: activity,
          account_id: reportData.crm_data?.account?.id,
          opportunity_id: reportData.crm_data?.opportunity?.id
        }
      };
    } catch (error) {
      return {
        sync_status: 'error',
        sync_error: error.message,
        last_sync_at: new Date()
      };
    }
  }

  /**
   * 接続テスト
   * @returns {Promise<Object>} 接続結果
   */
  async testConnection() {
    throw new Error(`testConnection not implemented in ${this.constructor.name}`);
  }

  /**
   * 企業データを統一フォーマットに変換
   * @param {Array} accounts - CRM固有の企業データ
   * @returns {Array} 統一フォーマットの企業データ
   */
  normalizeAccounts(accounts) {
    throw new Error(`normalizeAccounts not implemented in ${this.constructor.name}`);
  }

  /**
   * 商談データを統一フォーマットに変換
   * @param {Array} opportunities - CRM固有の商談データ
   * @returns {Array} 統一フォーマットの商談データ
   */
  normalizeOpportunities(opportunities) {
    throw new Error(`normalizeOpportunities not implemented in ${this.constructor.name}`);
  }

  /**
   * 活動データを統一フォーマットに変換
   * @param {Array} activities - CRM固有の活動データ
   * @returns {Array} 統一フォーマットの活動データ
   */
  normalizeActivities(activities) {
    throw new Error(`normalizeActivities not implemented in ${this.constructor.name}`);
  }

  /**
   * 作成された活動からIDを抽出
   * @param {Object} activity - 作成された活動データ
   * @returns {string} 活動ID
   */
  extractActivityId(activity) {
    throw new Error(`extractActivityId not implemented in ${this.constructor.name}`);
  }

  /**
   * 日報データをCRM固有のフォーマットに変換
   * @param {Object} reportData - 統一フォーマットの日報データ
   * @returns {Object} CRM固有の活動データ
   */
  formatReportForCRM(reportData) {
    throw new Error(`formatReportForCRM not implemented in ${this.constructor.name}`);
  }

  /**
   * 統一フォーマットの基本構造
   */
  static getUnifiedFormats() {
    return {
      account: {
        id: 'string',
        name: 'string',
        phone: 'string',
        email: 'string',
        _source: 'string', // CRM名
        _original: 'object' // 元データ
      },
      opportunity: {
        id: 'string',
        name: 'string',
        customer: 'string',
        customerId: 'string',
        estimatedValue: 'number',
        closeDate: 'string',
        stage: 'string',
        status: 'string',
        _source: 'string',
        _original: 'object'
      },
      activity: {
        id: 'string',
        subject: 'string',
        description: 'string',
        createdOn: 'string',
        status: 'string',
        priority: 'string',
        regardingObjectId: 'string',
        _source: 'string',
        _original: 'object'
      },
      note: {
        id: 'string',
        subject: 'string',
        noteText: 'string',
        createdOn: 'string',
        modifiedOn: 'string',
        regardingObjectId: 'string',
        fileName: 'string',
        mimeType: 'string',
        _source: 'string',
        _original: 'object'
      },
      meeting: {
        id: 'string',
        subject: 'string',
        description: 'string',
        scheduledStart: 'string',
        scheduledEnd: 'string',
        actualStart: 'string',
        actualEnd: 'string',
        location: 'string',
        status: 'string',
        regardingObjectId: 'string',
        _source: 'string',
        _original: 'object'
      }
    };
  }
}

module.exports = CRMAdapter;