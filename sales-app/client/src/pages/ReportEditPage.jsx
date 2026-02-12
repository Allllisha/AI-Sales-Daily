import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportAPI, dynamics365API, aiAPI } from '../services/api';
import tagAPI from '../services/tagAPI';
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

// ヒアリング内容のスタイル（日報詳細画面と同じ）
const QAContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--space-4);
  
  @media (max-width: 768px) {
    padding: 0 var(--space-2);
  }
`;

const QAItem = styled.div`
  background-color: var(--color-surface-alt);
  border-radius: var(--radius-subtle);
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--color-border);
  
  @media (max-width: 768px) {
    padding: var(--space-4) var(--space-4);
  }
`;

const Question = styled.div`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  
  span {
    color: var(--color-accent);
    font-weight: var(--font-weight-bold);
    min-width: 30px;
  }
`;

const AnswerTextArea = styled(TextArea)`
  margin-top: var(--space-2);
  background: var(--color-background);
  border: 1px solid var(--color-border);

  &:focus {
    border-color: var(--color-accent);
    outline: none;
  }
`;

// タグ関連のスタイル
const TagSection = styled.div`
  margin-top: var(--space-6);
  padding: var(--space-5);
  background: var(--color-background);
  border-radius: var(--radius-subtle);
  border: 1px solid var(--color-border);
`;

const TagSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
`;

const TagSectionTitle = styled.h3`
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
  margin: 0;
`;

const AddTagButton = styled.button`
  background: transparent;
  color: var(--color-accent);
  border: 2px solid var(--color-accent);
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  border-radius: var(--radius-subtle);
  transition: all 0.2s;

  &:hover {
    background: var(--color-accent);
    color: var(--color-text-inverse);
  }
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

const TagItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: ${props => props.color || 'var(--color-accent)'};
  color: var(--color-text-inverse);
  border-radius: var(--radius-subtle);
  font-size: var(--font-size-small);
`;

const RemoveTagButton = styled.button`
  background: transparent;
  border: none;
  color: var(--color-text-inverse);
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  font-size: var(--font-size-body);
  line-height: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const TagSelectorModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
`;

const TagSelectorContent = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-subtle);
  padding: var(--space-6);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-structure);
`;

const TagSelectorTitle = styled.h3`
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-4);
`;

const TagGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
`;

const SelectableTag = styled.button`
  background: ${props => props.selected ? 'var(--color-accent)' : 'var(--color-background)'};
  color: ${props => props.selected ? 'var(--color-text-inverse)' : 'var(--color-text)'};
  border: 2px solid ${props => props.selected ? 'var(--color-accent)' : 'var(--color-border)'};
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-small);
  cursor: pointer;
  border-radius: var(--radius-subtle);
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CategorySection = styled.div`
  margin-bottom: var(--space-5);
`;

const CategoryLabel = styled.h4`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
`;

const TagModalButtonGroup = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-5);
`;

const CreateFormSection = styled.div`
  border-top: 2px solid var(--color-border);
  padding-top: var(--space-5);
  margin-top: var(--space-5);
`;

const CreateFormTitle = styled.h4`
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-4);
`;

const FormField = styled.div`
  margin-bottom: var(--space-4);
`;

const FormLabel = styled.label`
  display: block;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin-bottom: var(--space-2);
`;

const FormInput = styled.input`
  width: 100%;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-subtle);
  font-size: var(--font-size-small);
  background: var(--color-background);

  &:focus {
    outline: none;
    border-color: var(--color-accent);
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-subtle);
  font-size: var(--font-size-small);
  background: var(--color-background);

  &:focus {
    outline: none;
    border-color: var(--color-accent);
  }
`;

const ColorPickerWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const ColorInput = styled.input`
  width: 60px;
  height: 40px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-subtle);
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: none;
    border-radius: var(--radius-subtle);
  }
`;

const ToggleCreateButton = styled.button`
  background: transparent;
  color: var(--color-accent);
  border: 2px dashed var(--color-accent);
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  border-radius: var(--radius-subtle);
  transition: all 0.2s;
  width: 100%;
  margin-bottom: var(--space-5);

  &:hover {
    background: var(--color-accent);
    color: var(--color-text-inverse);
  }
`;

