import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { analyticsAPI, userAPI } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/designSystem';
import { Card } from '../styles/componentStyles';
import toast from 'react-hot-toast';

const PageWrapper = styled.div`
  min-height: calc(100vh - 64px);
  background: linear-gradient(
    to bottom,
    transparent 0%,
    transparent 15%,
    rgba(255, 255, 255, 0.8) 25%,
    rgba(255, 255, 255, 0.95) 35%,
    white 45%,
    white 100%
  );
  position: relative;
`;

const Container = styled.div`
  padding: ${spacing[8]};
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: ${spacing[4]};
  }
`;

const Header = styled.div`
  margin-bottom: ${spacing[8]};
`;

const Title = styled.h1`
  font-size: ${typography.fontSize['3xl']};
  font-weight: ${typography.fontWeight.bold};
  color: ${colors.neutral[900]};
  margin-bottom: ${spacing[4]};
  font-family: ${typography.fontFamily.sans};
`;

const ControlSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing[6]};
  flex-wrap: wrap;
  gap: ${spacing[4]};
`;

const PeriodSelector = styled.div`
  display: flex;
  gap: ${spacing[3]};
`;

const PeriodButton = styled.button`
  padding: ${spacing[2]} ${spacing[4]};
  border: 1px solid ${colors.neutral[300]};
  background: ${props => props.active ? colors.primary[500] : 'white'};
  color: ${props => props.active ? 'white' : colors.neutral[700]};
  border-radius: ${borderRadius.md};
  font-size: ${typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  font-family: ${typography.fontFamily.sans};

  &:hover {
    background: ${props => props.active ? colors.primary[600] : colors.neutral[50]};
  }
`;

const MemberSelector = styled.div`
  display: flex;
  gap: ${spacing[2]};
  flex-wrap: wrap;
`;

const MemberButton = styled.button`
  padding: ${spacing[1]} ${spacing[3]};
  border: 1px solid ${props => props.selected ? colors.primary[500] : colors.neutral[300]};
  background: ${props => props.selected ? colors.primary[50] : 'white'};
  color: ${props => props.selected ? colors.primary[700] : colors.neutral[700]};
  border-radius: ${borderRadius.sm};
  font-size: ${typography.fontSize.xs};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${colors.primary[500]};
    background: ${colors.primary[50]};
  }
`;

const MetricSelector = styled.div`
  display: flex;
  gap: ${spacing[2]};
  margin-bottom: ${spacing[4]};
`;

const MetricButton = styled.button`
  padding: ${spacing[2]} ${spacing[3]};
  border: 1px solid ${props => props.selected ? colors.primary[500] : colors.neutral[300]};
  background: ${props => props.selected ? colors.primary[500] : 'white'};
  color: ${props => props.selected ? 'white' : colors.neutral[700]};
  border-radius: ${borderRadius.sm};
  font-size: ${typography.fontSize.xs};
  cursor: pointer;
  transition: all 0.2s;
  font-family: ${typography.fontFamily.sans};

  &:hover {
    background: ${props => props.selected ? colors.primary[600] : colors.neutral[50]};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${spacing[6]};
  margin-bottom: ${spacing[8]};
`;

const StatCard = styled(Card)`
  padding: ${spacing[6]};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${typography.fontSize['3xl']};
  font-weight: ${typography.fontWeight.bold};
  color: ${colors.primary[600]};
  margin-bottom: ${spacing[2]};
  font-family: ${typography.fontFamily.sans};
`;

const StatLabel = styled.div`
  font-size: ${typography.fontSize.sm};
  color: ${colors.neutral[600]};
  font-family: ${typography.fontFamily.sans};
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${spacing[8]};
  
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const ChartCard = styled(Card)`
  padding: ${spacing[6]};
`;

const ChartTitle = styled.h3`
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  margin-bottom: ${spacing[4]};
  font-family: ${typography.fontFamily.sans};
`;

const MemberStatsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${spacing[4]};
`;

const TableHeader = styled.th`
  text-align: left;
  padding: ${spacing[3]};
  border-bottom: 2px solid ${colors.neutral[200]};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[700]};
`;

const TableCell = styled.td`
  padding: ${spacing[3]};
  border-bottom: 1px solid ${colors.neutral[200]};
  color: ${colors.neutral[600]};
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: ${typography.fontSize.sm};
  color: ${colors.neutral[500]};
