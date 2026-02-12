import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checklistAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineCloudUpload, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

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
  min-height: 100px;
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

const SelectRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  font-size: var(--font-size-xs);
`;

const SectionLabel = styled.div`
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
`;

const ItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-background, #f8fafc);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;

const ItemNumber = styled.span`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-tertiary);
  min-width: 28px;
  text-align: center;
`;

const ItemInput = styled.input`
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
  height: 40px;
  transition: all var(--transition-fast);
  min-width: 0;

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--color-primary-600, #2563eb);
  }
`;

const DeleteItemButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all var(--transition-fast);

  &:hover {
    color: var(--color-error, #ef4444);
    background: rgba(239, 68, 68, 0.1);
  }
`;

const AddItemButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1.5px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
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

const CATEGORY_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: '安全確認', label: '安全確認' },
  { value: '品質管理', label: '品質管理' },
  { value: '作業手順', label: '作業手順' },
  { value: '機械点検', label: '機械点検' },
  { value: '環境管理', label: '環境管理' },
];

const WORK_TYPE_OPTIONS = [
  { value: '', label: '選択してください' },
  { value: '土工事', label: '土工事' },
  { value: '基礎工事', label: '基礎工事' },
  { value: '躯体工事', label: '躯体工事' },
  { value: '仕上工事', label: '仕上工事' },
  { value: '設備工事', label: '設備工事' },
  { value: '解体工事', label: '解体工事' },
];

const createEmptyItem = () => ({
  id: Date.now() + Math.random(),
  content: '',
  is_required: false,
});

const ChecklistCreatePage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [workType, setWorkType] = useState('');
  const [items, setItems] = useState([createEmptyItem()]);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) {
      newErrors.title = 'タイトルを入力してください';
    }
    if (items.length === 0) {
      newErrors.items = 'チェック項目を1つ以上追加してください';
    } else {
      const hasEmptyItem = items.some(item => !item.content.trim());
      if (hasEmptyItem) {
        newErrors.items = '空のチェック項目があります。内容を入力してください';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemContentChange = (id, content) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, content } : item
    ));
  };

  const handleItemRequiredChange = (id, is_required) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, is_required } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        work_type: workType || undefined,
        items: items.map((item, index) => ({
          content: item.content.trim(),
          is_required: item.is_required,
          order_number: index + 1,
        })),
      };

      await checklistAPI.create(payload);
      toast.success('チェックリストを作成しました');
      navigate('/checklists');
    } catch (err) {
      toast.error('作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/checklists')}>
          <HiOutlineArrowLeft />
        </BackButton>
        <Title>チェックリスト作成</Title>
      </Header>

      <Card>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              placeholder="例: 朝礼前安全確認チェックリスト"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <ErrorMessage>{errors.title}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">説明</Label>
            <TextArea
              id="description"
              placeholder="チェックリストの目的や使用場面を記述してください"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormGroup>

          <SelectRow>
            <FormGroup>
              <Label htmlFor="category">カテゴリ</Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="work_type">工種</Label>
              <Select
                id="work_type"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
              >
                {WORK_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </FormGroup>
          </SelectRow>

          <FormGroup>
            <SectionLabel>チェック項目</SectionLabel>
            <ItemsContainer>
              {items.map((item, index) => (
                <ItemRow key={item.id}>
                  <ItemNumber>{index + 1}</ItemNumber>
                  <ItemInput
                    placeholder="チェック項目の内容を入力"
                    value={item.content}
                    onChange={(e) => handleItemContentChange(item.id, e.target.value)}
                  />
                  <CheckboxLabel>
                    <input
                      type="checkbox"
                      checked={item.is_required}
                      onChange={(e) => handleItemRequiredChange(item.id, e.target.checked)}
                    />
                    必須
                  </CheckboxLabel>
                  <DeleteItemButton
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    title="項目を削除"
                  >
                    <HiOutlineTrash />
                  </DeleteItemButton>
                </ItemRow>
              ))}
            </ItemsContainer>
            {errors.items && <ErrorMessage>{errors.items}</ErrorMessage>}
            <AddItemButton type="button" onClick={handleAddItem}>
              <HiOutlinePlus />
              項目を追加
            </AddItemButton>
          </FormGroup>

          <SubmitButton type="submit" disabled={submitting}>
            <HiOutlineCloudUpload />
            {submitting ? '作成中...' : '作成する'}
          </SubmitButton>
        </Form>
      </Card>
    </Container>
  );
};

export default ChecklistCreatePage;
