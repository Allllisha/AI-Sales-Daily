import React from 'react';
import styled from '@emotion/styled';
import { HiOutlineDesktopComputer, HiOutlineMicrophone } from 'react-icons/hi';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
`;

const ModeCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-8) var(--space-6);
  background: ${props => props.$active ? 'var(--color-primary-50)' : 'var(--color-surface)'};
  border: 2px solid ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'var(--color-border)'};
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-base);
  min-height: 220px;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${props => props.$variant === 'office'
      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(37, 99, 235, 0.06) 100%)'
      : 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(249, 115, 22, 0.06) 100%)'};
    opacity: 0;
    transition: opacity var(--transition-base);
  }

  ${props => props.$active && `
    box-shadow: 0 4px 20px rgba(37, 99, 235, 0.15);
    &::before { opacity: 1; }
  `}

  &:hover {
    border-color: ${props => props.$variant === 'office' ? 'var(--color-info)' : 'var(--color-accent)'};
    box-shadow: var(--shadow-lg);
    transform: translateY(-4px);
    &::before { opacity: 1; }
  }

  &:hover .mode-icon {
    transform: scale(1.08);
  }

  &:hover .mode-arrow {
    color: var(--color-primary-600, #2563eb);
    transform: translateY(-50%) translateX(4px);
  }

  &:active {
    transform: translateY(-1px);
  }

  @media (max-width: 640px) {
    min-height: 120px;
    padding: var(--space-5);
    flex-direction: row;
    justify-content: flex-start;
    gap: var(--space-4);
  }
`;

const IconContainer = styled.div`
  width: 72px;
  height: 72px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: ${props => props.$variant === 'office'
    ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
    : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'};
  color: ${props => props.$variant === 'office' ? '#2563eb' : '#d97706'};
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: transform var(--transition-base);

  @media (max-width: 640px) {
    width: 56px;
    height: 56px;
    font-size: 1.5rem;
  }
`;

const TextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  position: relative;
  z-index: 1;

  @media (max-width: 640px) {
    align-items: flex-start;
  }
`;

const ModeTitle = styled.span`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;

  @media (max-width: 640px) {
    font-size: var(--font-size-lg);
  }
`;

const ModeDescription = styled.span`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
  line-height: var(--line-height-relaxed);

  @media (max-width: 640px) {
    text-align: left;
  }
`;

const Arrow = styled.span`
  position: absolute;
  right: var(--space-5);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  font-size: 1.5rem;
  transition: all var(--transition-fast);
  display: none;

  @media (max-width: 640px) {
    display: flex;
  }
`;

const ModeSelector = ({ onSelect }) => {
  return (
    <Container>
      <ModeCard onClick={() => onSelect('office')} $variant="office">
        <IconContainer className="mode-icon" $variant="office">
          <HiOutlineDesktopComputer />
        </IconContainer>
        <TextGroup>
          <ModeTitle>事務作業モード</ModeTitle>
          <ModeDescription>チャット形式で施工検討・確認</ModeDescription>
        </TextGroup>
        <Arrow className="mode-arrow">&#8250;</Arrow>
      </ModeCard>

      <ModeCard onClick={() => onSelect('field')} $variant="field">
        <IconContainer className="mode-icon" $variant="field">
          <HiOutlineMicrophone />
        </IconContainer>
        <TextGroup>
          <ModeTitle>現場作業モード</ModeTitle>
          <ModeDescription>音声で手軽にナレッジ確認</ModeDescription>
        </TextGroup>
        <Arrow className="mode-arrow">&#8250;</Arrow>
      </ModeCard>
    </Container>
  );
};

export default ModeSelector;
