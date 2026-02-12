import React from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const sizeStyles = {
  sm: css`
    padding: 6px 14px;
    font-size: var(--font-size-sm);
    border-radius: var(--radius-sm);
    min-height: 36px;
    gap: 6px;
  `,
  md: css`
    padding: 10px 20px;
    font-size: var(--font-size-base);
    border-radius: var(--radius-md);
    min-height: 44px;
    gap: 8px;
  `,
  lg: css`
    padding: 14px 28px;
    font-size: var(--font-size-lg);
    border-radius: var(--radius-md);
    min-height: 52px;
    gap: 10px;
  `,
  xl: css`
    padding: 18px 36px;
    font-size: var(--font-size-xl);
    border-radius: var(--radius-lg);
    min-height: 60px;
    gap: 12px;
  `
};

const StyledButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  border: none;
  transition: all var(--transition-base);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  letter-spacing: 0.01em;

  ${props => sizeStyles[props.$size || 'md']}

  /* Variant styles */
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return css`
          background: var(--gradient-primary);
          color: var(--color-text-inverse);
          box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.1);

          &:hover:not(:disabled) {
            background: var(--gradient-primary-hover);
            box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.15);
            transform: translateY(-1px);
          }
          &:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: var(--shadow-xs);
          }
        `;
      case 'secondary':
        return css`
          background: var(--color-surface);
          color: var(--color-primary);
          border: 1.5px solid var(--color-border);

          &:hover:not(:disabled) {
            background: var(--color-primary-50);
            border-color: var(--color-primary-600);
            box-shadow: var(--shadow-sm);
            transform: translateY(-1px);
          }
          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: var(--color-text-secondary);

          &:hover:not(:disabled) {
            background: var(--color-surface-alt);
            color: var(--color-text-primary);
          }
        `;
      case 'danger':
        return css`
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: var(--color-text-inverse);
          box-shadow: var(--shadow-sm);

          &:hover:not(:disabled) {
            box-shadow: var(--shadow-md);
            transform: translateY(-1px);
          }
          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `;
      case 'accent':
        return css`
          background: var(--gradient-accent);
          color: white;
          box-shadow: var(--shadow-sm);

          &:hover:not(:disabled) {
            box-shadow: var(--shadow-md);
            transform: translateY(-1px);
          }
          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `;
      case 'outline':
        return css`
          background: transparent;
          color: var(--color-primary);
          border: 1.5px solid var(--color-primary);

          &:hover:not(:disabled) {
            background: var(--color-primary-50);
            box-shadow: var(--shadow-sm);
          }
        `;
      default:
        return css`
          background: var(--gradient-primary);
          color: var(--color-text-inverse);
          box-shadow: var(--shadow-sm);
          &:hover:not(:disabled) {
            box-shadow: var(--shadow-md);
            transform: translateY(-1px);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  ${props => props.$fullWidth && css`
    width: 100%;
  `}
`;

const Spinner = styled.span`
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  flex-shrink: 0;
`;

const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 1.15em;
`;

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  ...props
}) => {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {!loading && icon && <IconWrapper>{icon}</IconWrapper>}
      {children}
      {!loading && iconRight && <IconWrapper>{iconRight}</IconWrapper>}
    </StyledButton>
  );
};

export default Button;
