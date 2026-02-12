import React, { useState } from 'react';
import styled from '@emotion/styled';

const SuggestionsContainer = styled.div`
  margin-bottom: var(--space-4);
  padding: var(--space-4);
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);

  @media (max-width: 480px) {
    padding: var(--space-3);
    margin-bottom: var(--space-3);
  }
`;

const SuggestionsTitle = styled.div`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: var(--space-2);

  @media (max-width: 480px) {
    font-size: var(--font-size-micro);
    margin-bottom: var(--space-2);
  }
`;

const SuggestionsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const SuggestionButton = styled.button`
  padding: var(--space-3) var(--space-4);
  background: ${props => props.selected ? 'var(--color-accent-light)' : 'var(--color-surface)'};
  border: 3px solid ${props => props.selected ? 'var(--color-accent)' : 'var(--color-border)'};
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  font-weight: ${props => props.selected ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)'};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-align: left;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: var(--line-height-standard);
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  box-shadow: ${props => props.selected ? '0 4px 12px rgba(255, 152, 0, 0.2)' : 'none'};

  &:hover {
    background: ${props => props.selected ? 'var(--color-accent-light)' : 'var(--color-primary-light)'};
    border-color: ${props => props.selected ? 'var(--color-accent)' : 'var(--color-primary)'};
    transform: translateX(2px);
    box-shadow: ${props => props.selected ? '0 4px 12px rgba(255, 152, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  }

  &:active {
    transform: scale(0.99);
  }

  &::before {
    content: attr(data-index);
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-bold);
    color: ${props => props.selected ? 'white' : 'var(--color-primary)'};
    width: 32px;
    height: 32px;
    background: ${props => props.selected ? 'var(--color-accent)' : 'var(--color-primary-light)'};
    border: 2px solid ${props => props.selected ? 'var(--color-accent)' : 'var(--color-primary)'};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  span {
    padding-left: calc(var(--space-3) + 32px + var(--space-3));
    padding-right: var(--space-3);
    display: block;
    font-size: var(--font-size-base);
    flex: 1;
  }

  &::after {
    content: ${props => props.selected ? '"✓"' : '""'};
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    font-size: var(--font-size-large);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
  }

  @media (max-width: 480px) {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-micro);
    min-height: 44px;

    &::before {
      width: 20px;
      height: 20px;
      font-size: 11px;
      left: var(--space-2);
    }

    span {
      padding-left: var(--space-7);
    }
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  padding: var(--space-4);

  @media (max-width: 480px) {
    font-size: var(--font-size-micro);
    padding: var(--space-3);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-md);
  color: white;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  margin-top: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);

  &:hover {
    background: var(--color-primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-small);
  }
`;

const SelectionInfo = styled.div`
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  margin-top: var(--space-2);
  text-align: center;
  font-style: italic;

  @media (max-width: 480px) {
    font-size: var(--font-size-micro);
  }
`;

const AnswerSuggestions = ({ suggestions, onSelect, isLoading, allowMultiple = true, initialSelected = [] }) => {
  const [selectedItems, setSelectedItems] = useState(initialSelected);
  if (isLoading) {
    return (
      <SuggestionsContainer>
        <LoadingMessage>回答候補を生成中...</LoadingMessage>
      </SuggestionsContainer>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const handleItemClick = (suggestion) => {
    if (allowMultiple) {
      setSelectedItems(prev => {
        const isSelected = prev.includes(suggestion);
        if (isSelected) {
          return prev.filter(item => item !== suggestion);
        } else {
          return [...prev, suggestion];
        }
      });
    } else {
      // 単一選択の場合は選択状態を表示してから送信
      setSelectedItems([suggestion]);
      setTimeout(() => {
        onSelect(suggestion);
        setSelectedItems([]);
      }, 200);
    }
  };

  const handleSubmit = () => {
    if (selectedItems.length > 0) {
      const combinedAnswer = selectedItems.map((item) => {
        // 各項目が句点で終わっているか確認し、なければ追加
        const trimmedItem = item.trim();
        if (!trimmedItem.endsWith('。')) {
          return trimmedItem + '。';
        }
        return trimmedItem;
      }).join('');
      onSelect(combinedAnswer);
      setSelectedItems([]);
    }
  };

  return (
    <SuggestionsContainer>
      <SuggestionsTitle>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        {allowMultiple ? '回答を選択してください（複数選択可）' : '回答を選択してください'}
      </SuggestionsTitle>
      <SuggestionsGrid>
        {suggestions.map((suggestion, index) => (
          <SuggestionButton
            key={index}
            data-index={index + 1}
            selected={selectedItems.includes(suggestion)}
            onClick={() => handleItemClick(suggestion)}
            aria-selected={selectedItems.includes(suggestion)}
          >
            <span>{suggestion}</span>
          </SuggestionButton>
        ))}
      </SuggestionsGrid>
      {allowMultiple && (
        <>
          {selectedItems.length > 0 && (
            <SelectionInfo>
              {selectedItems.length}件選択中: {selectedItems.join('、')}
            </SelectionInfo>
          )}
          <SubmitButton 
            onClick={handleSubmit}
            disabled={selectedItems.length === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            選択した項目で回答
          </SubmitButton>
        </>
      )}
    </SuggestionsContainer>
  );
};

export default AnswerSuggestions;