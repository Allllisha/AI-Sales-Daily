import React from 'react';
import styled from '@emotion/styled';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
`;

const ModalContent = styled.div`
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  padding: var(--space-8);
  max-width: 500px;
  width: 100%;
  box-shadow: var(--shadow-structure);
  animation: slideIn 0.2s ease-out;

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    padding: var(--space-6);
  }
`;

const ModalTitle = styled.h3`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ModalMessage = styled.p`
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-6);
  text-align: center;
  line-height: var(--line-height-comfortable);
  white-space: pre-wrap;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: center;
`;

const ModalButton = styled.button`
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 120px;
  
  &:hover:not(:disabled) {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: var(--color-text-tertiary);
    border-color: var(--color-text-tertiary);
    cursor: not-allowed;
  }
`;

const ModalCancelButton = styled.button`
  background-color: var(--color-background);
  color: var(--color-text-primary);
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 120px;
  
  &:hover {
    background-color: var(--color-surface);
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }
`;

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'キャンセル' }) => {
  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onCancel}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        {title && <ModalTitle>{title}</ModalTitle>}
        <ModalMessage>{message}</ModalMessage>
        <ModalButtons>
          <ModalCancelButton onClick={onCancel}>
            {cancelText}
          </ModalCancelButton>
          <ModalButton onClick={onConfirm}>
            {confirmText}
          </ModalButton>
        </ModalButtons>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ConfirmModal;