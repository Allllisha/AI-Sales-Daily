import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

const variantStyles = {
  default: css`
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  `,
  elevated: css`
    background: var(--color-surface);
    border: 1px solid transparent;
    box-shadow: var(--shadow-md);
  `,
  glass: css`
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: var(--shadow-glass);
  `,
  outline: css`
    background: transparent;
    border: 1.5px solid var(--color-border);
  `,
  gradient: css`
    background: var(--gradient-primary);
    border: none;
    color: var(--color-text-inverse);

    h1, h2, h3, h4, h5, h6, p, span {
      color: var(--color-text-inverse);
    }
    p, span {
      opacity: 0.85;
    }
  `
};

const StyledCard = styled.div`
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all var(--transition-base);
  animation: fadeInUp 0.4s ease-out both;

  ${props => variantStyles[props.$variant || 'default']}

  ${props => props.$hoverable && css`
    cursor: pointer;
    &:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-lg);
      border-color: var(--color-primary-lighter);
    }
    &:active {
      transform: translateY(-1px);
    }
  `}

  ${props => props.$noPadding && css`
    padding: 0;
  `}

  @media (max-width: 640px) {
    padding: var(--space-4);
    border-radius: var(--radius-md);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: ${props => props.$noMargin ? '0' : 'var(--space-4)'};
`;

const CardTitle = styled.h3`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: inherit;
`;

const CardDescription = styled.p`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
`;

const CardContent = styled.div`
  ${props => props.$divided && css`
    border-top: 1px solid var(--color-border-light);
    padding-top: var(--space-4);
    margin-top: var(--space-4);
  `}
`;

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-top: 1px solid var(--color-border-light);
  padding-top: var(--space-4);
  margin-top: var(--space-4);
`;

const Card = ({ variant = 'default', hoverable = false, noPadding = false, children, style, ...props }) => {
  return (
    <StyledCard $variant={variant} $hoverable={hoverable} $noPadding={noPadding} style={style} {...props}>
      {children}
    </StyledCard>
  );
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
