import React from 'react';
import styled from '@emotion/styled';

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
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
  max-width: 500px;
  width: 100%;
  padding: var(--space-6);
  box-shadow: var(--shadow-structure);
`;

const ModalTitle = styled.h2`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ModalMessage = styled.p`
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-5);
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    background: var(--color-surface);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &.primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border-color: var(--color-primary);
    
    &:hover:not(:disabled) {
      background: var(--color-accent);
      border-color: var(--color-accent);
    }
  }
`;

const CRMInfo = styled.div`
  padding: var(--space-4);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-none);
  margin-bottom: var(--space-4);
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
`;

const CRMLoginModal = ({ isOpen, onClose, onConfirm, crmType, action = 'default' }) => {
  if (!isOpen) return null;

  const getCRMName = () => {
    return crmType === 'salesforce' ? 'Salesforce' : 'Dynamics 365';
  };

  const getMessage = () => {
    const crmName = getCRMName();
    
    switch (action) {
      case 'create':
        return `新規案件を${crmName}に登録するには、${crmName}へのログインが必要です。`;
      case 'update':
        return `CRMデータを更新するには、${crmName}へのログインが必要です。`;
      case 'link':
        return `既存の案件に紐付けるには、${crmName}へのログインが必要です。`;
      case 'search':
        return `CRM案件を検索するには、少なくとも1つのCRMへのログインが必要です。`;
      default:
        return `この操作を実行するには、${crmName}へのログインが必要です。`;
    }
  };

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>CRMログイン確認</ModalTitle>
        
        <ModalMessage>{getMessage()}</ModalMessage>
        
        <CRMInfo>
          ログイン後、新しいタブが開き、{getCRMName()}の認証画面が表示されます。
          認証完了後は自動的にこのページに反映されます。
        </CRMInfo>
        
        <ButtonGroup>
          <Button onClick={onClose}>
            キャンセル
          </Button>
          <Button className="primary" onClick={onConfirm}>
            {getCRMName()}にログイン
          </Button>
        </ButtonGroup>
      </ModalContent>
    </Modal>
  );
};

export default CRMLoginModal;