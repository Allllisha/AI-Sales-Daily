import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 認証API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
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
  getTeamReports: async (params = {}) => {
    const response = await api.get('/api/reports/team', { params });
    return response.data;
  }
};

// AI API
export const aiAPI = {
  startHearing: async () => {
    const response = await api.post('/api/ai/hearing/start');
    return response.data;
  },
  submitAnswer: async (data) => {
    const response = await api.post('/api/ai/hearing/answer', data);
    return response.data;
  },
  correctText: async (text) => {
    const response = await api.post('/api/ai/correct-text', { text });
    return response.data;
  }
};

// 分析API
export const analyticsAPI = {
  getPersonalAnalytics: async (period = 30) => {
    const response = await api.get(`/api/analytics/personal?period=${period}`);
    return response.data;
  },
  getTeamAnalytics: async (period = 30, userIds = []) => {
    const params = new URLSearchParams({ period });
    if (userIds.length > 0) {
      userIds.forEach(id => params.append('userIds', id));
    }
    const response = await api.get(`/api/analytics/team?${params}`);
    return response.data;
  }
};


export default api;