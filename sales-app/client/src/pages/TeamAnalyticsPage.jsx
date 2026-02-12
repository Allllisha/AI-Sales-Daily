import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { analyticsAPI, userAPI } from '../services/api';
// Using architectural design system variables from CSS
import toast from 'react-hot-toast';

const PageWrapper = styled.div`
  min-height: calc(100vh - 72px);
  background-color: var(--color-background);
  position: relative;
  
  /* Subtle architectural grid background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(rgba(0,0,0,0.01) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.01) 1px, transparent 1px);
    background-size: var(--space-7) var(--space-7);
    pointer-events: none;
    z-index: 0;
  }

  @media (max-width: 768px) {
    min-height: calc(100vh - 64px);
  }
`;

const Container = styled.div`
  padding: var(--space-6);
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: var(--space-4);
  }
`;

const Header = styled.div`
  margin-bottom: var(--space-6);
`;

const Title = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: var(--color-primary);
  margin-bottom: var(--space-4);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.025em;
  line-height: var(--line-height-compressed);
  text-transform: uppercase;
`;

const ControlSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
  gap: var(--space-4);
`;

const PeriodSelector = styled.div`
  display: flex;
  gap: var(--space-3);
`;

const PeriodButton = styled.button`
  padding: var(--space-3) var(--space-4);
  border: 2px solid ${props => props.active ? 'var(--color-primary)' : 'var(--color-border)'};
  background: ${props => props.active ? 'var(--color-primary)' : 'var(--color-background)'};
  color: ${props => props.active ? 'var(--color-text-inverse)' : 'var(--color-text-primary)'};
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &:hover {
    background: ${props => props.active ? 'var(--color-accent)' : 'var(--color-surface)'};
    border-color: ${props => props.active ? 'var(--color-accent)' : 'var(--color-primary)'};
    transform: translateY(-1px);
  }
`;

const MemberSelector = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

const MemberButton = styled.button`
  padding: var(--space-2) var(--space-3);
  border: 2px solid ${props => props.selected ? 'var(--color-primary)' : 'var(--color-border)'};
  background: ${props => props.selected ? 'var(--color-surface)' : 'var(--color-background)'};
  color: ${props => props.selected ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
  border-radius: var(--radius-none);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &:hover {
    border-color: var(--color-primary);
    background: var(--color-surface);
    transform: translateY(-1px);
  }
`;

const MetricSelector = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
`;

const MetricButton = styled.button`
  padding: var(--space-2) var(--space-3);
  border: 2px solid ${props => props.selected ? 'var(--color-primary)' : 'var(--color-border)'};
  background: ${props => props.selected ? 'var(--color-primary)' : 'var(--color-background)'};
  color: ${props => props.selected ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)'};
  border-radius: var(--radius-none);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &:hover {
    background: ${props => props.selected ? 'var(--color-accent)' : 'var(--color-surface)'};
    border-color: ${props => props.selected ? 'var(--color-accent)' : 'var(--color-primary)'};
    transform: translateY(-1px);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-6);
`;

const StatCard = styled.div`
  padding: var(--space-5);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-paper);
  text-align: center;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    box-shadow: var(--shadow-elevation);
    transform: translateY(-1px);
  }
`;

const StatValue = styled.div`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: var(--color-primary);
  margin-bottom: var(--space-2);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.02em;
`;

const StatLabel = styled.div`
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const ChartCard = styled.div`
  padding: var(--space-5);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-paper);
  transition: all 0.2s ease-in-out;
  
  &:hover {
    box-shadow: var(--shadow-elevation);
  }
`;

const ChartTitle = styled.h3`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-4);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  letter-spacing: -0.01em;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-top: var(--space-4);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-border);
  
  /* スクロールバーのスタイリング */
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--color-surface-alt);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-text-tertiary);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-secondary);
  }
  
  @media (max-width: 768px) {
    margin: var(--space-3) calc(-1 * var(--space-4));
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
`;

const MemberStatsTable = styled.table`
  width: 100%;
  min-width: 800px; /* 最小幅を設定してスクロールを有効化 */
  border-collapse: collapse;
  background: var(--color-background);
  
  @media (max-width: 768px) {
    min-width: 900px; /* モバイルではより広い最小幅 */
  }
`;

const TableHeader = styled.th`
  text-align: left;
  padding: var(--space-3);
  border-bottom: 2px solid var(--color-border);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  white-space: nowrap;
  background: var(--color-surface);
  font-size: var(--font-size-small);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-micro);
  }
`;

