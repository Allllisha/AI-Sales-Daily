import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const SkeletonBase = styled.div`
  background: linear-gradient(
    90deg,
    var(--color-surface-alt) 25%,
    var(--color-border-light) 50%,
    var(--color-surface-alt) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: ${props => props.$radius || 'var(--radius-md)'};
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
`;

const SkeletonCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const SkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const LoadingSkeleton = ({ variant = 'line', count = 1, ...props }) => {
  if (variant === 'card') {
    return Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i}>
        <SkeletonRow>
          <SkeletonBase $width="70%" $height="22px" />
          <SkeletonBase $width="60px" $height="24px" $radius="var(--radius-full)" />
        </SkeletonRow>
        <SkeletonBase $height="16px" $width="100%" />
        <SkeletonBase $height="16px" $width="80%" />
        <SkeletonRow>
          <SkeletonBase $width="80px" $height="24px" $radius="var(--radius-full)" />
          <SkeletonBase $width="80px" $height="24px" $radius="var(--radius-full)" />
        </SkeletonRow>
      </SkeletonCard>
    ));
  }

  if (variant === 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonBase key={i} $height="16px" $width={i === count - 1 ? '60%' : '100%'} />
        ))}
      </div>
    );
  }

  if (variant === 'avatar') {
    return <SkeletonBase $width={props.size || '40px'} $height={props.size || '40px'} $radius="var(--radius-full)" />;
  }

  return Array.from({ length: count }).map((_, i) => (
    <SkeletonBase key={i} {...props} />
  ));
};

export default LoadingSkeleton;
