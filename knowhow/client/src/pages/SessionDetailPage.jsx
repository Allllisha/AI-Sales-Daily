import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sessionAPI } from '../services/api';
import styled from '@emotion/styled';
import ReactMarkdown from 'react-markdown';
import { HiOutlineArrowLeft, HiOutlineClock, HiOutlineBookOpen } from 'react-icons/hi';

const Container = styled.div`
  max-width: 700px;
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

const HeaderInfo = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
`;

const SessionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
`;

const StatusBadge = styled.span`
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  background: ${props => props.$completed ? 'var(--color-success-light)' : 'var(--color-warning-light)'};
  color: ${props => props.$completed ? 'var(--color-success-dark)' : 'var(--color-warning-dark)'};
`;

const MessagesArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const AssistantMessage = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  border-bottom-left-radius: var(--radius-sm);
  padding: var(--space-5);
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-primary);

  h1, h2, h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    margin: var(--space-4) 0 var(--space-2);
    &:first-of-type { margin-top: 0; }
  }
  h3 { font-size: var(--font-size-base); }
  p { margin: var(--space-2) 0; }
  p:first-of-type { margin-top: 0; }
  p:last-of-type { margin-bottom: 0; }
  ul, ol { margin: var(--space-2) 0; padding-left: var(--space-5); }
  li { margin: var(--space-1) 0; }
  strong { font-weight: var(--font-weight-bold); }
`;

const UserMessage = styled.div`
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
  font-size: var(--font-size-lg);
  align-self: flex-end;
  max-width: 90%;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.15);
`;

const MessageTime = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
  text-align: ${props => props.$right ? 'right' : 'left'};
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

const formatDateTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

// [[knowledge:ID|タイトル]] マーカーを markdown リンクに変換
const processKnowledgeLinks = (content) => {
  return content.replace(
    /\[\[knowledge:(\d+)\|([^\]]+)\]\]/g,
    '[$2](/knowledge/$1)'
  );
};

const SessionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ['voice-session', id],
    queryFn: () => sessionAPI.getById(id),
  });

  const backPath = session?.mode ? `/sessions?mode=${session.mode}` : '/sessions';

  if (isLoading) {
    return (
      <Container>
        <Header>
          <BackButton onClick={() => navigate(-1)}>
            <HiOutlineArrowLeft />
          </BackButton>
          <Title>会話詳細</Title>
        </Header>
        <LoadingState>
          <Spinner />
        </LoadingState>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container>
        <Header>
          <BackButton onClick={() => navigate(-1)}>
            <HiOutlineArrowLeft />
          </BackButton>
          <Title>セッションが見つかりません</Title>
        </Header>
      </Container>
    );
  }

  const messages = session.messages || [];

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate(backPath)}>
          <HiOutlineArrowLeft />
        </BackButton>
        <HeaderInfo>
          <Title>会話詳細</Title>
          <SessionMeta>
            <span><HiOutlineClock style={{ verticalAlign: 'middle', marginRight: '2px' }} />{formatDateTime(session.created_at)}</span>
            <StatusBadge $completed={session.status === 'completed'}>
              {session.status === 'completed' ? '完了' : '進行中'}
            </StatusBadge>
            <span>{messages.length}件</span>
          </SessionMeta>
        </HeaderInfo>
      </Header>

      <MessagesArea>
        {messages.map((msg, idx) => (
          <div key={idx}>
            {msg.role === 'assistant' ? (
              <>
                <AssistantMessage>
                  <ReactMarkdown components={{
                    a: ({ href, children }) => {
                      if (href?.startsWith('/knowledge/')) {
                        return (
                          <a
                            href={href}
                            onClick={(e) => { e.preventDefault(); navigate(href); }}
                            style={{ color: 'var(--color-primary-600, #2563eb)', textDecoration: 'none', fontWeight: 'var(--font-weight-medium)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                          >
                            <HiOutlineBookOpen size={14} style={{ flexShrink: 0 }} />
                            {children}
                          </a>
                        );
                      }
                      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                    }
                  }}>
                    {processKnowledgeLinks(msg.content)}
                  </ReactMarkdown>
                </AssistantMessage>
                <MessageTime>{formatTime(msg.created_at)}</MessageTime>
              </>
            ) : (
              <>
                <UserMessage>{msg.content}</UserMessage>
                <MessageTime $right>{formatTime(msg.created_at)}</MessageTime>
              </>
            )}
          </div>
        ))}
      </MessagesArea>
    </Container>
  );
};

export default SessionDetailPage;
