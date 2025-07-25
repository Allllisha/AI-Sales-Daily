import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportAPI } from '../services/api';
import styled from '@emotion/styled';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '../styles/designSystem';
import { Card as BaseCard, PrimaryButton, SecondaryButton, SuccessBadge, WarningBadge, LoadingContainer as BaseLoadingContainer, Spinner } from '../styles/componentStyles';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${spacing[8]};

  @media (max-width: 1024px) {
    max-width: 900px;
    padding: 0 ${spacing[6]};
  }

  @media (max-width: 768px) {
    padding: 0 ${spacing[4]};
  }
`;

const Card = styled(BaseCard)`
  margin-bottom: ${spacing[8]};

  @media (max-width: 1024px) {
    padding: ${spacing[10]};
  }

  @media (max-width: 768px) {
    padding: ${spacing[6]};
    border-radius: ${borderRadius.lg};
    margin-bottom: ${spacing[4]};
  }
`;

const Header = styled.div`
  margin-bottom: ${spacing[10]};
  padding-bottom: ${spacing[8]};
  border-bottom: 1px solid ${colors.neutral[200]};
  position: relative;

  @media (max-width: 768px) {
    margin-bottom: ${spacing[6]};
    padding-bottom: ${spacing[4]};
  }
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${spacing[4]};
  gap: ${spacing[4]};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${spacing[3]};
  }
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing[4]};
  flex: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${spacing[2]};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${spacing[3]};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const Title = styled.h1`
  font-size: ${typography.fontSize['3xl']};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  line-height: ${typography.lineHeight.tight};
  margin: 0;
  letter-spacing: ${typography.letterSpacing.tight};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize['2xl']};
  }
`;

const BackButton = styled(SecondaryButton)`
  display: flex;
  align-items: center;
  gap: ${spacing[2]};

  @media (max-width: 768px) {
    padding: ${spacing[2]} ${spacing[4]};
    font-size: ${typography.fontSize.sm};
  }
`;

const Section = styled.div`
  margin-bottom: ${spacing[8]};

  @media (max-width: 768px) {
    margin-bottom: ${spacing[6]};
  }
`;

const SectionTitle = styled.h2`
  font-size: ${typography.fontSize.xl};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[800]};
  margin-bottom: ${spacing[6]};
  letter-spacing: ${typography.letterSpacing.tight};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.lg};
    margin-bottom: ${spacing[4]};
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${spacing[6]};

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${spacing[5]};
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${spacing[4]};
  }
`;

const InfoItem = styled.div`
  padding: ${spacing[6]};
  background: white;
  border-radius: ${borderRadius.xl};
  border: 1px solid ${colors.neutral[200]};
  transition: all ${transitions.fast};

  &:hover {
    background: ${colors.neutral[50]};
    border-color: ${colors.neutral[300]};
    box-shadow: ${shadows.sm};
  }

  @media (max-width: 768px) {
    padding: ${spacing[4]};
  }
`;

const InfoLabel = styled.div`
  font-size: ${typography.fontSize.xs};
  color: ${colors.neutral[600]};
  margin-bottom: ${spacing[2]};
  font-weight: ${typography.fontWeight.medium};
  text-transform: uppercase;
  letter-spacing: ${typography.letterSpacing.wide};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.xs};
  }
`;

const InfoValue = styled.div`
  font-weight: ${typography.fontWeight.medium};
  color: ${colors.neutral[900]};
  font-size: ${typography.fontSize.base};
  line-height: ${typography.lineHeight.normal};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.sm};
  }
`;

const QASection = styled.div`
  margin-top: ${spacing[6]};
  display: grid;
  grid-template-columns: 1fr;
  gap: ${spacing[6]};

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${spacing[8]};
  }
`;

const QAItem = styled.div`
  margin-bottom: 0;
  padding: ${spacing[6]};
  background: white;
  border-radius: ${borderRadius.xl};
  border: 1px solid ${colors.neutral[200]};
  border-left: 3px solid ${colors.neutral[700]};
  transition: all ${transitions.fast};

  &:hover {
    background: ${colors.neutral[50]};
    border-color: ${colors.neutral[300]};
    border-left-color: ${colors.neutral[600]};
    box-shadow: ${shadows.sm};
  }

  @media (max-width: 768px) {
    padding: ${spacing[4]};
  }
`;

const Question = styled.div`
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[800]};
  margin-bottom: ${spacing[3]};
  display: flex;
  align-items: flex-start;
  gap: ${spacing[2]};
  line-height: ${typography.lineHeight.normal};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.sm};
  }
`;

const Answer = styled.div`
  color: ${colors.neutral[600]};
  margin-left: ${spacing[6]};
  line-height: ${typography.lineHeight.relaxed};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.sm};
    margin-left: ${spacing[5]};
  }
`;

const LoadingContainer = styled(BaseLoadingContainer)`
  min-height: 400px;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${spacing[12]};
  color: ${colors.error.main};
`;

