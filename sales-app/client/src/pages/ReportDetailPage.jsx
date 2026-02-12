import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportAPI } from '../services/api';
import tagAPI from '../services/tagAPI';
import styled from '@emotion/styled';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import CRMIntegrationSection from '../components/CRMIntegrationSection';
import { TagList } from '../components/Tag';
// Using architectural design system variables from CSS

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 0 var(--space-4);
  }
`;

const Card = styled.div`
  background-color: var(--color-surface);
  padding: var(--space-6);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-structure);
  margin-bottom: var(--space-6);
  position: relative;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    box-shadow: var(--shadow-elevation);
  }

  @media (max-width: 768px) {
    padding: var(--space-5);
    margin-bottom: var(--space-4);
  }
`;

const Header = styled.div`
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-5);
  border-bottom: 2px solid var(--color-border);
  position: relative;

  @media (max-width: 768px) {
    margin-bottom: var(--space-5);
    padding-bottom: var(--space-4);
  }
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
  gap: var(--space-4);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: var(--space-3);
  }
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: var(--color-primary);
  line-height: var(--line-height-compressed);
  margin: 0;
  letter-spacing: -0.025em;
  text-transform: uppercase;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    font-size: var(--font-size-heading);
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background-color: var(--color-background);
  color: var(--color-text-primary);
  border: 2px solid var(--color-border);
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover {
    background-color: var(--color-surface);
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-micro);
  }
`;

const Section = styled.div`
  margin-bottom: var(--space-6);

  @media (max-width: 768px) {
    margin-bottom: var(--space-5);
  }
`;

const SectionTitle = styled.h2`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-5);
  letter-spacing: -0.01em;
  text-transform: uppercase;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    font-size: var(--font-size-lead);
    margin-bottom: var(--space-4);
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
`;

const InfoItem = styled.div`
  padding: var(--space-5);
  background: var(--color-background);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-border);
  transition: all 0.2s ease-in-out;

  &:hover {
    background: var(--color-surface);
    border-color: var(--color-primary);
    box-shadow: var(--shadow-elevation);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: var(--space-4);
  }
`;

const TagSection = styled.div`
  margin-top: var(--space-6);
  padding: var(--space-5);
  background: var(--color-background);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-border);

  @media (max-width: 768px) {
    padding: var(--space-4);
    margin-top: var(--space-5);
  }
`;

const TagSectionTitle = styled.h3`
  font-size: var(--font-size-small);
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

// AI提案セクションのスタイル
const SuggestionsSection = styled.div`
  margin-top: var(--space-6);
  padding: var(--space-5);
  background: var(--color-background);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-border);

  @media (max-width: 768px) {
    padding: var(--space-4);
    margin-top: var(--space-5);
  }
`;

const SuggestionsSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  gap: var(--space-3);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SuggestionsSectionTitle = styled.h3`
  font-size: var(--font-size-small);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const GenerateButton = styled.button`
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: 2px solid var(--color-primary);
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: var(--color-accent);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const SuggestionsList = styled.ol`
  list-style: none;
  counter-reset: topic-counter;
  padding: 0;
  margin: var(--space-4) 0;
`;

const SuggestionItem = styled.li`
  counter-increment: topic-counter;
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  background: var(--color-surface);
  border-radius: var(--radius-none);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  transition: all 0.2s ease-in-out;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-elevation);
  }

  &:before {
    content: counter(topic-counter);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border-radius: 50%;
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-small);
  }
`;

const SuggestionsReasoning = styled.div`
  padding: var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-none);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  line-height: var(--line-height-comfortable);
  margin-top: var(--space-3);
`;

const EmptyMessage = styled.p`
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-5);
  margin: 0;
  font-size: var(--font-size-body);
  line-height: var(--line-height-comfortable);
`;

const LoadingMessage = styled.div`
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-5);
  font-size: var(--font-size-body);
`;

const InfoLabel = styled.div`
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    font-size: var(--font-size-micro);
  }
`;

const InfoValue = styled.div`
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  line-height: var(--line-height-standard);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    font-size: var(--font-size-small);
  }
`;

