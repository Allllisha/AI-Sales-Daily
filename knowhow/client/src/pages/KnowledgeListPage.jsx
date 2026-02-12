import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { knowledgeAPI } from '../services/api';
import styled from '@emotion/styled';
import KnowledgeCard from '../components/KnowledgeCard';
import SearchBar from '../components/SearchBar';
import { HiOutlinePlus, HiOutlineBookOpen, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineDownload } from 'react-icons/hi';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease-out;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
  gap: var(--space-4);
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

const CreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);

  &:hover {
    background: var(--gradient-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(26, 54, 93, 0.3);
  }
  &:active {
    transform: translateY(0);
  }
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: var(--space-2);
  align-items: center;
`;

const ExportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);

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

const SearchSection = styled.div`
  margin-bottom: var(--space-6);
`;

const FiltersRow = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-4);
  align-items: center;

  @media (max-width: 640px) {
    gap: var(--space-1-5, 6px);
  }
`;

const FilterChip = styled.button`
  padding: 6px var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
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

const FilterDivider = styled.div`
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 var(--space-2);

  @media (max-width: 640px) {
    display: none;
  }
`;

const FilterLabel = styled.span`
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ResultCount = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-4);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-16) var(--space-6);
`;

const EmptyIconWrap = styled.div`
  width: 72px;
  height: 72px;
  border-radius: var(--radius-xl);
  background: var(--color-primary-50);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-light);
  font-size: 1.75rem;
  margin: 0 auto var(--space-5);
`;

const EmptyText = styled.p`
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-medium);
`;

const EmptyHint = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
`;

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingSkeleton = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  height: 160px;
  animation: shimmer 1.5s infinite;
  background: linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-alt) 50%, var(--color-surface) 75%);
  background-size: 200% 100%;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-8);
  padding-bottom: var(--space-8);
`;

const PageButton = styled.button`
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-1);

  &:hover:not(:disabled) {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
`;

const FAB = styled.button`
  position: fixed;
  bottom: calc(var(--space-6) + 60px);
  right: var(--space-6);
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  border: none;
  box-shadow: 0 4px 16px rgba(26, 54, 93, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  z-index: 100;
  font-size: 1.5rem;

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 24px rgba(26, 54, 93, 0.4);
  }
  &:active {
    transform: scale(0.98);
  }

  @media (min-width: 641px) {
    display: none;
  }
`;

const categories = [
  { value: '', label: 'すべて' },
  { value: 'procedure', label: '手順' },
  { value: 'safety', label: '安全' },
  { value: 'quality', label: '品質' },
  { value: 'cost', label: 'コスト' },
  { value: 'equipment', label: '設備' },
  { value: 'material', label: '資材' },
];

const riskLevels = [
  { value: '', label: 'すべて' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '重大' },
];

const ITEMS_PER_PAGE = 12;

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const KnowledgeListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge', { search, category, riskLevel, page }],
    queryFn: () => knowledgeAPI.getAll({
      search: search || undefined,
      category: category || undefined,
      risk_level: riskLevel || undefined,
      page,
      limit: ITEMS_PER_PAGE,
    }),
    staleTime: 30000,
    keepPreviousData: true,
  });

  const knowledgeList = data?.items || data || [];
  const total = data?.total || knowledgeList.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const blob = await knowledgeAPI.exportCsv({
        category: category || undefined,
        risk_level: riskLevel || undefined,
      });
      downloadBlob(blob, `knowledge_export_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      console.error('CSV export failed:', error);
      alert('CSVエクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>ナレッジ一覧</Title>
        <HeaderButtons>
          <ExportButton onClick={handleExportCsv} disabled={exporting}>
            <HiOutlineDownload />
            {exporting ? 'エクスポート中...' : 'CSV出力'}
          </ExportButton>
          <CreateButton onClick={() => navigate('/knowledge/new')}>
            <HiOutlinePlus />
            新規登録
          </CreateButton>
        </HeaderButtons>
      </Header>

      <SearchSection>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="ナレッジを検索..."
        />
        <FiltersRow>
          <FilterLabel>カテゴリ</FilterLabel>
          {categories.map(cat => (
            <FilterChip
              key={cat.value}
              $active={category === cat.value}
              onClick={() => { setCategory(cat.value); setPage(1); }}
            >
              {cat.label}
            </FilterChip>
          ))}
          <FilterDivider />
          <FilterLabel>リスク</FilterLabel>
          {riskLevels.map(rl => (
            <FilterChip
              key={rl.value}
              $active={riskLevel === rl.value}
              onClick={() => { setRiskLevel(rl.value); setPage(1); }}
            >
              {rl.label}
            </FilterChip>
          ))}
        </FiltersRow>
      </SearchSection>

      {isLoading ? (
        <LoadingGrid>
          {[1,2,3,4,5,6].map(i => <LoadingSkeleton key={i} />)}
        </LoadingGrid>
      ) : knowledgeList.length > 0 ? (
        <>
          <ResultCount>{total}件のナレッジ</ResultCount>
          <Grid>
            {knowledgeList.map(item => (
              <KnowledgeCard key={item.id} knowledge={item} />
            ))}
          </Grid>
          {totalPages > 1 && (
            <Pagination>
              <PageButton disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <HiOutlineChevronLeft />
                前へ
              </PageButton>
              <PageInfo>{page} / {totalPages}</PageInfo>
              <PageButton disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                次へ
                <HiOutlineChevronRight />
              </PageButton>
            </Pagination>
          )}
        </>
      ) : (
        <EmptyState>
          <EmptyIconWrap>
            <HiOutlineBookOpen />
          </EmptyIconWrap>
          <EmptyText>ナレッジが見つかりませんでした</EmptyText>
          <EmptyHint>検索条件を変更するか、新しいナレッジを登録してください</EmptyHint>
        </EmptyState>
      )}

      <FAB onClick={() => navigate('/knowledge/new')}>
        <HiOutlinePlus />
      </FAB>
    </Container>
  );
};

export default KnowledgeListPage;
