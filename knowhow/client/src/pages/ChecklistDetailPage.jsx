import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { checklistAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineCalendar,
  HiOutlineUser, HiOutlineCollection, HiOutlineTag,
  HiOutlineClipboardCheck, HiOutlineClock
} from 'react-icons/hi';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease-out;
`;

const BackRow = styled.div`
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

const BreadcrumbText = styled.span`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
`;

const Card = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gradient-primary);
  }

  @media (max-width: 768px) {
    padding: var(--space-5);
  }
`;

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
`;

const Title = styled.h1`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
  letter-spacing: -0.02em;
  flex: 1;

  @media (max-width: 640px) {
    font-size: var(--font-size-xl);
  }
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px var(--space-3);
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

const Description = styled.p`
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--space-6);
`;

const SectionTitle = styled.h2`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  letter-spacing: -0.02em;
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const CheckItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: ${props => props.$checked ? 'var(--color-success-light, #f0fdf4)' : 'var(--color-surface-alt)'};
  border: 1px solid ${props => props.$checked ? 'var(--color-success, #22c55e)' : 'var(--color-border)'};
  border-radius: var(--radius-md);
  cursor: ${props => props.$executing ? 'pointer' : 'default'};
  transition: all var(--transition-fast);

  ${props => props.$executing && !props.$checked && `
    &:hover {
      border-color: var(--color-primary-600, #2563eb);
      background: var(--color-primary-50);
    }
  `}
`;

const CheckBox = styled.div`
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 2px solid ${props => props.$checked ? 'var(--color-success, #22c55e)' : 'var(--color-border)'};
  background: ${props => props.$checked ? 'var(--color-success, #22c55e)' : 'var(--color-surface)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  color: white;
  font-size: 0.85rem;
`;

const ItemContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

const OrderNumber = styled.span`
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  min-width: 20px;
`;

const ItemText = styled.span`
  font-size: var(--font-size-sm);
  color: ${props => props.$checked ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)'};
  text-decoration: ${props => props.$checked ? 'line-through' : 'none'};
  font-weight: var(--font-weight-medium);
`;

const RequiredBadge = styled.span`
  display: inline-block;
  padding: 2px var(--space-2);
  font-size: 0.65rem;
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  background: #fef2f2;
  color: #dc2626;
  white-space: nowrap;
`;

const ActionRow = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
`;

const ExecuteButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
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

const CompleteButton = styled(ExecuteButton)`
  background: var(--color-success, #22c55e);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);

  &:hover:not(:disabled) {
    background: #16a34a;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  }
`;

const ProgressBar = styled.div`
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 8px;
  background: var(--color-surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => props.$percent === 100 ? 'var(--color-success, #22c55e)' : 'var(--gradient-primary)'};
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
  width: ${props => props.$percent}%;
`;

const ProgressText = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
  text-align: right;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--space-16);
  gap: var(--space-4);
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary-600, #2563eb);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
`;

const LoadingText = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
`;

const ErrorState = styled.div`
  text-align: center;
  padding: var(--space-12);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
`;

const HistorySection = styled.div`
  margin-top: var(--space-8);
`;

const HistorySectionTitle = styled.h2`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const HistoryEmpty = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-8) 0;
`;

const HistoryCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  margin-bottom: var(--space-3);
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-sm);
  }
`;

const HistoryCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
  gap: var(--space-2);
`;

const HistoryUser = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
`;

const HistoryDate = styled.span`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
`;

const HistoryResult = styled.span`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
`;

const HistoryProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  background: var(--color-surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-top: var(--space-2);
`;

const HistoryProgressFill = styled.div`
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
  width: ${props => props.$percent}%;
  background: ${props =>
    props.$percent === 100
      ? 'var(--color-success, #22c55e)'
      : props.$percent >= 70
        ? '#eab308'
        : 'var(--color-primary-600, #2563eb)'
  };
`;

const ChecklistDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [executing, setExecuting] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: checklist, isLoading, isError } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => checklistAPI.getById(id),
  });

  const { data: executions = [], refetch: refetchExecutions } = useQuery({
    queryKey: ['checklist-executions', id],
    queryFn: () => checklistAPI.getExecutions(id),
    enabled: !!id,
  });

  const items = checklist?.items || [];
  const sortedItems = [...items].sort((a, b) => (a.order_number || 0) - (b.order_number || 0));
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
  const requiredItems = items.filter(item => item.is_required);
  const allRequiredChecked = requiredItems.every(item => checkedItems[item.id]);
  const canComplete = items.length > 0 && allRequiredChecked && checkedCount > 0;

  const handleToggleItem = (itemId) => {
    if (!executing) return;
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleStartExecution = () => {
    setExecuting(true);
    setCheckedItems({});
    toast.success('チェックを開始しました。各項目を確認してください');
  };

  const handleCompleteExecution = async () => {
    setIsSubmitting(true);
    try {
      const checkedItemsData = items.map(item => ({
        item_id: item.id,
        checked: checkedItems[item.id] || false,
        note: null,
      }));
      await checklistAPI.execute(id, { checked_items: checkedItemsData });
      toast.success('チェックリストを完了しました');
      setExecuting(false);
      setCheckedItems({});
      refetchExecutions();
    } catch (error) {
      toast.error('完了処理に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <Spinner />
          <LoadingText>読み込み中...</LoadingText>
        </LoadingState>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container>
        <BackRow>
          <BackButton onClick={() => navigate('/checklists')}>
            <HiOutlineArrowLeft />
          </BackButton>
          <BreadcrumbText>チェックリスト一覧へ戻る</BreadcrumbText>
        </BackRow>
        <ErrorState>データの読み込みに失敗しました。もう一度お試しください。</ErrorState>
      </Container>
    );
  }

  if (!checklist) {
    return (
      <Container>
        <BackRow>
          <BackButton onClick={() => navigate('/checklists')}>
            <HiOutlineArrowLeft />
          </BackButton>
          <BreadcrumbText>チェックリストが見つかりませんでした</BreadcrumbText>
        </BackRow>
      </Container>
    );
  }

  return (
    <Container>
      <BackRow>
        <BackButton onClick={() => navigate('/checklists')}>
          <HiOutlineArrowLeft />
        </BackButton>
        <BreadcrumbText>チェックリスト詳細</BreadcrumbText>
      </BackRow>

      <Card>
        <TitleRow>
          <Title>{checklist.name}</Title>
        </TitleRow>

        <Meta>
          <ItemCountBadge>
            <HiOutlineCollection />
            {items.length}項目
          </ItemCountBadge>
          {checklist.category && (
            <MetaBadge>
              <HiOutlineTag />
              {checklist.category}
            </MetaBadge>
          )}
          {checklist.work_type && (
            <MetaBadge>{checklist.work_type}</MetaBadge>
          )}
          {checklist.created_by_name && (
            <MetaBadge>
              <HiOutlineUser />
              {checklist.created_by_name}
            </MetaBadge>
          )}
          {checklist.created_at && (
            <MetaBadge>
              <HiOutlineCalendar />
              {new Date(checklist.created_at).toLocaleDateString('ja-JP')}
            </MetaBadge>
          )}
        </Meta>

        {checklist.description && (
          <Description>{checklist.description}</Description>
        )}

        {executing && (
          <ProgressBar>
            <ProgressTrack>
              <ProgressFill $percent={progress} />
            </ProgressTrack>
            <ProgressText>{checkedCount} / {items.length} ({progress}%)</ProgressText>
          </ProgressBar>
        )}

        <SectionTitle>チェック項目</SectionTitle>

        <ItemList>
          {sortedItems.map(item => (
            <CheckItem
              key={item.id}
              $checked={!!checkedItems[item.id]}
              $executing={executing}
              onClick={() => handleToggleItem(item.id)}
            >
              <CheckBox $checked={!!checkedItems[item.id]}>
                {checkedItems[item.id] && <HiOutlineCheckCircle />}
              </CheckBox>
              <ItemContent>
                <OrderNumber>{item.order_number}.</OrderNumber>
                <ItemText $checked={!!checkedItems[item.id]}>
                  {item.content}
                </ItemText>
                {item.is_required && (
                  <RequiredBadge>必須</RequiredBadge>
                )}
              </ItemContent>
            </CheckItem>
          ))}
        </ItemList>

        {!executing && (
          <ActionRow>
            <ExecuteButton onClick={handleStartExecution}>
              <HiOutlineClipboardCheck />
              チェック開始
            </ExecuteButton>
          </ActionRow>
        )}

        {executing && (
          <ActionRow>
            <CompleteButton
              onClick={handleCompleteExecution}
              disabled={!canComplete || isSubmitting}
            >
              <HiOutlineCheckCircle />
              {isSubmitting ? '記録中...' : '実行完了'}
            </CompleteButton>
          </ActionRow>
        )}
      </Card>

      <HistorySection>
        <HistorySectionTitle>
          <HiOutlineClock />
          実行履歴
        </HistorySectionTitle>

        {executions.length === 0 ? (
          <HistoryEmpty>まだ実行履歴がありません</HistoryEmpty>
        ) : (
          executions.map(exec => {
            const percent = exec.total_items > 0
              ? Math.round((exec.checked_items / exec.total_items) * 100)
              : 0;
            return (
              <HistoryCard key={exec.id}>
                <HistoryCardHeader>
                  <HistoryUser>
                    <HiOutlineUser />
                    {exec.executed_by_name || '不明'}
                  </HistoryUser>
                  <HistoryDate>
                    {exec.completed_at
                      ? `${new Date(exec.completed_at).toLocaleDateString('ja-JP')} ${new Date(exec.completed_at).toLocaleTimeString('ja-JP')}`
                      : ''}
                  </HistoryDate>
                </HistoryCardHeader>
                <HistoryResult>
                  {exec.checked_items} / {exec.total_items} 件完了
                </HistoryResult>
                <HistoryProgressTrack>
                  <HistoryProgressFill $percent={percent} />
                </HistoryProgressTrack>
              </HistoryCard>
            );
          })
        )}
      </HistorySection>
    </Container>
  );
};

export default ChecklistDetailPage;