const QASection = styled.div`
  margin-top: var(--space-5);
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }
`;

const QAItem = styled.div`
  margin-bottom: 0;
  padding: var(--space-5);
  background: var(--color-background);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-border);
  border-left: 6px solid var(--color-primary);
  transition: all 0.2s ease-in-out;

  &:hover {
    background: var(--color-surface);
    border-color: var(--color-accent);
    border-left-color: var(--color-accent);
    box-shadow: var(--shadow-elevation);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: var(--space-4);
  }
`;

const Question = styled.div`
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  line-height: var(--line-height-standard);

  @media (max-width: 768px) {
    font-size: var(--font-size-small);
  }
`;

const Answer = styled.div`
  color: var(--color-text-secondary);
  margin-left: var(--space-6);
  line-height: var(--line-height-comfortable);

  @media (max-width: 768px) {
    font-size: var(--font-size-small);
    margin-left: var(--space-5);
  }
`;

const LoadingContainer = styled.div`
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: var(--space-12);
  color: var(--color-error);
`;

const EditButton = styled.button`
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    background-color: var(--color-warning);
    border-color: var(--color-warning);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: var(--color-text-tertiary);
    border-color: var(--color-text-tertiary);
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-small);
  }
`;

const CompleteButton = styled.button`
  background-color: var(--color-success);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-success);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    background-color: var(--color-success);
    border-color: var(--color-success);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: var(--color-text-secondary);
    border-color: var(--color-text-secondary);
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-small);
  }
`;

const DeleteButton = styled.button`
  background-color: var(--color-error);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-error);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    background-color: var(--color-error);
    border-color: var(--color-error);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: var(--color-text-secondary);
    border-color: var(--color-text-secondary);
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-small);
  }
`;

const ScriptButton = styled.button`
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  
  &:hover:not(:disabled) {
    background-color: var(--color-text-inverse);
    color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: var(--color-text-secondary);
    border-color: var(--color-text-secondary);
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-small);
  }
`;

const StatusBadge = styled.span`
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-none);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.08em;
  background: ${props => props.status === 'completed' ? 
    'var(--color-success-light)' : 
    'var(--color-warning-light)'};
  color: ${props => props.status === 'completed' ? 
    'var(--color-success)' : 
    'var(--color-warning)'};
  border: 1px solid transparent;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: var(--font-size-micro);
    padding: var(--space-1) var(--space-3);
  }
`;

// Modal styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
`;

const ModalContent = styled.div`
  background: white;
  border-radius: var(--radius-none);
  padding: var(--space-8);
  max-width: 500px;
  width: 100%;
  box-shadow: var(--shadow-structure);
  animation: slideIn 0.2s ease-out;

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    padding: var(--space-6);
  }
`;

const ModalTitle = styled.h3`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
  text-align: center;
`;

const ModalMessage = styled.p`
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-6);
  text-align: center;
  line-height: var(--line-height-comfortable);
`;

const ModalButtons = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: center;
`;

