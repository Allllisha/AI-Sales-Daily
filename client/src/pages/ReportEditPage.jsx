import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '../styles/designSystem';
import { Card as BaseCard, PrimaryButton, SecondaryButton, FormGroup as BaseFormGroup, Label as BaseLabel, Input as BaseInput, TextArea as BaseTextArea, LoadingContainer as BaseLoadingContainer, Spinner } from '../styles/componentStyles';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${spacing[8]};
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  @media (max-width: 1024px) {
    max-width: 900px;
    padding: 0 ${spacing[6]};
  }

  @media (max-width: 768px) {
    padding: 0 ${spacing[4]};
  }
`;

const Card = styled(BaseCard)`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 1024px) {
    padding: ${spacing[10]};
  }

  @media (max-width: 768px) {
    padding: ${spacing[6]};
    border-radius: ${borderRadius.lg};
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing[10]};
  padding-bottom: ${spacing[8]};
  border-bottom: 1px solid ${colors.neutral[200]};
  flex-shrink: 0;
  position: relative;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${spacing[4]};
    margin-bottom: ${spacing[6]};
    padding-bottom: ${spacing[4]};
  }
`;

const Title = styled.h1`
  font-size: ${typography.fontSize['3xl']};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  letter-spacing: ${typography.letterSpacing.tight};
  line-height: ${typography.lineHeight.tight};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize['2xl']};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${spacing[2]};
`;

const Button = styled.button`
  padding: ${spacing[3]} ${spacing[5]};
  border: none;
  border-radius: ${borderRadius.md};
  font-weight: ${typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${transitions.fast};
  font-size: ${typography.fontSize.sm};
  font-family: ${typography.fontFamily.sans};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: ${spacing[2]} ${spacing[4]};
    font-size: ${typography.fontSize.sm};
  }
`;

const SaveButton = styled(PrimaryButton)`
  background-color: ${colors.success.main};
  border-color: ${colors.success.main};

  &:hover:not(:disabled) {
    background-color: ${colors.success.dark};
    border-color: ${colors.success.dark};
  }
`;

const CancelButton = styled(SecondaryButton)``;

const FormContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: ${spacing[2]};
  margin-right: -${spacing[2]};

  /* Custom scrollbar for better appearance */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${colors.neutral[100]};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${colors.neutral[400]};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${colors.neutral[500]};
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
  gap: ${spacing[6]};
  padding-bottom: ${spacing[8]};

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${spacing[8]};
  }

  /* 長いテキストエリアは全幅を使用 */
  .full-width {
    grid-column: 1 / -1;
  }
`;

const FormGroup = styled(BaseFormGroup)``;

const Label = styled(BaseLabel)`
  color: ${colors.neutral[800]};
  letter-spacing: ${typography.letterSpacing.tight};
`;

const Input = styled(BaseInput)`
  padding: ${spacing[3]} ${spacing[4]};
  font-size: ${typography.fontSize.sm};
`;

const TextArea = styled(BaseTextArea)`
  padding: ${spacing[3]} ${spacing[4]};
  font-size: ${typography.fontSize.sm};
  min-height: 120px;
  line-height: ${typography.lineHeight.normal};
`;

const LoadingContainer = styled(BaseLoadingContainer)`
  min-height: 400px;
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
            <Spinner />
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