import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { analyticsAPI } from '../services/api';
import {
  HiOutlineArrowLeft, HiOutlineEye, HiOutlineSearch,
  HiOutlineThumbUp, HiOutlineBookOpen, HiOutlineTrendingUp,
  HiOutlineClock, HiOutlineTag
} from 'react-icons/hi';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  animation: ${fadeInUp} 0.4s ease-out;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
`;

const BackButton = styled.button`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  font-size: 1.1rem;
  flex-shrink: 0;
  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
  }
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.h1`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-extrabold, var(--font-weight-bold));
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
`;

const UserMeta = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: 2px;
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
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const StatCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  transition: all var(--transition-base);
  &:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
`;

const StatIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
  background: ${props => props.$bg || 'var(--color-primary-50)'};
  color: ${props => props.$color || 'var(--color-primary-600, #2563eb)'};
  font-size: 1.1rem;
`;

const StatValue = styled.div`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-extrabold, var(--font-weight-bold));
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
`;

const StatLabel = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const Card = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
`;

const FullWidthCard = styled(Card)`
  grid-column: 1 / -1;
`;

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  svg { color: var(--color-primary-600, #2563eb); }
`;

const ListItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border-light, var(--color-border));
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  transition: background var(--transition-fast);
  border-radius: var(--radius-sm);
  padding-left: var(--space-2);
  padding-right: var(--space-2);
  ${props => props.$clickable && `&:hover { background: var(--color-surface-alt); }`}
  &:last-child { border-bottom: none; }
`;

const ListRank = styled.span`
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
  background: ${props => props.$rank <= 3 ? 'var(--color-primary-50)' : 'var(--color-surface-alt)'};
  color: ${props => props.$rank <= 3 ? 'var(--color-primary-600, #2563eb)' : 'var(--color-text-tertiary)'};
`;

const ListContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListTitle = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListMeta = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
`;

const ListValue = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-600, #2563eb);
  flex-shrink: 0;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border-light, var(--color-border));
  &:last-child { border-bottom: none; }
`;

const ActivityIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
  background: ${props => props.$bg || 'var(--color-surface-alt)'};
  color: ${props => props.$color || 'var(--color-text-tertiary)'};
`;

const ActivityContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityText = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
`;

const ActivityTime = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
`;

const EmptyText = styled.div`
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-16);
  gap: var(--space-4);
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary-600, #2563eb);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
`;

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  fontSize: '13px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
};
const axisTickStyle = { fill: 'var(--color-text-tertiary, #94a3b8)' };

const roleLabels = { admin: '管理者', site_manager: '現場長', expert: 'ベテラン', worker: '作業員' };
const categoryLabels = { procedure: '手順', safety: '安全', quality: '品質', cost: 'コスト', equipment: '設備', material: '資材' };
const actionLabels = { view: '閲覧', search: '検索', useful_mark: '高評価', voice_query: '音声質問', checklist_use: 'チェックリスト' };
const actionIcons = {
  view: { icon: HiOutlineEye, bg: 'var(--color-primary-50)', color: 'var(--color-primary-600, #2563eb)' },
  search: { icon: HiOutlineSearch, bg: '#fef3c7', color: '#d97706' },
  useful_mark: { icon: HiOutlineThumbUp, bg: '#fdf2f8', color: '#db2777' },
  voice_query: { icon: HiOutlineClock, bg: '#ecfdf5', color: '#059669' },
  checklist_use: { icon: HiOutlineTag, bg: '#f0f9ff', color: '#0284c7' },
};

const periodOptions = [
  { value: 'week', label: '1週間' },
  { value: 'month', label: '1ヶ月' },
  { value: 'quarter', label: '3ヶ月' },
  { value: 'all', label: '全期間' },
];

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

const UserAnalyticsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'user', id, period],
    queryFn: () => analyticsAPI.getUserProgress(id, { period }),
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Container>
        <Header>
          <BackButton onClick={() => navigate('/analytics')}><HiOutlineArrowLeft /></BackButton>
          <UserInfo><UserName>読み込み中...</UserName></UserInfo>
        </Header>
        <LoadingContainer><Spinner /><span style={{ color: 'var(--color-text-tertiary)' }}>データを読み込んでいます...</span></LoadingContainer>
      </Container>
    );
  }

  if (error) {
    const is403 = error?.response?.status === 403;
    return (
      <Container>
        <Header>
          <BackButton onClick={() => navigate('/analytics')}><HiOutlineArrowLeft /></BackButton>
          <UserInfo><UserName>エラー</UserName></UserInfo>
        </Header>
        <EmptyText>{is403 ? 'このユーザーの分析データを閲覧する権限がありません' : 'データの取得に失敗しました'}</EmptyText>
      </Container>
    );
  }

  const { user: userDetail, stats, trend = [], top_knowledge = [], top_searches = [], recent_activity = [] } = data || {};

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/analytics')}><HiOutlineArrowLeft /></BackButton>
        <UserInfo>
          <UserName>{userDetail?.name || '不明'}</UserName>
          <UserMeta>
            {userDetail?.department || ''}{userDetail?.department && ' / '}{roleLabels[userDetail?.role] || userDetail?.role}
          </UserMeta>
        </UserInfo>
        <PeriodFilter>
          {periodOptions.map(opt => (
            <PeriodButton key={opt.value} $active={period === opt.value} onClick={() => setPeriod(opt.value)}>
              {opt.label}
            </PeriodButton>
          ))}
        </PeriodFilter>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatIcon $bg="var(--color-primary-50)" $color="var(--color-primary-600, #2563eb)"><HiOutlineEye /></StatIcon>
          <StatValue>{stats?.knowledge_views || 0}</StatValue>
          <StatLabel>閲覧数</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon $bg="#fef3c7" $color="#d97706"><HiOutlineSearch /></StatIcon>
          <StatValue>{stats?.searches || 0}</StatValue>
          <StatLabel>検索数</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon $bg="#fdf2f8" $color="#db2777"><HiOutlineThumbUp /></StatIcon>
          <StatValue>{stats?.useful_marks || 0}</StatValue>
          <StatLabel>高評価数</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon $bg="#ecfdf5" $color="#059669"><HiOutlineBookOpen /></StatIcon>
          <StatValue>{stats?.unique_knowledge_viewed || 0}</StatValue>
          <StatLabel>閲覧ナレッジ数</StatLabel>
        </StatCard>
      </StatsGrid>

      <ChartsGrid>
        <FullWidthCard>
          <CardTitle><HiOutlineTrendingUp />活動推移</CardTitle>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" fontSize={12} tick={axisTickStyle} />
                <YAxis fontSize={12} tick={axisTickStyle} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="views" name="閲覧" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="searches" name="検索" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="useful" name="高評価" stroke="#db2777" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyText>この期間のアクティビティはありません</EmptyText>
          )}
        </FullWidthCard>

        <Card>
          <CardTitle><HiOutlineBookOpen />よく閲覧するナレッジ</CardTitle>
          {top_knowledge.length > 0 ? (
            top_knowledge.map((item, idx) => (
              <ListItem key={item.id} $clickable onClick={() => navigate(`/knowledge/${item.id}`)}>
                <ListRank $rank={idx + 1}>{idx + 1}</ListRank>
                <ListContent>
                  <ListTitle>{item.title}</ListTitle>
                  <ListMeta>{categoryLabels[item.category] || item.category}{item.work_type && ` / ${item.work_type}`}</ListMeta>
                </ListContent>
                <ListValue>{item.view_count}回</ListValue>
              </ListItem>
            ))
          ) : (
            <EmptyText>データがありません</EmptyText>
          )}
        </Card>

        <Card>
          <CardTitle><HiOutlineSearch />検索キーワード</CardTitle>
          {top_searches.length > 0 ? (
            top_searches.map((item, idx) => (
              <ListItem key={idx}>
                <ListRank $rank={idx + 1}>{idx + 1}</ListRank>
                <ListContent>
                  <ListTitle>{item.search_query}</ListTitle>
                </ListContent>
                <ListValue>{item.count}回</ListValue>
              </ListItem>
            ))
          ) : (
            <EmptyText>データがありません</EmptyText>
          )}
        </Card>
      </ChartsGrid>

      <Card style={{ marginBottom: 'var(--space-8)' }}>
        <CardTitle><HiOutlineClock />最近のアクティビティ</CardTitle>
        {recent_activity.length > 0 ? (
          recent_activity.map((act, idx) => {
            const iconConfig = actionIcons[act.action_type] || actionIcons.view;
            const Icon = iconConfig.icon;
            return (
              <ActivityItem key={idx}>
                <ActivityIcon $bg={iconConfig.bg} $color={iconConfig.color}><Icon /></ActivityIcon>
                <ActivityContent>
                  <ActivityText>
                    {actionLabels[act.action_type] || act.action_type}
                    {act.knowledge_title && (
                      <span
                        style={{ color: 'var(--color-primary-600, #2563eb)', cursor: 'pointer', marginLeft: '4px' }}
                        onClick={() => act.knowledge_id && navigate(`/knowledge/${act.knowledge_id}`)}
                      >
                        {act.knowledge_title}
                      </span>
                    )}
                    {act.search_query && (
                      <span style={{ color: 'var(--color-text-secondary)' }}> "{act.search_query}"</span>
                    )}
                  </ActivityText>
                  <ActivityTime>{formatTime(act.created_at)}</ActivityTime>
                </ActivityContent>
              </ActivityItem>
            );
          })
        ) : (
          <EmptyText>アクティビティがありません</EmptyText>
        )}
      </Card>
    </Container>
  );
};

export default UserAnalyticsPage;
