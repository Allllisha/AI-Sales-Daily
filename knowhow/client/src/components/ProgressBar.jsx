import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const fillAnimation = keyframes`
  from { width: 0; }
`;

const Track = styled.div`
  width: 100%;
  height: ${props => props.$height || '8px'};
  background: var(--color-surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
`;

const Fill = styled.div`
  height: 100%;
  width: ${props => Math.min(100, Math.max(0, props.$value))}%;
  background: ${props => {
    if (props.$color) return props.$color;
    if (props.$value >= 80) return 'var(--gradient-primary)';
    if (props.$value >= 50) return 'var(--gradient-accent)';
    return 'linear-gradient(135deg, var(--color-error) 0%, var(--color-warning) 100%)';
  }};
  border-radius: var(--radius-full);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${fillAnimation} 0.8s ease-out;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Label = styled.span`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
`;

const Value = styled.span`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
`;

const ProgressBar = ({ value = 0, label, showValue = true, height, color }) => {
  return (
    <Wrapper>
      {(label || showValue) && (
        <LabelRow>
          {label && <Label>{label}</Label>}
          {showValue && <Value>{Math.round(value)}%</Value>}
        </LabelRow>
      )}
      <Track $height={height}>
        <Fill $value={value} $color={color} />
      </Track>
    </Wrapper>
  );
};

export default ProgressBar;
