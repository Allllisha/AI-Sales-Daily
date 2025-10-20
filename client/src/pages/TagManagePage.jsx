import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import tagAPI from '../services/tagAPI';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
`;

const Title = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  color: var(--color-primary);
  margin: 0;
`;

const BackButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
`;

const CategorySection = styled.div`
  margin-bottom: var(--space-6);
`;

const CategoryTitle = styled.h2`
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const CategoryBadge = styled.span`
  padding: var(--space-1) var(--space-3);
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
`;

const TagTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
`;

const Th = styled.th`
  padding: var(--space-4);
  text-align: left;
  background: var(--color-background);
  border-bottom: 2px solid var(--color-border);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  font-size: var(--font-size-base);
`;

const Td = styled.td`
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
`;

const TagColorCircle = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.color || '#6B7280'};
  border: 2px solid var(--color-border);
`;

const ActionButton = styled.button`
  padding: var(--space-2) var(--space-3);
  margin-right: var(--space-2);
  border: 2px solid ${props => props.danger ? '#EF4444' : 'var(--color-border)'};
  background: transparent;
  color: ${props => props.danger ? '#EF4444' : 'var(--color-text)'};
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-small);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s;

  &:hover {
    ${props => props.danger ? `
      background: #EF4444;
      color: white;
    ` : `
      border-color: var(--color-accent);
      color: var(--color-accent);
    `}
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-secondary);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-none);
`;

const LoadingState = styled.div`
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-secondary);
`;

const ModalOverlay = styled.div`
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
`;

const Modal = styled.div`
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  padding: var(--space-6);
  max-width: 500px;
  width: 90%;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
`;

const ModalTitle = styled.h2`
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: var(--font-size-large);
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: var(--space-2);

  &:hover {
    color: var(--color-accent);
  }
`;

const FormGroup = styled.div`
  margin-bottom: var(--space-4);
`;

const Label = styled.label`
  display: block;
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
`;

const Input = styled.input`
  width: 100%;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-base);
  background: var(--color-background);
  color: var(--color-text);

  &:focus {
    outline: none;
    border-color: var(--color-accent);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-base);
  background: var(--color-background);
  color: var(--color-text);

  &:focus {
    outline: none;
    border-color: var(--color-accent);
  }
`;

const ColorPickerWrapper = styled.div`
  display: flex;
  gap: var(--space-3);
  align-items: center;
`;

const ColorInput = styled.input`
  width: 60px;
  height: 40px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  cursor: pointer;
`;

const ModalActions = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-6);
`;

const SaveButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-accent);
  background: var(--color-accent);
  color: white;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s;

  &:hover {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-text-secondary);
  }
`;

const TagManagePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isManager } = useAuth();
  const [editingTag, setEditingTag] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedTagsForMerge, setSelectedTagsForMerge] = useState([]);
  const [editForm, setEditForm] = useState({ name: '', category: 'company', color: '#3B82F6' });

  const { data: allTags = [], isLoading, error, isFetching } = useQuery({
    queryKey: ['allTags'],
    queryFn: async () => {
      console.log('[TagManagePage] Fetching all tags...');
      const result = await tagAPI.getAll(null, 200);
      console.log('[TagManagePage] Fetched tags:', result);
      return result;
    },
    staleTime: 0, // データをすぐにstaleにする
    refetchOnMount: true, // マウント時に必ず再取得
  });

  // デバッグ用
  React.useEffect(() => {
    console.log('[TagManagePage] State:', {
      allTags,
      tagsCount: allTags.length,
      isLoading,
      isFetching,
      error
    });
  }, [allTags, isLoading, isFetching, error]);

  // タグキャッシュをクリアして最新データを取得
  React.useEffect(() => {
    console.log('[TagManagePage] Mounted - Invalidating tag cache...');
    queryClient.invalidateQueries(['allTags']);
    queryClient.invalidateQueries(['popularTags']);
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (tagData) => tagAPI.createTag(tagData),
    onSuccess: () => {
      queryClient.invalidateQueries(['allTags']);
      queryClient.invalidateQueries(['popularTags']);
      setIsCreating(false);
      setEditForm({ name: '', category: 'company', color: '#3B82F6' });
      toast.success('タグを作成しました');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'タグの作成に失敗しました';
      toast.error(message);
      console.error('Create tag error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tagId) => tagAPI.deleteTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries(['allTags']);
      queryClient.invalidateQueries(['popularTags']);
      toast.success('タグを削除しました');
    },
    onError: (error) => {
      toast.error('タグの削除に失敗しました');
      console.error('Delete tag error:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ tagId, updates }) => tagAPI.updateTag(tagId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['allTags']);
      queryClient.invalidateQueries(['popularTags']);
      setEditingTag(null);
      toast.success('タグを更新しました');
    },
    onError: (error) => {
      toast.error('タグの更新に失敗しました');
      console.error('Update tag error:', error);
    },
  });

  const mergeMutation = useMutation({
    mutationFn: ({ sourceTagIds, targetTagId }) =>
      tagAPI.mergeTags(sourceTagIds, targetTagId),
    onSuccess: () => {
      queryClient.invalidateQueries(['allTags']);
      queryClient.invalidateQueries(['popularTags']);
      setMergeMode(false);
      setSelectedTagsForMerge([]);
      toast.success('タグを統合しました');
    },
    onError: (error) => {
      toast.error('タグの統合に失敗しました');
      console.error('Merge tags error:', error);
    },
  });

  const handleDelete = (tagId, tagName) => {
    if (window.confirm(`「${tagName}」を削除してもよろしいですか？\n関連する日報からもこのタグが削除されます。`)) {
      deleteMutation.mutate(tagId);
    }
  };

  const handleMerge = () => {
    if (selectedTagsForMerge.length < 2) {
      toast.error('統合するタグを2つ以上選択してください');
      return;
    }

    const targetTagId = selectedTagsForMerge[0];
    const sourceTagIds = selectedTagsForMerge.slice(1);
    const targetTag = allTags.find(t => t.id === targetTagId);

    if (window.confirm(`「${targetTag.name}」に統合します。\n他の選択したタグは削除されます。よろしいですか？`)) {
      mergeMutation.mutate({ sourceTagIds, targetTagId });
    }
  };

  const toggleTagForMerge = (tagId) => {
    setSelectedTagsForMerge(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // 編集モーダルを開く時にフォームを初期化
  React.useEffect(() => {
    if (editingTag) {
      setEditForm({
        name: editingTag.name,
        category: editingTag.category,
        color: editingTag.color
      });
    }
  }, [editingTag]);

  // 新規作成モーダルを開く
  const handleOpenCreate = () => {
    setEditForm({ name: '', category: 'company', color: '#3B82F6' });
    setIsCreating(true);
  };

  // 保存処理（作成または更新）
  const handleSave = () => {
    if (!editForm.name.trim()) {
      toast.error('タグ名を入力してください');
      return;
    }

    if (isCreating) {
      // 新規作成
      createMutation.mutate({
        name: editForm.name,
        category: editForm.category,
        color: editForm.color
      });
    } else {
      // 更新
      updateMutation.mutate({
        tagId: editingTag.id,
        updates: {
          name: editForm.name,
          category: editForm.category,
          color: editForm.color
        }
      });
    }
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsCreating(false);
    setEditingTag(null);
    setEditForm({ name: '', category: 'company', color: '#3B82F6' });
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingState>タグ一覧を読み込み中...</LoadingState>
      </Container>
    );
  }

  // タグをカテゴリ別にグループ化
  const tagsByCategory = allTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {});

  const categoryLabels = {
    company: '企業名',
    person: '人物',
    topic: '話題',
    emotion: '感情',
    stage: 'ステージ',
    industry: '業界',
    product: '製品・サービス'
  };

  return (
    <Container>
      <Header>
        <Title>タグ管理</Title>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {mergeMode ? (
            <>
              <ActionButton onClick={() => {
                setMergeMode(false);
                setSelectedTagsForMerge([]);
              }}>
                キャンセル
              </ActionButton>
              <ActionButton
                onClick={handleMerge}
                disabled={selectedTagsForMerge.length < 2}
              >
                統合実行 ({selectedTagsForMerge.length}個選択中)
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton onClick={handleOpenCreate}>
                + タグを作成
              </ActionButton>
              <ActionButton onClick={() => setMergeMode(true)}>
                タグを統合
              </ActionButton>
            </>
          )}
          <BackButton onClick={() => navigate('/')}>
            ← ホームに戻る
          </BackButton>
        </div>
      </Header>

      {allTags.length === 0 ? (
        <EmptyState>
          <p>タグがまだありません</p>
          <p style={{ fontSize: 'var(--font-size-small)', marginTop: 'var(--space-2)' }}>
            日報を作成すると、AIが自動的にタグを抽出します
          </p>
        </EmptyState>
      ) : (
        Object.entries(tagsByCategory).map(([category, tags]) => (
          <CategorySection key={category}>
            <CategoryTitle>
              {categoryLabels[category] || category}
              <CategoryBadge>{tags.length}個</CategoryBadge>
            </CategoryTitle>
            <TagTable>
              <thead>
                <tr>
                  {mergeMode && <Th style={{ width: '50px' }}>選択</Th>}
                  <Th>タグ名</Th>
                  <Th style={{ width: '100px' }}>色</Th>
                  <Th style={{ width: '100px' }}>使用回数</Th>
                  <Th style={{ width: '150px' }}>操作</Th>
                </tr>
              </thead>
              <tbody>
                {tags.map(tag => (
                  <tr key={tag.id}>
                    {mergeMode && (
                      <Td>
                        <input
                          type="checkbox"
                          checked={selectedTagsForMerge.includes(tag.id)}
                          onChange={() => toggleTagForMerge(tag.id)}
                        />
                      </Td>
                    )}
                    <Td>{tag.name}</Td>
                    <Td>
                      <TagColorCircle color={tag.color} />
                    </Td>
                    <Td>{tag.usage_count || 0}回</Td>
                    <Td>
                      <ActionButton
                        onClick={() => setEditingTag(tag)}
                        disabled={mergeMode}
                      >
                        編集
                      </ActionButton>
                      <ActionButton
                        danger
                        onClick={() => handleDelete(tag.id, tag.name)}
                        disabled={mergeMode}
                      >
                        削除
                      </ActionButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TagTable>
          </CategorySection>
        ))
      )}

      {/* 作成/編集モーダル */}
      {(isCreating || editingTag) && (
        <ModalOverlay onClick={handleCloseModal}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{isCreating ? 'タグを作成' : 'タグを編集'}</ModalTitle>
              <CloseButton onClick={handleCloseModal}>×</CloseButton>
            </ModalHeader>

            <FormGroup>
              <Label>タグ名</Label>
              <Input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="タグ名を入力"
              />
            </FormGroup>

            <FormGroup>
              <Label>カテゴリ</Label>
              <Select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              >
                <option value="company">企業名</option>
                <option value="person">人物</option>
                <option value="topic">話題</option>
                <option value="emotion">感情</option>
                <option value="stage">ステージ</option>
                <option value="industry">業界</option>
                <option value="product">製品・サービス</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>カラー</Label>
              <ColorPickerWrapper>
                <ColorInput
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                />
                <Input
                  type="text"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  placeholder="#000000"
                  style={{ width: '150px' }}
                />
                <TagColorCircle color={editForm.color} />
              </ColorPickerWrapper>
            </FormGroup>

            <ModalActions>
              <CancelButton onClick={handleCloseModal}>
                キャンセル
              </CancelButton>
              <SaveButton
                onClick={handleSave}
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                {(createMutation.isLoading || updateMutation.isLoading) ? '保存中...' : '保存'}
              </SaveButton>
            </ModalActions>
          </Modal>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default TagManagePage;
