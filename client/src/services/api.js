import axios from 'axios';

// Force empty base URL in development to use Vite proxy
const API_BASE_URL = '';

// Debug logging with cache buster
console.log('[API Debug] Cache Buster v3 - FORCE LOCALHOST:', {
  DEV: import.meta.env.DEV,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  API_BASE_URL,
  mode: import.meta.env.MODE,
  window_location: window.location.origin,
  final_baseURL_used: API_BASE_URL,
  timestamp: new Date().toISOString()
});

// Force localhost in development
if (import.meta.env.DEV) {
  console.log('[API Debug] Development mode detected - using relative URLs for proxy');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on the login page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 認証API
export const authAPI = {
  login: async (email, password) => {
    console.log('API: Sending login request...');
    console.log('[API Debug] Login URL:', api.defaults.baseURL + '/api/auth/login');
    const response = await api.post('/api/auth/login', { email, password });
    console.log('API: Login response:', response.data);
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  }
};

// ユーザーAPI
export const userAPI = {
  getMe: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  },
  getSubordinates: async () => {
    const response = await api.get('/api/users/subordinates');
    return response.data;
  },
  getTeamMembers: async () => {
    const response = await api.get('/api/users/team');
    return response.data;
  },
  getManagers: async () => {
    const response = await api.get('/api/users/managers');
    return response.data;
  }
};

// 日報API
export const reportAPI = {
  getReports: async (params) => {
    const response = await api.get('/api/reports', { params });
    return response.data;
  },
  getReport: async (id) => {
    const response = await api.get(`/api/reports/${id}`);
    return response.data;
  },
  createReport: async (data) => {
    const response = await api.post('/api/reports', data);
    return response.data;
  },
  updateReport: async (id, data) => {
    const response = await api.put(`/api/reports/${id}`, data);
    return response.data;
  },
  deleteReport: async (id) => {
    const response = await api.delete(`/api/reports/${id}`);
    return response.data;
  },
  updateReportStatus: async (id, status) => {
    const response = await api.put(`/api/reports/${id}/status`, { status });
    return response.data;
  },
  getTeamReports: async (params = {}) => {
    const response = await api.get('/api/reports/team', { params });
    return response.data;
  }
};

// AI API
export const aiAPI = {
  startHearing: async (data = {}) => {
    const response = await api.post('/api/ai/hearing/start', data);
    return response.data;
  },
  submitAnswer: async (data) => {
    const response = await api.post('/api/ai/hearing/answer', data);
    return response.data;
  },
  correctText: async (text) => {
    const response = await api.post('/api/ai/correct-text', { text });
    return response.data;
  },
  correctReportText: async (text) => {
    const response = await api.post('/api/ai/correct-report', { text });
    return response.data;
  },
  startMeetingNotes: async (data) => {
    const response = await api.post('/api/ai/hearing/meeting', data);
    return response.data;
  },
  getSession: async (sessionId) => {
    const response = await api.get(`/api/ai/hearing/session/${sessionId}`);
    return response.data;
  },
  getSuggestions: async (data) => {
    const response = await api.post('/api/ai/hearing/suggestions', data);
    return response.data;
  }
};

