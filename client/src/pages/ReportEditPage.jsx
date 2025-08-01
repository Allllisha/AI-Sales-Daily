import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
// Using architectural design system variables from CSS

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 0 var(--space-4);
  }
`;

const Card = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-surface);
  padding: var(--space-6);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-structure);
  transition: all 0.2s ease-in-out;

  @media (max-width: 768px) {
    padding: var(--space-5);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-5);
  border-bottom: 2px solid var(--color-border);
  flex-shrink: 0;
  position: relative;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    padding-bottom: var(--space-4);
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: var(--color-primary);
  letter-spacing: -0.025em;
  line-height: var(--line-height-compressed);
  text-transform: uppercase;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    font-size: var(--font-size-heading);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: var(--space-2);
`;

const Button = styled.button`
  padding: var(--space-3) var(--space-5);
  border: none;
  border-radius: var(--radius-none);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-size: var(--font-size-small);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-small);
  }
`;

const SaveButton = styled.button`
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
    background-color: var(--color-text-tertiary);
    border-color: var(--color-text-tertiary);
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-small);
  }
`;

const CancelButton = styled.button`
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
  
  &:hover {
    background-color: var(--color-surface);
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-small);
  }
`;

const FormContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: var(--space-2);
  margin-right: -var(--space-2);

  /* Custom scrollbar for better appearance */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--color-surface);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-text-secondary);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-tertiary);
  }

  @media (max-width: 768px) {
    padding-right: 0;
    margin-right: 0;
    
    /* Hide scrollbar on mobile for cleaner look */
    &::-webkit-scrollbar {
      width: 3px;
    }
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  padding-bottom: var(--space-8);

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-8);
  }

  /* 長いテキストエリアは全幅を使用 */
  .full-width {
    grid-column: 1 / -1;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const Label = styled.label`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const Input = styled.input`
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  background-color: var(--color-background);
  transition: all 0.2s ease-in-out;
  color: var(--color-text-primary);
  font-family: inherit;
  
  &::placeholder {
    color: var(--color-text-tertiary);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
    background-color: var(--color-background);
    box-shadow: var(--shadow-focused);
  }
  
  &:disabled {
    background-color: var(--color-surface-alt);
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  min-height: 120px;
  line-height: var(--line-height-standard);
  background-color: var(--color-background);
  transition: all 0.2s ease-in-out;
  color: var(--color-text-primary);
  font-family: inherit;
  resize: vertical;
  
  &::placeholder {
    color: var(--color-text-tertiary);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
    background-color: var(--color-background);
    box-shadow: var(--shadow-focused);
  }
  
  &:disabled {
    background-color: var(--color-surface-alt);
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const LoadingContainer = styled.div`
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
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

  if (!report || report.user_id !== user?.id) {
    return (
      <Container>
        <Card>
          <p>この日報を編集する権限がありません</p>
        </Card>
      </Container>
    );
  }

  if (report.status === 'completed') {
    return (
      <Container>
        <Card>
          <p>完了済みの日報は編集できません</p>
        </Card>
      </Container>
    );
  }

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
              {updateMutation.isPending ? '保存中...' : '保存'}
            </SaveButton>
            <CancelButton onClick={() => navigate(`/reports/${id}`)}>
              キャンセル
            </CancelButton>
          </ButtonGroup>
        </Header>

        <FormContainer>
          <Form id="edit-form" onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="customer">顧客</Label>
              <Input
                id="customer"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                placeholder="顧客名を入力"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="project">案件</Label>
              <Input
                id="project"
                name="project"
                value={formData.project}
                onChange={handleChange}
                placeholder="案件名を入力"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="budget">予算</Label>
              <Input
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="予算を入力"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="schedule">スケジュール</Label>
              <Input
                id="schedule"
                name="schedule"
                value={formData.schedule}
                onChange={handleChange}
                placeholder="工期・納期を入力"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="location">場所</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="場所を入力"
              />
            </FormGroup>

            <FormGroup className="full-width">
              <Label htmlFor="next_action">次のアクション</Label>
              <TextArea
                id="next_action"
                name="next_action"
                value={formData.next_action}
                onChange={handleChange}
                placeholder="次のアクションを入力（改行で複数入力可）"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="participants">参加者</Label>
              <Input
                id="participants"
                name="participants"
                value={formData.participants}
                onChange={handleChange}
                placeholder="参加者を入力（、で区切る）"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="industry">業界</Label>
              <Input
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="業界を入力（例：建設業、IT業、保険業）"
              />
            </FormGroup>

            <FormGroup className="full-width">
              <Label htmlFor="issues">課題・リスク</Label>
              <TextArea
                id="issues"
                name="issues"
                value={formData.issues}
                onChange={handleChange}
                placeholder="課題やリスクを入力（改行で複数入力可）"
              />
            </FormGroup>
          </Form>
        </FormContainer>
      </Card>
    </Container>
  );
};

export default ReportEditPage;