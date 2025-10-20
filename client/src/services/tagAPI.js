import apiClient from './api';

const tagAPI = {
  // すべてのタグを取得
  getAll: async (category = null, limit = 100) => {
    console.log('[tagAPI.getAll] Called with category:', category, 'limit:', limit);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('limit', limit);

      const url = `/api/tags?${params.toString()}`;
      console.log('[tagAPI.getAll] Requesting:', url);
      const response = await apiClient.get(url);
      console.log('[tagAPI.getAll] Response:', response.data);
      return response.data.tags || [];
    } catch (error) {
      console.error('[tagAPI.getAll] Error fetching all tags:', error);
      console.error('[tagAPI.getAll] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return [];
    }
  },

  // 人気のタグを取得
  getPopular: async (limit = 20) => {
    console.log('[tagAPI.getPopular] Called with limit:', limit);
    try {
      const url = `/api/tags/popular?limit=${limit}`;
      console.log('[tagAPI.getPopular] Requesting:', url);
      const response = await apiClient.get(url);
      console.log('[tagAPI.getPopular] Response:', response.data);
      return response.data.tags || [];
    } catch (error) {
      console.error('[tagAPI.getPopular] Error fetching popular tags:', error);
      console.error('[tagAPI.getPopular] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return [];
    }
  },

  // 特定の日報のタグを取得
  getByReportId: async (reportId) => {
    try {
      const response = await apiClient.get(`/api/tags/report/${reportId}`);
      return response.data.tags || [];
    } catch (error) {
      console.error('Error fetching report tags:', error);
      return [];
    }
  },

  // タグで日報を検索
  searchReports: async (tagIds, userId = null) => {
    const params = new URLSearchParams();
    params.append('tagIds', Array.isArray(tagIds) ? tagIds.join(',') : tagIds);
    if (userId) params.append('userId', userId);

    const response = await apiClient.get(`/api/tags/search?${params.toString()}`);
    return response.data.reports;
  },

  // 日報にタグを追加
  addToReport: async (reportId, tagId) => {
    console.log('[tagAPI.addToReport] Adding tag:', { reportId, tagId });
    try {
      const response = await apiClient.post(`/api/reports/${reportId}/tags`, { tagId });
      console.log('[tagAPI.addToReport] Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[tagAPI.addToReport] Error:', error);
      throw error;
    }
  },

  // 日報からタグを削除
  removeFromReport: async (reportId, tagId) => {
    console.log('[tagAPI.removeFromReport] Removing tag:', { reportId, tagId });
    try {
      const response = await apiClient.delete(`/api/reports/${reportId}/tags/${tagId}`);
      console.log('[tagAPI.removeFromReport] Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[tagAPI.removeFromReport] Error:', error);
      throw error;
    }
  },

  // タグ統計を取得（マネージャー向け）
  getStats: async (period = 30) => {
    const response = await apiClient.get(`/api/tags/stats?period=${period}`);
    return response.data.stats;
  },

  // タグを作成
  createTag: async (tagData) => {
    console.log('[tagAPI.createTag] Creating tag:', tagData);
    try {
      const response = await apiClient.post('/api/tags', tagData);
      console.log('[tagAPI.createTag] Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[tagAPI.createTag] Error creating tag:', error);
      console.error('[tagAPI.createTag] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // タグを更新
  updateTag: async (tagId, updates) => {
    const response = await apiClient.put(`/api/tags/${tagId}`, updates);
    return response.data;
  },

  // タグを削除
  deleteTag: async (tagId) => {
    const response = await apiClient.delete(`/api/tags/${tagId}`);
    return response.data;
  },

  // タグを統合
  mergeTags: async (sourceTagIds, targetTagId) => {
    const response = await apiClient.post(`/api/tags/merge`, {
      sourceTagIds,
      targetTagId
    });
    return response.data;
  }
};

export default tagAPI;