const EditButton = styled(PrimaryButton)`
  @media (max-width: 768px) {
    padding: ${spacing[2]} ${spacing[4]};
    font-size: ${typography.fontSize.sm};
  }
`;

const CompleteButton = styled(PrimaryButton)`
  background-color: ${colors.success.main};
  border-color: ${colors.success.main};

  &:hover:not(:disabled) {
    background-color: ${colors.success.dark};
    border-color: ${colors.success.dark};
  }

  &:disabled {
    background-color: ${colors.neutral[400]};
    border-color: ${colors.neutral[400]};
  }

  @media (max-width: 768px) {
    padding: ${spacing[2]} ${spacing[4]};
    font-size: ${typography.fontSize.sm};
  }
`;

const DeleteButton = styled(PrimaryButton)`
  background-color: ${colors.error.main};
  border-color: ${colors.error.main};

  &:hover:not(:disabled) {
    background-color: ${colors.error.dark};
    border-color: ${colors.error.dark};
  }

  &:disabled {
    background-color: ${colors.neutral[400]};
    border-color: ${colors.neutral[400]};
  }

  @media (max-width: 768px) {
    padding: ${spacing[2]} ${spacing[4]};
    font-size: ${typography.fontSize.sm};
  }
`;

const StatusBadge = styled.span`
  padding: ${spacing[2]} ${spacing[4]};
  border-radius: ${borderRadius.md};
  font-size: ${typography.fontSize.xs};
  font-weight: ${typography.fontWeight.medium};
  letter-spacing: ${typography.letterSpacing.wide};
  background: ${props => props.status === 'completed' ? 
    colors.success.light : 
    colors.warning.light};
  color: ${props => props.status === 'completed' ? 
    colors.success.dark : 
    colors.warning.dark};
  border: 1px solid transparent;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.xs};
    padding: ${spacing[1]} ${spacing[3]};
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
  padding: ${spacing[4]};
`;

const ModalContent = styled.div`
  background: white;
  border-radius: ${borderRadius.xl};
  padding: ${spacing[8]};
  max-width: 500px;
  width: 100%;
  box-shadow: ${shadows.xl};
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
    padding: ${spacing[6]};
  }
`;

const ModalTitle = styled.h3`
  font-size: ${typography.fontSize.xl};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  margin-bottom: ${spacing[4]};
  text-align: center;
`;

const ModalMessage = styled.p`
  font-size: ${typography.fontSize.base};
  color: ${colors.neutral[600]};
  margin-bottom: ${spacing[6]};
  text-align: center;
  line-height: ${typography.lineHeight.relaxed};
`;

const ModalButtons = styled.div`
  display: flex;
  gap: ${spacing[3]};
  justify-content: center;
`;

const ModalButton = styled(PrimaryButton)`
  min-width: 120px;
`;

const ModalCancelButton = styled(SecondaryButton)`
  min-width: 120px;
`;

const ReportDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportAPI.getReport(id),
  });

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

  if (isLoading) {
    return (
      <Container>
        <Card>
          <LoadingContainer>
            <Spinner />
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
                <>
                  <CompleteButton 
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? '処理中...' : '日報を完了する'}
                  </CompleteButton>
                  <EditButton onClick={() => navigate(`/reports/${id}/edit`)}>
                    編集
                  </EditButton>
                </>
              )}
              {isOwner && (
                <DeleteButton 
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? '削除中...' : '削除'}
                </DeleteButton>
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

        {slots.next_action && slots.next_action.trim() && (
          <Section>
            <SectionTitle>次のアクション</SectionTitle>
            <InfoItem>
              <InfoValue>
                {slots.next_action.split(',').map((action, index) => (
                  <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ marginRight: '8px', color: colors.primary[500], fontWeight: 'bold' }}>•</span>
                    <span>{action.trim()}</span>
                  </div>
                ))}
              </InfoValue>
            </InfoItem>
          </Section>
        )}

        {slots.issues && slots.issues.trim() && (
          <Section>
            <SectionTitle>課題・リスク</SectionTitle>
            <InfoItem>
              <InfoValue>
                {slots.issues.split(',').map((issue, index) => (
                  <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ marginRight: '8px', color: colors.error[500], fontWeight: 'bold' }}>•</span>
                    <span>{issue.trim()}</span>
                  </div>
                ))}
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
      </Card>

      {/* Complete Modal */}
      {showCompleteModal && (
        <ModalOverlay onClick={() => setShowCompleteModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>日報を完了しますか？</ModalTitle>
            <ModalMessage>
              完了後は編集できなくなります。<br />
              この操作は取り消せません。
            </ModalMessage>
            <ModalButtons>
              <ModalButton
                onClick={handleConfirmComplete}
                disabled={completeMutation.isPending}
                style={{ backgroundColor: colors.success.main, borderColor: colors.success.main }}
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
                style={{ backgroundColor: colors.error.main, borderColor: colors.error.main }}
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
    </Container>
  );
};

export default ReportDetailPage;