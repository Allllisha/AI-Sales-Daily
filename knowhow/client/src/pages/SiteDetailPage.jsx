import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sitesAPI } from '../services/api';
import styled from '@emotion/styled';
import {
  HiOutlineArrowLeft,
  HiOutlineLocationMarker,
  HiOutlineCalendar,
  HiOutlineUser,
  HiOutlineOfficeBuilding,
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
      switch (props.$status) {
        case 'active': return '#16a34a';
        case 'completed': return '#2563eb';
        case 'suspended': return '#d97706';
        default: return '#94a3b8';
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

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  white-space: nowrap;
  background: ${props => {
    switch (props.$status) {
      case 'active': return '#f0fdf4';
      case 'completed': return '#eff6ff';
      case 'suspended': return '#fffbeb';
      default: return '#f1f5f9';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'active': return '#16a34a';
      case 'completed': return '#2563eb';
      case 'suspended': return '#d97706';
      default: return '#64748b';
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
`;

const MemberList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-3);
`;

const MemberCard = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
`;

const MemberAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-primary-50);
  color: var(--color-primary-600, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
`;

const MemberInfo = styled.div`
  min-width: 0;
`;

const MemberName = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MemberRole = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
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

const statusLabels = {
  active: '稼働中',
  completed: '完了',
  suspended: '中断',
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('ja-JP');
};

const SiteDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: site, isLoading } = useQuery({
    queryKey: ['site', id],
    queryFn: () => sitesAPI.getById(id),
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

  if (!site) {
    return (
      <Container>
        <BackRow>
          <BackButton onClick={() => navigate('/sites')}>
            <HiOutlineArrowLeft />
          </BackButton>
          <BreadcrumbText>現場が見つかりませんでした</BreadcrumbText>
        </BackRow>
      </Container>
    );
  }

  const members = site.members || site.site_members || [];

  return (
    <Container>
      <BackRow>
        <BackButton onClick={() => navigate('/sites')}>
          <HiOutlineArrowLeft />
        </BackButton>
        <BreadcrumbText>現場詳細</BreadcrumbText>
      </BackRow>

      <Card $status={site.status}>
        <TitleRow>
          <Title>{site.name}</Title>
          <StatusBadge $status={site.status}>
            <HiOutlineOfficeBuilding />
            {statusLabels[site.status] || site.status}
          </StatusBadge>
        </TitleRow>

        <Meta>
          {site.location && (
            <MetaBadge>
              <HiOutlineLocationMarker />
              {site.location}
            </MetaBadge>
          )}
          {site.start_date && (
            <MetaBadge>
              <HiOutlineCalendar />
              開始: {formatDate(site.start_date)}
            </MetaBadge>
          )}
          {site.end_date && (
            <MetaBadge>
              <HiOutlineCalendar />
              終了: {formatDate(site.end_date)}
            </MetaBadge>
          )}
        </Meta>

        {site.description && (
          <Section>
            <SectionTitle>概要</SectionTitle>
            <SectionContent>{site.description}</SectionContent>
          </Section>
        )}

        {site.start_date && (
          <InfoBox $bg="#eff6ff" $border="#2563eb">
            <InfoLabel $color="#2563eb">工期</InfoLabel>
            <InfoText>
              {formatDate(site.start_date)}
              {site.end_date ? ` ~ ${formatDate(site.end_date)}` : ' ~ 未定'}
            </InfoText>
          </InfoBox>
        )}
      </Card>

      {members.length > 0 && (
        <Card $status={site.status}>
          <SectionTitle>メンバー ({members.length}名)</SectionTitle>
          <MemberList>
            {members.map((member, index) => (
              <MemberCard key={member.id || member.user_id || index}>
                <MemberAvatar>
                  <HiOutlineUser />
                </MemberAvatar>
                <MemberInfo>
                  <MemberName>{member.name || member.user_name || '不明'}</MemberName>
                  {(member.role || member.site_role) && (
                    <MemberRole>{member.role || member.site_role}</MemberRole>
                  )}
                </MemberInfo>
              </MemberCard>
            ))}
          </MemberList>
        </Card>
      )}
    </Container>
  );
};

export default SiteDetailPage;
