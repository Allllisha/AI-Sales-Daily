import React, { useState } from 'react';
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
  max-width: 700px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-structure);
`;

const ModalHeader = styled.div`
  padding: var(--space-5);
  border-bottom: 2px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h2`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: var(--font-size-title);
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: var(--color-text-primary);
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
`;

const ConflictList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const ConflictItem = styled.div`
  padding: var(--space-4);
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
`;

const FieldName = styled.div`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ValueComparison = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
`;

const ValueCard = styled.div`
  padding: var(--space-3);
  background: ${props => props.selected ? 'var(--color-accent-light)' : 'var(--color-surface)'};
  border: 2px solid ${props => props.selected ? 'var(--color-accent)' : 'var(--color-border)'};
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--color-accent);
  }
`;

const ValueLabel = styled.div`
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
`;

const ValueContent = styled.div`
  font-size: var(--font-size-small);
  color: var(--color-text-primary);
  word-break: break-word;
`;

const ResolutionOptions = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
`;

const ResolutionButton = styled.button`
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: ${props => props.selected ? 'var(--color-primary)' : 'var(--color-background)'};
  color: ${props => props.selected ? 'var(--color-text-inverse)' : 'var(--color-text-primary)'};
  border: 2px solid ${props => props.selected ? 'var(--color-primary)' : 'var(--color-border)'};
  border-radius: var(--radius-none);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: var(--color-surface);
    border-color: var(--color-accent);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ModalFooter = styled.div`
  padding: var(--space-5);
  border-top: 2px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
`;

const ActionButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: var(--color-surface);
    border-color: var(--color-accent);
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

const CRMConflictModal = ({ isOpen, onClose, conflicts, onResolve }) => {
  const [resolutions, setResolutions] = useState({});

  const fieldNameMap = {
    customer: '顧客',
    project: '案件',
    budget: '予算',
    schedule: 'スケジュール',
    participants: '参加者',
    location: '場所',
    next_action: '次のアクション'
  };

  const handleResolutionChange = (fieldName, resolution, value) => {
    setResolutions(prev => ({
      ...prev,
      [fieldName]: {
        fieldName,
        resolution,
        resolvedValue: value,
        reportValue: conflicts.find(c => c.field_name === fieldName)?.report_value,
        crmValue: conflicts.find(c => c.field_name === fieldName)?.crm_value
      }
    }));
  };

  const handleResolveAll = () => {
    const resolutionList = Object.values(resolutions);
    
    // すべての競合が解決されているかチェック
    if (resolutionList.length !== conflicts.length) {
      alert('すべての競合を解決してください');
      return;
    }
    
    onResolve(resolutionList);
  };

  const handleAutoResolve = (strategy) => {
    const autoResolutions = {};
    
    conflicts.forEach(conflict => {
      let resolution, value;
      
      if (strategy === 'use_report') {
        resolution = 'use_report';
        value = conflict.report_value;
      } else if (strategy === 'use_crm') {
        resolution = 'use_crm';
        value = conflict.crm_value;
      } else if (strategy === 'newest') {
        // 簡易的に日報を新しいとみなす
        resolution = 'use_report';
        value = conflict.report_value;
      }
      
      autoResolutions[conflict.field_name] = {
        fieldName: conflict.field_name,
        resolution,
        resolvedValue: value,
        reportValue: conflict.report_value,
        crmValue: conflict.crm_value
      };
    });
    
    setResolutions(autoResolutions);
  };

  if (!isOpen) return null;

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>データ競合の解決</ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <ModalBody>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <ResolutionOptions>
              <ResolutionButton onClick={() => handleAutoResolve('use_report')}>
                すべて日報データを使用
              </ResolutionButton>
              <ResolutionButton onClick={() => handleAutoResolve('use_crm')}>
                すべてCRMデータを使用
              </ResolutionButton>
              <ResolutionButton onClick={() => handleAutoResolve('newest')}>
                すべて最新データを使用
              </ResolutionButton>
            </ResolutionOptions>
          </div>

          <ConflictList>
            {conflicts.map((conflict) => {
              const resolution = resolutions[conflict.field_name];
              
              return (
                <ConflictItem key={conflict.field_name}>
                  <FieldName>
                    {fieldNameMap[conflict.field_name] || conflict.field_name}
                  </FieldName>
                  
                  <ValueComparison>
                    <ValueCard 
                      selected={resolution?.resolution === 'use_report'}
                      onClick={() => handleResolutionChange(
                        conflict.field_name, 
                        'use_report', 
                        conflict.report_value
                      )}
                    >
                      <ValueLabel>日報データ</ValueLabel>
                      <ValueContent>{conflict.report_value || '(空)'}</ValueContent>
                    </ValueCard>
                    
                    <ValueCard 
                      selected={resolution?.resolution === 'use_crm'}
                      onClick={() => handleResolutionChange(
                        conflict.field_name, 
                        'use_crm', 
                        conflict.crm_value
                      )}
                    >
                      <ValueLabel>CRMデータ</ValueLabel>
                      <ValueContent>{conflict.crm_value || '(空)'}</ValueContent>
                    </ValueCard>
                  </ValueComparison>
                  
                  {resolution && (
                    <div style={{ 
                      marginTop: 'var(--space-3)', 
                      padding: 'var(--space-2)',
                      background: 'var(--color-success-light)',
                      border: '1px solid var(--color-success)',
                      borderRadius: 'var(--radius-none)',
                      fontSize: 'var(--font-size-micro)',
                      color: 'var(--color-success-dark)'
                    }}>
                      ✓ {resolution.resolution === 'use_report' ? '日報データ' : 'CRMデータ'}を使用
                    </div>
                  )}
                </ConflictItem>
              );
            })}
          </ConflictList>
        </ModalBody>

        <ModalFooter>
          <ActionButton onClick={onClose}>
            キャンセル
          </ActionButton>
          <ActionButton 
            className="primary"
            onClick={handleResolveAll}
            disabled={Object.keys(resolutions).length !== conflicts.length}
          >
            解決を適用
          </ActionButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CRMConflictModal;