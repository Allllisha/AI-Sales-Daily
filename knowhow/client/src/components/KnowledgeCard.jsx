import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import RiskBadge from './RiskBadge';
import { HiOutlineEye, HiOutlineThumbUp, HiOutlineChevronRight } from 'react-icons/hi';

const Card = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gradient-primary);
    opacity: 0;
    transition: opacity var(--transition-base);
  }

  &:hover {
    box-shadow: var(--shadow-lg);
    border-color: var(--color-primary-lighter);
    transform: translateY(-3px);

    &::before {
      opacity: 1;
    }
  }

  &:hover .arrow-icon {
    opacity: 1;
    transform: translateY(-50%) translateX(2px);
    color: var(--color-primary-600, #2563eb);
  }

  &:active {
    transform: translateY(-1px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
`;

const Title = styled.h3`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: var(--line-height-snug, 1.375);
  flex: 1;
  letter-spacing: -0.01em;
`;

const Summary = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

const CategoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  color: #2563eb;
`;

const WorkTypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-light);
`;

const Stats = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border-light);
`;

const StatItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
`;

const ArrowIcon = styled.span`
  position: absolute;
  right: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  font-size: 1.2rem;
  opacity: 0;
  transition: all var(--transition-fast);

  /* hover style applied via parent .card-hover class */
`;

const DraftBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
`;

const categoryLabels = {
  procedure: '手順',
  safety: '安全',
  quality: '品質',
  cost: 'コスト',
  equipment: '設備',
  material: '資材'
};

const KnowledgeCard = ({ knowledge }) => {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate(`/knowledge/${knowledge.id}`)}>
      <CardHeader>
        <Title>{knowledge.title}</Title>
        {knowledge.status === 'draft' && <DraftBadge>下書き</DraftBadge>}
        <RiskBadge level={knowledge.risk_level} />
      </CardHeader>

      {knowledge.summary && (
        <Summary>{knowledge.summary}</Summary>
      )}

      <MetaRow>
        {knowledge.category && (
          <CategoryBadge>{categoryLabels[knowledge.category] || knowledge.category}</CategoryBadge>
        )}
        {knowledge.work_type && (
          <WorkTypeBadge>{knowledge.work_type}</WorkTypeBadge>
        )}
      </MetaRow>

      <Stats>
        <StatItem>
          <HiOutlineEye /> {knowledge.view_count || 0} 閲覧
        </StatItem>
        <StatItem>
          <HiOutlineThumbUp /> {knowledge.useful_count || 0} 役立った
        </StatItem>
      </Stats>

      <ArrowIcon className="arrow-icon"><HiOutlineChevronRight /></ArrowIcon>
    </Card>
  );
};

export default KnowledgeCard;
