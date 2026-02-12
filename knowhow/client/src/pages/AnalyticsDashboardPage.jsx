import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from '@emotion/styled';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import {
  HiOutlineBookOpen, HiOutlineEye, HiOutlineUserGroup,
  HiOutlineExclamation, HiOutlineChartBar, HiOutlineTrendingUp,
  HiOutlineThumbUp, HiOutlineDownload, HiOutlineDocumentText
} from 'react-icons/hi';

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease-out;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-8);
  flex-wrap: wrap;
  gap: var(--space-4);
`;

const PageTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

const PageTitle = styled.h1`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-extrabold, var(--font-weight-bold));
  color: var(--color-text-primary);
  letter-spacing: -0.02em;

  @media (max-width: 640px) {
    font-size: var(--font-size-xl);
  }
`;

const PageSubtitle = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
`;

const PeriodFilter = styled.div`
  display: flex;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
`;

const PeriodButton = styled.button`
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border: none;
  background: ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'transparent'};
  color: ${props => props.$active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)'};
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'var(--color-surface-alt)'};
    color: ${props => props.$active ? 'var(--color-text-inverse)' : 'var(--color-primary-600, #2563eb)'};
  }

  @media (max-width: 640px) {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
  }
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
`;

const ExportButtons = styled.div`
  display: flex;
  gap: var(--space-2);
`;

const ExportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 6px);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;

  &:hover:not(:disabled) {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-8);

  @media (max-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$gradient || 'var(--gradient-primary)'};
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
    }
  }
`;

const StatIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);
  background: ${props => props.$bg || 'var(--color-primary-50)'};
  color: ${props => props.$color || 'var(--color-primary-600, #2563eb)'};
  font-size: 1.25rem;
`;

const StatValue = styled.div`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-extrabold, var(--font-weight-bold));
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
  letter-spacing: -0.02em;
`;

const StatLabel = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  margin-bottom: var(--space-8);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base);

  &:hover {
    box-shadow: var(--shadow-md);
  }

  @media (max-width: 640px) {
    padding: var(--space-4);
  }
`;

const ChartTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
`;

const ChartTitleIcon = styled.span`
  color: var(--color-primary-600, #2563eb);
  font-size: 1.1rem;
  display: flex;
`;

const ChartTitle = styled.h3`
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
`;

const FullWidthChart = styled(ChartCard)`
  grid-column: 1 / -1;
`;

const RankingSection = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-8);
  box-shadow: var(--shadow-sm);

  @media (max-width: 640px) {
    padding: var(--space-4);
  }
`;

const RankingList = styled.div`
  display: flex;
  flex-direction: column;
`;

const RankingItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-2);
  border-bottom: 1px solid var(--color-border-light, var(--color-border));
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
  cursor: pointer;

  &:hover {
    background: var(--color-surface-alt);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const RankNumber = styled.span`
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
  background: ${props => {
    if (props.$rank === 1) return 'linear-gradient(135deg, #fbbf24, #f59e0b)';
    if (props.$rank === 2) return 'linear-gradient(135deg, #d1d5db, #9ca3af)';
    if (props.$rank === 3) return 'linear-gradient(135deg, #f0a78d, #cd7f63)';
    return 'var(--color-surface-alt)';
  }};
  color: ${props => props.$rank <= 3 ? 'white' : 'var(--color-text-tertiary)'};
  ${props => props.$rank <= 3 && 'box-shadow: 0 2px 6px rgba(0,0,0,0.15);'}
`;

const RankContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const RankTitle = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RankMeta = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
`;

const RankValue = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-600, #2563eb);
  flex-shrink: 0;
`;

const EmptyChart = styled.div`
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  gap: var(--space-2);
`;

const EmptyChartIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 1.25rem;
`;

const LoadingCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
`;

const LoadingBar = styled.div`
  height: ${props => props.$h || '20px'};
  width: ${props => props.$w || '100%'};
  background: linear-gradient(90deg, var(--color-surface-alt) 25%, var(--color-border-light, var(--color-border)) 50%, var(--color-surface-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
  margin-bottom: ${props => props.$mb || '0'};
`;

const CHART_COLORS = ['#2563eb', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899'];

const RISK_COLORS = {
  low: '#22c55e',
  medium: '#3b82f6',
  high: '#f97316',
  critical: '#ef4444',
};

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  fontSize: '13px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
};

const axisTickStyle = { fill: 'var(--color-text-tertiary, #94a3b8)' };

const periodOptions = [
  { value: 'week', label: '今週' },
  { value: 'month', label: '今月' },
  { value: 'quarter', label: '3ヶ月' },
  { value: 'all', label: '全期間' },
];

const categoryLabels = {
  procedure: '手順',
  safety: '安全',
  quality: '品質',
  cost: 'コスト',
  equipment: '設備',
  material: '資材',
};

const riskLabels = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '重大',
};

const roleLabels = {
  admin: '管理者',
  site_manager: '現場長',
  expert: 'ベテラン',
  worker: '作業員',
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const AnalyticsDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [exportingCsv, setExportingCsv] = useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: usageData, isLoading: usageLoading, error: usageError } = useQuery({
    queryKey: ['analytics', 'usage', period],
    queryFn: () => analyticsAPI.getUsage({ period }),
    staleTime: 60000,
  });

  const { data: riskData, isLoading: riskLoading, error: riskError } = useQuery({
    queryKey: ['analytics', 'risks', period],
    queryFn: () => analyticsAPI.getRisks({ period }),
    staleTime: 60000,
  });

  const isLoading = usageLoading || riskLoading;
  const hasError = usageError || riskError;

  const stats = usageData?.stats || {};
  const trendData = usageData?.trend || [];
  const categoryData = (usageData?.categories || []).map(item => ({
    ...item,
    name: categoryLabels[item.category] || item.category || item.name,
    value: item.count || item.value || 0,
  }));
  const riskDistribution = (riskData?.distribution || []).map(item => ({
    ...item,
    name: riskLabels[item.risk_level] || item.risk_level || item.name,
    value: item.count || item.value || 0,
  }));
  const popularKnowledge = usageData?.popular || [];
  const userRankings = usageData?.user_rankings || [];

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const blob = await analyticsAPI.exportCsv({ period });
      downloadBlob(blob, `analytics_export_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('CSVエクスポートに失敗しました');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const blob = await analyticsAPI.exportPdf({ period });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('レポート生成に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <Container>
        <PageHeader>
          <PageTitleGroup>
            <PageTitle>分析ダッシュボード</PageTitle>
            <PageSubtitle>ナレッジ活用状況を確認</PageSubtitle>
          </PageTitleGroup>
        </PageHeader>
        <StatsGrid>
          {[1, 2, 3, 4].map(i => (
            <LoadingCard key={i}>
              <LoadingBar $h="44px" $w="44px" $mb="12px" />
              <LoadingBar $h="28px" $w="50%" $mb="8px" />
              <LoadingBar $h="16px" $w="70%" />
            </LoadingCard>
          ))}
        </StatsGrid>
        <ChartsGrid>
          <LoadingCard style={{ gridColumn: '1 / -1' }}>
            <LoadingBar $h="20px" $w="40%" $mb="16px" />
            <LoadingBar $h="280px" />
          </LoadingCard>
          <LoadingCard>
            <LoadingBar $h="20px" $w="40%" $mb="16px" />
            <LoadingBar $h="250px" />
          </LoadingCard>
          <LoadingCard>
            <LoadingBar $h="20px" $w="40%" $mb="16px" />
            <LoadingBar $h="250px" />
          </LoadingCard>
        </ChartsGrid>
      </Container>
    );
  }

  if (hasError) {
    const is403 = usageError?.response?.status === 403 || riskError?.response?.status === 403;
    return (
      <Container>
        <PageHeader>
          <PageTitleGroup>
            <PageTitle>分析ダッシュボード</PageTitle>
            <PageSubtitle>ナレッジ活用状況を確認</PageSubtitle>
          </PageTitleGroup>
        </PageHeader>
        <EmptyChart style={{ height: '300px' }}>
          <EmptyChartIcon><HiOutlineChartBar /></EmptyChartIcon>
          {is403 ? 'この機能は管理者・現場長のみ利用できます' : 'データの取得に失敗しました。再度お試しください。'}
        </EmptyChart>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader>
        <PageTitleGroup>
          <PageTitle>分析ダッシュボード</PageTitle>
          <PageSubtitle>ナレッジ活用状況を確認</PageSubtitle>
        </PageTitleGroup>
        <HeaderControls>
          <PeriodFilter>
            {periodOptions.map(opt => (
              <PeriodButton
                key={opt.value}
                $active={period === opt.value}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </PeriodButton>
            ))}
          </PeriodFilter>
          <ExportButtons>
            <ExportButton onClick={handleExportCsv} disabled={exportingCsv}>
              <HiOutlineDownload />
              {exportingCsv ? '出力中...' : 'CSV'}
            </ExportButton>
            <ExportButton onClick={handleExportPdf}>
              <HiOutlineDocumentText />
              レポート
            </ExportButton>
          </ExportButtons>
        </HeaderControls>
      </PageHeader>

      <StatsGrid>
        <StatCard $gradient="var(--gradient-primary)">
          <StatIcon $bg="var(--color-primary-50)" $color="var(--color-primary-600, #2563eb)">
            <HiOutlineBookOpen />
          </StatIcon>
          <StatValue>{stats.total_knowledge || 0}</StatValue>
          <StatLabel>総ナレッジ数</StatLabel>
        </StatCard>

        <StatCard $gradient="linear-gradient(135deg, #3b82f6, #60a5fa)">
          <StatIcon $bg="var(--color-info-light)" $color="var(--color-info-dark)">
            <HiOutlineEye />
          </StatIcon>
          <StatValue>{stats.monthly_views || 0}</StatValue>
          <StatLabel>今月の閲覧数</StatLabel>
        </StatCard>

        <StatCard $gradient="linear-gradient(135deg, #22c55e, #4ade80)">
          <StatIcon $bg="var(--color-success-light)" $color="var(--color-success-dark)">
            <HiOutlineUserGroup />
          </StatIcon>
          <StatValue>{stats.active_users || 0}</StatValue>
          <StatLabel>アクティブユーザー</StatLabel>
        </StatCard>

        <StatCard $gradient="linear-gradient(135deg, #f59e0b, #fbbf24)">
          <StatIcon $bg="var(--color-warning-light)" $color="var(--color-warning-dark)">
            <HiOutlineExclamation />
          </StatIcon>
          <StatValue>{stats.total_incidents || 0}</StatValue>
          <StatLabel>事例数</StatLabel>
        </StatCard>

        <StatCard $gradient="linear-gradient(135deg, #ec4899, #f472b6)">
          <StatIcon $bg="#fdf2f8" $color="#db2777">
            <HiOutlineThumbUp />
          </StatIcon>
          <StatValue>{stats.useful_marks || 0}</StatValue>
          <StatLabel>高評価数</StatLabel>
        </StatCard>
      </StatsGrid>

      <ChartsGrid>
        <FullWidthChart>
          <ChartTitleRow>
            <ChartTitleIcon><HiOutlineTrendingUp /></ChartTitleIcon>
            <ChartTitle>ナレッジ活用推移</ChartTitle>
          </ChartTitleRow>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" fontSize={12} tick={axisTickStyle} />
                <YAxis fontSize={12} tick={axisTickStyle} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="views" name="閲覧数" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5, strokeWidth: 2 }} />
                <Line type="monotone" dataKey="searches" name="検索数" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5, strokeWidth: 2 }} />
                <Line type="monotone" dataKey="useful" name="高評価" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 3, fill: '#ec4899' }} activeDot={{ r: 5, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>
              <EmptyChartIcon><HiOutlineTrendingUp /></EmptyChartIcon>
              データがありません
            </EmptyChart>
          )}
        </FullWidthChart>

        <ChartCard>
          <ChartTitleRow>
            <ChartTitleIcon><HiOutlineChartBar /></ChartTitleIcon>
            <ChartTitle>カテゴリ別分布</ChartTitle>
          </ChartTitleRow>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 40 : 50}
                    outerRadius={isMobile ? 70 : 80}
                    paddingAngle={3}
                    dataKey="value"
                    label={isMobile ? false : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              {isMobile && categoryData.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
                  {categoryData.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CHART_COLORS[index % CHART_COLORS.length], flexShrink: 0 }} />
                      {item.name}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyChart>
              <EmptyChartIcon><HiOutlineChartBar /></EmptyChartIcon>
              データがありません
            </EmptyChart>
          )}
        </ChartCard>

        <ChartCard>
          <ChartTitleRow>
            <ChartTitleIcon><HiOutlineExclamation /></ChartTitleIcon>
            <ChartTitle>リスクレベル傾向</ChartTitle>
          </ChartTitleRow>
          {riskDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" fontSize={12} tick={axisTickStyle} />
                <YAxis fontSize={12} tick={axisTickStyle} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="件数" radius={[6, 6, 0, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={RISK_COLORS[entry.risk_level] || CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>
              <EmptyChartIcon><HiOutlineExclamation /></EmptyChartIcon>
              データがありません
            </EmptyChart>
          )}
        </ChartCard>
      </ChartsGrid>

      <RankingSection>
        <ChartTitleRow>
          <ChartTitleIcon><HiOutlineBookOpen /></ChartTitleIcon>
          <ChartTitle>人気ナレッジランキング</ChartTitle>
        </ChartTitleRow>
        {popularKnowledge.length > 0 ? (
          <RankingList>
            {popularKnowledge.slice(0, 10).map((item, idx) => (
              <RankingItem key={item.id || idx} onClick={() => navigate(`/knowledge/${item.id}`)}>
                <RankNumber $rank={idx + 1}>{idx + 1}</RankNumber>
                <RankContent>
                  <RankTitle>{item.title}</RankTitle>
                  <RankMeta>
                    {categoryLabels[item.category] || item.category}
                    {item.work_type && ` / ${item.work_type}`}
                  </RankMeta>
                </RankContent>
                <RankValue style={{ textAlign: 'right' }}>
                  <div>{item.view_count || 0} 閲覧</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: item.useful_count > 0 ? '#db2777' : 'var(--color-text-tertiary)' }}>
                    {item.useful_count || 0} 高評価
                    {item.view_count > 0 && ` (${Math.round((item.useful_count || 0) / item.view_count * 100)}%)`}
                  </div>
                </RankValue>
              </RankingItem>
            ))}
          </RankingList>
        ) : (
          <EmptyChart>
            <EmptyChartIcon><HiOutlineBookOpen /></EmptyChartIcon>
            データがありません
          </EmptyChart>
        )}
      </RankingSection>

      <RankingSection>
        <ChartTitleRow>
          <ChartTitleIcon><HiOutlineUserGroup /></ChartTitleIcon>
          <ChartTitle>ユーザー別ナレッジ活用状況</ChartTitle>
        </ChartTitleRow>
        {userRankings.length > 0 ? (
          <RankingList>
            {userRankings.map((u, idx) => {
              const inactive = u.total_actions === 0;
              return (
                <RankingItem key={u.id} onClick={() => navigate(`/analytics/users/${u.id}`)} style={{ opacity: inactive ? 0.55 : 1 }}>
                  <RankNumber $rank={inactive ? 0 : idx + 1}>{idx + 1}</RankNumber>
                  <RankContent>
                    <RankTitle>{u.name}</RankTitle>
                    <RankMeta>
                      {u.department || roleLabels[u.role] || u.role}
                      {inactive
                        ? ' / この期間の活動なし'
                        : ` / ${u.unique_knowledge}件のナレッジを閲覧`}
                    </RankMeta>
                  </RankContent>
                  {!inactive && (
                    <RankValue style={{ textAlign: 'right' }}>
                      <div>{u.views} 閲覧 / {u.searches} 検索</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: u.useful_marks > 0 ? '#db2777' : 'var(--color-text-tertiary)' }}>
                        {u.useful_marks} 高評価
                      </div>
                    </RankValue>
                  )}
                </RankingItem>
              );
            })}
          </RankingList>
        ) : (
          <EmptyChart>
            <EmptyChartIcon><HiOutlineUserGroup /></EmptyChartIcon>
            データがありません
          </EmptyChart>
        )}
      </RankingSection>
    </Container>
  );
};

export default AnalyticsDashboardPage;
