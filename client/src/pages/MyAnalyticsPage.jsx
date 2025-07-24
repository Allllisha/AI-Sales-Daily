import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { analyticsAPI } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/designSystem';
import { Card } from '../styles/componentStyles';
import toast from 'react-hot-toast';

const Container = styled.div`
  padding: ${spacing[8]};
  max-width: 1200px;
  margin: 0 auto;
  
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

const PeriodSelector = styled.div`
  display: flex;
  gap: ${spacing[3]};
  margin-bottom: ${spacing[6]};
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

const ActionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[3]};
  max-height: 400px;
  overflow-y: auto;
`;

const ActionItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: ${spacing[4]};
  background: ${props => props.completed ? colors.neutral[50] : 'white'};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${borderRadius.md};
  gap: ${spacing[3]};
  transition: all 0.2s;

  &:hover {
    box-shadow: ${shadows.sm};
  }
`;

const ActionCheckbox = styled.input`
  margin-top: 2px;
  width: 18px;
  height: 18px;
  accent-color: ${colors.success[500]};
`;

const ActionContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${spacing[2]};
`;

const ActionText = styled.div`
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  color: ${props => props.completed ? colors.neutral[500] : colors.neutral[800]};
  text-decoration: ${props => props.completed ? 'line-through' : 'none'};
  font-family: ${typography.fontFamily.sans};
`;

const ActionMeta = styled.div`
  display: flex;
  gap: ${spacing[4]};
  align-items: center;
  flex-wrap: wrap;
`;

const ActionCustomer = styled.span`
  font-size: ${typography.fontSize.xs};
  color: ${colors.primary[600]};
  background: ${colors.primary[50]};
  padding: ${spacing[1]} ${spacing[2]};
  border-radius: ${borderRadius.sm};
  font-weight: ${typography.fontWeight.medium};
`;

const ActionDueDate = styled.span`
  font-size: ${typography.fontSize.xs};
  color: ${props => props.overdue ? colors.error[600] : colors.warning[600]};
  background: ${props => props.overdue ? colors.error[50] : colors.warning[50]};
  padding: ${spacing[1]} ${spacing[2]};
  border-radius: ${borderRadius.sm};
  font-weight: ${typography.fontWeight.medium};
`;

const ActionDate = styled.span`
  font-size: ${typography.fontSize.xs};
  color: ${colors.neutral[500]};
`;

const MyAnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [localActions, setLocalActions] = useState([]);
  const [actionCompletionStates, setActionCompletionStates] = useState({});
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
    fetchAnalyticsData();
  }, [selectedPeriod]);
  
  // ページにフォーカスが戻った時にデータを再取得
  useEffect(() => {
    const handleFocus = () => {
      console.log('Page focused, refetching analytics data');
      fetchAnalyticsData();
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

  const fetchAnalyticsData = async () => {
    try {
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
        // 保存された完了状態を適用
        const actionsWithSavedStates = data.actionsList.map(action => {
          const actionKey = `${action.reportId}_${action.text}`;
          const savedCompleted = actionCompletionStates[actionKey];
          return {
            ...action,
            completed: savedCompleted !== undefined ? savedCompleted : action.completed
          };
        });
        setLocalActions(actionsWithSavedStates);
        
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
      <Container>
        <LoadingSpinner>データを読み込み中...</LoadingSpinner>
      </Container>
    );
  }

  if (!analyticsData) {
    return (
      <Container>
        <Header>
          <Title>マイ分析</Title>
        </Header>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>データが取得できませんでした</p>
          <button onClick={fetchAnalyticsData}>再試行</button>
        </div>
      </Container>
    );
  }
  
  console.log('Rendering analytics data:', analyticsData);

  const { 
    basicStats = {}, 
    dailyReports = [], 
    customerAnalysis = [], 
    projectCategories = [], 
    issuesAnalysis = [], 
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
          <StatValue style={{ color: colors.success[600] }}>{actionStats.completed}</StatValue>
          <StatLabel>アクション完了数</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue style={{ color: colors.warning[600] }}>{actionStats.pending}</StatValue>
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
            <ResponsiveContainer width="100%" height={300}>
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
                stroke={visibleLines.count ? colors.primary[500] : 'transparent'}
                strokeWidth={2}
                dot={visibleLines.count ? { fill: colors.primary[500], r: 4 } : false}
                name="日報数"
                hide={!visibleLines.count}
              />
              <Line 
                type="monotone" 
                dataKey="completedActions" 
                stroke={visibleLines.completedActions ? colors.warning[500] : 'transparent'}
                strokeWidth={2}
                dot={visibleLines.completedActions ? { fill: colors.warning[500], r: 4 } : false}
                name="アクション完了数"
                hide={!visibleLines.completedActions}
              />
              <Line 
                type="monotone" 
                dataKey="customerCount" 
                stroke={visibleLines.customerCount ? '#8B5CF6' : 'transparent'}
                strokeWidth={2}
                dot={visibleLines.customerCount ? { fill: '#8B5CF6', r: 4 } : false}
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

        {/* 案件カテゴリ分析 */}
        <ChartCard>
          <ChartTitle>案件カテゴリ分析</ChartTitle>
          {projectCategories && projectCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
              <Pie
                data={projectCategories}
                cx="50%"
                cy="40%"
                outerRadius={60}
                fill="#8884d8"
                dataKey="count"
              >
                {projectCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => `${entry.payload.category} (${entry.payload.count})`}
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
          {(() => {
            console.log('Customer Analysis Data:', customerAnalysis);
            console.log('Customer Analysis Length:', customerAnalysis?.length);
            return null;
          })()}
          {customerAnalysis && customerAnalysis.length > 0 ? (
            customerAnalysis.length === 1 ? (
              // 1件の場合はプログレスバー風の表示
              <div style={{ padding: '20px' }}>
                {customerAnalysis.map((item, index) => (
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
                        width: '100%', 
                        height: '100%', 
                        backgroundColor: colors.primary[500],
                        borderRadius: '6px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 複数件の場合はバーチャート
              <ResponsiveContainer width="100%" height={Math.max(200, customerAnalysis.length * 60)}>
                <BarChart 
                  data={customerAnalysis} 
                  layout="horizontal"
                  margin={{ left: 10, right: 20, top: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="customer" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="reportCount" fill={colors.primary[500]} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              データがありません
            </div>
          )}
        </ChartCard>

        {/* 課題・リスク分析 */}
        <ChartCard>
          <ChartTitle>課題・リスク分析</ChartTitle>
          {issuesAnalysis && issuesAnalysis.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={issuesAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="issueType" 
                  angle={-30} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 11, fill: colors.neutral[600] }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12, fill: colors.neutral[600] }} />
                <Tooltip />
                <Bar dataKey="count" fill={colors.primary[500]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              データがありません
            </div>
          )}
        </ChartCard>
      </ChartGrid>

      {/* アクション一覧（Todoリスト形式） */}
      {localActions && localActions.length > 0 && (
        <ChartCard style={{ marginTop: spacing[8] }}>
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
        <ChartCard style={{ marginTop: spacing[8] }}>
          <ChartTitle>顧客の趣味・関心事（Top 10）</ChartTitle>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={relationshipAnalysis.topHobbies}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hobby" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={colors.secondary[500]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </Container>
  );
};

export default MyAnalyticsPage;