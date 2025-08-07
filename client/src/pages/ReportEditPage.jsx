import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportAPI, dynamics365API, aiAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
// Using architectural design system variables from CSS

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5);
  min-height: 100vh;
  background: var(--color-background);

  @media (max-width: 768px) {
    padding: var(--space-5) var(--space-4);
  }
`;

const Card = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-subtle);
  box-shadow: var(--shadow-structure);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--color-border);

  @media (max-width: 768px) {
    border-radius: var(--radius-subtle);
    box-shadow: var(--shadow-elevation);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-6);
  background: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  position: relative;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-5);
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-heading);
  font-weight: var(--font-weight-thin);
  color: var(--color-text-inverse);
  letter-spacing: -0.025em;
  text-transform: uppercase;
  position: relative;

  @media (max-width: 768px) {
    font-size: var(--font-size-title);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
  }
`;

// Removed Button styled component as it's not used

const SaveButton = styled.button`
  background: var(--color-accent);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-5);
  border: none;
  border-radius: var(--radius-subtle);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-elevation);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    background: var(--color-text-tertiary);
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    padding: var(--space-3) var(--space-4);
  }
`;

const CancelButton = styled.button`
  background: transparent;
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-5);
  border: 1px solid var(--color-text-inverse);
  border-radius: var(--radius-subtle);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover {
    background: var(--color-text-inverse);
    color: var(--color-primary);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    width: 100%;
    padding: var(--space-3) var(--space-4);
  }
`;

const AICorrectionButton = styled.button`
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  background: var(--color-accent);
  color: var(--color-text-inverse);
  padding: var(--space-4) var(--space-5);
  border: none;
  border-radius: var(--radius-prominent);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  box-shadow: var(--shadow-structure);
  z-index: 100;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 12px 24px rgba(255, 107, 0, 0.3);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0) scale(1);
  }
  
  &:disabled {
    background: var(--color-text-tertiary);
    cursor: not-allowed;
    box-shadow: var(--shadow-paper);
  }
  
  @media (max-width: 768px) {
    bottom: 80px;
    right: var(--space-4);
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-small);
  }
`;

const FormContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  background: var(--color-surface);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--color-surface-alt);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: var(--radius-subtle);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-tertiary);
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);
  padding: var(--space-6);

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    column-gap: var(--space-6);
    row-gap: var(--space-5);
  }

  @media (max-width: 768px) {
    padding: var(--space-5);
    gap: var(--space-4);
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  
  &.full-width {
    grid-column: 1 / -1;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--color-border-light);
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:focus-within::after {
    opacity: 1;
  }

  &:focus-within label {
    color: var(--color-accent);
  }

  &:focus-within label::before {
    background: var(--color-accent);
    transform: scale(1.5);
  }
`;

const Label = styled.label`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  transition: color 0.2s;

  &::before {
    content: '';
    width: 3px;
    height: 3px;
    background: var(--color-tertiary);
    transition: all 0.2s;
  }
`;

const Input = styled.input`
  width: 100%;
  min-height: 48px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-subtle);
  font-size: var(--font-size-body);
  background: var(--color-background);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-regular);
  
  &::placeholder {
    color: var(--color-text-tertiary);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
    background: var(--color-background);
    box-shadow: var(--shadow-focused);
  }
  
  &:hover:not(:disabled):not(:focus) {
    border-color: var(--color-tertiary);
  }
  
  &:disabled {
    background: var(--color-surface-alt);
    color: var(--color-text-tertiary);
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-subtle);
  font-size: var(--font-size-body);
  min-height: ${props => props.large ? '200px' : '140px'};
  line-height: var(--line-height-comfortable);
  background: var(--color-background);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-regular);
  resize: vertical;
  
  &::placeholder {
    color: var(--color-text-tertiary);
    line-height: var(--line-height-comfortable);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
    background: var(--color-background);
    box-shadow: var(--shadow-focused);
  }
  
  &:hover:not(:disabled):not(:focus) {
    border-color: var(--color-tertiary);
  }
  
  &:disabled {
    background: var(--color-surface-alt);
    color: var(--color-text-tertiary);
    cursor: not-allowed;
  }
`;

const LoadingContainer = styled.div`
  min-height: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