const ModalButton = styled.button`
  background: ${props => props.primary ? 'var(--color-accent)' : 'transparent'};
  color: ${props => props.primary ? 'var(--color-text-inverse)' : 'var(--color-text)'};
  border: 2px solid ${props => props.primary ? 'var(--color-accent)' : 'var(--color-border)'};
  padding: var(--space-3) var(--space-5);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  border-radius: var(--radius-subtle);
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.primary ? 'var(--color-primary)' : 'var(--color-border)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

  const [questionsAnswers, setQuestionsAnswers] = useState([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [selectedTagToAdd, setSelectedTagToAdd] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagForm, setNewTagForm] = useState({
    name: '',
    category: 'company',
    color: '#3B82F6'
  });

  // タグはreportから取得
  const tags = report?.tags || [];

  // すべてのタグを取得
  const { data: allTags = [] } = useQuery({
    queryKey: ['allTags'],
    queryFn: () => tagAPI.getAll(),
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
    if (report?.questions_answers) {
      setQuestionsAnswers(report.questions_answers);
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

  // タグを日報に追加
  const addTagMutation = useMutation({
    mutationFn: (tagId) => tagAPI.addToReport(id, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries(['report', id]);
      queryClient.invalidateQueries(['allTags']);
      toast.success('タグを追加しました');
      setShowTagSelector(false);
      setSelectedTagToAdd(null);
    },
    onError: (error) => {
      console.error('Add tag error:', error);
      const message = error.response?.data?.message || 'タグの追加に失敗しました';
      toast.error(message);
    }
  });

  // タグを日報から削除
  const removeTagMutation = useMutation({
    mutationFn: (tagId) => tagAPI.removeFromReport(id, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries(['report', id]);
      queryClient.invalidateQueries(['allTags']);
      toast.success('タグを削除しました');
    },
    onError: (error) => {
      console.error('Remove tag error:', error);
      const message = error.response?.data?.message || 'タグの削除に失敗しました';
      toast.error(message);
    }
  });

  // 新しいタグを作成して日報に追加
  const createAndAddTagMutation = useMutation({
    mutationFn: async (tagData) => {
      // タグを作成
      const createResponse = await tagAPI.createTag(tagData);
      const newTag = createResponse.tag;
      // 作成したタグを日報に追加
      await tagAPI.addToReport(id, newTag.id);
      return newTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['report', id]);
      queryClient.invalidateQueries(['allTags']);
      toast.success('タグを作成して追加しました');
      setShowCreateForm(false);
      setNewTagForm({ name: '', category: 'company', color: '#3B82F6' });
    },
    onError: (error) => {
      console.error('Create and add tag error:', error);
      const message = error.response?.data?.message || 'タグの作成に失敗しました';
      toast.error(message);
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
      questions_answers: questionsAnswers,
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

  const handleQAChange = (index, value) => {
    setQuestionsAnswers(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        answer: value
      };
      return updated;
    });
  };

  // タグ追加処理
  const handleAddTag = () => {
    if (selectedTagToAdd) {
      addTagMutation.mutate(selectedTagToAdd);
    }
  };

  // タグ削除処理
  const handleRemoveTag = (tagId) => {
    if (window.confirm('このタグを削除しますか？')) {
      removeTagMutation.mutate(tagId);
    }
  };

  // 新しいタグを作成
  const handleCreateTag = () => {
    if (!newTagForm.name.trim()) {
      toast.error('タグ名を入力してください');
      return;
    }
    createAndAddTagMutation.mutate(newTagForm);
  };

  // カテゴリ別にタグをグループ化
  const tagsByCategory = allTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {});

  // 既に追加されているタグのIDリスト
  const existingTagIds = tags.map(t => t.id);

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

          {/* ヒアリング内容編集セクション */}
          {questionsAnswers && questionsAnswers.length > 0 && (
            <FormGroup className="full-width">
              <Label style={{ 
                fontSize: 'var(--font-size-body)', 
                marginBottom: 'var(--space-4)',
                marginLeft: 'var(--space-4)',
                display: 'block'
              }}>
                ヒアリング内容
              </Label>
              <QAContainer>
                {questionsAnswers.map((qa, index) => (
                  <QAItem key={index}>
                    <Question>
                      <span>Q{index + 1}.</span>
                      {qa.question}
                    </Question>
                    <AnswerTextArea
                      value={qa.answer || ''}
                      onChange={(e) => handleQAChange(index, e.target.value)}
                      placeholder="回答を入力してください"
                      rows={4}
                    />
                  </QAItem>
                ))}
              </QAContainer>
            </FormGroup>
          )}

          {/* タグ編集セクション */}
          <TagSection>
            <TagSectionHeader>
              <TagSectionTitle>タグ</TagSectionTitle>
              <AddTagButton type="button" onClick={() => setShowTagSelector(true)}>
                + タグを追加
              </AddTagButton>
            </TagSectionHeader>
            {tags && tags.length > 0 ? (
              <TagList>
                {tags.map(tag => (
                  <TagItem key={tag.id} color={tag.color}>
                    {tag.name}
                    {tag.category && (
                      <span style={{ marginLeft: 'var(--space-2)', opacity: 0.8, fontSize: 'var(--font-size-micro)' }}>
                        ({tag.category})
                      </span>
                    )}
                    <RemoveTagButton type="button" onClick={() => handleRemoveTag(tag.id)}>
                      ×
                    </RemoveTagButton>
                  </TagItem>
                ))}
              </TagList>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)', margin: 0 }}>
                タグが設定されていません
              </p>
            )}
          </TagSection>
        </FormContainer>
      </Card>

      {/* Tag Selector Modal */}
      {showTagSelector && (
        <TagSelectorModal onClick={() => setShowTagSelector(false)}>
          <TagSelectorContent onClick={(e) => e.stopPropagation()}>
            <TagSelectorTitle>タグを追加</TagSelectorTitle>

            {/* 新しいタグを作成ボタン */}
            <ToggleCreateButton type="button" onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? '既存のタグから選択' : '+ 新しいタグを作成'}
            </ToggleCreateButton>

            {showCreateForm ? (
              /* 新しいタグ作成フォーム */
              <CreateFormSection>
                <CreateFormTitle>新しいタグを作成</CreateFormTitle>
                <FormField>
                  <FormLabel>タグ名 *</FormLabel>
                  <FormInput
                    type="text"
                    placeholder="例: 重要顧客"
                    value={newTagForm.name}
                    onChange={(e) => setNewTagForm({ ...newTagForm, name: e.target.value })}
                  />
                </FormField>
                <FormField>
                  <FormLabel>カテゴリ *</FormLabel>
                  <FormSelect
                    value={newTagForm.category}
                    onChange={(e) => setNewTagForm({ ...newTagForm, category: e.target.value })}
                  >
                    <option value="company">会社</option>
                    <option value="person">人物</option>
                    <option value="topic">トピック</option>
                    <option value="emotion">感情</option>
                    <option value="stage">ステージ</option>
                    <option value="industry">業界</option>
                    <option value="product">製品</option>
                  </FormSelect>
                </FormField>
                <FormField>
                  <FormLabel>色</FormLabel>
                  <ColorPickerWrapper>
                    <ColorInput
                      type="color"
                      value={newTagForm.color}
                      onChange={(e) => setNewTagForm({ ...newTagForm, color: e.target.value })}
                    />
                    <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)' }}>
                      {newTagForm.color}
                    </span>
                  </ColorPickerWrapper>
                </FormField>
                <TagModalButtonGroup>
                  <ModalButton
                    type="button"
                    primary
                    onClick={handleCreateTag}
                    disabled={createAndAddTagMutation.isPending}
                  >
                    {createAndAddTagMutation.isPending ? '作成中...' : '作成して追加'}
                  </ModalButton>
                  <ModalButton type="button" onClick={() => {
                    setShowTagSelector(false);
                    setShowCreateForm(false);
                    setNewTagForm({ name: '', category: 'company', color: '#3B82F6' });
                  }}>
                    キャンセル
                  </ModalButton>
                </TagModalButtonGroup>
              </CreateFormSection>
            ) : Object.keys(tagsByCategory).length > 0 ? (
              /* 既存のタグから選択 */
              <>
                {Object.entries(tagsByCategory).map(([category, categoryTags]) => (
                  <CategorySection key={category}>
                    <CategoryLabel>{category}</CategoryLabel>
                    <TagGrid>
                      {categoryTags.map(tag => {
                        const isAlreadyAdded = existingTagIds.includes(tag.id);
                        const isSelected = selectedTagToAdd === tag.id;

                        return (
                          <SelectableTag
                            key={tag.id}
                            type="button"
                            selected={isSelected}
                            disabled={isAlreadyAdded}
                            onClick={() => {
                              if (!isAlreadyAdded) {
                                setSelectedTagToAdd(isSelected ? null : tag.id);
                              }
                            }}
                          >
                            {tag.name}
                            {isAlreadyAdded && ' (追加済み)'}
                          </SelectableTag>
                        );
                      })}
                    </TagGrid>
                  </CategorySection>
                ))}
                <TagModalButtonGroup>
                  <ModalButton
                    type="button"
                    primary
                    onClick={handleAddTag}
                    disabled={!selectedTagToAdd || addTagMutation.isPending}
                  >
                    {addTagMutation.isPending ? '追加中...' : '追加'}
                  </ModalButton>
                  <ModalButton type="button" onClick={() => {
                    setShowTagSelector(false);
                    setSelectedTagToAdd(null);
                  }}>
                    キャンセル
                  </ModalButton>
                </TagModalButtonGroup>
              </>
            ) : (
              /* タグが存在しない場合 */
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                既存のタグがありません。<br />
                上のボタンから新しいタグを作成してください。
              </p>
            )}
          </TagSelectorContent>
        </TagSelectorModal>
      )}
    </Container>
  );
};

export default ReportEditPage;