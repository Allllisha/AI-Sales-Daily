import React, { useState } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: ${props => props.$hasIcon ? '12px 16px 12px 44px' : '12px 16px'};
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1.5px solid ${props => props.$error ? 'var(--color-error)' : 'var(--color-border)'};
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  outline: none;

  &:focus {
    border-color: ${props => props.$error ? 'var(--color-error)' : 'var(--color-primary-600, #2563eb)'};
    box-shadow: ${props => props.$error
      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
      : 'var(--shadow-focus)'};
  }

  &:hover:not(:focus):not(:disabled) {
    border-color: ${props => props.$error ? 'var(--color-error)' : 'var(--color-text-tertiary)'};
  }

  &:disabled {
    background: var(--color-surface-alt);
    color: var(--color-text-tertiary);
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }

  ${props => props.$size === 'lg' && css`
    padding: 16px 20px;
    font-size: var(--font-size-lg);
    border-radius: var(--radius-lg);
  `}
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  font-size: var(--font-size-base);
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1.5px solid ${props => props.$error ? 'var(--color-error)' : 'var(--color-border)'};
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  outline: none;
  resize: vertical;
  min-height: 100px;
  line-height: var(--line-height-relaxed);

  &:focus {
    border-color: ${props => props.$error ? 'var(--color-error)' : 'var(--color-primary-600, #2563eb)'};
    box-shadow: ${props => props.$error
      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
      : 'var(--shadow-focus)'};
  }

  &:disabled {
    background: var(--color-surface-alt);
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const Label = styled.label`
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
`;

const ErrorText = styled.span`
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-error);
  margin-top: var(--space-1);
  animation: fadeIn 0.2s ease-out;
`;

const HelpText = styled.span`
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
`;

const IconLeft = styled.span`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  pointer-events: none;
  font-size: 1.1em;
`;

const Input = ({
  label,
  error,
  help,
  icon,
  textarea = false,
  size,
  ...props
}) => {
  const Component = textarea ? StyledTextarea : StyledInput;

  return (
    <div>
      {label && <Label>{label}</Label>}
      <Wrapper>
        {icon && !textarea && <IconLeft>{icon}</IconLeft>}
        <Component $error={!!error} $hasIcon={!!icon} $size={size} {...props} />
      </Wrapper>
      {error && <ErrorText>{error}</ErrorText>}
      {help && !error && <HelpText>{help}</HelpText>}
    </div>
  );
};

export default Input;
