import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { knowledgeAPI } from '../services/api';
import styled from '@emotion/styled';
import ModeSelector from '../components/ModeSelector';
import KnowledgeCard from '../components/KnowledgeCard';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineChartBar, HiOutlineChevronRight, HiOutlineBookOpen, HiOutlineChatAlt2, HiOutlineShieldCheck } from 'react-icons/hi';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const WelcomeSection = styled.div`
  background: var(--gradient-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-8) var(--space-8);
  margin-bottom: var(--space-8);
  color: var(--color-text-inverse);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s ease-out;

  &::before {
    content: '';
    position: absolute;
    top: -60%;
    right: -15%;
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
  &::after {
    content: '';
    position: absolute;
    bottom: -40%;
    left: -10%;
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%);
    border-radius: 50%;
  }

  @media (max-width: 768px) {
    padding: var(--space-6) var(--space-5);
    margin-bottom: var(--space-6);
    border-radius: var(--radius-lg);
  }
`;

const WelcomeTitle = styled.h1`
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-inverse);
  margin-bottom: var(--space-2);
  position: relative;
  letter-spacing: -0.03em;

  @media (max-width: 768px) {
    font-size: var(--font-size-2xl);
  }
`;

const WelcomeSubtitle = styled.p`
  font-size: var(--font-size-lg);
  color: rgba(255, 255, 255, 0.8);
  position: relative;

  @media (max-width: 768px) {
    font-size: var(--font-size-base);
  }
`;

const Section = styled.section`
  margin-bottom: var(--space-8);
  animation: fadeInUp 0.5s ease-out ${props => props.$delay || '0s'} both;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
`;

const SectionTitle = styled.h2`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
`;

const ViewAllButton = styled.button`
  background: none;
  border: none;
  color: var(--color-primary-600, #2563eb);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-1);

  &:hover {
    background: var(--color-primary-50);
  }
`;

const KnowledgeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
`;

const QuickActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${props => props.$gradient || 'var(--gradient-primary)'};
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  &:hover {
    border-color: var(--color-primary-lighter);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    &::before { opacity: 1; }
  }

  &:active {
    transform: translateY(0);
  }
`;

const QuickActionIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
  background: ${props => props.$bg || 'var(--color-primary-50)'};
  color: ${props => props.$color || 'var(--color-primary-600, #2563eb)'};
`;

const QuickActionText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const QuickActionTitle = styled.span`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
`;

const QuickActionDesc = styled.span`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
`;

const EmptyBox = styled.div`
  text-align: center;
  padding: var(--space-12) var(--space-6);
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: var(--color-primary-50);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-light);
  font-size: 1.5rem;
  margin: 0 auto var(--space-4);
`;

const EmptyText = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  line-height: var(--line-height-relaxed);
`;

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: recentKnowledge } = useQuery({
    queryKey: ['knowledge', 'recent'],
    queryFn: () => knowledgeAPI.getAll({ limit: 6, sort: 'updated_at', order: 'desc' }),
    staleTime: 60000,
  });

  const handleModeSelect = (mode) => {
    if (mode === 'office') {
      navigate('/office-chat');
    } else {
      navigate('/field-voice');
    }
  };

  const knowledgeList = recentKnowledge?.items || recentKnowledge || [];

  return (
    <Container>
      <WelcomeSection>
        <WelcomeTitle>
          {user?.name}さん、お疲れ様です
        </WelcomeTitle>
        <WelcomeSubtitle>
          今日もAIアシスタントがサポートします
        </WelcomeSubtitle>
      </WelcomeSection>

      <Section $delay="0.05s">
        <SectionTitle style={{ marginBottom: 'var(--space-5)' }}>作業モードを選択</SectionTitle>
        <ModeSelector onSelect={handleModeSelect} />
      </Section>

      <Section $delay="0.1s">
        <SectionTitle style={{ marginBottom: 'var(--space-5)' }}>クイックアクション</SectionTitle>
        <QuickActions>
          <QuickActionButton onClick={() => navigate('/knowledge/new')} $gradient="linear-gradient(135deg, #22c55e, #16a34a)">
            <QuickActionIcon $bg="var(--color-success-light)" $color="var(--color-success-dark)">
              <HiOutlinePlus />
            </QuickActionIcon>
            <QuickActionText>
              <QuickActionTitle>ナレッジ登録</QuickActionTitle>
              <QuickActionDesc>知見・ノウハウを共有</QuickActionDesc>
            </QuickActionText>
          </QuickActionButton>
          <QuickActionButton onClick={() => navigate('/knowledge/search')} $gradient="var(--gradient-primary)">
            <QuickActionIcon $bg="var(--color-info-light)" $color="var(--color-info-dark)">
              <HiOutlineSearch />
            </QuickActionIcon>
            <QuickActionText>
              <QuickActionTitle>ナレッジ検索</QuickActionTitle>
              <QuickActionDesc>自然言語で検索</QuickActionDesc>
            </QuickActionText>
          </QuickActionButton>
          <QuickActionButton onClick={() => navigate('/analytics')} $gradient="var(--gradient-accent)">
            <QuickActionIcon $bg="var(--color-warning-light)" $color="var(--color-warning-dark)">
              <HiOutlineChartBar />
            </QuickActionIcon>
            <QuickActionText>
              <QuickActionTitle>分析ダッシュボード</QuickActionTitle>
              <QuickActionDesc>活用状況を確認</QuickActionDesc>
            </QuickActionText>
          </QuickActionButton>
          <QuickActionButton onClick={() => navigate('/sessions')} $gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)">
            <QuickActionIcon $bg="#ede9fe" $color="#7c3aed">
              <HiOutlineChatAlt2 />
            </QuickActionIcon>
            <QuickActionText>
              <QuickActionTitle>会話履歴</QuickActionTitle>
              <QuickActionDesc>過去の会話を確認</QuickActionDesc>
            </QuickActionText>
          </QuickActionButton>
          <QuickActionButton onClick={() => navigate('/risk-assessment')} $gradient="linear-gradient(135deg, #ef4444, #dc2626)">
            <QuickActionIcon $bg="#fee2e2" $color="#dc2626">
              <HiOutlineShieldCheck />
            </QuickActionIcon>
            <QuickActionText>
              <QuickActionTitle>リスク評価</QuickActionTitle>
              <QuickActionDesc>作業リスクをAI評価</QuickActionDesc>
            </QuickActionText>
          </QuickActionButton>
        </QuickActions>
      </Section>

      <Section $delay="0.15s">
        <SectionHeader>
          <SectionTitle>最近のナレッジ</SectionTitle>
          <ViewAllButton onClick={() => navigate('/knowledge')}>
            すべて表示
            <HiOutlineChevronRight />
          </ViewAllButton>
        </SectionHeader>
        {knowledgeList.length > 0 ? (
          <KnowledgeGrid>
            {knowledgeList.slice(0, 6).map(item => (
              <KnowledgeCard key={item.id} knowledge={item} />
            ))}
          </KnowledgeGrid>
        ) : (
          <EmptyBox>
            <EmptyIcon><HiOutlineBookOpen /></EmptyIcon>
            <EmptyText>
              まだナレッジが登録されていません。<br />
              「ナレッジ登録」から始めましょう。
            </EmptyText>
          </EmptyBox>
        )}
      </Section>
    </Container>
  );
};

export default HomePage;
