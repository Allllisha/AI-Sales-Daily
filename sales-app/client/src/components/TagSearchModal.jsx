import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useQuery } from '@tanstack/react-query';
import tagAPI from '../services/tagAPI';
import Tag from './Tag';
import toast from 'react-hot-toast';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
`;

const ModalContent = styled.div`
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-elevation);
  max-width: 700px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: var(--space-6);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
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
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: var(--space-2);

  &:hover {
    color: var(--color-primary);
  }
`;

const Section = styled.div`
  margin-bottom: var(--space-5);
`;

const SectionTitle = styled.h3`
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin-bottom: var(--space-3);
`;

const TagGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

const SearchModeToggle = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
`;

const ToggleButton = styled.button`
  padding: var(--space-2) var(--space-4);
  border: 2px solid ${props => props.active ? 'var(--color-accent)' : 'var(--color-border)'};
  background: ${props => props.active ? 'var(--color-accent)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--color-text)'};
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-accent);
  }
`;

const DateRangeContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DateInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const Label = styled.label`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
`;

const Input = styled.input`
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-base);

  &:focus {
    outline: none;
    border-color: var(--color-accent);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 2px solid var(--color-border);
`;

const Button = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid ${props => props.primary ? 'var(--color-accent)' : 'var(--color-border)'};
  background: ${props => props.primary ? 'var(--color-accent)' : 'transparent'};
  color: ${props => props.primary ? 'white' : 'var(--color-text)'};
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  border-radius: var(--radius-none);
  transition: all 0.2s;

  &:hover {
    ${props => props.primary ? `
      background: var(--color-primary);
      border-color: var(--color-primary);
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

const SelectedTagsInfo = styled.div`
  padding: var(--space-3);
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  margin-top: var(--space-3);
`;

const TagSearchModal = ({ isOpen, onClose, onSearch }) => {
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [searchMode, setSearchMode] = useState('OR'); // 'AND' or 'OR'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: allTags = [], isLoading } = useQuery({
    queryKey: ['allTags'],
    queryFn: () => tagAPI.getAll(null, 100),
    enabled: isOpen,
  });

  const handleTagToggle = (tagId) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSearch = () => {
    if (selectedTagIds.length === 0) {
      toast.error('タグを1つ以上選択してください');
      return;
    }

    const searchParams = {
      tagIds: selectedTagIds,
      mode: searchMode,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    onSearch(searchParams);
    onClose();
  };

  const handleReset = () => {
    setSelectedTagIds([]);
    setSearchMode('OR');
    setStartDate('');
    setEndDate('');
  };

  if (!isOpen) return null;

  // タグをカテゴリ別にグループ化
  const tagsByCategory = allTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {});

  const categoryLabels = {
    company: '企業',
    person: '人物',
    topic: '話題',
    emotion: '感情',
    stage: 'ステージ',
    industry: '業界',
    product: '製品・サービス'
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>タグで日報を検索</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <Section>
          <SectionTitle>検索条件</SectionTitle>
          <SearchModeToggle>
            <ToggleButton
              active={searchMode === 'OR'}
              onClick={() => setSearchMode('OR')}
            >
              OR検索（いずれかのタグ）
            </ToggleButton>
            <ToggleButton
              active={searchMode === 'AND'}
              onClick={() => setSearchMode('AND')}
            >
              AND検索（すべてのタグ）
            </ToggleButton>
          </SearchModeToggle>

          {selectedTagIds.length > 0 && (
            <SelectedTagsInfo>
              {selectedTagIds.length}個のタグを選択中
              {searchMode === 'OR' ? '（いずれかを含む日報）' : '（すべてを含む日報）'}
            </SelectedTagsInfo>
          )}
        </Section>

        <Section>
          <SectionTitle>期間指定（オプション）</SectionTitle>
          <DateRangeContainer>
            <DateInput>
              <Label>開始日</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </DateInput>
            <DateInput>
              <Label>終了日</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </DateInput>
          </DateRangeContainer>
        </Section>

        <Section>
          <SectionTitle>タグを選択</SectionTitle>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              読み込み中...
            </div>
          ) : (
            Object.entries(tagsByCategory).map(([category, tags]) => (
              <div key={category} style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{
                  fontSize: 'var(--font-size-small)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-2)'
                }}>
                  {categoryLabels[category] || category}
                </div>
                <TagGrid>
                  {tags.map(tag => (
                    <Tag
                      key={tag.id}
                      name={tag.name}
                      category={tag.category}
                      color={tag.color}
                      onClick={() => handleTagToggle(tag.id)}
                      onRemove={selectedTagIds.includes(tag.id) ? () => handleTagToggle(tag.id) : null}
                    />
                  ))}
                </TagGrid>
              </div>
            ))
          )}
        </Section>

        <ButtonGroup>
          <Button onClick={handleReset}>
            リセット
          </Button>
          <Button onClick={onClose}>
            キャンセル
          </Button>
          <Button
            primary
            onClick={handleSearch}
            disabled={selectedTagIds.length === 0}
          >
            検索実行
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TagSearchModal;
