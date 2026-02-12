import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { knowledgeAPI } from '../services/api';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import toast from 'react-hot-toast';
import RiskBadge from '../components/RiskBadge';
import {
  HiOutlineSearch, HiOutlineMicrophone, HiOutlineLightBulb,
  HiOutlineSparkles, HiOutlineTag, HiOutlineChevronDown
} from 'react-icons/hi';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease-out;
`;

const HeroSection = styled.div`
  text-align: center;
  margin-bottom: var(--space-8);
`;

const Title = styled.h1`
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  letter-spacing: -0.03em;

  @media (max-width: 768px) {
    font-size: var(--font-size-2xl);
  }
`;

const Subtitle = styled.p`
  font-size: var(--font-size-base);
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
`;

const SearchForm = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const SearchInputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  font-size: 1.25rem;
  pointer-events: none;
  display: flex;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: var(--space-4) var(--space-5) var(--space-4) 52px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  background: var(--color-surface);
  height: 56px;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus), var(--shadow-md);
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const VoiceButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: ${props => props.$recording ? 'var(--color-error)' : 'var(--color-surface)'};
  border: 1.5px solid ${props => props.$recording ? 'var(--color-error)' : 'var(--color-border)'};
  color: ${props => props.$recording ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)'};
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  font-size: 1.25rem;

  ${props => props.$recording && `
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
  `}

  &:hover {
    border-color: ${props => props.$recording ? 'var(--color-error)' : 'var(--color-primary-600, #2563eb)'};
    color: ${props => props.$recording ? 'var(--color-text-inverse)' : 'var(--color-primary-600, #2563eb)'};
    background: ${props => props.$recording ? 'var(--color-error)' : 'var(--color-primary-50)'};
  }
`;

const SearchButton = styled.button`
  padding: var(--space-4) var(--space-8);
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-full);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
  height: 56px;
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

const SuggestionChips = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
  justify-content: center;
`;

const SuggestionChip = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 6px var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }
`;

const FiltersRow = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);

  @media (max-width: 640px) {
    gap: var(--space-1-5, 6px);
    margin-bottom: var(--space-4);
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

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
`;

const ResultsCount = styled.span`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
`;

const ResultsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: ${fadeInUp} 0.3s ease-out;
`;

const ResultCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 3px;
    background: var(--gradient-primary);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  &:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary-lighter);
    transform: translateY(-1px);
    &::before { opacity: 1; }
  }
`;

const ResultCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
`;

const ResultCardTitle = styled.h3`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
  flex: 1;
  letter-spacing: -0.01em;
`;

const ScoreBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  background: ${props => {
    const s = props.$score || 0;
    if (s >= 0.8) return 'var(--color-success-light)';
    if (s >= 0.5) return 'var(--color-info-light)';
    return 'var(--color-surface-alt)';
  }};
  color: ${props => {
    const s = props.$score || 0;
    if (s >= 0.8) return 'var(--color-success-dark)';
    if (s >= 0.5) return 'var(--color-info-dark)';
    return 'var(--color-text-tertiary)';
  }};
`;

const ResultCardContent = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: var(--space-3);
`;

const ResultCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
  background-color: ${props => props.$bg || 'var(--color-surface-alt)'};
  color: ${props => props.$color || 'var(--color-text-secondary)'};
`;

const LoadMoreWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: var(--space-6) 0;
`;

const LoadMoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-8);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
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

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-16) var(--space-6);
`;

const EmptyIconWrap = styled.div`
  width: 80px;
  height: 80px;
  border-radius: var(--radius-xl);
  background: var(--color-primary-50);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-light);
  font-size: 2rem;
  margin: 0 auto var(--space-5);
`;

const EmptyTitle = styled.p`
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-medium);
`;

const EmptyHint = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-12);
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