// ファイルアップロードAPI
export const uploadAPI = {
  uploadFile: async (formData) => {
    const response = await api.post('/api/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  processFile: async (fileId, type) => {
    const response = await api.post('/api/upload/process', { fileId, type });
    return response.data;
  }
};

// 分析API
export const analyticsAPI = {
  getPersonalAnalytics: async (period = 30) => {
    const response = await api.get(`/api/analytics/personal?period=${period}`);
    return response.data;
  },
  
  getPersonalIssues: async (period = 30) => {
    const response = await api.get(`/api/analytics/personal/issues?period=${period}`);
    return response.data;
  },
  
  getTeamAnalytics: async (period = 30, userIds = []) => {
    const params = new URLSearchParams({ period });
    if (userIds.length > 0) {
      userIds.forEach(id => params.append('userIds', id));
    }
    const response = await api.get(`/api/analytics/team?${params}`);
    return response.data;
  },
  
  getTeamIssues: async (period = 30, userIds = []) => {
    const params = new URLSearchParams({ period });
    if (userIds.length > 0) {
      userIds.forEach(id => params.append('userIds', id));
    }
    const response = await api.get(`/api/analytics/team/issues?${params}`);
    return response.data;
  }
};

// Dynamics 365 API
export const dynamics365API = {
  testConnection: async () => {
    const response = await api.get('/api/dynamics365/test');
    return response.data;
  },
  getAccounts: async (limit = 50) => {
    const response = await api.get(`/api/dynamics365/accounts?limit=${limit}`);
    return response.data;
  },
  getOpportunities: async (accountId = null, limit = 50) => {
    const params = new URLSearchParams({ limit });
    if (accountId) params.append('accountId', accountId);
    const response = await api.get(`/api/dynamics365/opportunities?${params}`);
    return response.data;
  },
  getActivities: async (regardingObjectId = null, limit = 50) => {
    const params = new URLSearchParams({ limit });
    if (regardingObjectId) params.append('regardingObjectId', regardingObjectId);
    const response = await api.get(`/api/dynamics365/activities?${params}`);
    return response.data;
  },
  getNotes: async (regardingObjectId = null, limit = 50) => {
    const params = new URLSearchParams({ limit });
    if (regardingObjectId) params.append('regardingObjectId', regardingObjectId);
    const response = await api.get(`/api/dynamics365/notes?${params}`);
    return response.data;
  },
  getMeetings: async (regardingObjectId = null, limit = 50) => {
    const params = new URLSearchParams({ limit });
    if (regardingObjectId) params.append('regardingObjectId', regardingObjectId);
    const response = await api.get(`/api/dynamics365/meetings?${params}`);
    return response.data;
  },
  syncReport: async (reportData) => {
    const response = await api.post('/api/dynamics365/sync-report', reportData);
    return response.data;
  }
};

// Salesforce API
export const salesforceAPI = {
  testConnection: async () => {
    const response = await api.post('/api/crm/test-connection', {
      crmType: 'salesforce',
      config: {}
    });
    return response.data;
  },
  getAccounts: async (limit = 50) => {
    const response = await api.get(`/api/crm/salesforce/accounts?limit=${limit}`);
    return response.data;
  },
  getOpportunities: async (accountId = null, limit = 50) => {
    const params = new URLSearchParams({ limit });
    if (accountId) params.append('accountId', accountId);
    const response = await api.get(`/api/crm/salesforce/opportunities?${params}`);
    return response.data;
  },
  getActivities: async (regardingObjectId = null, limit = 50) => {
    const params = new URLSearchParams({ limit });
    if (regardingObjectId) params.append('regardingObjectId', regardingObjectId);
    const response = await api.get(`/api/crm/salesforce/activities?${params}`);
    return response.data;
  },
  getNotes: async (regardingObjectId = null, limit = 50) => {
    const params = new URLSearchParams({ limit });
    if (regardingObjectId) params.append('regardingObjectId', regardingObjectId);
    const response = await api.get(`/api/crm/salesforce/notes?${params}`);
    return response.data;
  },
  getMeetings: async (regardingObjectId = null, limit = 50) => {
    const params = new URLSearchParams({ limit });
    if (regardingObjectId) params.append('regardingObjectId', regardingObjectId);
    const response = await api.get(`/api/crm/salesforce/meetings?${params}`);
    return response.data;
  },
  syncReport: async (reportData) => {
    const response = await api.post('/api/crm/salesforce/sync-report', reportData);
    return response.data;
  }
};

// 統合CRM API
export const crmAPI = {
  getAvailableCRMs: async () => {
    const response = await api.get('/api/crm/available');
    return response.data;
  },
  testConnection: async (crmType, config = {}) => {
    const response = await api.post('/api/crm/test-connection', {
      crmType,
      config
    });
    return response.data;
  }
};

// CRM統合API（シンプル版）
export const crmIntegrationAPI = {
  // 日報をCRMに同期（新規作成または更新）
  syncReport: async (reportId, crmType, action, crmData) => {
    const response = await api.post(`/api/crm-integration/reports/${reportId}/sync`, {
      crmType,
      action,
      crmData
    });
    return response.data;
  },
  
  // CRMマッピング情報を取得
  getCRMMapping: async (reportId) => {
    const response = await api.get(`/api/crm-integration/reports/${reportId}/crm-mapping`);
    return response.data;
  },
  
  // 同期履歴を取得
  getSyncHistory: async (reportId = null, limit = 50) => {
    const params = new URLSearchParams();
    if (reportId) params.append('reportId', reportId);
    params.append('limit', limit);
    const response = await api.get(`/api/crm-integration/sync-history?${params}`);
    return response.data;
  },

  // CRMログイン状態を確認
  checkAuthStatus: async () => {
    const response = await api.get('/api/crm-auth/check-auth');
    return response.data;
  },

  // CRM検索
  searchCRM: async (searchTerm, crmType) => {
    const response = await api.post('/api/crm-auth/search', {
      searchTerm,
      crmType
    });
    return response.data;
  },
  
  // 最近のCRM案件を取得
  getRecentOpportunities: async (crmType = 'salesforce') => {
    const response = await api.get('/api/crm-integration/recent-opportunities', {
      params: { crmType }
    });
    return response.data;
  },
  
  // CRM紐付けを削除
  removeMapping: async (reportId, mappingId) => {
    const response = await api.delete(`/api/crm-integration/reports/${reportId}/crm-mapping/${mappingId}`);
    return response.data;
  },
  
  // CRM紐付けの優先順位を更新
  updateMappingPriority: async (reportId, mappingId, priority) => {
    const response = await api.put(`/api/crm-integration/reports/${reportId}/crm-mapping/${mappingId}/priority`, {
      priority
    });
    return response.data;
  }
};

export default api;