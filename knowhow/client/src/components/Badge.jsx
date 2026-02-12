import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

const variantMap = {
  primary: css`
    background: var(--color-primary-lighter);
    color: var(--color-primary);
    border-color: transparent;
  `,
  success: css`
    background: var(--color-success-light);
    color: var(--color-success-dark);
    border-color: transparent;
  `,
  warning: css`
    background: var(--color-warning-light);
    color: var(--color-warning-dark);
    border-color: transparent;
  `,
  danger: css`
    background: var(--color-error-light);
    color: var(--color-error-dark);
    border-color: transparent;
  `,
  info: css`
    background: var(--color-info-light);
    color: var(--color-info-dark);
    border-color: transparent;
  `,
  neutral: css`
    background: var(--color-surface-alt);
    color: var(--color-text-secondary);
    border-color: var(--color-border);
  `,
  accent: css`
    background: var(--color-accent-light);
    color: var(--color-accent-hover);
    border-color: transparent;
  `
};

const sizeMap = {
  sm: css`
    padding: 2px 8px;
    font-size: 0.7rem;
  `,
  md: css`
    padding: 3px 10px;
    font-size: var(--font-size-xs);
  `,
  lg: css`
    padding: 5px 14px;
    font-size: var(--font-size-sm);
  `
};

const StyledBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  white-space: nowrap;
  border: 1px solid;
  line-height: 1.4;
  letter-spacing: 0.01em;

  ${props => variantMap[props.$variant || 'neutral']}
  ${props => sizeMap[props.$size || 'md']}
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
`;

const Badge = ({ variant = 'neutral', size = 'md', dot = false, icon, children, ...props }) => {
  return (
    <StyledBadge $variant={variant} $size={size} {...props}>
      {dot && <Dot />}
      {icon && <span style={{ display: 'inline-flex', fontSize: '0.9em' }}>{icon}</span>}
      {children}
    </StyledBadge>
  );
};

export default Badge;