`;

const ReportEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportAPI.getReport(id),
  });

  const [formData, setFormData] = useState({
    customer: '',
    project: '',
    next_action: '',
    budget: '',
    schedule: '',
    location: '',
    issues: '',
    participants: '',
    industry: '',
  });

  const [isCorrecting, setIsCorrecting] = useState(false);

  React.useEffect(() => {
    if (report?.slots) {
      setFormData({
        customer: report.slots.customer || '',
        project: report.slots.project || '',
        next_action: report.slots.next_action ? report.slots.next_action.replace(/,/g, '\n') : '',
        budget: report.slots.budget || '',
        schedule: report.slots.schedule || '',
        location: report.slots.location || '',
        issues: report.slots.issues ? report.slots.issues.replace(/,/g, '\n') : '',
        participants: report.slots.participants || '',
        industry: report.slots.industry || '',
      });
    }
  }, [report]);

  const updateMutation = useMutation({
    mutationFn: (data) => reportAPI.updateReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['report', id]);
      queryClient.invalidateQueries(['reports']);
      toast.success('日報を更新しました');
      navigate(`/reports/${id}`);
    },
    onError: () => {
      toast.error('日報の更新に失敗しました');
    }
  });

  const syncMutation = useMutation({
    mutationFn: (data) => dynamics365API.syncReport(data),
    onSuccess: () => {
      toast.success('Dynamics 365に同期しました');
    },
    onError: (error) => {
      console.error('Dynamics 365 sync error:', error);
      toast.error('Dynamics 365への同期に失敗しました');
    }
  });

  const handleSyncToDynamics365 = () => {
    const reportData = {
      customer: formData.customer,
      project: formData.project,
      participants: formData.participants,
      location: formData.location,
      budget: formData.budget,
      schedule: formData.schedule,
      next_action: formData.next_action,
      issues: formData.issues,
      questions_answers: report?.questions_answers || [],
      dynamics365_account_id: report?.dynamics365_account_id,
      dynamics365_opportunity_id: report?.dynamics365_opportunity_id
    };

    syncMutation.mutate(reportData);
  };

  if (isLoading) {
    return (
      <Container>
        <Card>
          <LoadingContainer>
            <LoadingSpinner />
            <LoadingText>日報を読み込んでいます...</LoadingText>
          </LoadingContainer>
        </Card>
      </Container>
    );
  }

  if (!report || report.user_id !== user?.id) {
    return (
      <Container>
        <Card>
          <p>この日報を編集する権限がありません</p>
        </Card>
      </Container>
    );
  }

  // 完了済みの日報も編集可能にする（コメントアウト）
  // if (report.status === 'completed') {
  //   return (
  //     <Container>
  //       <Card>
  //         <p>完了済みの日報は編集できません</p>
  //       </Card>
  //     </Container>
  //   );
  // }

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert form data to appropriate types for the API (comma-separated strings)
    const processedSlots = {
      customer: formData.customer,
      project: formData.project,
      next_action: formData.next_action.trim() ?
        formData.next_action.split('\n').map(item => item.trim()).filter(item => item).join(', ') : '',
      budget: formData.budget,
      schedule: formData.schedule,
      location: formData.location,
      issues: formData.issues.trim() ?
        formData.issues.split('\n').map(item => item.trim()).filter(item => item).join(', ') : '',
      participants: formData.participants,
      industry: formData.industry,
    };
    
    updateMutation.mutate({
      slots: processedSlots,
      status: 'draft'
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAICorrection = async () => {
    if (isCorrecting) return;

    setIsCorrecting(true);
    try {
      // Combine all text fields for correction
      const textToCorrect = `
