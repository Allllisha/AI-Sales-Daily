import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { reportAPI, userAPI } from '../services/api';
import styled from '@emotion/styled';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    padding: 0 1rem;
  }
`;

const FilterSection = styled.div`
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    border-radius: 0;
    padding: 1rem;
    margin-bottom: 1rem;
  }
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const StatCard = styled.div`
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const StatChange = styled.div`
  font-size: 0.875rem;
  color: ${props => props.positive ? '#10b981' : '#6b7280'};
  margin-top: 0.5rem;
`;

const RecentReportsSection = styled.div`
  background-color: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: 0;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    font-size: 1.125rem;
    margin-bottom: 1rem;
  }
`;

const ReportList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ReportItem = styled.div`
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f9fafb;
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const ReportInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ReportDate = styled.div`
  font-weight: 500;
  color: #1f2937;
`;

const ReportCustomer = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${props => props.status === 'completed' ? '#d1fae5' : '#fef3c7'};
  color: ${props => props.status === 'completed' ? '#065f46' : '#92400e'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const AnalyticsPage = () => {
  const { user, isManager } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [selectedUser, setSelectedUser] = useState(user?.id || 'all');

  // 期間の計算
  const getPeriodDates = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'thisMonth':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'last3Months':
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  };

  const { start, end } = getPeriodDates();

  // 部下一覧の取得（マネージャーのみ）
  const { data: subordinates = [] } = useQuery({
    queryKey: ['subordinates'],
    queryFn: userAPI.getSubordinates,
    enabled: isManager
  });

  // レポートデータの取得
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['analytics-reports', selectedPeriod, selectedUser],
    queryFn: () => reportAPI.getReports({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      userId: isManager && selectedUser !== 'all' ? selectedUser : undefined
    })
  });

  // 統計の計算
  const stats = React.useMemo(() => {
    const completedReports = reports.filter(r => r.status === 'completed');
    const draftReports = reports.filter(r => r.status === 'draft');
    
    // ユニークな顧客数
    const uniqueCustomers = new Set(reports.map(r => r.customer).filter(Boolean));
    
    // ユニークな案件数
    const uniqueProjects = new Set(reports.map(r => r.project).filter(Boolean));

    return {
      totalReports: reports.length,
      completedReports: completedReports.length,
      draftReports: draftReports.length,
      completionRate: reports.length > 0 ? Math.round((completedReports.length / reports.length) * 100) : 0,
      uniqueCustomers: uniqueCustomers.size,
      uniqueProjects: uniqueProjects.size
    };
  }, [reports]);

  if (isLoading) {
    return (
      <Container>
        <PageTitle>{isManager ? 'チーム分析' : 'マイ分析'}</PageTitle>
        <div>読み込み中...</div>
      </Container>
    );
  }

  return (
    <Container>
      <PageTitle>{isManager ? 'チーム分析' : 'マイ分析'}</PageTitle>
      
      <FilterSection>
        <FilterGrid>
          <FormGroup>
            <Label>期間</Label>
            <Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
              <option value="thisMonth">今月</option>
              <option value="lastMonth">先月</option>
              <option value="last3Months">過去3ヶ月</option>
            </Select>
          </FormGroup>
          
          {isManager && (
            <FormGroup>
              <Label>担当者</Label>
              <Select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                <option value="all">全員</option>
                <option value={user.id}>{user.name}（自分）</option>
                {subordinates.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </Select>
            </FormGroup>
          )}
        </FilterGrid>
      </FilterSection>

      <StatsGrid>
        <StatCard>
          <StatLabel>総日報数</StatLabel>
          <StatValue>{stats.totalReports}</StatValue>
          <StatChange positive={stats.completionRate >= 80}>
            完了率: {stats.completionRate}%
          </StatChange>
        </StatCard>
        
        <StatCard>
          <StatLabel>完了済み日報</StatLabel>
          <StatValue>{stats.completedReports}</StatValue>
          <StatChange>
            下書き: {stats.draftReports}件
          </StatChange>
        </StatCard>
        
        <StatCard>
          <StatLabel>顧客数</StatLabel>
          <StatValue>{stats.uniqueCustomers}</StatValue>
          <StatChange>
            ユニーク顧客
          </StatChange>
        </StatCard>
        
        <StatCard>
          <StatLabel>案件数</StatLabel>
          <StatValue>{stats.uniqueProjects}</StatValue>
          <StatChange>
            進行中案件
          </StatChange>
        </StatCard>
      </StatsGrid>

      <RecentReportsSection>
        <SectionTitle>最近の日報</SectionTitle>
        {reports.length > 0 ? (
          <ReportList>
            {reports.slice(0, 10).map(report => (
              <ReportItem key={report.id} onClick={() => window.location.href = `/reports/${report.id}`}>
                <ReportInfo>
                  <ReportDate>
                    {format(new Date(report.report_date), 'yyyy年MM月dd日(E)', { locale: ja })}
                    {isManager && report.user_name && ` - ${report.user_name}`}
                  </ReportDate>
                  <ReportCustomer>
                    {report.customer || '顧客未設定'} / {report.project || '案件未設定'}
                  </ReportCustomer>
                </ReportInfo>
                <StatusBadge status={report.status}>
                  {report.status === 'completed' ? '完了' : '下書き'}
                </StatusBadge>
              </ReportItem>
            ))}
          </ReportList>
        ) : (
          <EmptyState>
            選択した期間の日報がありません
          </EmptyState>
        )}
      </RecentReportsSection>
    </Container>
  );
};

export default AnalyticsPage;