import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await userAPI.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Starting login...');
      const response = await authAPI.login(email, password);
      console.log('AuthContext: Login response received:', response);
      
      // Store token first
      localStorage.setItem('token', response.token);
      
      // Set user data
      setUser(response.user);
      
      // Small delay to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      toast.success('ログインしました');
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      const message = error.response?.data?.error || 'ログインに失敗しました';
      
      // 401エラー（認証失敗）の場合、新規登録を促す
      const isAuthError = error.response?.status === 401;
      
      if (isAuthError) {
        // カスタムトーストで新規登録を提案
        toast((t) => (
          <div>
            <p style={{ marginBottom: '8px', fontWeight: '600' }}>ログインに失敗しました</p>
            <p style={{ fontSize: '14px', marginBottom: '12px' }}>アカウントが存在しない可能性があります</p>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/register';
              }}
              style={{
                backgroundColor: '#8B5CF6',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              新規登録へ
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{
                backgroundColor: '#E5E7EB',
                color: '#4B5563',
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              閉じる
            </button>
          </div>
        ), {
          duration: 8000,
          style: {
            maxWidth: '400px'
          }
        });
      } else {
        toast.error(message);
      }
      
      return { 
        success: false, 
        error: message,
        isAuthError
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      toast.success('アカウントを作成しました');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || '登録に失敗しました';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    // 認証状態をクリアして完全リフレッシュ
    window.location.href = '/login';
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isManager: user?.role === 'manager'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};