import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useQuery, useMutation } from '@tanstack/react-query';
import { crmIntegrationAPI } from '../services/api';
import toast from 'react-hot-toast';

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
  max-width: 600px;
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

const FormGroup = styled.div`
  margin-bottom: var(--space-5);
`;

const Label = styled.label`
  display: block;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Toggle = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const ToggleSwitch = styled.button`
  width: 60px;
  height: 32px;
  background: ${props => props.checked ? 'var(--color-success)' : 'var(--color-border)'};
  border: 2px solid ${props => props.checked ? 'var(--color-success)' : 'var(--color-border)'};
  border-radius: 16px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.checked ? '28px' : '2px'};
    width: 24px;
    height: 24px;
    background: var(--color-text-inverse);
    border-radius: 50%;
    transition: all 0.3s;
  }
`;

const ToggleLabel = styled.span`
  font-size: var(--font-size-small);
  color: var(--color-text-primary);
`;

const Select = styled.select`
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  background: var(--color-background);
  color: var(--color-text-primary);
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  background: var(--color-background);
  color: var(--color-text-primary);
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HelpText = styled.p`
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
  margin-top: var(--space-2);
`;

const StatusCard = styled.div`
  padding: var(--space-3);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-none);
  margin-bottom: var(--space-4);
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-small);
  
  &:not(:last-child) {
    margin-bottom: var(--space-2);
  }
`;

const StatusLabel = styled.span`
  color: var(--color-text-secondary);
`;

const StatusValue = styled.span`
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
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

const CRMSyncConfigModal = ({ isOpen, onClose, crmType }) => {
  const [config, setConfig] = useState({
    autoSyncEnabled: false,
    syncFrequency: 'daily',
    syncTime: '02:00',
    conflictResolution: 'manual'
  });

  // 同期設定を取得
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['sync-config', crmType],
    queryFn: () => crmIntegrationAPI.getSyncConfig(crmType),
    enabled: isOpen
  });

  // 同期設定を更新
  const updateConfigMutation = useMutation({
    mutationFn: (configData) => crmIntegrationAPI.updateSyncConfig(crmType, configData),
    onSuccess: () => {
      toast.success('同期設定を保存しました');
      onClose();
    },
    onError: (error) => {
      toast.error('設定の保存に失敗しました');
    }
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig({
        autoSyncEnabled: savedConfig.auto_sync_enabled || false,
        syncFrequency: savedConfig.sync_frequency || 'daily',
        syncTime: savedConfig.sync_time || '02:00',
        conflictResolution: savedConfig.conflict_resolution || 'manual'
      });
    }
  }, [savedConfig]);

  const handleSave = () => {
    updateConfigMutation.mutate(config);
  };

  if (!isOpen) return null;

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            {crmType === 'salesforce' ? 'Salesforce' : 'Dynamics 365'} 自動同期設定
          </ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <ModalBody>
          {savedConfig?.last_sync_at && (
            <StatusCard>
              <StatusRow>
                <StatusLabel>最終同期日時</StatusLabel>
                <StatusValue>
                  {new Date(savedConfig.last_sync_at).toLocaleString('ja-JP')}
                </StatusValue>
              </StatusRow>
            </StatusCard>
          )}

          <FormGroup>
            <Label>自動同期</Label>
            <Toggle>
              <ToggleSwitch 
                checked={config.autoSyncEnabled}
                onClick={() => setConfig(prev => ({ 
                  ...prev, 
                  autoSyncEnabled: !prev.autoSyncEnabled 
                }))}
              />
              <ToggleLabel>
                {config.autoSyncEnabled ? '有効' : '無効'}
              </ToggleLabel>
            </Toggle>
            <HelpText>
              自動同期を有効にすると、設定した頻度で日報がCRMに自動的に同期されます
            </HelpText>
          </FormGroup>

          <FormGroup>
            <Label>同期頻度</Label>
            <Select 
              value={config.syncFrequency}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                syncFrequency: e.target.value 
              }))}
              disabled={!config.autoSyncEnabled}
            >
              <option value="realtime">リアルタイム</option>
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </Select>
            <HelpText>
              {config.syncFrequency === 'realtime' && 'データ変更時に即座に同期します'}
              {config.syncFrequency === 'hourly' && '毎時0分に同期を実行します'}
              {config.syncFrequency === 'daily' && '指定した時刻に毎日同期を実行します'}
              {config.syncFrequency === 'weekly' && '毎週月曜日の指定時刻に同期を実行します'}
            </HelpText>
          </FormGroup>

          {(config.syncFrequency === 'daily' || config.syncFrequency === 'weekly') && (
            <FormGroup>
              <Label>同期時刻</Label>
              <Input 
                type="time"
                value={config.syncTime}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  syncTime: e.target.value 
                }))}
                disabled={!config.autoSyncEnabled}
              />
              <HelpText>
                同期を実行する時刻を設定します（24時間形式）
              </HelpText>
            </FormGroup>
          )}

          <FormGroup>
            <Label>競合解決方法</Label>
            <Select 
              value={config.conflictResolution}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                conflictResolution: e.target.value 
              }))}
              disabled={!config.autoSyncEnabled}
            >
              <option value="manual">手動で解決</option>
              <option value="crm_priority">CRMデータを優先</option>
              <option value="report_priority">日報データを優先</option>
              <option value="newest">最新データを優先</option>
            </Select>
            <HelpText>
              {config.conflictResolution === 'manual' && 'データ競合が発生した場合、手動で解決する必要があります'}
              {config.conflictResolution === 'crm_priority' && '競合時はCRMのデータを保持します'}
              {config.conflictResolution === 'report_priority' && '競合時は日報のデータで上書きします'}
              {config.conflictResolution === 'newest' && '競合時は最新のデータを使用します'}
            </HelpText>
          </FormGroup>
        </ModalBody>

        <ModalFooter>
          <ActionButton onClick={onClose}>
            キャンセル
          </ActionButton>
          <ActionButton 
            className="primary"
            onClick={handleSave}
            disabled={updateConfigMutation.isPending}
          >
            {updateConfigMutation.isPending ? '保存中...' : '保存'}
          </ActionButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CRMSyncConfigModal;