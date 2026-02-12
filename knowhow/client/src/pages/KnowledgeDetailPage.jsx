import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeAPI, speechAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import RiskBadge from '../components/RiskBadge';
import KnowledgeCard from '../components/KnowledgeCard';
import {
  HiOutlineArrowLeft, HiOutlineThumbUp, HiOutlineVolumeUp,
  HiOutlineEye, HiOutlineCheckCircle, HiOutlineTag, HiOutlineTrash
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
    background: var(--gradient-primary);
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
  background-color: ${props => props.$bg || 'var(--color-surface-alt)'};
  color: ${props => props.$color || 'var(--color-text-secondary)'};
`;

const MetaStat = styled(MetaBadge)`
  font-size: var(--font-size-xs);
  gap: var(--space-1);
  svg { font-size: 0.85rem; }
`;

const SummaryBox = styled.div`
  padding: var(--space-4) var(--space-5);
  background: var(--color-primary-50);
  border-left: 3px solid var(--color-primary-600, #2563eb);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  margin-bottom: var(--space-6);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
`;

const SummaryLabel = styled.strong`
  color: var(--color-primary-600, #2563eb);
  font-weight: var(--font-weight-semibold);
`;

const Content = styled.div`
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-primary);

  h1, h2, h3, h4, h5, h6 {
    margin-top: var(--space-6);
    margin-bottom: var(--space-3);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
  }
  h2 { font-size: var(--font-size-xl); }
  h3 { font-size: var(--font-size-lg); }
  p { margin-bottom: var(--space-4); color: var(--color-text-primary); }
  ul, ol { padding-left: var(--space-6); margin-bottom: var(--space-4); }
  li { margin-bottom: var(--space-2); }
  code {
    background-color: var(--color-surface-alt);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }
  pre {
    background-color: var(--color-surface-alt);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin-bottom: var(--space-4);
    border: 1px solid var(--color-border);
  }
  blockquote {
    border-left: 3px solid var(--color-primary-600, #2563eb);
    padding-left: var(--space-4);
    color: var(--color-text-secondary);
    margin: var(--space-4) 0;
    font-style: italic;
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UsefulButton = styled(ActionButton)`
  ${props => props.$marked && `
    background: var(--color-success-light);
    border-color: var(--color-success);
    color: var(--color-success-dark);
  `}
`;

const SpeakButton = styled(ActionButton)`
  ${props => props.$speaking && `
    background: var(--color-info-light);
    border-color: var(--color-info);
    color: var(--color-info-dark);
  `}
`;

const DeleteButton = styled(ActionButton)`
  color: var(--color-error, #ef4444);
  border-color: var(--color-error, #ef4444);

  &:hover {
    background: #fef2f2;
    border-color: var(--color-error, #ef4444);
    color: var(--color-error, #ef4444);
  }
`;

const ApproveButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  margin-left: auto;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);

  &:hover:not(:disabled) {
    background: var(--gradient-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(26, 54, 93, 0.3);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
`;

const RelatedSection = styled.div`
  margin-top: var(--space-8);
`;

const SectionTitle = styled.h2`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-5);
  letter-spacing: -0.02em;
`;

const RelatedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
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

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: var(--space-4);
`;

const ModalBox = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 100%;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-5) var(--space-3);
`;

const ModalIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full, 9999px);
  background: #fef2f2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
`;

const ModalTitle = styled.h3`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
`;

const ModalBody = styled.p`
  padding: 0 var(--space-5) var(--space-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
`;

const ModalActions = styled.div`
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
`;

const ModalButton = styled.button`
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);

  ${props => props.$danger ? `
    background: #dc2626;
    color: white;
    border: none;
    &:hover { background: #b91c1c; }
  ` : `
    background: var(--color-surface);
    color: var(--color-text-secondary);
    border: 1.5px solid var(--color-border);
    &:hover {
      border-color: var(--color-text-secondary);
      color: var(--color-text-primary);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const categoryLabels = {
  procedure: '手順',
  safety: '安全',
  quality: '品質',
  cost: 'コスト',
  equipment: '設備',
  material: '資材'
};

const statusLabels = {
  draft: '下書き',
  review: 'レビュー中',
  published: '公開',
  archived: 'アーカイブ'
};

const KnowledgeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isExpert } = useAuth();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [markedUseful, setMarkedUseful] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const audioRef = useRef(null);

  const { data: knowledge, isLoading } = useQuery({
    queryKey: ['knowledge', id],
    queryFn: () => knowledgeAPI.getById(id),
  });

  const { data: related } = useQuery({
    queryKey: ['knowledge', id, 'related'],
    queryFn: () => knowledgeAPI.getRelated(id),
    enabled: !!id,
  });

  const usefulMutation = useMutation({
    mutationFn: () => knowledgeAPI.markUseful(id),
    onSuccess: () => {
      setMarkedUseful(true);
      queryClient.invalidateQueries(['knowledge', id]);
      toast.success('評価しました');
    },
    onError: () => toast.error('評価に失敗しました')
  });

  const approveMutation = useMutation({
    mutationFn: () => knowledgeAPI.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge', id]);
      toast.success('承認しました');
    },
    onError: () => toast.error('承認に失敗しました')
  });

  const deleteMutation = useMutation({
    mutationFn: () => knowledgeAPI.delete(id),
    onSuccess: () => {
      toast.success('ナレッジを削除しました');
      navigate('/knowledge');
    },
    onError: () => toast.error('削除に失敗しました')
  });

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    deleteMutation.mutate();
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      // 停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = (knowledge?.content || '').replace(/[#*_`>\[\]|()-]/g, '').replace(/\n+/g, '。');
    if (!text.trim()) return;

    setIsSpeaking(true);

    try {
      const audioBlob = await speechAPI.synthesize(text);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setIsSpeaking(false);
      };
      audio.play();
    } catch (err) {
      console.warn('Azure TTS failed, falling back to browser TTS:', err);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        toast.error('音声読み上げに対応していません');
      }
    }
  };

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

  if (!knowledge) {
    return (
      <Container>
        <BackRow>
          <BackButton onClick={() => navigate('/knowledge')}>
            <HiOutlineArrowLeft />
          </BackButton>
          <BreadcrumbText>ナレッジが見つかりませんでした</BreadcrumbText>
        </BackRow>
      </Container>
    );
  }

  const relatedList = related?.items || related || [];

  return (
    <>
    <Container>
      <BackRow>
        <BackButton onClick={() => navigate('/knowledge')}>
          <HiOutlineArrowLeft />
        </BackButton>
        <BreadcrumbText>ナレッジ詳細</BreadcrumbText>
      </BackRow>

      <Card>
        <TitleRow>
          <Title>{knowledge.title}</Title>
          <RiskBadge level={knowledge.risk_level} />
        </TitleRow>

        <Meta>
          {knowledge.category && (
            <MetaBadge $bg="var(--color-primary-50)" $color="var(--color-primary-600, #2563eb)">
              <HiOutlineTag style={{ fontSize: '0.8rem' }} />
              {categoryLabels[knowledge.category] || knowledge.category}
            </MetaBadge>
          )}
          {knowledge.work_type && (
            <MetaBadge>{knowledge.work_type}</MetaBadge>
          )}
          <MetaBadge $bg={knowledge.status === 'published' ? 'var(--color-success-light)' : 'var(--color-surface-alt)'}
                     $color={knowledge.status === 'published' ? 'var(--color-success-dark)' : 'var(--color-text-tertiary)'}>
            {statusLabels[knowledge.status] || knowledge.status}
          </MetaBadge>
          <MetaStat>
            <HiOutlineEye />
            {knowledge.view_count || 0}
          </MetaStat>
          <MetaStat>
            <HiOutlineThumbUp />
            {knowledge.useful_count || 0}
          </MetaStat>
        </Meta>

        {knowledge.summary && (
          <SummaryBox>
            <SummaryLabel>要約: </SummaryLabel>
            {knowledge.summary}
          </SummaryBox>
        )}

        <Content>
          <ReactMarkdown>{knowledge.content}</ReactMarkdown>
        </Content>

        <ActionRow>
          <UsefulButton
            $marked={markedUseful}
            onClick={() => usefulMutation.mutate()}
            disabled={markedUseful || usefulMutation.isPending}
          >
            <HiOutlineThumbUp />
            {markedUseful ? '評価済み' : '役に立った'}
          </UsefulButton>
          <SpeakButton $speaking={isSpeaking} onClick={handleSpeak}>
            <HiOutlineVolumeUp />
            {isSpeaking ? '停止' : '読み上げ'}
          </SpeakButton>
          {isExpert && knowledge.status !== 'published' && (
            <ApproveButton
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              <HiOutlineCheckCircle />
              {approveMutation.isPending ? '承認中...' : '承認する'}
            </ApproveButton>
          )}
          {(knowledge.author_id === user?.id || ['site_manager', 'admin'].includes(user?.role)) && (
            <DeleteButton
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <HiOutlineTrash />
              {deleteMutation.isPending ? '削除中...' : '削除'}
            </DeleteButton>
          )}
        </ActionRow>
      </Card>

      {relatedList.length > 0 && (
        <RelatedSection>
          <SectionTitle>関連ナレッジ</SectionTitle>
          <RelatedGrid>
            {relatedList.map(item => (
              <KnowledgeCard key={item.id} knowledge={item} />
            ))}
          </RelatedGrid>
        </RelatedSection>
      )}
    </Container>

    {showDeleteConfirm && (
      <ModalOverlay onClick={() => setShowDeleteConfirm(false)}>
        <ModalBox onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <ModalIcon><HiOutlineTrash /></ModalIcon>
            <ModalTitle>ナレッジを削除</ModalTitle>
          </ModalHeader>
          <ModalBody>
            「{knowledge?.title}」を削除します。この操作は取り消せません。
          </ModalBody>
          <ModalActions>
            <ModalButton onClick={() => setShowDeleteConfirm(false)}>
              キャンセル
            </ModalButton>
            <ModalButton $danger onClick={handleDeleteConfirm}>
              削除する
            </ModalButton>
          </ModalActions>
        </ModalBox>
      </ModalOverlay>
    )}
    </>
  );
};

export default KnowledgeDetailPage;
