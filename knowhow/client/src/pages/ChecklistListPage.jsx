import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { checklistAPI } from '../services/api';
import styled from '@emotion/styled';
import { HiOutlinePlus, HiOutlineClipboardList, HiOutlineUser, HiOutlineCollection } from 'react-icons/hi';

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

const ChecklistCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  cursor: pointer;
  transition: all var(--transition-base);

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

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 3px var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
  background-color: var(--color-surface-alt);
  color: var(--color-text-secondary);
`;

const ItemCountBadge = styled(MetaBadge)`
  background: var(--color-primary-50);
  color: var(--color-primary-600, #2563eb);
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
  height: 140px;
  animation: shimmer 1.5s infinite;
  background: linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-alt) 50%, var(--color-surface) 75%);
  background-size: 200% 100%;
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

const ChecklistListPage = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => checklistAPI.getAll(),
    staleTime: 30000,
  });

  const checklists = Array.isArray(data) ? data : (data?.items || []);

  return (
    <Container>
      <Header>
        <Title>チェックリスト一覧</Title>
        <CreateButton onClick={() => navigate('/checklists/new')}>
          <HiOutlinePlus />
          新規作成
        </CreateButton>
      </Header>

      {isLoading ? (
        <LoadingGrid>
          {[1,2,3,4,5,6].map(i => <LoadingSkeleton key={i} />)}
        </LoadingGrid>
      ) : checklists.length > 0 ? (
        <>
          <ResultCount>{checklists.length}件のチェックリスト</ResultCount>
          <Grid>
            {checklists.map(item => (
              <ChecklistCard
                key={item.id}
                onClick={() => navigate(`/checklists/${item.id}`)}
              >
                <CardTitle>{item.name}</CardTitle>
                {item.description && (
                  <CardDescription>{item.description}</CardDescription>
                )}
                <CardMeta>
                  <ItemCountBadge>
                    <HiOutlineCollection />
                    {item.item_count || 0}項目
                  </ItemCountBadge>
                  {item.work_type && (
                    <MetaBadge>{item.work_type}</MetaBadge>
                  )}
                  {item.created_by_name && (
                    <MetaBadge>
                      <HiOutlineUser />
                      {item.created_by_name}
                    </MetaBadge>
                  )}
                </CardMeta>
              </ChecklistCard>
            ))}
          </Grid>
        </>
      ) : (
        <EmptyState>
          <EmptyIconWrap>
            <HiOutlineClipboardList />
          </EmptyIconWrap>
          <EmptyText>チェックリストがありません</EmptyText>
          <EmptyHint>新しいチェックリストを作成してください</EmptyHint>
        </EmptyState>
      )}

      <FAB onClick={() => navigate('/checklists/new')}>
        <HiOutlinePlus />
      </FAB>
    </Container>
  );
};

export default ChecklistListPage;
