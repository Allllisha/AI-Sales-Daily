import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 with token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/register') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token');
        }
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const newToken = response.data.token;
        localStorage.setItem('token', newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
  refresh: async () => {
    const response = await api.post('/api/auth/refresh');
    return response.data;
  },
  resetPassword: async (currentPassword, newPassword) => {
    const response = await api.post('/api/auth/reset-password', { currentPassword, newPassword });
    return response.data;
  }
};

// User API
export const userAPI = {
  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  }
};

// Knowledge API
export const knowledgeAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/knowledge', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/knowledge/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/knowledge', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/api/knowledge/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/knowledge/${id}`);
    return response.data;
  },
  search: async (query, filters = {}) => {
    const response = await api.post('/api/knowledge/search', { query, ...filters });
    return response.data;
  },
  getRelated: async (id) => {
    const response = await api.get(`/api/knowledge/${id}/related`);
    return response.data;
  },
  markUseful: async (id) => {
    const response = await api.post(`/api/knowledge/${id}/useful`);
    return response.data;
  },
  approve: async (id) => {
    const response = await api.post(`/api/knowledge/${id}/approve`);
    return response.data;
  },
  exportCsv: async (params = {}) => {
    const response = await api.get('/api/knowledge/export/csv', { params, responseType: 'blob' });
    return response.data;
  }
};

// AI Chat API
export const aiAPI = {
  chat: async (data) => {
    const response = await api.post('/api/ai/chat', data);
    return response.data;
  },
  startVoiceSession: async (data = {}) => {
    const response = await api.post('/api/ai/voice-session', data);
    return response.data;
  },
  riskAssessment: async (data) => {
    const response = await api.post('/api/ai/risk-assessment', data);
    return response.data;
  },
  summarize: async (data) => {
    const response = await api.post('/api/ai/summarize', data);
    return response.data;
  },
  extractTags: async (data) => {
    const response = await api.post('/api/ai/extract-tags', data);
    return response.data;
  },
  correctText: async (text) => {
    const response = await api.post('/api/ai/correct-text', { text });
    return response.data;
  },
  analyzeConversation: async (data) => {
    const response = await api.post('/api/ai/analyze-conversation', data);
    return response.data;
  },
  correctSpeech: async (text) => {
    const response = await api.post('/api/ai/correct-speech', { text });
    return response.data;
  }
};

// Session API
export const sessionAPI = {
  list: async (params = {}) => {
    const response = await api.get('/api/ai/voice-sessions', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/ai/voice-sessions/${id}`);
    return response.data;
  },
  complete: async (id) => {
    const response = await api.put(`/api/ai/voice-sessions/${id}/complete`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/ai/voice-sessions/${id}`);
    return response.data;
  },
  addMessages: async (id, messages) => {
    const response = await api.post(`/api/ai/voice-sessions/${id}/messages`, { messages });
    return response.data;
  }
};

// Incident API
export const incidentAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/incidents', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/incidents/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/incidents', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/api/incidents/${id}`, data);
    return response.data;
  },
  search: async (query) => {
    const response = await api.post('/api/incidents/search', { query });
    return response.data;
  }
};

// Checklist API
export const checklistAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/checklists', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/checklists/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/checklists', data);
    return response.data;
  },
  execute: async (id, data = {}) => {
    const response = await api.post(`/api/checklists/${id}/execute`, data);
    return response.data;
  },
  getExecutions: async (checklistId) => {
    const response = await api.get(`/api/checklists/${checklistId}/executions`);
    return response.data;
  },
  getExecutionDetail: async (executionId) => {
    const response = await api.get(`/api/checklists/executions/${executionId}`);
    return response.data;
  }
};

// Speech API
export const speechAPI = {
  getToken: async () => {
    const response = await api.get('/api/speech/token');
    return response.data;
  },
  synthesize: async (text, voice) => {
    const response = await api.post('/api/speech/synthesize', { text, voice }, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Analytics API
export const analyticsAPI = {
  getUsage: async (params = {}) => {
    const response = await api.get('/api/analytics/usage', { params });
    return response.data;
  },
  getUserProgress: async (userId, params = {}) => {
    const response = await api.get(`/api/analytics/users/${userId}`, { params });
    return response.data;
  },
  getRisks: async (params = {}) => {
    const response = await api.get('/api/analytics/risks', { params });
    return response.data;
  },
  getKnowledgeGaps: async (params = {}) => {
    const response = await api.get('/api/analytics/knowledge-gaps', { params });
    return response.data;
  },
  exportCsv: async (params = {}) => {
    const response = await api.get('/api/analytics/export/csv', { params, responseType: 'blob' });
    return response.data;
  },
  exportPdf: async (params = {}) => {
    const response = await api.get('/api/analytics/export/pdf', { params, responseType: 'blob' });
    return response.data;
  }
};

// Sites API
export const sitesAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/sites', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/sites/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/api/sites', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/api/sites/${id}`, data);
    return response.data;
  }
};

export default api;
