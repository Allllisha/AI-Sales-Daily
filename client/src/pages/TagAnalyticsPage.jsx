import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import tagAPI from '../services/tagAPI';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
`;

const Title = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: var(--color-primary);
  margin: 0;
`;

const BackButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
`;

const StatsSection = styled.div`
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
`;

const SectionTitle = styled.h2`
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-4);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-5);
`;

const StatCard = styled.div`
  padding: var(--space-4);
  background: var(--color-background);
  border: 2px solid var(--color-border);
`;

const StatLabel = styled.div`
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
`;

const StatValue = styled.div`
  font-size: var(--font-size-xlarge);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
`;

const TagList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const TagRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
    background: var(--color-surface);
    transform: translateX(4px);
  }

  &:hover span:first-of-type {
    color: var(--color-primary);
  }
`;

const TagName = styled.span`
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  transition: color 0.2s;
`;

const TagCount = styled.span`
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
`;

const PeriodSelector = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
`;

const PeriodButton = styled.button`
  padding: var(--space-2) var(--space-4);
  border: 2px solid ${props => props.active ? 'var(--color-primary)' : 'var(--color-border)'};
  background: ${props => props.active ? 'var(--color-primary)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--color-text)'};
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
    ${props => !props.active && 'background: var(--color-surface);'}
  }
`;

const ChangeIndicator = styled.span`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: ${props => props.change > 0 ? '#10B981' : props.change < 0 ? '#EF4444' : 'var(--color-text-secondary)'};

  &::before {
    content: '${props => props.change > 0 ? '↑' : props.change < 0 ? '↓' : '→'}';
    margin-right: var(--space-1);
  }
`;

const CategorySection = styled.div`
  margin-bottom: var(--space-5);
`;

const CategoryHeader = styled.h3`
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin: 0 0 var(--space-3) 0;
  padding: var(--space-2);
  background: var(--color-surface);
  border-left: 4px solid var(--color-primary);
`;

const LoadingState = styled.div`
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-secondary);
`;

const TagAnalyticsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState(30);

  // カテゴリ名を日本語に変換
  const getCategoryLabel = (category) => {
    const categoryMap = {
      'company': '会社',
      'person': '人物',
      'topic': 'トピック',
      'emotion': '感情',
      'stage': 'ステージ',
      'industry': '業界',
      'product': '製品'
    };
    return categoryMap[category] || category;
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['tagStats', period],
    queryFn: () => tagAPI.getStats(period),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Container>
        <LoadingState>タグ統計を読み込み中...</LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>タグ分析</Title>
        <BackButton onClick={() => navigate('/')}>
          ← ホームに戻る
        </BackButton>
      </Header>

      <PeriodSelector>
        <PeriodButton active={period === 7} onClick={() => setPeriod(7)}>
          7日間
        </PeriodButton>
        <PeriodButton active={period === 30} onClick={() => setPeriod(30)}>
          30日間
        </PeriodButton>
        <PeriodButton active={period === 90} onClick={() => setPeriod(90)}>
          90日間
        </PeriodButton>
        <PeriodButton active={period === 365} onClick={() => setPeriod(365)}>
          1年間
        </PeriodButton>
      </PeriodSelector>

      {stats && (
        <>
          <StatsSection>
            <SectionTitle>カテゴリ別統計（過去{period}日間）</SectionTitle>
            <StatsGrid>
              {stats.categoryStats && stats.categoryStats.map(cat => (
                <StatCard key={cat.category}>
                  <StatLabel>{getCategoryLabel(cat.category)}</StatLabel>
                  <StatValue>{cat.usage_count}回</StatValue>
                  <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
                    {cat.report_count}件の日報
                  </div>
                  {cat.change !== undefined && cat.change !== 0 && (
                    <div style={{ marginTop: 'var(--space-2)' }}>
                      <ChangeIndicator change={cat.change}>
                        {Math.abs(cat.change)}%
                      </ChangeIndicator>
                    </div>
                  )}
                </StatCard>
              ))}
            </StatsGrid>
          </StatsSection>

          <StatsSection>
            <SectionTitle>人気のタグ（Top 20）</SectionTitle>
            <TagList>
              {stats.topTags && stats.topTags.map(tag => (
                <TagRow key={tag.id} onClick={() => navigate(`/tags/${tag.id}`)}>
                  <TagName>{tag.name}</TagName>
                  <TagCount>{tag.usage_count}回使用</TagCount>
                </TagRow>
              ))}
            </TagList>
          </StatsSection>

          {stats.categoryRankings && (
            <StatsSection>
              <SectionTitle>カテゴリ別ランキング</SectionTitle>
              {Object.entries(stats.categoryRankings).map(([category, tags]) => (
                tags.length > 0 && (
                  <CategorySection key={category}>
                    <CategoryHeader>{getCategoryLabel(category)} Top 10</CategoryHeader>
                    <TagList>
                      {tags.map((tag, index) => (
                        <TagRow key={tag.id} onClick={() => navigate(`/tags/${tag.id}`)}>
                          <div>
                            <span style={{ color: 'var(--color-text-secondary)', marginRight: 'var(--space-2)' }}>
                              #{index + 1}
                            </span>
                            <TagName>{tag.name}</TagName>
                          </div>
                          <TagCount>{tag.usage_count}回使用</TagCount>
                        </TagRow>
                      ))}
                    </TagList>
                  </CategorySection>
                )
              ))}
            </StatsSection>
          )}
        </>
      )}
    </Container>
  );
};

export default TagAnalyticsPage;
