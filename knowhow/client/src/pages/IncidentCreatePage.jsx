import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { incidentAPI, sitesAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineCloudUpload } from 'react-icons/hi';

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

const Title = styled.h1`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;

  @media (max-width: 640px) {
    font-size: var(--font-size-xl);
  }
`;

const Card = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-sm);

  @media (max-width: 768px) {
    padding: var(--space-5);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const Label = styled.label`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
`;

const Input = styled.input`
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  height: 48px;
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const TextArea = styled.textarea`
  padding: var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  min-height: 120px;
  resize: vertical;
  line-height: var(--line-height-relaxed);
  font-family: inherit;
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const Select = styled.select`
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  height: 48px;
  transition: all var(--transition-fast);
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  font-size: var(--font-size-xs);
`;

const SelectRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-base);
  height: 52px;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);
  margin-top: var(--space-4);

  &:hover:not(:disabled) {
    background: var(--gradient-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(26, 54, 93, 0.3);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const IncidentCreatePage = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      severity: 'moderate',
    }
  });

  const { data: sitesData } = useQuery({
    queryKey: ['sites-all'],
    queryFn: () => sitesAPI.getAll(),
    staleTime: 60000,
  });

  const sites = sitesData?.items || sitesData || [];

  const createMutation = useMutation({
    mutationFn: (data) => incidentAPI.create(data),
    onSuccess: (result) => {
      toast.success('事例を登録しました');
      navigate(`/incidents/${result.id}`);
    },
    onError: () => {
      toast.error('登録に失敗しました');
    }
  });

  const onSubmit = (data) => {
    const payload = {
      ...data,
      site_id: data.site_id ? parseInt(data.site_id) : undefined,
      occurred_at: data.occurred_at || undefined,
    };
    createMutation.mutate(payload);
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/incidents')}>
          <HiOutlineArrowLeft />
        </BackButton>
        <Title>事例登録</Title>
      </Header>

      <Card>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              placeholder="例: 足場解体時の墜落事故"
              {...register('title', { required: 'タイトルを入力してください' })}
            />
            {errors.title && <ErrorMessage>{errors.title.message}</ErrorMessage>}
          </FormGroup>

          <SelectRow>
            <FormGroup>
              <Label htmlFor="severity">重大度 *</Label>
              <Select id="severity" {...register('severity', { required: true })}>
                <option value="minor">軽微</option>
                <option value="moderate">中程度</option>
                <option value="serious">重大</option>
                <option value="critical">危険</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="work_type">工種</Label>
              <Input
                id="work_type"
                placeholder="例: 足場工事"
                {...register('work_type')}
              />
            </FormGroup>
          </SelectRow>

          <SelectRow>
            <FormGroup>
              <Label htmlFor="site_id">現場</Label>
              <Select id="site_id" {...register('site_id')}>
                <option value="">選択してください</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="occurred_at">発生日</Label>
              <Input
                id="occurred_at"
                type="date"
                {...register('occurred_at')}
              />
            </FormGroup>
          </SelectRow>

          <FormGroup>
            <Label htmlFor="description">概要 *</Label>
            <TextArea
              id="description"
              placeholder="事故・事例の概要を記述してください"
              {...register('description', { required: '概要を入力してください' })}
            />
            {errors.description && <ErrorMessage>{errors.description.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="cause">原因</Label>
            <TextArea
              id="cause"
              placeholder="原因を記述してください"
              style={{ minHeight: '80px' }}
              {...register('cause')}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="countermeasure">対策</Label>
            <TextArea
              id="countermeasure"
              placeholder="対策を記述してください"
              style={{ minHeight: '80px' }}
              {...register('countermeasure')}
            />
          </FormGroup>

          <SubmitButton
            type="submit"
            disabled={createMutation.isPending}
          >
            <HiOutlineCloudUpload />
            {createMutation.isPending ? '登録中...' : '登録する'}
          </SubmitButton>
        </Form>
      </Card>
    </Container>
  );
};

export default IncidentCreatePage;
