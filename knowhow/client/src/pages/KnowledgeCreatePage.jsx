import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { knowledgeAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import SimpleVoiceInput from '../components/SimpleVoiceInput';
import {
  HiOutlineArrowLeft, HiOutlineMicrophone, HiOutlinePencil,
  HiOutlineX, HiOutlineCloudUpload, HiOutlineSave
} from 'react-icons/hi';

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
  min-height: 200px;
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

const InputModeToggle = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
`;

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1.5px solid ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'var(--color-border)'};
  background: ${props => props.$active ? 'var(--color-primary-50)' : 'var(--color-surface)'};
  color: ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'var(--color-text-secondary)'};

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);

  @media (max-width: 640px) {
    flex-direction: column-reverse;
  }
`;

const SubmitButton = styled.button`
  flex: 1;
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

const DraftButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
  height: 52px;

  &:hover:not(:disabled) {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TagsInputWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  min-height: 48px;
  transition: all var(--transition-fast);

  &:focus-within {
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
`;

const TagChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px var(--space-3);
  background: var(--color-primary-50);
  color: var(--color-primary-600, #2563eb);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-primary-lighter);
`;

const TagRemoveBtn = styled.button`
  display: inline-flex;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  opacity: 0.6;
  font-size: 0.85rem;
  &:hover { opacity: 1; }
`;

const TagTextInput = styled.input`
  border: none;
  background: none;
  outline: none;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  min-width: 120px;
  padding: 2px 0;

  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const KnowledgeCreatePage = () => {
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState('text');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      category: 'procedure',
      risk_level: 'low'
    }
  });

  const contentValue = watch('content');

  const createMutation = useMutation({
    mutationFn: (data) => knowledgeAPI.create(data),
    onSuccess: (result) => {
      toast.success(result.status === 'draft' ? '下書きを保存しました' : 'ナレッジを登録しました');
      navigate(`/knowledge/${result.id || ''}`);
    },
    onError: () => {
      toast.error('登録に失敗しました');
    }
  });

  const onSubmit = (data, status = 'published') => {
    createMutation.mutate({ ...data, tags, status });
  };

  const handleDraftSave = () => {
    const data = watch();
    if (!data.title?.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }
    createMutation.mutate({ ...data, tags, status: 'draft' });
  };

  const handleVoiceResult = (text) => {
    setValue('content', text);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags(prev => [...prev, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/knowledge')}>
          <HiOutlineArrowLeft />
        </BackButton>
        <Title>ナレッジ登録</Title>
      </Header>

      <Card>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              placeholder="例: 杭打ち工事における地下水位対策"
              {...register('title', { required: 'タイトルを入力してください' })}
            />
            {errors.title && <ErrorMessage>{errors.title.message}</ErrorMessage>}
          </FormGroup>

          <SelectRow>
            <FormGroup>
              <Label htmlFor="category">カテゴリ *</Label>
              <Select id="category" {...register('category', { required: true })}>
                <option value="procedure">手順</option>
                <option value="safety">安全</option>
                <option value="quality">品質</option>
                <option value="cost">コスト</option>
                <option value="equipment">設備</option>
                <option value="material">資材</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="risk_level">リスクレベル</Label>
              <Select id="risk_level" {...register('risk_level')}>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">重大</option>
              </Select>
            </FormGroup>
          </SelectRow>

          <FormGroup>
            <Label htmlFor="work_type">工種</Label>
            <Input
              id="work_type"
              placeholder="例: 杭打ち工事"
              {...register('work_type')}
            />
          </FormGroup>

          <FormGroup>
            <Label>内容 *</Label>
            <InputModeToggle>
              <ToggleButton
                type="button"
                $active={inputMode === 'text'}
                onClick={() => setInputMode('text')}
              >
                <HiOutlinePencil />
                テキスト入力
              </ToggleButton>
              <ToggleButton
                type="button"
                $active={inputMode === 'voice'}
                onClick={() => setInputMode('voice')}
              >
                <HiOutlineMicrophone />
                音声入力
              </ToggleButton>
            </InputModeToggle>

            {inputMode === 'text' ? (
              <>
                <TextArea
                  placeholder="ナレッジの内容を記述してください。Markdown形式に対応しています。"
                  {...register('content', { required: '内容を入力してください' })}
                />
                {errors.content && <ErrorMessage>{errors.content.message}</ErrorMessage>}
              </>
            ) : (
              <SimpleVoiceInput
                onResult={handleVoiceResult}
                value={contentValue}
              />
            )}
          </FormGroup>

          <FormGroup>
            <Label>タグ</Label>
            <TagsInputWrapper>
              {tags.map(tag => (
                <TagChip key={tag}>
                  {tag}
                  <TagRemoveBtn type="button" onClick={() => handleRemoveTag(tag)}>
                    <HiOutlineX />
                  </TagRemoveBtn>
                </TagChip>
              ))}
              <TagTextInput
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? 'タグを入力してEnterで追加' : '追加...'}
              />
            </TagsInputWrapper>
          </FormGroup>

          <ButtonRow>
            <DraftButton
              type="button"
              onClick={handleDraftSave}
              disabled={createMutation.isPending}
            >
              <HiOutlineSave />
              {createMutation.isPending ? '保存中...' : '下書き保存'}
            </DraftButton>
            <SubmitButton
              type="submit"
              disabled={createMutation.isPending}
            >
              <HiOutlineCloudUpload />
              {createMutation.isPending ? '登録中...' : '公開する'}
            </SubmitButton>
          </ButtonRow>
        </Form>
      </Card>
    </Container>
  );
};

export default KnowledgeCreatePage;
