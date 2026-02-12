import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sitesAPI } from '../services/api';
import styled from '@emotion/styled';
import SearchBar from '../components/SearchBar';
import {
  HiOutlinePlus,
  HiOutlineOfficeBuilding,
  HiOutlineLocationMarker,
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi';

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

const SiteCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => {
      switch (props.$status) {
        case 'active': return '#16a34a';
        case 'completed': return '#2563eb';
        case 'suspended': return '#d97706';
        default: return '#94a3b8';
      }
    }};
  }

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
`;

const CardTitle = styled.h3`
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  line-height: var(--line-height-tight);
`;

const CardDescription = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: var(--space-3);
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 3px var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  background: ${props => {
    switch (props.$status) {
      case 'active': return '#f0fdf4';
      case 'completed': return '#eff6ff';
      case 'suspended': return '#fffbeb';
      default: return '#f1f5f9';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'active': return '#16a34a';
      case 'completed': return '#2563eb';
      case 'suspended': return '#d97706';
      default: return '#64748b';
    }
  }};
`;

const MetaText = styled.span`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: var(--space-1);
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

const statusFilters = [
  { value: '', label: 'すべて' },
  { value: 'active', label: '稼働中' },
  { value: 'completed', label: '完了' },
  { value: 'suspended', label: '中断' },
];

const statusLabels = {
  active: '稼働中',
  completed: '完了',
  suspended: '中断',
};

const ITEMS_PER_PAGE = 12;

const SiteListPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => sitesAPI.getAll(),
    staleTime: 30000,
  });

  const allSites = data?.sites || data || [];

  const filteredSites = useMemo(() => {
    let result = Array.isArray(allSites) ? allSites : [];

    // Status filter
    if (statusFilter) {
      result = result.filter(site => site.status === statusFilter);
    }

    // Search filter (name and location)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(site =>
        (site.name && site.name.toLowerCase().includes(query)) ||
        (site.location && site.location.toLowerCase().includes(query))
      );
    }

    return result;
  }, [allSites, statusFilter, searchQuery]);

  const total = filteredSites.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const pagedSites = filteredSites.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setPage(1);
  };

  return (
    <Container>
      <Header>
        <Title>現場管理</Title>
        <CreateButton onClick={() => navigate('/sites/new')}>
          <HiOutlinePlus />
          現場登録
        </CreateButton>
      </Header>

      <SearchSection>
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="現場名・場所で検索..."
        />
        <FiltersRow>
          <FilterLabel>ステータス</FilterLabel>
          {statusFilters.map(s => (
            <FilterChip
              key={s.value}
              $active={statusFilter === s.value}
              onClick={() => handleStatusChange(s.value)}
            >
              {s.label}
            </FilterChip>
          ))}
        </FiltersRow>
      </SearchSection>

      {isLoading ? (
        <LoadingGrid>
          {[1, 2, 3, 4, 5, 6].map(i => <LoadingSkeleton key={i} />)}
        </LoadingGrid>
      ) : pagedSites.length > 0 ? (
        <>
          <ResultCount>{total}件の現場</ResultCount>
          <Grid>
            {pagedSites.map(site => (
              <SiteCard
                key={site.id}
                $status={site.status}
                onClick={() => navigate(`/sites/${site.id}`)}
              >
                <CardTitle>{site.name}</CardTitle>
                {site.description && (
                  <CardDescription>{site.description}</CardDescription>
                )}
                <CardMeta>
                  <StatusBadge $status={site.status}>
                    {statusLabels[site.status] || site.status}
                  </StatusBadge>
                  {site.location && (
                    <MetaText>
                      <HiOutlineLocationMarker />
                      {site.location}
                    </MetaText>
                  )}
                  {site.start_date && (
                    <MetaText>
                      <HiOutlineCalendar />
                      {new Date(site.start_date).toLocaleDateString('ja-JP')}
                    </MetaText>
                  )}
                </CardMeta>
              </SiteCard>
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
            <HiOutlineOfficeBuilding />
          </EmptyIconWrap>
          <EmptyText>現場が見つかりませんでした</EmptyText>
          <EmptyHint>検索条件を変更するか、新しい現場を登録してください</EmptyHint>
        </EmptyState>
      )}

      <FAB onClick={() => navigate('/sites/new')}>
        <HiOutlinePlus />
      </FAB>
    </Container>
  );
};

export default SiteListPage;