const LoadingText = styled.span`
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
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
  { value: '', label: 'リスク: すべて' },
  { value: 'critical', label: '重大' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const categoryLabels = {
  procedure: '手順',
  safety: '安全',
  quality: '品質',
  cost: 'コスト',
  equipment: '設備',
  material: '資材',
};

const suggestions = [
  '杭打ち工事の注意点',
  '鉄骨工事 安全対策',
  'コンクリート養生 品質管理',
  '足場の点検項目',
  '地下水対策',
];

const LIMIT = 10;

const KnowledgeSearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const recognitionRef = useRef(null);

  const searchMutation = useMutation({
    mutationFn: async (params) => {
      if (params.query?.trim()) {
        // テキスト検索: POST /api/knowledge/search
        return knowledgeAPI.search(params.query, {
          category: params.category || undefined,
          risk_level: params.riskLevel || undefined,
        });
      } else {
        // フィルターのみ: GET /api/knowledge
        return knowledgeAPI.getAll({
          category: params.category || undefined,
          risk_level: params.riskLevel || undefined,
          page: Math.floor((params.offset || 0) / LIMIT) + 1,
          limit: LIMIT,
        });
      }
    },
    onSuccess: (data, variables) => {
      const items = data?.items || data?.results || data || [];
      if (variables.offset > 0) {
        setResults(prev => [...prev, ...items]);
      } else {
        setResults(items);
      }
      setHasMore(items.length >= LIMIT);
      setHasSearched(true);
    },
    onError: () => {
      toast.error('検索に失敗しました');
    },
  });

  const handleSearch = (searchQuery, overrides = {}) => {
    const q = searchQuery ?? query;
    const cat = overrides.category ?? category;
    const risk = overrides.riskLevel ?? riskLevel;
    setOffset(0);
    searchMutation.mutate({ query: q, category: cat, riskLevel: risk, offset: 0 });
  };

  const handleLoadMore = () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    searchMutation.mutate({ query, category, riskLevel, offset: newOffset });
  };

  const handleSuggestion = (text) => {
    setQuery(text);
    handleSearch(text);
  };

  const toggleVoiceSearch = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('お使いのブラウザは音声入力に対応していません');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';

      recognition.onresult = (event) => {
        let transcript = '';
        let isFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }
        setQuery(transcript);
        if (isFinal) {
          setIsRecording(false);
          setTimeout(() => handleSearch(transcript), 300);
        }
      };

      recognition.onerror = (event) => {
        setIsRecording(false);
        if (event.error === 'no-speech') {
          toast.error('音声が検出されませんでした');
        } else if (event.error !== 'aborted') {
          toast.error('音声認識エラーが発生しました');
        }
      };

      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('音声入力を開始できませんでした');
      setIsRecording(false);
    }
  };

  return (
    <Container>
      <HeroSection>
        <Title>ナレッジ検索</Title>
        <Subtitle>
          <HiOutlineSparkles />
          AIが自然言語でナレッジを検索します
        </Subtitle>
      </HeroSection>

      <SearchForm>
        <SearchInputWrapper>
          <SearchIcon><HiOutlineSearch /></SearchIcon>
          <SearchInput
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="例: 杭打ち工事で地下水が出た場合の対処法"
          />
        </SearchInputWrapper>
        <VoiceButton $recording={isRecording} onClick={toggleVoiceSearch}>
          <HiOutlineMicrophone />
        </VoiceButton>
        <SearchButton
          onClick={() => handleSearch()}
          disabled={!query.trim() || searchMutation.isPending}
        >
          {searchMutation.isPending ? '検索中...' : '検索'}
        </SearchButton>
      </SearchForm>

      {!hasSearched && (
        <SuggestionChips>
          {suggestions.map(s => (
            <SuggestionChip key={s} onClick={() => handleSuggestion(s)}>
              <HiOutlineLightBulb />
              {s}
            </SuggestionChip>
          ))}
        </SuggestionChips>
      )}

      <FiltersRow>
        {categories.map(cat => (
          <FilterChip
            key={cat.value}
            $active={category === cat.value}
            onClick={() => {
              setCategory(cat.value);
              handleSearch(undefined, { category: cat.value });
            }}
          >
            {cat.label}
          </FilterChip>
        ))}
        {riskLevels.map(rl => (
          <FilterChip
            key={rl.value}
            $active={riskLevel === rl.value}
            onClick={() => {
              setRiskLevel(rl.value);
              handleSearch(undefined, { riskLevel: rl.value });
            }}
          >
            {rl.label}
          </FilterChip>
        ))}
      </FiltersRow>

      {searchMutation.isPending && results.length === 0 ? (
        <LoadingState>
          <Spinner />
          <LoadingText>ナレッジを検索中...</LoadingText>
        </LoadingState>
      ) : hasSearched && results.length === 0 && !searchMutation.isPending ? (
        <EmptyState>
          <EmptyIconWrap>
            <HiOutlineSearch />
          </EmptyIconWrap>
          <EmptyTitle>検索結果が見つかりませんでした</EmptyTitle>
          <EmptyHint>異なるキーワードや表現で再度検索してみてください</EmptyHint>
        </EmptyState>
      ) : results.length > 0 ? (
        <>
          <ResultsHeader>
            <ResultsCount>{results.length}件の結果</ResultsCount>
          </ResultsHeader>
          <ResultsGrid>
            {results.map((item, idx) => (
              <ResultCard key={item.id || idx} onClick={() => navigate(`/knowledge/${item.id}`)}>
                <ResultCardHeader>
                  <ResultCardTitle>{item.title}</ResultCardTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.score != null && (
                      <ScoreBadge $score={item.score}>
                        {Math.round((item.score || 0) * 100)}%
                      </ScoreBadge>
                    )}
                    <RiskBadge level={item.risk_level} />
                  </div>
                </ResultCardHeader>
                {(item.summary || item.content) && (
                  <ResultCardContent>
                    {item.summary || item.content}
                  </ResultCardContent>
                )}
                <ResultCardMeta>
                  {item.category && (
                    <MetaBadge $bg="var(--color-primary-50)" $color="var(--color-primary-600, #2563eb)">
                      <HiOutlineTag style={{ fontSize: '0.75rem' }} />
                      {categoryLabels[item.category] || item.category}
                    </MetaBadge>
                  )}
                  {item.work_type && (
                    <MetaBadge>{item.work_type}</MetaBadge>
                  )}
                </ResultCardMeta>
              </ResultCard>
            ))}
          </ResultsGrid>
          {hasMore && (
            <LoadMoreWrapper>
              <LoadMoreButton
                onClick={handleLoadMore}
                disabled={searchMutation.isPending}
              >
                <HiOutlineChevronDown />
                {searchMutation.isPending ? '読み込み中...' : 'もっと見る'}
              </LoadMoreButton>
            </LoadMoreWrapper>
          )}
        </>
      ) : (
        <EmptyState>
          <EmptyIconWrap>
            <HiOutlineSearch />
          </EmptyIconWrap>
          <EmptyTitle>キーワードを入力して検索してください</EmptyTitle>
          <EmptyHint>AIがナレッジベースから最適な結果を検索します</EmptyHint>
        </EmptyState>
      )}
    </Container>
  );
};

export default KnowledgeSearchPage;
