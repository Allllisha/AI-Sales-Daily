import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sessionAPI } from '../services/api';
import styled from '@emotion/styled';
import { HiOutlineArrowLeft, HiOutlineChatAlt2, HiOutlineClock, HiOutlineChevronRight } from 'react-icons/hi';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease-out;
`;

const Header = styled.div`
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

const Title = styled.h1`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
`;

const SessionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const SessionCard = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  width: 100%;

  &:hover {
    border-color: var(--color-primary-lighter);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
`;

const SessionIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
  background: ${props => props.$completed ? 'var(--color-success-light)' : 'var(--color-warning-light)'};
  color: ${props => props.$completed ? 'var(--color-success-dark)' : 'var(--color-warning-dark)'};
`;

const SessionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SessionTitle = styled.div`
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SessionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
`;

const StatusBadge = styled.span`
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  background: ${props => props.$completed ? 'var(--color-success-light)' : 'var(--color-warning-light)'};
  color: ${props => props.$completed ? 'var(--color-success-dark)' : 'var(--color-warning-dark)'};
`;

const ChevronIcon = styled.div`
  color: var(--color-text-tertiary);
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-16) var(--space-6);
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

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today - target) / (1000 * 60 * 60 * 24);

  const time = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  if (diff === 0) return `今日 ${time}`;
  if (diff === 1) return `昨日 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
};

const SessionHistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  const pageTitle = mode === 'office' ? '事務作業の会話履歴' : mode === 'field' ? '現場作業の会話履歴' : '会話履歴';
  const backPath = mode === 'office' ? '/office-chat' : mode === 'field' ? '/field-voice' : '/';

  const { data, isLoading } = useQuery({
    queryKey: ['voice-sessions', mode],
    queryFn: () => sessionAPI.list({ limit: 50, mode: mode || undefined }),
  });

  const sessions = data?.sessions || [];

  if (isLoading) {
    return (
      <Container>
        <Header>
          <BackButton onClick={() => navigate(backPath)}>
            <HiOutlineArrowLeft />
          </BackButton>
          <Title>{pageTitle}</Title>
        </Header>
        <LoadingState>
          <Spinner />
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate(backPath)}>
          <HiOutlineArrowLeft />
        </BackButton>
        <Title>{pageTitle}</Title>
      </Header>

      {sessions.length > 0 ? (
        <SessionList>
          {sessions.map(session => (
            <SessionCard key={session.id} onClick={() => navigate(`/sessions/${session.id}`)}>
              <SessionIcon $completed={session.status === 'completed'}>
                <HiOutlineChatAlt2 />
              </SessionIcon>
              <SessionInfo>
                <SessionTitle>
                  {session.first_user_message
                    ? session.first_user_message.substring(0, 60) + (session.first_user_message.length > 60 ? '...' : '')
                    : `${session.mode === 'field' ? '現場' : '事務'}セッション`}
                </SessionTitle>
                <SessionMeta>
                  <span><HiOutlineClock style={{ verticalAlign: 'middle', marginRight: '2px' }} />{formatDate(session.created_at)}</span>
                  <span>{session.message_count || 0}件のメッセージ</span>
                  <StatusBadge $completed={session.status === 'completed'}>
                    {session.status === 'completed' ? '完了' : '進行中'}
                  </StatusBadge>
                </SessionMeta>
              </SessionInfo>
              <ChevronIcon>
                <HiOutlineChevronRight />
              </ChevronIcon>
            </SessionCard>
          ))}
        </SessionList>
      ) : (
        <EmptyState>
          <EmptyIcon><HiOutlineChatAlt2 /></EmptyIcon>
          <EmptyText>
            まだ会話履歴がありません。<br />
            {mode === 'office' ? '事務作業モードで会話を始めましょう。' : mode === 'field' ? '現場作業モードで会話を始めましょう。' : '会話を始めましょう。'}
          </EmptyText>
        </EmptyState>
      )}
    </Container>
  );
};

export default SessionHistoryPage;
