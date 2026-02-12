import React, { useState } from 'react';
import styled from '@emotion/styled';

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 0 var(--space-4);
  transition: all var(--transition-base);
  height: 48px;
  box-shadow: var(--shadow-xs);

  &:focus-within {
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus), var(--shadow-sm);
  }

  &:focus-within .search-icon {
    color: var(--color-primary-600, #2563eb);
  }

  &:hover:not(:focus-within) {
    border-color: var(--color-text-tertiary);
  }
`;

const SearchIcon = styled.div`
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color var(--transition-fast);
`;

const Input = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  padding: var(--space-3) var(--space-3);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  outline: none;

  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const ClearButton = styled.button`
  background: var(--color-surface-alt);
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: ${props => props.$visible ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
  flex-shrink: 0;

  &:hover {
    background: var(--color-border);
    color: var(--color-text-primary);
  }
`;

const SearchBar = ({ value, onChange, onSubmit, placeholder = '検索...' }) => {
  const [localValue, setLocalValue] = useState(value || '');

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  const handleClear = () => {
    setLocalValue('');
    if (onChange) onChange('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit(localValue);
    }
  };

  return (
    <Container>
      <InputWrapper>
        <SearchIcon className="search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </SearchIcon>
        <Input
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <ClearButton $visible={!!localValue} onClick={handleClear} aria-label="クリア">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </ClearButton>
      </InputWrapper>
    </Container>
  );
};

export default SearchBar;
