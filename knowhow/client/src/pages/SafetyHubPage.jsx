import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  HiOutlineClipboardCheck,
  HiOutlineExclamation,
  HiOutlineShieldCheck,
  HiOutlineChevronRight,
} from 'react-icons/hi';
import { checklistAPI, incidentAPI } from '../services/api';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: var(--space-8);
  animation: ${fadeInUp} 0.5s ease-out;

  @media (max-width: 768px) {
    margin-bottom: var(--space-6);
  }
`;

const PageTitle = styled.h1`
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  letter-spacing: -0.03em;

  @media (max-width: 768px) {
    font-size: var(--font-size-2xl);
  }
`;

const PageSubtitle = styled.p`
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);

  @media (max-width: 768px) {
    font-size: var(--font-size-base);
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
`;

const HubCard = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: left;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
  animation: ${fadeInUp} 0.5s ease-out ${props => props.$delay || '0s'} both;
  min-height: 100px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$accentColor || 'var(--color-primary-600)'};
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  &:hover {
    border-color: ${props => props.$accentColor || 'var(--color-primary-lighter)'};
    box-shadow: var(--shadow-lg);
    transform: translateY(-3px);
    &::before { opacity: 1; }
  }

  &:active {
    transform: translateY(0);
    box-shadow: var(--shadow-sm);
  }

  @media (max-width: 768px) {
    padding: var(--space-5);
    min-height: 88px;
  }
`;

const HubCardIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 52px;
    height: 52px;
    font-size: 1.4rem;
  }
`;

const HubCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  min-width: 0;
`;

const HubCardTitle = styled.span`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: var(--font-size-base);
  }
`;

const HubCardDesc = styled.span`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
`;

const HubCardSummary = styled.span`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
`;

const HubCardArrow = styled.div`
  color: var(--color-text-tertiary);
  font-size: 1.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  transition: transform var(--transition-fast);

  ${HubCard}:hover & {
    transform: translateX(3px);
    color: ${props => props.$color || 'var(--color-text-secondary)'};
  }
`;

const SafetyHubPage = () => {
  const navigate = useNavigate();

  const { data: checklistData } = useQuery({
    queryKey: ['checklists', 'hub-summary'],
    queryFn: () => checklistAPI.getAll({ limit: 1 }),
    staleTime: 60000,
  });

  const { data: incidentData } = useQuery({
    queryKey: ['incidents', 'hub-summary'],
    queryFn: () => incidentAPI.getAll({ limit: 1 }),
    staleTime: 60000,
  });

  const checklistCount = checklistData?.total ?? checklistData?.items?.length ?? null;
  const incidentCount = incidentData?.total ?? incidentData?.items?.length ?? null;

  const sections = [
    {
      title: 'チェックリスト',
      description: '日常点検・安全確認を実施',
      icon: <HiOutlineClipboardCheck />,
      path: '/checklists',
      color: '#2563eb',
      bg: '#dbeafe',
      summary: checklistCount !== null ? `${checklistCount}件のチェックリスト` : null,
      delay: '0.05s',
    },
    {
      title: '類災事例',
      description: '過去の事故・ヒヤリハットを確認',
      icon: <HiOutlineExclamation />,
      path: '/incidents',
      color: '#dc2626',
      bg: '#fee2e2',
      summary: incidentCount !== null ? `${incidentCount}件の事例` : null,
      delay: '0.1s',
    },
    {
      title: 'リスク評価',
      description: 'AIで作業リスクを評価',
      icon: <HiOutlineShieldCheck />,
      path: '/risk-assessment',
      color: '#16a34a',
      bg: '#dcfce7',
      summary: '作業のリスクをAIが分析',
      delay: '0.15s',
    },
  ];

  return (
    <Container>
      <PageHeader>
        <PageTitle>安全管理</PageTitle>
        <PageSubtitle>安全に関する機能をまとめて管理します</PageSubtitle>
      </PageHeader>
      <CardGrid>
        {sections.map(section => (
          <HubCard
            key={section.path}
            onClick={() => navigate(section.path)}
            $accentColor={section.color}
            $delay={section.delay}
          >
            <HubCardIcon style={{ background: section.bg, color: section.color }}>
              {section.icon}
            </HubCardIcon>
            <HubCardContent>
              <HubCardTitle>{section.title}</HubCardTitle>
              <HubCardDesc>{section.description}</HubCardDesc>
              {section.summary && (
                <HubCardSummary>{section.summary}</HubCardSummary>
              )}
            </HubCardContent>
            <HubCardArrow $color={section.color}>
              <HiOutlineChevronRight />
            </HubCardArrow>
          </HubCard>
        ))}
      </CardGrid>
    </Container>
  );
};

export default SafetyHubPage;
