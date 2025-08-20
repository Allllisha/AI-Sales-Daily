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
    </Container>
  );
};

export default ReportEditPage;