import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';

const overlayFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const contentSlideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1400;
  padding: var(--space-4);
  animation: ${overlayFadeIn} 0.2s ease-out;
`;

const Content = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  width: 100%;
  max-width: ${props => {
    switch (props.$size) {
      case 'sm': return '400px';
      case 'lg': return '640px';
      case 'xl': return '800px';
      default: return '520px';
    }
  }};
  max-height: 90vh;
  overflow-y: auto;
  animation: ${contentSlideUp} 0.3s ease-out;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border-light);
`;

const Title = styled.h2`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
`;

const CloseBtn = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 1.2rem;

  &:hover {
    background: var(--color-border);
    color: var(--color-text-primary);
  }
`;

const Body = styled.div`
  padding: var(--space-6);
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border-light);
`;

const Modal = ({ open, onClose, title, size = 'md', footer, children }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <Content $size={size}>
        {title && (
          <Header>
            <Title>{title}</Title>
            <CloseBtn onClick={onClose} aria-label="閉じる">&times;</CloseBtn>
          </Header>
        )}
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Content>
    </Overlay>
  );
};

export default Modal;
