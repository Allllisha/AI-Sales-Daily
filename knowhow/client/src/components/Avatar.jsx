import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

const sizeMap = {
  sm: { size: '32px', font: '0.75rem' },
  md: { size: '40px', font: '0.875rem' },
  lg: { size: '48px', font: '1rem' },
  xl: { size: '64px', font: '1.25rem' },
  '2xl': { size: '80px', font: '1.5rem' }
};

const StyledAvatar = styled.div`
  width: ${props => sizeMap[props.$size]?.size || '40px'};
  height: ${props => sizeMap[props.$size]?.size || '40px'};
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: ${props => sizeMap[props.$size]?.font || '0.875rem'};
  color: var(--color-text-inverse);
  background: var(--gradient-primary);
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  user-select: none;

  ${props => props.$bordered && css`
    border: 2px solid var(--color-surface);
    box-shadow: var(--shadow-sm);
  `}
`;

const Avatar = ({ name, size = 'md', bordered = false, ...props }) => {
  const initials = name
    ? name.split(/[\s]+/).map(s => s[0]).slice(0, 2).join('')
    : '?';

  return (
    <StyledAvatar $size={size} $bordered={bordered} title={name} {...props}>
      {initials}
    </StyledAvatar>
  );
};

export default Avatar;
