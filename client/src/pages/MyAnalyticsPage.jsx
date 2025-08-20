import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { analyticsAPI } from '../services/api';
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

const PeriodSelector = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
`;

const PeriodButton = styled.button`
  padding: var(--space-3) var(--space-4);
  border: 2px solid ${props => props.active ? 'var(--color-accent)' : 'var(--color-border)'};
  background: ${props => props.active ? 'var(--color-accent)' : 'var(--color-background)'};
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
    background: ${props => props.active ? 'var(--color-accent-hover)' : 'var(--color-surface)'};
    border-color: ${props => props.active ? 'var(--color-accent-hover)' : 'var(--color-accent)'};
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
  color: var(--color-accent);
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

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

// オレンジテーマに統一した色パレット
const INDUSTRY_COLORS = {
  '建設': '#F97316', // メインオレンジ
  '製造': '#FB923C', // ソフトオレンジ
  'IT': '#FED7AA', // ライトオレンジ
  '小売': '#EA580C', // ダークオレンジ
  'サービス': '#DC2626', // レッドオレンジ
  '不動産': '#FBBF24', // イエローオレンジ
  '金融': '#F59E0B', // アンバー
  '医療': '#D97706', // バーントオレンジ
  '教育': '#FDE68A', // ペールイエロー
  'その他': '#FCA5A5'  // ライトコーラル
};

// オレンジテーマカラーパレット
const COLORS = [
  '#F97316', // メインオレンジ
  '#FB923C', // ソフトオレンジ
  '#FED7AA', // ライトオレンジ
  '#EA580C', // ダークオレンジ
  '#DC2626', // レッドオレンジ
  '#FBBF24', // イエローオレンジ
  '#F59E0B', // アンバー
  '#D97706', // バーントオレンジ
];

const ActionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 400px;
  overflow-y: auto;
  overflow-x: auto;
  
  @media (max-width: 768px) {
    -webkit-overflow-scrolling: touch;
  }
`;

const ActionItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: var(--space-4);
  background: ${props => props.completed ? 'var(--color-surface-alt)' : 'var(--color-background)'};
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  gap: var(--space-3);
  transition: all 0.2s ease-in-out;
  min-width: 300px;

  &:hover {
    box-shadow: var(--shadow-elevation);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  @media (max-width: 400px) {
    min-width: 280px;
    padding: var(--space-3);
  }
`;

const ActionCheckbox = styled.input`
  margin-top: 2px;
  width: 18px;
  height: 18px;
  accent-color: var(--color-success);
`;

const ActionContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const ActionText = styled.div`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: ${props => props.completed ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)'};
  text-decoration: ${props => props.completed ? 'line-through' : 'none'};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const ActionMeta = styled.div`
  display: flex;
  gap: var(--space-4);
  align-items: center;
  flex-wrap: wrap;
`;

const ActionCustomer = styled.span`
  font-size: var(--font-size-micro);
  color: var(--color-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-none);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ActionDueDate = styled.span`
  font-size: var(--font-size-micro);
  color: ${props => props.overdue ? 'var(--color-error)' : 'var(--color-warning)'};
  background: var(--color-surface-alt);
  border: 1px solid ${props => props.overdue ? 'var(--color-error)' : 'var(--color-warning)'};
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-none);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ActionDate = styled.span`
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;


const MyAnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [localActions, setLocalActions] = useState([]);
  const [actionCompletionStates, setActionCompletionStates] = useState({});
  const [issuesAnalysis, setIssuesAnalysis] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [visibleLines, setVisibleLines] = useState({
    count: true,
    completedActions: true,
    customerCount: true
  });

  const periods = [
    { value: 7, label: '7日間' },
    { value: 30, label: '30日間' },
    { value: 90, label: '90日間' }
  ];

  // ローカルストレージからアクション完了状態を読み込み
  useEffect(() => {
    const savedStates = localStorage.getItem('actionCompletionStates');
    if (savedStates) {
      try {
        setActionCompletionStates(JSON.parse(savedStates));
      } catch (error) {
        console.error('Failed to parse saved action states:', error);
      }
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData(true); // 期間が変更された時は強制的に再取得
    fetchIssuesAnalysis();
  }, [selectedPeriod]);
  
  // ページにフォーカスが戻った時の処理（チェックボックス状態は維持）
  useEffect(() => {
    const handleFocus = () => {
      console.log('Page focused, keeping checkbox states');
      // チェックボックスの状態は再取得しない
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleActionToggle = (index, completed) => {
    const action = localActions[index];
    const actionKey = `${action.reportId}_${action.text}`; // ユニークなキーを生成
    
    const updatedActions = [...localActions];
    updatedActions[index] = { ...updatedActions[index], completed };
    setLocalActions(updatedActions);
    
    // ローカルストレージに状態を保存
    const newStates = { ...actionCompletionStates, [actionKey]: completed };
    setActionCompletionStates(newStates);
    localStorage.setItem('actionCompletionStates', JSON.stringify(newStates));
    
    // 現在のアクションリストも更新
    localStorage.setItem('currentActionsList', JSON.stringify(updatedActions));
    
    // 日別活動推移のデータも更新
    updateDailyReportsWithActionData(updatedActions);
    
    if (completed) {
      toast.success('アクションを完了しました');
    } else {
      toast.success('アクションを未完了に戻しました');
    }
  };

  const updateDailyReportsWithActionData = (actions) => {
    if (!analyticsData?.dailyReports) return;
    
    // アクションを日付ごとにグループ化
    const actionsByDate = {};
    actions.forEach(action => {
      const dateStr = new Date(action.reportDate).toISOString().split('T')[0];
      if (!actionsByDate[dateStr]) {
        actionsByDate[dateStr] = { total: 0, completed: 0 };
      }
      actionsByDate[dateStr].total++;
      if (action.completed) {
        actionsByDate[dateStr].completed++;
      }
    });
    
    // dailyReportsを更新（既存のactionCountを保持しつつcompletedActionsを更新）
    const updatedDailyReports = analyticsData.dailyReports.map(dayData => ({
      ...dayData,
      completedActions: actionsByDate[dayData.date]?.completed || 0
      // actionCountは既存の値を保持（サーバーから取得した値）
    }));
    
    // analyticsDataを更新
    setAnalyticsData(prev => ({
      ...prev,
      dailyReports: updatedDailyReports
    }));
  };

  const fetchIssuesAnalysis = async () => {
    try {
      setIssuesLoading(true);
      const data = await analyticsAPI.getPersonalIssues(selectedPeriod);
      setIssuesAnalysis(data.issuesAnalysis || []);
    } catch (error) {
      console.error('Issues analysis fetch error:', error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const fetchAnalyticsData = async (forceRefresh = false) => {
    try {
      // forceRefreshがfalseでlocalActionsが既に存在する場合は再取得しない
      if (!forceRefresh && localActions.length > 0) {
        console.log('Using cached actions data');
        return;
      }
      
      setLoading(true);
      console.log('Fetching analytics data for period:', selectedPeriod);
      const data = await analyticsAPI.getPersonalAnalytics(selectedPeriod);
      console.log('Analytics data received:', data);
      console.log('basicStats from API:', data.basicStats);
      console.log('Debug - total_reports:', data.basicStats?.total_reports);
      console.log('Full API response:', JSON.stringify(data, null, 2));
      setAnalyticsData(data);
      // アクションリストをローカル状態にコピー（チェックボックス操作用）
      if (data.actionsList) {
        console.log('Raw actionsList from API:', data.actionsList);
        console.log('Number of actions:', data.actionsList.length);
        
        // 最新のローカルストレージの状態を取得
        const savedStates = localStorage.getItem('actionCompletionStates');
        const currentActionStates = savedStates ? JSON.parse(savedStates) : {};
        
        // 保存された完了状態を適用
        const actionsWithSavedStates = data.actionsList.map(action => {
          const actionKey = `${action.reportId}_${action.text}`;
          const savedCompleted = currentActionStates[actionKey];
          return {
            ...action,
            completed: savedCompleted !== undefined ? savedCompleted : action.completed
          };
        });
        console.log('Actions with saved states:', actionsWithSavedStates);
        setLocalActions(actionsWithSavedStates);
        
        // 現在のアクションリストをローカルストレージに保存（ホームページでの表示用）
        localStorage.setItem('currentActionsList', JSON.stringify(actionsWithSavedStates));
        
        // 初回読み込み時も日別活動推移を更新
        if (actionsWithSavedStates.length > 0) {
          setTimeout(() => updateDailyReportsWithActionData(actionsWithSavedStates), 100);
        }
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      console.error('Error details:', error.response?.data);
      toast.error('分析データの取得に失敗しました: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

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
            <Title>マイ分析</Title>
          </Header>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>データが取得できませんでした</p>
            <button onClick={fetchAnalyticsData}>再試行</button>
          </div>
        </Container>
      </PageWrapper>
    );
  }
  
  console.log('Rendering analytics data:', analyticsData);

  const { 
    basicStats = {}, 
    dailyReports = [], 
    customerAnalysis = [], 
    industryAnalysis = [], 
    relationshipAnalysis = {} 
  } = analyticsData;

  // リアルタイムでアクション完了数を計算
  const calculateActionStats = () => {
    const totalActions = localActions.length;
    const completedActions = localActions.filter(action => action.completed).length;
    const pendingActions = totalActions - completedActions;
    
    return {
      total: totalActions,
      completed: completedActions,
      pending: pendingActions
    };
  };

  const actionStats = calculateActionStats();

  // レジェンドクリック時の表示/非表示切り替え
  const handleLegendClick = (dataKey) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  return (
    <PageWrapper>
      <Container>
      <Header>
        <Title>マイ分析</Title>
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
      </Header>

      {/* 基本統計 */}
      <StatsGrid>
        <StatCard>
          <StatValue>{basicStats.total_reports}</StatValue>
          <StatLabel>総日報数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{basicStats.unique_customers}</StatValue>
          <StatLabel>取引先数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{actionStats.total}</StatValue>
          <StatLabel>アクション項目数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue style={{ color: 'var(--color-success)' }}>{actionStats.completed}</StatValue>
          <StatLabel>アクション完了数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue style={{ color: 'var(--color-warning)' }}>{actionStats.pending}</StatValue>
          <StatLabel>アクション未完了数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{relationshipAnalysis?.reportsWithPersonalInfo || 0}</StatValue>
          <StatLabel>関係構築情報あり</StatLabel>
        </StatCard>
      </StatsGrid>

      {/* チャート */}
      <ChartGrid>
        {/* 日別レポート数 */}
        <ChartCard>
          <ChartTitle>日別活動推移</ChartTitle>
          {dailyReports && dailyReports.length > 0 ? (
            <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 250 : 300}>
              <LineChart data={dailyReports}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(date) => new Date(date).toLocaleDateString('ja-JP')}
                formatter={(value, name) => {
                  const labels = {
                    'count': '日報数',
                    'completedActions': 'アクション完了数',
                    'customerCount': '取引先数'
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend 
                onClick={(e) => {
                  if (e && e.dataKey) {
                    handleLegendClick(e.dataKey);
                  }
                }}
                wrapperStyle={{ cursor: 'pointer', userSelect: 'none' }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke={visibleLines.count ? '#F97316' : 'transparent'}
                strokeWidth={2}
                dot={visibleLines.count ? { fill: '#F97316', r: 4 } : false}
                name="日報数"
                hide={!visibleLines.count}
              />
              <Line 
                type="monotone" 
                dataKey="completedActions" 
                stroke={visibleLines.completedActions ? '#10B981' : 'transparent'}
                strokeWidth={2}
                dot={visibleLines.completedActions ? { fill: '#10B981', r: 4 } : false}
                name="アクション完了数"
                hide={!visibleLines.completedActions}
              />
              <Line 
                type="monotone" 
                dataKey="customerCount" 
                stroke={visibleLines.customerCount ? '#FB923C' : 'transparent'}
                strokeWidth={2}
                dot={visibleLines.customerCount ? { fill: '#FB923C', r: 4 } : false}
                name="取引先数"
                hide={!visibleLines.customerCount}
              />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              データがありません
            </div>
          )}
        </ChartCard>

        {/* 業界分析 */}
        <ChartCard>
          <ChartTitle>業界分析</ChartTitle>
          {industryAnalysis && industryAnalysis.length > 0 ? (
            <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 250 : 300}>
              <PieChart>
              <Pie
                data={industryAnalysis}
                cx="50%"
                cy="40%"
                outerRadius={60}
                fill="#F97316"
                dataKey="count"
              >
                {industryAnalysis.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={INDUSTRY_COLORS[entry.industry] || COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => `${entry.payload.industry} (${entry.payload.count})`}
                wrapperStyle={{
                  paddingTop: '10px'
                }}
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
            <div style={{ 
              padding: '20px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
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

        {/* 課題・リスク分析 */}
        <ChartCard>
          <ChartTitle>よく使われる課題キーワード</ChartTitle>
          {issuesAnalysis && issuesAnalysis.length > 0 ? (
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
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              データがありません
            </div>
          )}
        </ChartCard>
      </ChartGrid>

      {/* アクション一覧（Todoリスト形式） */}
      {localActions && localActions.length > 0 && (
        <ChartCard style={{ marginTop: 'var(--space-6)' }}>
          <ChartTitle>アクション一覧</ChartTitle>
          <ActionsList>
            {localActions.map((action, index) => (
              <ActionItem key={index} completed={action.completed}>
                <ActionCheckbox 
                  type="checkbox" 
                  checked={action.completed}
                  onChange={(e) => handleActionToggle(index, e.target.checked)}
                />
                <ActionContent>
                  <ActionText completed={action.completed}>
                    {action.text}
                  </ActionText>
                  <ActionMeta>
                    <ActionCustomer>{action.customer}</ActionCustomer>
                    {action.dueDate && (
                      <ActionDueDate overdue={new Date(action.dueDate) < new Date() && !action.completed}>
                        期限: {new Date(action.dueDate).toLocaleDateString('ja-JP')}
                      </ActionDueDate>
                    )}
                    <ActionDate>
                      {new Date(action.reportDate).toLocaleDateString('ja-JP')}
                    </ActionDate>
                  </ActionMeta>
                </ActionContent>
              </ActionItem>
            ))}
          </ActionsList>
        </ChartCard>
      )}

      {/* 関係構築情報 */}
      {relationshipAnalysis && relationshipAnalysis.topHobbies && relationshipAnalysis.topHobbies.length > 0 && (
        <ChartCard style={{ marginTop: 'var(--space-6)' }}>
          <ChartTitle>顧客の趣味・関心事（Top 10）</ChartTitle>
          {relationshipAnalysis.topHobbies.length === 1 ? (
            // 1件の場合はプログレスバー風の表示
            <div style={{ padding: '20px' }}>
              {relationshipAnalysis.topHobbies.map((item, index) => (
                <div key={index} style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {item.hobby}
                    </span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: 'var(--color-accent)',
                      fontSize: '18px'
                    }}>
                      {item.count}件
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
                      width: '100%', 
                      height: '100%', 
                      backgroundColor: 'var(--color-accent)',
                      borderRadius: '6px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // 複数件の場合はバーチャート（動的な高さ調整）
            <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? Math.max(180, Math.min(250, relationshipAnalysis.topHobbies.length * 35)) : Math.max(200, relationshipAnalysis.topHobbies.length * 40)}>
              <BarChart data={relationshipAnalysis.topHobbies}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hobby" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#F97316" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}
      </Container>
    </PageWrapper>
  );
};

export default MyAnalyticsPage;