顧客: ${formData.customer}
案件: ${formData.project}
次のアクション: ${formData.next_action}
予算: ${formData.budget}
スケジュール: ${formData.schedule}
場所: ${formData.location}
課題: ${formData.issues}
参加者: ${formData.participants}
業界: ${formData.industry}
      `.trim();

      const result = await aiAPI.correctReportText(textToCorrect);
      
      if (result && result.correctedSlots) {
        // Update form data with corrected values
        setFormData(prev => ({
          ...prev,
          ...result.correctedSlots,
          // Convert comma-separated strings back to newlines for display
          next_action: result.correctedSlots.next_action ? 
            result.correctedSlots.next_action.replace(/,\s*/g, '\n') : prev.next_action,
          issues: result.correctedSlots.issues ? 
            result.correctedSlots.issues.replace(/,\s*/g, '\n') : prev.issues,
        }));
        toast.success('AI補正が完了しました');
      }
    } catch (error) {
      console.error('AI補正エラー:', error);
      toast.error('AI補正に失敗しました');
    } finally {
      setIsCorrecting(false);
    }
  };

  return (
    <Container>
      <Card>
        <Header>
          <Title>日報を編集</Title>
          <ButtonGroup>
            <SaveButton 
              form="edit-form"
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? '保存中...' : '保存する'}
            </SaveButton>
            {report?.slots?.dynamics365_account_id && (
              <SaveButton 
                type="button"
                onClick={handleSyncToDynamics365}
                disabled={syncMutation.isPending}
                style={{ 
                  background: 'var(--color-secondary)',
                  borderColor: 'var(--color-secondary)'
                }}
              >
                {syncMutation.isPending ? '同期中...' : 'Dynamics 365に同期'}
              </SaveButton>
            )}
            <CancelButton onClick={() => navigate(`/reports/${id}`)}>
              キャンセル
            </CancelButton>
          </ButtonGroup>
        </Header>

        <FormContainer>
          <Form id="edit-form" onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="customer">顧客名</Label>
              <Input
                id="customer"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                placeholder="例: 株式会社〇〇"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="project">案件名</Label>
              <Input
                id="project"
                name="project"
                value={formData.project}
                onChange={handleChange}
                placeholder="例: 新システム導入プロジェクト"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="budget">予算</Label>
              <Input
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="例: 1,000万円"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="schedule">スケジュール</Label>
              <Input
                id="schedule"
                name="schedule"
                value={formData.schedule}
                onChange={handleChange}
                placeholder="例: 2024年3月末まで"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="location">場所</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="例: 東京本社 会議室A"
              />
            </FormGroup>

            <FormGroup className="full-width">
              <Label htmlFor="next_action">次のアクション</Label>
              <TextArea
                id="next_action"
                name="next_action"
                value={formData.next_action}
                onChange={handleChange}
                placeholder="例:
・見積書を作成して送付
・次回ミーティングの日程調整
・技術資料の準備"
                large
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="participants">参加者</Label>
              <Input
                id="participants"
                name="participants"
                value={formData.participants}
                onChange={handleChange}
                placeholder="例: 田中部長、山田様、鈴木様"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="industry">業界</Label>
              <Input
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="例: 建設業、IT業、製造業など"
              />
            </FormGroup>

            <FormGroup className="full-width">
              <Label htmlFor="issues">課題・リスク</Label>
              <TextArea
                id="issues"
                name="issues"
                value={formData.issues}
                onChange={handleChange}
                placeholder="例:
・予算オーバーの懸念あり
・競合他社も提案中
・意思決定者が不明確"
                large
              />
            </FormGroup>
          </Form>
        </FormContainer>
      </Card>
      
      <AICorrectionButton 
        onClick={handleAICorrection}
        disabled={isCorrecting}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 3L13.707 2.293C13.5195 2.10545 13.2652 2.00006 13 2.00006C12.7348 2.00006 12.4805 2.10545 12.293 2.293L13 3ZM11 5L10.293 5.707C10.4805 5.89455 10.7348 5.99994 11 5.99994C11.2652 5.99994 11.5195 5.89455 11.707 5.707L11 5ZM13 7L13.707 7.707C13.8945 7.5195 13.9999 7.26519 13.9999 7C13.9999 6.73481 13.8945 6.4805 13.707 6.293L13 7ZM11 9L10.293 8.293C10.1055 8.4805 10.0001 8.73481 10.0001 9C10.0001 9.26519 10.1055 9.5195 10.293 9.707L11 9ZM13 11L13.707 10.293C13.5195 10.1055 13.2652 10.0001 13 10.0001C12.7348 10.0001 12.4805 10.1055 12.293 10.293L13 11ZM11 13L10.293 13.707C10.4805 13.8945 10.7348 13.9999 11 13.9999C11.2652 13.9999 11.5195 13.8945 11.707 13.707L11 13ZM13 15L13.707 15.707C13.8945 15.5195 13.9999 15.2652 13.9999 15C13.9999 14.7348 13.8945 14.4805 13.707 14.293L13 15ZM11 17L10.293 16.293C10.1055 16.4805 10.0001 16.7348 10.0001 17C10.0001 17.2652 10.1055 17.5195 10.293 17.707L11 17ZM13 19L13.707 18.293C13.5195 18.1055 13.2652 18.0001 13 18.0001C12.7348 18.0001 12.4805 18.1055 12.293 18.293L13 19ZM11 21L10.293 21.707C10.4805 21.8945 10.7348 21.9999 11 21.9999C11.2652 21.9999 11.5195 21.8945 11.707 21.707L11 21ZM2 12H7V10H2V12ZM17 12H22V10H17V12ZM12.293 3.707L10.293 5.707L11.707 6.293L13.707 4.293L12.293 3.707ZM11.707 4.293L13.707 6.293L12.293 7.707L10.293 5.707L11.707 4.293ZM12.293 6.293L10.293 8.293L11.707 9.707L13.707 7.707L12.293 6.293ZM11.707 9.293L13.707 11.293L12.293 10.707L10.293 8.707L11.707 9.293ZM12.293 10.293L10.293 12.293L11.707 13.707L13.707 11.707L12.293 10.293ZM11.707 13.293L13.707 15.293L12.293 14.707L10.293 12.707L11.707 13.293ZM12.293 14.293L10.293 16.293L11.707 17.707L13.707 15.707L12.293 14.293ZM11.707 17.293L13.707 19.293L12.293 18.707L10.293 16.707L11.707 17.293ZM12.293 18.293L10.293 20.293L11.707 21.707L13.707 19.707L12.293 18.293Z" fill="currentColor"/>
        </svg>
        {isCorrecting ? 'AI補正中...' : 'AIで文章を補正'}
      </AICorrectionButton>
    </Container>
  );
};

export default ReportEditPage;