const ModalButton = styled.button`
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-5);
  border: 2px solid transparent;
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 120px;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ModalCancelButton = styled.button`
  background-color: var(--color-background);
  color: var(--color-text-primary);
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 120px;

  &:hover {
    background-color: var(--color-surface);
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }
`;

const ReportDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportAPI.getReport(id),
  });

  // タグはreportに含まれるようになったので、reportから取得
  const tags = report?.tags || [];

  const completeMutation = useMutation({
    mutationFn: () => reportAPI.updateReport(id, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['report', id]);
      queryClient.invalidateQueries(['reports']);
      toast.success('日報を完了しました');
    },
    onError: () => {
      toast.error('日報の完了に失敗しました');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => reportAPI.deleteReport(id),
    onSuccess: () => {
      toast.success('日報を削除しました');
      navigate('/');
    },
    onError: () => {
      toast.error('日報の削除に失敗しました');
    }
  });

  const revertToDraftMutation = useMutation({
    mutationFn: () => reportAPI.updateReportStatus(id, 'draft'),
    onSuccess: () => {
      toast.success('日報を下書きに戻しました');
      queryClient.invalidateQueries(['report', id]);
      navigate(`/reports/${id}/edit`);
    },
    onError: (error) => {
      console.error('Revert to draft error:', error);
      toast.error(error.response?.data?.error || '下書きに戻せませんでした');
    }
  });

  // AI提案の生成
  const generateSuggestionsMutation = useMutation({
    mutationFn: () => reportAPI.generateSuggestions(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['report', id]);
      toast.success('AI提案を生成しました');
    },
    onError: (error) => {
      console.error('Generate suggestions error:', error);
      toast.error('AI提案の生成に失敗しました');
    }
  });

  const handleGenerateSuggestions = () => {
    generateSuggestionsMutation.mutate();
  };

  // AI提案データを取得
  const suggestions = report?.ai_suggestions ?
    (typeof report.ai_suggestions === 'string' ? JSON.parse(report.ai_suggestions) : report.ai_suggestions) :
    null;

  if (isLoading) {
    return (
      <Container>
        <Card>
          <LoadingContainer>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid var(--color-border)', 
              borderTopColor: 'var(--color-primary)', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}>
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          </LoadingContainer>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Card>
          <ErrorContainer>
            <p>日報の読み込みに失敗しました</p>
            <BackButton onClick={() => navigate('/')}>
              ホームに戻る
            </BackButton>
          </ErrorContainer>
        </Card>
      </Container>
    );
  }

  const slots = report.slots || {};
  const isOwner = user && user.id === report.user_id;

  const handleComplete = () => {
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = () => {
    completeMutation.mutate();
    setShowCompleteModal(false);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteModal(false);
  };

  const handleEdit = () => {
    if (report.status === 'completed') {
      // 完了済みの場合は確認ダイアログを表示
      setShowEditConfirmModal(true);
    } else {
      // 下書きの場合は直接編集画面へ
      navigate(`/reports/${id}/edit`);
    }
  };

  const handleConfirmEdit = () => {
    setShowEditConfirmModal(false);
    revertToDraftMutation.mutate();
  };

  return (
    <Container>
      <Card>
        <Header>
          <HeaderTop>
            <TitleSection>
              <Title>
                {format(new Date(report.report_date), 'yyyy年MM月dd日(E)', { locale: ja })}の日報
              </Title>
              <StatusBadge status={report.status}>
                {report.status === 'completed' ? '完了' : '下書き'}
              </StatusBadge>
            </TitleSection>
            <ActionButtons>
              {isOwner && report.status === 'draft' && (
                <CompleteButton 
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending ? '処理中...' : '日報を完了する'}
                </CompleteButton>
              )}
              {isOwner && (
                <>
                  <ScriptButton onClick={() => navigate(`/reports/${id}/scripts/generate`)}>
                    スクリプト生成
                  </ScriptButton>
                  <EditButton onClick={handleEdit}>
                    編集
                  </EditButton>
                  <DeleteButton 
                    onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? '削除中...' : '削除'}
                </DeleteButton>
                </>
              )}
              <BackButton onClick={() => navigate('/')}>
                戻る
              </BackButton>
            </ActionButtons>
          </HeaderTop>
        </Header>

        <Section>
          <SectionTitle>基本情報</SectionTitle>
          <InfoGrid>
            {slots.customer && (
              <InfoItem>
                <InfoLabel>顧客</InfoLabel>
                <InfoValue>{slots.customer}</InfoValue>
              </InfoItem>
            )}
            {slots.project && slots.project.trim() && (
              <InfoItem>
                <InfoLabel>案件</InfoLabel>
                <InfoValue>{slots.project}</InfoValue>
              </InfoItem>
            )}
            {slots.budget && (
              <InfoItem>
                <InfoLabel>予算</InfoLabel>
                <InfoValue>{slots.budget}</InfoValue>
              </InfoItem>
            )}
            {slots.schedule && (
              <InfoItem>
                <InfoLabel>スケジュール</InfoLabel>
                <InfoValue>{slots.schedule}</InfoValue>
              </InfoItem>
            )}
            {slots.location && (
              <InfoItem>
                <InfoLabel>場所</InfoLabel>
                <InfoValue>{slots.location}</InfoValue>
              </InfoItem>
            )}
            {slots.participants && slots.participants.trim() && (
              <InfoItem>
                <InfoLabel>参加者</InfoLabel>
                <InfoValue>{slots.participants}</InfoValue>
              </InfoItem>
            )}
            {slots.industry && slots.industry.trim() && (
              <InfoItem>
                <InfoLabel>業界</InfoLabel>
                <InfoValue>{slots.industry}</InfoValue>
              </InfoItem>
            )}
          </InfoGrid>
        </Section>

        {slots.next_action && (typeof slots.next_action === 'string' ? slots.next_action.trim() : slots.next_action.length > 0) && (
          <Section>
            <SectionTitle>次のアクション</SectionTitle>
            <InfoItem>
              <InfoValue>
                {(() => {
                  // next_actionが文字列の場合
                  if (typeof slots.next_action === 'string') {
                    return slots.next_action.split(',').map((action, index) => (
                      <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
                        <span style={{ marginRight: '8px', color: 'var(--color-accent)', fontWeight: 'bold' }}>•</span>
                        <span>{action.trim()}</span>
                      </div>
                    ));
                  }
                  // next_actionが配列の場合
                  else if (Array.isArray(slots.next_action)) {
                    return slots.next_action.map((action, index) => {
                      let actionText = '';
                      if (typeof action === 'object' && action !== null) {
                        // オブジェクトの場合、taskフィールドを優先、担当者と期限も含める
                        if (action.task) {
                          const parts = [action.task];
                          if (action.responsible) parts.push(`担当: ${action.responsible}`);
                          if (action.deadline) parts.push(`期限: ${action.deadline}`);
                          actionText = parts.join(' ');
                        } else {
                          actionText = action.action || action.text || JSON.stringify(action);
                        }
                      } else {
                        actionText = String(action);
                      }
                      return (
                        <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
                          <span style={{ marginRight: '8px', color: 'var(--color-accent)', fontWeight: 'bold' }}>•</span>
                          <span>{actionText}</span>
                        </div>
                      );
                    });
                  }
                  return null;
                })()}
              </InfoValue>
            </InfoItem>
          </Section>
        )}

        {slots.issues && (typeof slots.issues === 'string' ? slots.issues.trim() : slots.issues.length > 0) && (
          <Section>
            <SectionTitle>課題・リスク</SectionTitle>
            <InfoItem>
              <InfoValue>
                {(() => {
                  // issuesが文字列の場合
                  if (typeof slots.issues === 'string') {
                    return slots.issues.split(',').map((issue, index) => (
                      <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
                        <span style={{ marginRight: '8px', color: 'var(--color-error)', fontWeight: 'bold' }}>•</span>
                        <span>{issue.trim()}</span>
                      </div>
                    ));
                  }
                  // issuesが配列の場合
                  else if (Array.isArray(slots.issues)) {
                    return slots.issues.map((issue, index) => {
                      let issueText = '';
                      if (typeof issue === 'object' && issue !== null) {
                        // オブジェクトの場合、issueフィールドやdescriptionフィールドを探す
                        issueText = issue.issue || issue.description || issue.text || JSON.stringify(issue);
                      } else {
                        issueText = String(issue);
                      }
                      return (
                        <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
                          <span style={{ marginRight: '8px', color: 'var(--color-error)', fontWeight: 'bold' }}>•</span>
                          <span>{issueText}</span>
                        </div>
                      );
                    });
                  }
                  return null;
                })()}
              </InfoValue>
            </InfoItem>
          </Section>
        )}

        {report.questions_answers && report.questions_answers.length > 0 && (
          <Section>
            <SectionTitle>ヒアリング内容</SectionTitle>
            <QASection>
              {report.questions_answers.map((qa, index) => (
                <QAItem key={index}>
                  <Question>
                    <span>Q{index + 1}.</span>
                    {qa.question}
                  </Question>
                  <Answer>{qa.answer}</Answer>
                </QAItem>
              ))}
            </QASection>
          </Section>
        )}

        {/* タグセクション */}
        {tags && tags.length > 0 && (
          <TagSection>
            <TagSectionTitle>タグ</TagSectionTitle>
            <TagList
              tags={tags}
              showCategory={true}
              onTagClick={(tag) => {
                navigate(`/tags/${tag.id}`);
              }}
            />
          </TagSection>
        )}

        {/* AI提案セクション */}
        <SuggestionsSection>
          <SuggestionsSectionHeader>
            <SuggestionsSectionTitle>
              次回商談の提案 (AI生成)
            </SuggestionsSectionTitle>
            <GenerateButton
              onClick={handleGenerateSuggestions}
              disabled={
                generateSuggestionsMutation.isPending ||
                (suggestions && !suggestions.has_past_reports)
              }
            >
              {generateSuggestionsMutation.isPending ? '生成中...' : '提案を再生成'}
            </GenerateButton>
          </SuggestionsSectionHeader>

          {generateSuggestionsMutation.isPending ? (
            <LoadingMessage>AI提案を生成しています...</LoadingMessage>
          ) : suggestions && suggestions.has_past_reports ? (
            <>
              <SuggestionsList>
                {suggestions.next_topics.map((topic, index) => (
                  <SuggestionItem key={index}>{topic}</SuggestionItem>
                ))}
              </SuggestionsList>
              {suggestions.reasoning && (
                <SuggestionsReasoning>
                  <strong>提案理由：</strong> {suggestions.reasoning}
                </SuggestionsReasoning>
              )}
            </>
          ) : (
            <EmptyMessage>
              {suggestions && !suggestions.has_past_reports
                ? 'まだ過去の日報がありません。最初の商談として、顧客のニーズと課題をしっかり聞き取ることに集中しましょう。'
                : 'AI提案を生成するには「提案を再生成」ボタンをクリックしてください。'}
            </EmptyMessage>
          )}
        </SuggestionsSection>
      </Card>

      {/* CRM連携セクション */}
      <CRMIntegrationSection report={report} />

      {/* Complete Modal */}
      {showCompleteModal && (
        <ModalOverlay onClick={() => setShowCompleteModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>日報を完了しますか？</ModalTitle>
            <ModalMessage>
              完了後も編集は可能です。<br />
              ステータスが「完了」に変更されます。
            </ModalMessage>
            <ModalButtons>
              <ModalButton
                onClick={handleConfirmComplete}
                disabled={completeMutation.isPending}
                style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
              >
                {completeMutation.isPending ? '処理中...' : '完了する'}
              </ModalButton>
              <ModalCancelButton onClick={() => setShowCompleteModal(false)}>
                キャンセル
              </ModalCancelButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <ModalOverlay onClick={() => setShowDeleteModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>日報を削除しますか？</ModalTitle>
            <ModalMessage>
              この操作は取り消せません。<br />
              本当に削除してもよろしいですか？
            </ModalMessage>
            <ModalButtons>
              <ModalButton
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                style={{ backgroundColor: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              >
                {deleteMutation.isPending ? '削除中...' : '削除する'}
              </ModalButton>
              <ModalCancelButton onClick={() => setShowDeleteModal(false)}>
                キャンセル
              </ModalCancelButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 編集確認モーダル（完了済み日報の場合） */}
      {showEditConfirmModal && (
        <ModalOverlay onClick={() => setShowEditConfirmModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>完了済み日報の編集</ModalTitle>
            <ModalMessage>
              完了済みの日報を編集すると、ステータスが「下書き」に戻ります。<br />
              CRM連携情報は保持されますが、再度「日報を完了する」ボタンを押す必要があります。<br />
              <br />
              編集を続けますか？
            </ModalMessage>
            <ModalButtons>
              <ModalButton 
                onClick={handleConfirmEdit}
                disabled={revertToDraftMutation.isPending}
                style={{ backgroundColor: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
              >
                {revertToDraftMutation.isPending ? '処理中...' : '下書きに戻して編集'}
              </ModalButton>
              <ModalCancelButton onClick={() => setShowEditConfirmModal(false)}>
                キャンセル
              </ModalCancelButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}

    </Container>
  );
};

export default ReportDetailPage;