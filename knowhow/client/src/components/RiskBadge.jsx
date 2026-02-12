import React from 'react';
import styled from '@emotion/styled';
import { HiExclamation, HiShieldCheck } from 'react-icons/hi';

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  white-space: nowrap;
  letter-spacing: 0.02em;
  background: ${props => {
    switch (props.$level) {
      case 'critical': return 'linear-gradient(135deg, #fee2e2, #fecaca)';
      case 'high': return 'linear-gradient(135deg, #ffedd5, #fed7aa)';
      case 'medium': return 'linear-gradient(135deg, #dbeafe, #bfdbfe)';
      case 'low': return 'linear-gradient(135deg, #dcfce7, #bbf7d0)';
      default: return 'var(--color-surface-alt)';
    }
  }};
  color: ${props => {
    switch (props.$level) {
      case 'critical': return '#dc2626';
      case 'high': return '#c2410c';
      case 'medium': return '#1d4ed8';
      case 'low': return '#15803d';
      default: return 'var(--color-text-tertiary)';
    }
  }};
`;

const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 0.85em;
`;

const riskLabels = {
  critical: '重大',
  high: '高',
  medium: '中',
  low: '低'
};

const RiskBadge = ({ level }) => {
  if (!level) return null;

  const icon = level === 'low' ? <HiShieldCheck /> : <HiExclamation />;

  return (
    <Badge $level={level}>
      <IconWrap>{icon}</IconWrap>
      {riskLabels[level] || level}
    </Badge>
  );
};

export default RiskBadge;
