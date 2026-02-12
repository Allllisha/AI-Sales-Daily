import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import OfficeChatPage from './pages/OfficeChatPage';
import FieldVoicePage from './pages/FieldVoicePage';
import KnowledgeListPage from './pages/KnowledgeListPage';
import KnowledgeDetailPage from './pages/KnowledgeDetailPage';
import KnowledgeCreatePage from './pages/KnowledgeCreatePage';
import KnowledgeSearchPage from './pages/KnowledgeSearchPage';
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage';
import UserAnalyticsPage from './pages/UserAnalyticsPage';
import SessionHistoryPage from './pages/SessionHistoryPage';
import SessionDetailPage from './pages/SessionDetailPage';
import IncidentListPage from './pages/IncidentListPage';
import IncidentCreatePage from './pages/IncidentCreatePage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import ChecklistListPage from './pages/ChecklistListPage';
import ChecklistCreatePage from './pages/ChecklistCreatePage';
import ChecklistDetailPage from './pages/ChecklistDetailPage';
import RiskAssessmentPage from './pages/RiskAssessmentPage';
import SafetyHubPage from './pages/SafetyHubPage';
import SiteListPage from './pages/SiteListPage';
import SiteCreatePage from './pages/SiteCreatePage';
import SiteDetailPage from './pages/SiteDetailPage';

// Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

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
                <Route path="/office-chat" element={<OfficeChatPage />} />
                <Route path="/field-voice" element={<FieldVoicePage />} />
                <Route path="/knowledge" element={<KnowledgeListPage />} />
                <Route path="/knowledge/new" element={<KnowledgeCreatePage />} />
                <Route path="/knowledge/search" element={<KnowledgeSearchPage />} />
                <Route path="/knowledge/:id" element={<KnowledgeDetailPage />} />
                <Route path="/analytics" element={<AnalyticsDashboardPage />} />
                <Route path="/analytics/users/:id" element={<UserAnalyticsPage />} />
                <Route path="/sessions" element={<SessionHistoryPage />} />
                <Route path="/sessions/:id" element={<SessionDetailPage />} />
                {/* 安全管理ハブ */}
                <Route path="/safety" element={<SafetyHubPage />} />
                {/* 類災事例 */}
                <Route path="/incidents" element={<IncidentListPage />} />
                <Route path="/incidents/new" element={<IncidentCreatePage />} />
                <Route path="/incidents/:id" element={<IncidentDetailPage />} />
                {/* チェックリスト */}
                <Route path="/checklists" element={<ChecklistListPage />} />
                <Route path="/checklists/new" element={<ChecklistCreatePage />} />
                <Route path="/checklists/:id" element={<ChecklistDetailPage />} />
                {/* リスク評価 */}
                <Route path="/risk-assessment" element={<RiskAssessmentPage />} />
                {/* 現場管理 */}
                <Route path="/sites" element={<SiteListPage />} />
                <Route path="/sites/new" element={<SiteCreatePage />} />
                <Route path="/sites/:id" element={<SiteDetailPage />} />
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
