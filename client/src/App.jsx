import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import HearingPage from './pages/HearingPage';
import ReportDetailPage from './pages/ReportDetailPage';
import ReportEditPage from './pages/ReportEditPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MyAnalyticsPage from './pages/MyAnalyticsPage';
import TeamAnalyticsPage from './pages/TeamAnalyticsPage';
import RegisterPage from './pages/RegisterPage';

// Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/hearing" element={<HearingPage />} />
                <Route path="/reports/:id" element={<ReportDetailPage />} />
                <Route path="/reports/:id/edit" element={<ReportEditPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/my-analytics" element={<MyAnalyticsPage />} />
                <Route path="/team-analytics" element={<TeamAnalyticsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;