`;

const COLORS = [
  colors.primary[500],
  colors.secondary[500], 
  colors.success[500],
  colors.warning[500],
  colors.error[500],
  colors.info[500]
];

const TeamAnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [individualActionStates, setIndividualActionStates] = useState({});
  const [selectedMetric, setSelectedMetric] = useState('count');
  const [issuesAnalysis, setIssuesAnalysis] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  const periods = [
    { value: 7, label: '7日間' },
    { value: 30, label: '30日間' },
    { value: 90, label: '90日間' }
  ];

  const metrics = [
    { value: 'count', label: '日報数', color: colors.primary[500] },
    { value: 'completedActions', label: 'アクション完了数', color: colors.success[500] },
    { value: 'customerCount', label: '取引先数', color: colors.info[500] }
  ];

  // ローカルストレージから個人のアクション完了状態を読み込み（部下の完了状態を確認）
  useEffect(() => {
    const savedStates = localStorage.getItem('actionCompletionStates');
    if (savedStates) {
      try {
        setIndividualActionStates(JSON.parse(savedStates));
      } catch (error) {
        console.error('Failed to parse saved individual action states:', error);
      }
    }
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
    fetchIssuesAnalysis();
  }, [selectedPeriod, selectedMembers]);
  
  // ページにフォーカスが戻った時にデータを再取得
  useEffect(() => {
    const handleFocus = () => {
      console.log('Team Analytics page focused, refetching data');
      fetchAnalyticsData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedPeriod, selectedMembers]);

  const fetchTeamMembers = async () => {
    try {
      const members = await userAPI.getTeamMembers();
      setTeamMembers(members);
    } catch (error) {
      console.error('Team members fetch error:', error);
      toast.error('チームメンバーの取得に失敗しました');
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await analyticsAPI.getTeamAnalytics(selectedPeriod, selectedMembers);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Team analytics fetch error:', error);
      toast.error('チーム分析データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchIssuesAnalysis = async () => {
    try {
      setIssuesLoading(true);
      const data = await analyticsAPI.getTeamIssues(selectedPeriod, selectedMembers);
      setIssuesAnalysis(data.issuesAnalysis || []);
    } catch (error) {
      console.error('Team issues analysis fetch error:', error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleMemberToggle = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // この関数は削除（マネージャーは状態を変更できない）

  if (loading) {
    return (
      <PageWrapper>
        <Container>
          <LoadingSpinner>データを読み込み中...</LoadingSpinner>
        </Container>
      </PageWrapper>
    );
  }

  if (!analyticsData) {
    return (
      <PageWrapper>
        <Container>
          <Header>
            <Title>チーム分析</Title>
          </Header>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>データが取得できませんでした</p>
            <button onClick={fetchAnalyticsData}>再試行</button>
          </div>
        </Container>
      </PageWrapper>
    );
  }

  const { 
    teamStats = {}, 
    memberStats = [],
    dailyReports = [], 
    customerAnalysis = [], 
    industryAnalysis = [],
    teamActionsList = []
  } = analyticsData;

  // 部下の個人アクション完了状態を元にチーム統計を計算
  const calculateTeamActionStats = () => {
    if (!teamActionsList || teamActionsList.length === 0) {
      return { total: 0, completed: 0, pending: 0 };
    }

    const total = teamActionsList.length;
    const completed = teamActionsList.filter((action) => {
      const actionKey = `${action.reportId}_${action.text}`;
      return individualActionStates[actionKey] || false;
    }).length;
    const pending = total - completed;

    return { total, completed, pending };
  };

  const actualActionStats = calculateTeamActionStats();

  // 日別チャートのアクション完了数を実際の完了状態に基づいて再計算
  const recalculateDailyReports = (dailyReports) => {
    if (!dailyReports || !teamActionsList) return dailyReports;

    return dailyReports.map(dayData => {
      // その日のアクションを取得
      const dayActions = teamActionsList.filter(action => {
        const actionDate = new Date(action.reportDate).toISOString().split('T')[0];
        return actionDate === dayData.date;
      });

      // その日の完了アクション数を計算
      const completedActionsForDay = dayActions.filter(action => {
        const actionKey = `${action.reportId}_${action.text}`;
        return individualActionStates[actionKey] || false;
      }).length;

      return {
        ...dayData,
        completedActions: completedActionsForDay,
        actionCount: dayActions.length
      };
    });
  };

  // 実際の完了状態を反映した日別データ
  const adjustedDailyReports = recalculateDailyReports(dailyReports);

  // 現在選択されているメトリクスの情報を取得
  const getCurrentMetric = () => {
    return metrics.find(m => m.value === selectedMetric) || metrics[0];
  };

  return (
    <PageWrapper>
      <Container>
      <Header>
        <Title>チーム分析</Title>
        <ControlSection>
          <PeriodSelector>
            {periods.map(period => (
              <PeriodButton
                key={period.value}
                active={selectedPeriod === period.value}
                onClick={() => setSelectedPeriod(period.value)}
              >
                {period.label}
              </PeriodButton>
            ))}
          </PeriodSelector>
          
          <MemberSelector>
            <span style={{ alignSelf: 'center', marginRight: spacing[2], fontSize: typography.fontSize.sm }}>
              メンバー:
            </span>
            {teamMembers.map(member => (
              <MemberButton
                key={member.id}
                selected={selectedMembers.includes(member.id)}
                onClick={() => handleMemberToggle(member.id)}
              >
                {member.name}
              </MemberButton>
            ))}
          </MemberSelector>
        </ControlSection>
      </Header>

      {/* チーム統計 */}
      <StatsGrid>
        <StatCard>
          <StatValue>{teamStats.total_reports}</StatValue>
          <StatLabel>総日報数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{teamStats.total_members}</StatValue>
          <StatLabel>チームメンバー数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{teamStats.unique_customers}</StatValue>
          <StatLabel>取引先数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{actualActionStats.total}</StatValue>
          <StatLabel>総アクション数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue style={{ color: colors.success[600] }}>{actualActionStats.completed}</StatValue>
          <StatLabel>アクション完了数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue style={{ color: colors.warning[600] }}>{actualActionStats.pending}</StatValue>
          <StatLabel>アクション未完了数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>
            {teamStats.total_reports > 0 ? 
              Math.round((teamStats.completed_reports / teamStats.total_reports) * 100) : 0}%
          </StatValue>
          <StatLabel>日報完了率</StatLabel>
        </StatCard>
      </StatsGrid>

      {/* メンバー別統計テーブル */}
      <ChartCard style={{ marginBottom: spacing[8] }}>
        <ChartTitle>メンバー別パフォーマンス</ChartTitle>
        {memberStats && memberStats.length > 0 ? (
          <MemberStatsTable>
            <thead>
              <tr>
                <TableHeader>メンバー</TableHeader>
                <TableHeader>日報数</TableHeader>
                <TableHeader>日報完了数</TableHeader>
                <TableHeader>日報完了率</TableHeader>
                <TableHeader>取引先数</TableHeader>
                <TableHeader>アクション完了数</TableHeader>
                <TableHeader>アクション未完了数</TableHeader>
                <TableHeader>アクション完了率</TableHeader>
              </tr>
            </thead>
            <tbody>
              {memberStats.map(member => {
                // このメンバーのアクション統計を計算
                const memberActions = teamActionsList.filter(action => action.userId === member.userId);
                const memberCompletedActions = memberActions.filter(action => {
                  const actionKey = `${action.reportId}_${action.text}`;
                  return individualActionStates[actionKey] || false;
                });
                const memberActionCompletionRate = memberActions.length > 0 
                  ? Math.round((memberCompletedActions.length / memberActions.length) * 100) 
                  : 0;

                return (
                  <tr key={member.userId}>
                    <TableCell style={{ fontWeight: typography.fontWeight.medium }}>
                      {member.name}
                    </TableCell>
                    <TableCell>{member.reportCount}</TableCell>
                    <TableCell>{member.completedCount}</TableCell>
                    <TableCell>{member.completionRate}%</TableCell>
                    <TableCell>{member.customerCount}</TableCell>
                    <TableCell style={{ color: colors.success[600], fontWeight: typography.fontWeight.medium }}>
                      {memberCompletedActions.length}
                    </TableCell>
                    <TableCell style={{ color: colors.warning[600], fontWeight: typography.fontWeight.medium }}>
                      {memberActions.length - memberCompletedActions.length}
                    </TableCell>
                    <TableCell style={{ 
                      color: memberActionCompletionRate >= 80 ? colors.success[600] : 
                             memberActionCompletionRate >= 50 ? colors.warning[600] : colors.error[600],
                      fontWeight: typography.fontWeight.medium 
                    }}>
                      {memberActionCompletionRate}%
                    </TableCell>
                  </tr>
                );
              })}
            </tbody>
          </MemberStatsTable>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: colors.neutral[500] }}>
            データがありません
          </div>
        )}
      </ChartCard>

      {/* チャート */}
      <ChartGrid>
        {/* 日別活動推移 */}
        <ChartCard>
          <ChartTitle>日別活動推移</ChartTitle>
          <MetricSelector>
            {metrics.map(metric => (
              <MetricButton
                key={metric.value}
                selected={selectedMetric === metric.value}
                onClick={() => setSelectedMetric(metric.value)}
              >
                {metric.label}
              </MetricButton>
            ))}
          </MetricSelector>
          {adjustedDailyReports && adjustedDailyReports.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={adjustedDailyReports}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('ja-JP')}
                  formatter={(value) => [value, getCurrentMetric().label]}
                />
                <Line 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke={getCurrentMetric().color} 
                  strokeWidth={2}
                  dot={{ fill: getCurrentMetric().color }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              データがありません
            </div>
          )}
        </ChartCard>

        {/* 案件カテゴリ分析 */}
        <ChartCard>
          <ChartTitle>業界分析</ChartTitle>
          {industryAnalysis && industryAnalysis.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={industryAnalysis}
                  cx="50%"
                  cy="40%"
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {industryAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(_, entry) => `${entry.payload.industry} (${entry.payload.count})`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              データがありません
            </div>
          )}
        </ChartCard>

        {/* 顧客別商談数 */}
        <ChartCard>
          <ChartTitle>顧客別商談数（Top 10）</ChartTitle>
          {customerAnalysis && customerAnalysis.length > 0 ? (
            <div style={{ padding: '20px' }}>
              {(() => {
                const maxCount = Math.max(...customerAnalysis.map(item => item.reportCount));
                return customerAnalysis.map((item, index) => (
                  <div key={index} style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontWeight: '600', color: colors.neutral[800] }}>
                        {item.customer}
                      </span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: colors.primary[600],
                        fontSize: '18px'
                      }}>
                        {item.reportCount}件
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '12px', 
                      backgroundColor: colors.neutral[200],
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${(item.reportCount / maxCount) * 100}%`, 
                        height: '100%', 
                        backgroundColor: colors.primary[500],
                        borderRadius: '6px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              データがありません
            </div>
          )}
        </ChartCard>
      </ChartGrid>

      {/* チーム課題・リスク分析 */}
      {issuesAnalysis && issuesAnalysis.length > 0 && (
        <ChartCard style={{ marginTop: spacing[8] }}>
          <ChartTitle>チームでよく使われる課題キーワード</ChartTitle>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: spacing[4],
            padding: spacing[4]
          }}>
            {issuesAnalysis.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${spacing[3]} ${spacing[4]}`,
                backgroundColor: colors.neutral[50],
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.neutral[200]}`,
                transition: 'all 0.2s'
              }}>
                <span style={{
                  fontWeight: typography.fontWeight.medium,
                  color: colors.neutral[800],
                  fontSize: typography.fontSize.sm
                }}>
                  {item.keyword}
                </span>
                <span style={{
                  backgroundColor: colors.primary[500],
                  color: 'white',
                  padding: `${spacing[1]} ${spacing[2]}`,
                  borderRadius: borderRadius.sm,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  minWidth: '24px',
                  textAlign: 'center'
                }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* チームアクション一覧 */}
      {teamActionsList && teamActionsList.length > 0 && (
        <ChartCard style={{ marginTop: spacing[8] }}>
          <ChartTitle>チーム全体のアクション一覧</ChartTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3], maxHeight: '500px', overflowY: 'auto' }}>
            {teamActionsList.map((action, index) => {
              const actionKey = `${action.reportId}_${action.text}`;
              const isCompleted = individualActionStates[actionKey] || false;
              
              return (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    padding: spacing[4], 
                    background: isCompleted ? colors.success[50] : colors.warning[50],
                    border: `1px solid ${isCompleted ? colors.success[200] : colors.warning[200]}`,
                    borderRadius: borderRadius.md,
                    gap: spacing[3],
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isCompleted ? colors.success[500] : colors.warning[500],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {isCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: typography.fontSize.sm, 
                      fontWeight: typography.fontWeight.medium,
                      color: isCompleted ? colors.success[800] : colors.warning[800],
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      marginBottom: spacing[2]
                    }}>
                      {action.text}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: spacing[4], 
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.primary[700],
                        background: colors.primary[100],
                        padding: `${spacing[1]} ${spacing[2]}`,
                        borderRadius: borderRadius.sm,
                        fontWeight: typography.fontWeight.medium
                      }}>
                        {action.customer}
                      </span>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.secondary[700],
                        background: colors.secondary[100],
                        padding: `${spacing[1]} ${spacing[2]}`,
                        borderRadius: borderRadius.sm,
                        fontWeight: typography.fontWeight.medium
                      }}>
                        {action.userName}
                      </span>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.neutral[600]
                      }}>
                        {new Date(action.reportDate).toLocaleDateString('ja-JP')}
                      </span>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: isCompleted ? colors.success[700] : colors.warning[700],
                        background: isCompleted ? colors.success[100] : colors.warning[100],
                        padding: `${spacing[1]} ${spacing[2]}`,
                        borderRadius: borderRadius.sm,
                        fontWeight: typography.fontWeight.bold
                      }}>
                        {isCompleted ? '✅ 完了済み' : '⏳ 未完了'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}
      </Container>
    </PageWrapper>
  );
};

export default TeamAnalyticsPage;