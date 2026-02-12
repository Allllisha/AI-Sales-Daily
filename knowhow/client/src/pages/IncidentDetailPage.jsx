import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { incidentAPI } from '../services/api';
import styled from '@emotion/styled';
import {
  HiOutlineArrowLeft, HiOutlineLocationMarker, HiOutlineCalendar,
  HiOutlineUser, HiOutlineExclamationCircle
} from 'react-icons/hi';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease-out;
`;

const BackRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
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

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }
`;

const BreadcrumbText = styled.span`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
`;

const Card = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => {
      switch (props.$severity) {
        case 'critical': return '#dc2626';
        case 'serious': return '#ea580c';
        case 'moderate': return '#d97706';
        default: return '#65a30d';
      }
    }};
  }

  @media (max-width: 768px) {
    padding: var(--space-5);
  }
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
`;

const Title = styled.h1`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
  letter-spacing: -0.02em;
  flex: 1;

  @media (max-width: 640px) {
    font-size: var(--font-size-xl);
  }
`;

const SeverityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  white-space: nowrap;
  background: ${props => {
    switch (props.$severity) {
      case 'critical': return '#fef2f2';
      case 'serious': return '#fff7ed';
      case 'moderate': return '#fffbeb';
      default: return '#f7fee7';
    }
  }};
  color: ${props => {
    switch (props.$severity) {
      case 'critical': return '#dc2626';
      case 'serious': return '#ea580c';
      case 'moderate': return '#d97706';
      default: return '#65a30d';
    }
  }};
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
  background-color: var(--color-surface-alt);
  color: var(--color-text-secondary);
`;

const Section = styled.div`
  margin-bottom: var(--space-6);
`;

const SectionTitle = styled.h2`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  letter-spacing: -0.02em;
`;

const SectionContent = styled.div`
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-primary);
  white-space: pre-wrap;
`;

const InfoBox = styled.div`
  padding: var(--space-4) var(--space-5);
  background: ${props => props.$bg || 'var(--color-surface-alt)'};
  border-left: 3px solid ${props => props.$border || 'var(--color-primary-600, #2563eb)'};
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  margin-bottom: var(--space-4);
`;

const InfoLabel = styled.strong`
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: ${props => props.$color || 'var(--color-primary-600, #2563eb)'};
  margin-bottom: var(--space-2);
`;

const InfoText = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  white-space: pre-wrap;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
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

const LoadingText = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
`;

const severityLabels = {
  minor: '軽微',
  moderate: '中程度',
  serious: '重大',
  critical: '危険',
};

const IncidentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentAPI.getById(id),
  });

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <Spinner />
          <LoadingText>読み込み中...</LoadingText>
        </LoadingState>
      </Container>
    );
  }

  if (!incident) {
    return (
      <Container>
        <BackRow>
          <BackButton onClick={() => navigate('/incidents')}>
            <HiOutlineArrowLeft />
          </BackButton>
          <BreadcrumbText>事例が見つかりませんでした</BreadcrumbText>
        </BackRow>
      </Container>
    );
  }

  return (
    <Container>
      <BackRow>
        <BackButton onClick={() => navigate('/incidents')}>
          <HiOutlineArrowLeft />
        </BackButton>
        <BreadcrumbText>事例詳細</BreadcrumbText>
      </BackRow>

      <Card $severity={incident.severity}>
        <TitleRow>
          <Title>{incident.title}</Title>
          <SeverityBadge $severity={incident.severity}>
            <HiOutlineExclamationCircle />
            {severityLabels[incident.severity] || incident.severity}
          </SeverityBadge>
        </TitleRow>

        <Meta>
          {incident.work_type && (
            <MetaBadge>{incident.work_type}</MetaBadge>
          )}
          {incident.site_name && (
            <MetaBadge>
              <HiOutlineLocationMarker />
              {incident.site_name}
            </MetaBadge>
          )}
          {incident.reported_by_name && (
            <MetaBadge>
              <HiOutlineUser />
              {incident.reported_by_name}
            </MetaBadge>
          )}
          {incident.occurred_at && (
            <MetaBadge>
              <HiOutlineCalendar />
              {new Date(incident.occurred_at).toLocaleDateString('ja-JP')}
            </MetaBadge>
          )}
        </Meta>

        <Section>
          <SectionTitle>概要</SectionTitle>
          <SectionContent>{incident.description}</SectionContent>
        </Section>

        {incident.cause && (
          <InfoBox $bg="#fff7ed" $border="#ea580c">
            <InfoLabel $color="#ea580c">原因</InfoLabel>
            <InfoText>{incident.cause}</InfoText>
          </InfoBox>
        )}

        {incident.countermeasure && (
          <InfoBox $bg="#f0fdf4" $border="#16a34a">
            <InfoLabel $color="#16a34a">対策</InfoLabel>
            <InfoText>{incident.countermeasure}</InfoText>
          </InfoBox>
        )}
      </Card>
    </Container>
  );
};

export default IncidentDetailPage;