const TableCell = styled.td`
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  white-space: nowrap;
  font-size: var(--font-size-small);
  
  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-micro);
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

// アーキテクチャルデザインに統一した色パレット
const INDUSTRY_COLORS = {
  '建設': '#000000', // ブラック
  '製造': '#1A1A1A', // ダークチャコール
  'IT': '#333333', // ミディアムグレー
  '小売': '#4A4A4A', // セカンダリーグレー
  'サービス': '#666666', // ライトグレー
  '不動産': '#888888', // ターシャリーグレー
  '金融': '#AAAAAA', // ライトグレー
  '医療': '#CCCCCC', // ベリーライトグレー
  '教育': '#E8E8E8', // ボーダーグレー
  'その他': '#2563EB'  // ビジネスブルー
};

// アーキテクチャルカラーパレット
const COLORS = [
  '#000000', // プライマリー（ブラック）
  '#1A1A1A', // ダークチャコール
  '#333333', // ミディアムグレー
  '#4A4A4A', // セカンダリーグレー
  '#666666', // ライトグレー
  '#888888', // ターシャリーグレー
  '#2563EB', // ビジネスブルー
  '#E8E8E8', // ボーダーグレー
];

const TeamAnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionGroupBy, setActionGroupBy] = useState('date'); // 追加: アクショングループ化の状態
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
    { value: 'count', label: '日報数', color: '#000000' },
    { value: 'completedActions', label: 'アクション完了数', color: '#000000' },
    { value: 'customerCount', label: '取引先数', color: '#333333' }
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
            <span style={{ alignSelf: 'center', marginRight: 'var(--space-2)', fontSize: 'var(--font-size-small)' }}>
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
          <StatValue style={{ color: '#000000' }}>{actualActionStats.completed}</StatValue>
          <StatLabel>アクション完了数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue style={{ color: '#2563EB' }}>{actualActionStats.pending}</StatValue>
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
      <ChartCard style={{ marginBottom: 'var(--space-6)' }}>
        <ChartTitle>メンバー別パフォーマンス</ChartTitle>
        {memberStats && memberStats.length > 0 ? (
          <TableContainer>
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
                    <TableCell style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {member.name}
                    </TableCell>
                    <TableCell>{member.reportCount}</TableCell>
                    <TableCell>{member.completedCount}</TableCell>
                    <TableCell>{member.completionRate}%</TableCell>
                    <TableCell>{member.customerCount}</TableCell>
                    <TableCell style={{ color: 'var(--color-success)', fontWeight: 'var(--font-weight-medium)' }}>
                      {memberCompletedActions.length}
                    </TableCell>
                    <TableCell style={{ color: 'var(--color-warning)', fontWeight: 'var(--font-weight-medium)' }}>
                      {memberActions.length - memberCompletedActions.length}
                    </TableCell>
                    <TableCell style={{ 
                      color: memberActionCompletionRate >= 80 ? 'var(--color-success)' : 
                             memberActionCompletionRate >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                      fontWeight: 'var(--font-weight-medium)' 
                    }}>
                      {memberActionCompletionRate}%
                    </TableCell>
                  </tr>
                );
              })}
            </tbody>
            </MemberStatsTable>
          </TableContainer>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
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
                  cy="50%"
                  innerRadius={0}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="industry"
                  label={(entry) => {
                    const total = industryAnalysis.reduce((sum, item) => sum + item.count, 0);
                    const percent = ((entry.count / total) * 100).toFixed(0);
                    // 3%以上の場合のみラベルを表示（小さいセグメントは非表示）
                    if (percent >= 3) {
                      // 業界名が長い場合は省略
                      const displayName = entry.industry.length > 8 ? 
                        entry.industry.substring(0, 8) + '...' : entry.industry;
                      return `${displayName} ${percent}%`;
                    }
                    return '';
                  }}
                  labelLine={{
                    stroke: '#666',
                    strokeWidth: 1
                  }}
                >
                  {industryAnalysis.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={INDUSTRY_COLORS[entry.industry] || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value}件`,
                    props.payload.industry
                  ]}
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
                      <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {item.customer}
                      </span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: 'var(--color-primary)',
                        fontSize: '18px'
                      }}>
                        {item.reportCount}件
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '12px', 
                      backgroundColor: 'var(--color-border)',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${(item.reportCount / maxCount) * 100}%`, 
                        height: '100%', 
                        backgroundColor: 'var(--color-primary)',
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
        <ChartCard style={{ marginTop: 'var(--space-6)' }}>
          <ChartTitle>チームでよく使われる課題キーワード</ChartTitle>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: 'var(--space-4)',
            padding: 'var(--space-4)'
          }}>
            {issuesAnalysis.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-none)',
                border: '2px solid var(--color-border)',
                transition: 'all 0.2s'
              }}>
                <span style={{
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-small)'
                }}>
                  {item.keyword}
                </span>
                <span style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-text-inverse)',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-none)',
                  fontSize: 'var(--font-size-micro)',
                  fontWeight: 'var(--font-weight-bold)',
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
        <ChartCard style={{ marginTop: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <ChartTitle style={{ marginBottom: 0 }}>チーム全体のアクション一覧</ChartTitle>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <select
                value={actionGroupBy}
                onChange={(e) => setActionGroupBy(e.target.value)}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-none)',
                  border: '2px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  fontSize: 'var(--font-size-small)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <option value="date">日付別</option>
                <option value="customer">顧客別</option>
                <option value="member">メンバー別</option>
                <option value="status">ステータス別</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: '600px', overflowY: 'auto', padding: 'var(--space-1)' }}>
            {(() => {
              // グループ化のロジック
              const groupedActions = {};
              
              teamActionsList.forEach(action => {
                let groupKey;
                switch (actionGroupBy) {
                  case 'date':
                    groupKey = new Date(action.reportDate).toLocaleDateString('ja-JP');
                    break;
                  case 'customer':
                    groupKey = action.customer;
                    break;
                  case 'member':
                    groupKey = action.userName;
                    break;
                  case 'status':
                    const actionKey = `${action.reportId}_${action.text}`;
                    groupKey = individualActionStates[actionKey] ? '完了済み' : '未完了';
                    break;
                  default:
                    groupKey = 'その他';
                }
                
                if (!groupedActions[groupKey]) {
                  groupedActions[groupKey] = [];
                }
                groupedActions[groupKey].push(action);
              });
              
              // ソート
              const sortedGroups = Object.entries(groupedActions).sort((a, b) => {
                if (actionGroupBy === 'date') {
                  return new Date(b[0]) - new Date(a[0]);
                } else if (actionGroupBy === 'status') {
                  return a[0] === '未完了' ? -1 : 1;
                }
                return a[0].localeCompare(b[0]);
              });
              
              return sortedGroups.map(([groupKey, actions], groupIndex) => (
                <div key={groupIndex} style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-none)',
                  padding: 'var(--space-4)',
                  border: '2px solid var(--color-border)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 'var(--space-3)',
                    gap: 'var(--space-2)'
                  }}>
                    <h4 style={{
                      fontSize: 'var(--font-size-title)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text-primary)',
                      margin: 0
                    }}>
                      {groupKey}
                    </h4>
                    <span style={{
                      backgroundColor: 'var(--color-surface-alt)',
                      color: 'var(--color-accent)',
                      padding: 'var(--space-1) var(--space-2)',
                      borderRadius: 'var(--radius-none)',
                      fontSize: 'var(--font-size-micro)',
                      fontWeight: 'var(--font-weight-bold)'
                    }}>
                      {actions.length}件
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {actions.map((action, index) => {
                      const actionKey = `${action.reportId}_${action.text}`;
                      const isCompleted = individualActionStates[actionKey] || false;
                      
                      return (
                        <div 
                          key={index} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start',
                            padding: 'var(--space-3)', 
                            background: 'var(--color-background)',
                            border: `2px solid ${isCompleted ? 'var(--color-success)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-none)',
                            gap: 'var(--space-3)',
                            transition: 'all 0.2s',
                            boxShadow: isCompleted ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isCompleted ? 'var(--color-success)' : 'var(--color-warning)',
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
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)',
                      color: isCompleted ? 'var(--color-success)' : 'var(--color-warning)',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      marginBottom: 'var(--space-2)'
                    }}>
                      {action.text}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: 'var(--space-4)', 
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        fontSize: 'var(--font-size-micro)',
                        color: 'var(--color-primary)',
                        background: 'var(--color-accent-light)',
                        padding: 'var(--space-1) var(--space-2)',
                        borderRadius: 'var(--radius-none)',
                        fontWeight: 'var(--font-weight-medium)'
                      }}>
                        {action.customer}
                      </span>
                      <span style={{
                        fontSize: 'var(--font-size-micro)',
                        color: 'var(--color-text-primary)',
                        background: 'var(--color-surface)',
                        padding: 'var(--space-1) var(--space-2)',
                        borderRadius: 'var(--radius-none)',
                        fontWeight: 'var(--font-weight-medium)'
                      }}>
                        {action.userName}
                      </span>
                      <span style={{
                        fontSize: 'var(--font-size-micro)',
                        color: 'var(--color-text-tertiary)'
                      }}>
                        {new Date(action.reportDate).toLocaleDateString('ja-JP')}
                      </span>
                      <span style={{
                        fontSize: 'var(--font-size-micro)',
                        color: isCompleted ? 'var(--color-success)' : 'var(--color-warning)',
                        background: isCompleted ? 'var(--color-surface-alt)' : 'var(--color-accent-light)',
                        padding: 'var(--space-1) var(--space-2)',
                        borderRadius: 'var(--radius-none)',
                        fontWeight: 'var(--font-weight-bold)'
                      }}>
                        {isCompleted ? '✅ 完了済み' : '⏳ 未完了'}
                      </span>
                    </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </ChartCard>
      )}
      </Container>
    </PageWrapper>
  );
};

export default TeamAnalyticsPage;