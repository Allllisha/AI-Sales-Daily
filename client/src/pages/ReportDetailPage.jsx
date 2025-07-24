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

const ReportDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);

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
    if (window.confirm('この日報を完了しますか？完了後は編集できなくなります。')) {
      completeMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (window.confirm('この日報を削除しますか？この操作は取り消せません。')) {
      deleteMutation.mutate();
    }
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
            {slots.project && (Array.isArray(slots.project) ? slots.project.length > 0 : slots.project) && (
              <InfoItem>
                <InfoLabel>案件</InfoLabel>
                <InfoValue>
                  {Array.isArray(slots.project) 
                    ? slots.project.join('、') 
                    : slots.project}
                </InfoValue>
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
            {slots.participants && slots.participants.length > 0 && (
              <InfoItem>
                <InfoLabel>参加者</InfoLabel>
                <InfoValue>{slots.participants.join('、')}</InfoValue>
              </InfoItem>
            )}
          </InfoGrid>
        </Section>

        {slots.next_action && (Array.isArray(slots.next_action) ? slots.next_action.length > 0 : slots.next_action) && (
          <Section>
            <SectionTitle>次のアクション</SectionTitle>
            <InfoItem>
              <InfoValue>
                {Array.isArray(slots.next_action) 
                  ? slots.next_action.map((action, index) => (
                      <div key={index} style={{ marginBottom: '8px' }}>• {action}</div>
                    ))
                  : slots.next_action}
              </InfoValue>
            </InfoItem>
          </Section>
        )}

        {slots.issues && slots.issues.length > 0 && (
          <Section>
            <SectionTitle>課題・リスク</SectionTitle>
            <InfoItem>
              <InfoValue>
                {slots.issues.map((issue, index) => (
                  <div key={index} style={{ marginBottom: '8px' }}>• {issue}</div>
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
    </Container>
  );
};

export default ReportDetailPage;