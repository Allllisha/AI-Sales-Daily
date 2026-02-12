import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 1800000; // 30 minutes

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
  const inactivityTimerRef = useRef(null);

  const performLogout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    window.location.href = '/login';
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      toast('セッションの有効期限が切れました。再度ログインしてください。');
      performLogout();
    }, INACTIVITY_TIMEOUT);
  }, [performLogout]);

  // Auto-logout on inactivity
  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user, resetInactivityTimer]);

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
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      await new Promise(resolve => setTimeout(resolve, 100));
      toast.success('ログインしました');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'ログインに失敗しました';
      const isAuthError = error.response?.status === 401;
      toast.error(message);
      return { success: false, error: message, isAuthError };
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

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore errors - proceed with client-side cleanup
    }
    performLogout();
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authAPI.resetPassword(currentPassword, newPassword);
      toast.success('パスワードを変更しました');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error
        || error.response?.data?.errors?.[0]?.msg
        || 'パスワードの変更に失敗しました';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSiteManager: user?.role === 'site_manager' || user?.role === 'admin',
    isExpert: user?.role === 'expert' || user?.role === 'site_manager' || user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
