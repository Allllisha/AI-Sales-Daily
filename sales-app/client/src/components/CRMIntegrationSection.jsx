import React, { useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmIntegrationAPI } from '../services/api';
import toast from 'react-hot-toast';
import CRMSearchModal from './CRMSearchModal';
import CRMLoginModal from './CRMLoginModal';
import { useNavigate } from 'react-router-dom';

const Section = styled.div`
  margin-top: var(--space-6);
  padding: var(--space-5);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
`;

const SectionTitle = styled.h3`
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatusCard = styled.div`
  padding: var(--space-4);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-none);
  margin-bottom: var(--space-4);
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StatusLabel = styled.span`
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatusValue = styled.span`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-4);
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
  
  &.success {
    background: var(--color-success);
    color: var(--color-text-inverse);
    border-color: var(--color-success);
    
    &:hover:not(:disabled) {
      background: var(--color-success-dark);
      border-color: var(--color-success-dark);
    }
  }
`;

const SyncHistory = styled.div`
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
`;

const AccordionWrapper = styled.div`
  margin-top: var(--space-2);
`;

const AccordionHeader = styled.button`
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-surface);
    border-color: var(--color-accent);
  }
  
  &.expanded {
    border-bottom: none;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
`;

const AccordionContent = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-none) var(--radius-none);
  padding: var(--space-3);
  font-size: var(--font-size-micro);
  max-height: 300px;
  overflow-y: auto;
`;

const DetailRow = styled.div`
  display: flex;
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border-light);
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  flex: 0 0 120px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const DetailValue = styled.span`
  flex: 1;
  color: var(--color-text-primary);
  word-break: break-word;
`;

const ExpandIcon = styled.span`
  display: inline-block;
  transition: transform 0.2s ease;
  
  &.expanded {
    transform: rotate(180deg);
  }
`;

const HistoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  font-size: var(--font-size-micro);
  
  &:not(:last-child) {
    border-bottom: 1px solid var(--color-border-light);
  }
`;

const CRMIntegrationSection = ({ report }) => {
  const queryClient = useQueryClient();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loginModal, setLoginModal] = useState({ isOpen: false, crmType: null, action: null, callback: null });
  const [selectedCRMForLink, setSelectedCRMForLink] = useState(null);
  
  // 日報のステータスチェック
  const isDraft = report.status === 'draft';
  const isCompleted = report.status === 'completed';
  
  // CRMログイン状態を確認
  React.useEffect(() => {
    const checkAuthStatus = async () => {
      setIsCheckingAuth(true);
      try {
        const result = await crmIntegrationAPI.checkAuthStatus();
        setAuthStatus(result.authStatus);
      } catch (error) {
        console.error('Failed to check CRM auth status:', error);
        setAuthStatus({
          salesforce: { loggedIn: false },
          dynamics365: { loggedIn: false }
        });
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // CRMマッピング情報を取得
  const { data: mapping, refetch: refetchMapping } = useQuery({
    queryKey: ['crm-mapping', report.id],
    queryFn: () => crmIntegrationAPI.getCRMMapping(report.id),
    enabled: !!report.id
  });

  // 同期履歴を取得
  const { data: syncHistory } = useQuery({
    queryKey: ['sync-history', report.id],
    queryFn: () => crmIntegrationAPI.getSyncHistory(report.id, 10),
    enabled: !!report.id,
    onSuccess: (data) => {
      console.log('Sync history data:', data);
    }
  });

  // CRMに同期
  const syncMutation = useMutation({
    mutationFn: ({ crmType, action, crmData }) => {
      setIsSyncing(true);
      return crmIntegrationAPI.syncReport(report.id, crmType, action, crmData);
    },
    onSuccess: async (data) => {
      toast.success(data.message || 'CRM同期に成功しました');
      
      // レポートデータを更新（CRMデータが更新されるため）
      queryClient.invalidateQueries(['report', report.id]);
      
      // マッピング情報も再取得
      await refetchMapping();
      
      // 同期履歴も再取得
      queryClient.invalidateQueries(['sync-history', report.id]);
      setIsSyncing(false);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'CRM同期に失敗しました';
      
      // Dynamics 365/Salesforceへのログインが必要な場合
      if (errorMessage.includes('token not found') || errorMessage.includes('Please login')) {
        toast.error('CRMへのログインが必要です。設定画面からログインしてください。');
        // TODO: ログイン画面へのリンクを表示
      } else {
        toast.error(errorMessage);
      }
      setIsSyncing(false);
    },
    onSettled: () => {
      // 念のため、処理完了後も確実にリセット
      setTimeout(() => setIsSyncing(false), 100);
    }
  });

  // 新規案件として登録
  const handleCreateInCRM = (crmType) => {
    syncMutation.mutate({
      crmType,
      action: 'create',
      crmData: {
        customer: report.slots?.customer || report.crm_data?.customer,
        project: report.slots?.project || report.crm_data?.project,
        budget: report.slots?.budget,
        schedule: report.slots?.schedule,
        participants: report.slots?.participants,
        location: report.slots?.location,
        next_action: report.slots?.next_action,
        issues: report.slots?.issues,
        opportunityId: report.crm_data?.opportunity?.id,
        accountId: report.crm_data?.account?.id
      }
    });
  };

  // 既存案件に紐付け
  const handleLinkToCRM = (crmData) => {
    syncMutation.mutate({
      crmType: crmData.crmType,
      action: 'update',
      crmData
    });
    setShowSearchModal(false);
  };

  // CRMデータを更新
  const toggleHistoryExpand = useCallback((historyId) => {
    setExpandedHistoryId(prev => prev === historyId ? null : historyId);
  }, []);
  
  const formatSyncDetail = (history) => {
    const details = [];
    
    if (history.sync_data) {
      const data = typeof history.sync_data === 'string' ? 
        JSON.parse(history.sync_data) : history.sync_data;
      
      if (history.sync_type === 'create' && data.fields_created) {
        details.push({ label: '作成内容', value: '' });
        Object.entries(data.fields_created).forEach(([key, value]) => {
          if (value) {
            const fieldName = {
              customer: '顧客',
              project: '案件',
              budget: '予算',
              schedule: 'スケジュール',
              participants: '参加者',
              location: '場所',
              next_action: '次のアクション',
              issues: '課題'
            }[key] || key;
            details.push({ label: `  ${fieldName}`, value });
          }
        });
      }
      
      if (history.sync_type === 'update' && data.fields_updated) {
        // 案件変更の特別な処理
        if (data.fields_updated.previous_opportunity && data.fields_updated.new_opportunity) {
          details.push({ label: '📌 案件変更', value: '' });
          details.push({ label: '  変更前', value: data.fields_updated.previous_opportunity });
          details.push({ label: '  変更後', value: data.fields_updated.new_opportunity });
        }
        
        details.push({ label: '更新内容', value: '' });
        Object.entries(data.fields_updated).forEach(([key, value]) => {
          // 案件変更の特別なフィールドはスキップ
          if (key === 'previous_opportunity' || key === 'new_opportunity') {
            return;
          }
          if (value) {
            const fieldName = {
              customer: '顧客',
              project: '案件',
              budget: '予算',
              schedule: 'スケジュール',
              next_action: '次のアクション',
              issues: '課題'
            }[key] || key;
            details.push({ label: `  ${fieldName}`, value });
          }
        });
      }
      
      if (data.after) {
        if (data.after.accountName) {
          details.push({ label: 'CRM取引先', value: data.after.accountName });
        }
        if (data.after.opportunityName) {
          details.push({ label: 'CRM商談', value: data.after.opportunityName });
        }
        if (data.after.opportunityId) {
          details.push({ label: 'CRM商談ID', value: data.after.opportunityId });
        }
      }
    }
    
    if (history.error_message) {
      details.push({ label: 'エラー', value: history.error_message });
    }
    
    return details;
  };
  
  // マッピングを削除
  const handleRemoveMapping = async (mappingId) => {
    if (!window.confirm('この紐付けを解除しますか？')) return;
    
    try {
      const response = await fetch(`/api/crm-integration/reports/${report.id}/crm-mapping/${mappingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        toast.success('CRM紐付けを解除しました');
        queryClient.invalidateQueries(['crm-mapping', report.id]);
      } else {
        throw new Error('Failed to remove mapping');
      }
    } catch (error) {
      console.error('Remove mapping error:', error);
      toast.error('紐付けの解除に失敗しました');
    }
  };
  
  // メインマッピングに設定
  const handleSetMainMapping = async (mappingId) => {
    try {
      const response = await fetch(`/api/crm-integration/reports/${report.id}/crm-mapping/${mappingId}/priority`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priority: 100 })
      });
      
      if (response.ok) {
        toast.success('メインのCRM連携先を変更しました');
        queryClient.invalidateQueries(['crm-mapping', report.id]);
      } else {
        throw new Error('Failed to update priority');
      }
    } catch (error) {
      console.error('Update priority error:', error);
      toast.error('優先順位の更新に失敗しました');
    }
  };
  
  const handleUpdateCRM = () => {
    if (!mapping?.mapping?.crm_type && !mapping?.mappings?.length) return;
    
    // 既存のCRMデータと最新のreport.slotsデータをマージ
    const updatedCrmData = {
      ...mapping.mapping.crm_data,
      // 最新のreport.slotsデータで上書き
      customer: report.slots?.customer || report.crm_data?.customer,
      project: report.slots?.project || report.crm_data?.project,
      budget: report.slots?.budget,
      schedule: report.slots?.schedule,
      participants: report.slots?.participants,
      location: report.slots?.location,
      next_action: report.slots?.next_action,
      issues: report.slots?.issues,
      // opportunityNameも更新（projectと同じ値）
      opportunityName: report.slots?.project || report.crm_data?.project
    };
    
    syncMutation.mutate({
      crmType: mapping.mapping.crm_type,
      action: 'update',
      crmData: updatedCrmData
    });
  };

  const navigate = useNavigate();
  
  const isFromMeeting = report.mode === 'meeting' || report.mode === 'hearing';
  const isFromCRM = report.mode === 'salesforce' || report.mode === 'dynamics365';
  const isNewCRMRecord = report.crm_data?.actionType === 'create';
  // crm_dataがない場合もupdateとして扱う（Salesforce/Dynamics365モードのデフォルト）
  const isUpdateCRMRecord = report.crm_data?.actionType === 'update' || (isFromCRM && !report.crm_data?.actionType);
  
  // CRMログイン状態の確認
  const isSalesforceLoggedIn = authStatus?.salesforce?.loggedIn || false;
  const isDynamics365LoggedIn = authStatus?.dynamics365?.loggedIn || false;
  const hasAnyCRMLogin = isSalesforceLoggedIn || isDynamics365LoggedIn;
  
  // ログインページへのリダイレクト
  const handleCRMLogin = async (crmType) => {
    try {
      // 認証トークンを含めてOAuth URLを取得
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/oauth/${crmType}/authorize`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get OAuth URL');
      }
      
      const data = await response.json();
      
      // OAuth URLを新しいタブで開く
      window.open(data.authUrl, '_blank');
      
      // ログイン完了後のポーリング
      const checkInterval = setInterval(async () => {
        try {
          const result = await crmIntegrationAPI.checkAuthStatus();
          if (result.authStatus[crmType]?.loggedIn) {
            setAuthStatus(result.authStatus);
            clearInterval(checkInterval);
            toast.success(`${crmType === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}にログインしました`);
          }
        } catch (error) {
          console.error('Auth check error:', error);
        }
      }, 2000);
      
      // 30秒後にポーリングを停止
      setTimeout(() => clearInterval(checkInterval), 30000);
    } catch (error) {
      console.error('OAuth login error:', error);
      toast.error('ログイン処理を開始できませんでした');
    }
  };

  return (
    <Section>
      <SectionTitle>CRM連携</SectionTitle>
      
      {/* 下書き状態の場合のメッセージ */}
      {isDraft && (
        <StatusCard style={{ backgroundColor: 'var(--color-warning-light)', borderColor: 'var(--color-warning)' }}>
          <StatusRow>
            <StatusLabel style={{ color: 'var(--color-warning-dark)' }}>⚠️ 下書き状態</StatusLabel>
            <StatusValue style={{ color: 'var(--color-warning-dark)', fontWeight: 'var(--font-weight-medium)' }}>
              {isFromCRM ? 
                'CRMへの新規作成・更新は日報完了後に実行できます' :
                isFromMeeting ? 
                '既存案件への紐付けのみ可能です。新規案件作成は日報完了後に実行できます' :
                'CRM連携は日報完了後に実行できます'}
            </StatusValue>
          </StatusRow>
        </StatusCard>
      )}

      {/* 現在のCRM連携状態（複数対応） */}
      {mapping?.mappings && mapping.mappings.length > 0 ? (
        mapping.mappings.map((m, index) => (
          <StatusCard key={m.id || index}>
            <StatusRow>
              <StatusLabel>
                連携先 {mapping.mappings.length > 1 && `(${index + 1}/${mapping.mappings.length})`}
                {m.priority > 0 && <span style={{ color: 'var(--color-accent)', marginLeft: '8px' }}>★ メイン</span>}
              </StatusLabel>
              <StatusValue>
                {m.crm_type === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}
                <Button 
                  style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: 'var(--font-size-micro)' }}
                  onClick={() => handleRemoveMapping(m.id)}
                >
                  解除
                </Button>
              </StatusValue>
            </StatusRow>
            {m.crm_data.accountName && (
              <StatusRow>
                <StatusLabel>取引先</StatusLabel>
                <StatusValue>{m.crm_data.accountName}</StatusValue>
              </StatusRow>
            )}
            {m.crm_data.opportunityName && (
              <StatusRow>
                <StatusLabel>商談</StatusLabel>
                <StatusValue>{m.crm_data.opportunityName}</StatusValue>
              </StatusRow>
            )}
            {mapping.mappings.length > 1 && index !== 0 && (
              <StatusRow>
                <Button 
                  style={{ fontSize: 'var(--font-size-micro)', padding: '4px 12px' }}
                  onClick={() => handleSetMainMapping(m.id)}
                >
                  メインに設定
                </Button>
              </StatusRow>
            )}
          </StatusCard>
        ))
      ) : mapping?.mapped && mapping.mapping?.crm_data && (
        // 後方互換性のための旧形式表示
        <StatusCard>
          <StatusRow>
            <StatusLabel>連携先</StatusLabel>
            <StatusValue>
              {mapping.mapping.crm_type === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}
            </StatusValue>
          </StatusRow>
          {mapping.mapping.crm_data.accountName && (
            <StatusRow>
              <StatusLabel>取引先</StatusLabel>
              <StatusValue>{mapping.mapping.crm_data.accountName}</StatusValue>
            </StatusRow>
          )}
          {mapping.mapping.crm_data.opportunityName && (
            <StatusRow>
              <StatusLabel>商談</StatusLabel>
              <StatusValue>{mapping.mapping.crm_data.opportunityName}</StatusValue>
            </StatusRow>
          )}
          {mapping.mapping.last_sync_date && (
            <StatusRow>
              <StatusLabel>最終同期</StatusLabel>
              <StatusValue>
                {new Date(mapping.mapping.last_sync_date).toLocaleString('ja-JP')}
              </StatusValue>
            </StatusRow>
          )}
        </StatusCard>
      )}

      {/* ログイン状態の確認中 */}
      {isCheckingAuth ? (
        <StatusCard style={{ marginBottom: 'var(--space-3)' }}>
          <StatusRow>
            <StatusLabel>ログイン状態を確認中...</StatusLabel>
          </StatusRow>
        </StatusCard>
      ) : (
        <>
          {/* CRM連携状態のサマリー表示 */}
          <div style={{ 
            padding: 'var(--space-3)',
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-none)',
            marginBottom: 'var(--space-4)'
          }}>
            <div style={{ 
              fontSize: 'var(--font-size-small)', 
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-3)'
            }}>
              CRM連携ステータス
            </div>
            
            {/* テーブル形式で表示 */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '120px 1fr 1fr',
              gap: 'var(--space-2)',
              fontSize: 'var(--font-size-micro)',
              alignItems: 'center'
            }}>
              {/* ヘッダー行 */}
              <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-secondary)' }}>
                CRMシステム
              </div>
              <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-secondary)' }}>
                ログイン状態
              </div>
              <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-secondary)' }}>
                日報連携状態
              </div>
              
              {/* Salesforce行 */}
              <div style={{ 
                padding: 'var(--space-2)',
                background: 'var(--color-surface)',
                borderLeft: '3px solid var(--color-accent)'
              }}>
                Salesforce
              </div>
              <div style={{ 
                padding: 'var(--space-2)',
                background: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <span style={{ 
                  color: isSalesforceLoggedIn ? 'var(--color-success)' : 'var(--color-text-tertiary)' 
                }}>
                  {isSalesforceLoggedIn ? '● ログイン済み' : '○ 未ログイン'}
                </span>
              </div>
              <div style={{ 
                padding: 'var(--space-2)',
                background: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <span style={{ 
                  color: (mapping?.mappings?.some(m => m.crm_type === 'salesforce') || 
                         (mapping?.mapped && mapping?.mapping?.crm_type === 'salesforce')) ? 
                         'var(--color-primary)' : 'var(--color-text-tertiary)' 
                }}>
                  {(mapping?.mappings?.some(m => m.crm_type === 'salesforce') || 
                   (mapping?.mapped && mapping?.mapping?.crm_type === 'salesforce')) ? 
                    '✓ この日報と連携済み' : 
                    '－ 未連携'}
                </span>
                {(() => {
                  const salesforceMapping = mapping?.mappings?.find(m => m.crm_type === 'salesforce');
                  const opportunityName = salesforceMapping?.crm_data?.opportunityName || 
                                         (mapping?.mapped && mapping?.mapping?.crm_type === 'salesforce' && 
                                          mapping?.mapping?.crm_data?.opportunityName);
                  return opportunityName ? (
                    <span style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-secondary)' }}>
                      ({opportunityName})
                    </span>
                  ) : null;
                })()}
              </div>
              
              {/* Dynamics 365行 */}
              <div style={{ 
                padding: 'var(--space-2)',
                background: 'var(--color-surface)',
                borderLeft: '3px solid var(--color-accent)'
              }}>
                Dynamics 365
              </div>
              <div style={{ 
                padding: 'var(--space-2)',
                background: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <span style={{ 
                  color: isDynamics365LoggedIn ? 'var(--color-success)' : 'var(--color-text-tertiary)' 
                }}>
                  {isDynamics365LoggedIn ? '● ログイン済み' : '○ 未ログイン'}
                </span>
              </div>
              <div style={{ 
                padding: 'var(--space-2)',
                background: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <span style={{ 
                  color: (mapping?.mappings?.some(m => m.crm_type === 'dynamics365') || 
                         (mapping?.mapped && mapping?.mapping?.crm_type === 'dynamics365')) ? 
                         'var(--color-primary)' : 'var(--color-text-tertiary)' 
                }}>
                  {(mapping?.mappings?.some(m => m.crm_type === 'dynamics365') || 
                   (mapping?.mapped && mapping?.mapping?.crm_type === 'dynamics365')) ? 
                    '✓ この日報と連携済み' : 
                    '－ 未連携'}
                </span>
                {(() => {
                  const dynamics365Mapping = mapping?.mappings?.find(m => m.crm_type === 'dynamics365');
                  const opportunityName = dynamics365Mapping?.crm_data?.opportunityName || 
                                         (mapping?.mapped && mapping?.mapping?.crm_type === 'dynamics365' && 
                                          mapping?.mapping?.crm_data?.opportunityName);
                  return opportunityName ? (
                    <span style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-secondary)' }}>
                      ({opportunityName})
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
            
            {/* 説明文 */}
            <div style={{ 
              marginTop: 'var(--space-3)',
              padding: 'var(--space-2)',
              background: 'var(--color-accent-light)',
              fontSize: 'var(--font-size-micro)',
              color: 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-none)'
            }}>
              💡 ログイン済みでも日報との連携は別途必要です。新規作成または既存案件への紐付けを行ってください。
            </div>
          </div>
        </>
      )}
      
      <ButtonGroup>
        {/* 議事録/AIヒアリングから作成した日報の場合 */}
        {isFromMeeting && !isCheckingAuth && (
          <>
            {/* 既存案件に紐付けボタン（常に表示） */}
            <Button 
              className="primary"
              onClick={() => {
                if (!hasAnyCRMLogin) {
                  setLoginModal({
                    isOpen: true,
                    crmType: 'salesforce',
                    action: 'search',
                    callback: () => setShowSearchModal(true)
                  });
                } else {
                  setShowSearchModal(true);
                }
              }}
              title={!hasAnyCRMLogin ? 'CRMにログインしてから既存案件を検索します' : '顧客名や案件名で既存のCRM案件を検索して紐付けます'}
            >
              {!hasAnyCRMLogin ? (
                <>🔍 CRMログイン後、既存案件を検索</>
              ) : (
                <>🔍 {mapping?.mappings?.length > 0 ? '別のCRM案件を検索して紐付け' : '既存CRM案件を検索して紐付け'}</>
              )}
            </Button>
            
            {/* 新規案件作成ボタン（各CRMに未連携の場合のみ表示） */}
            {!isDraft && (
              <>
                {/* Salesforceに未連携の場合のみ表示 */}
                {!mapping?.mappings?.some(m => m.crm_type === 'salesforce') && (
                  <Button 
                    onClick={() => {
                      if (!isSalesforceLoggedIn) {
                        setLoginModal({
                          isOpen: true,
                          crmType: 'salesforce',
                          action: 'create',
                          callback: () => handleCreateInCRM('salesforce')
                        });
                      } else {
                        handleCreateInCRM('salesforce');
                      }
                    }}
                    disabled={isSyncing}
                  >
                    新規案件としてSalesforceに登録
                  </Button>
                )}
                
                {/* Dynamics 365に未連携の場合のみ表示 */}
                {!mapping?.mappings?.some(m => m.crm_type === 'dynamics365') && (
                  <Button 
                    onClick={() => {
                      if (!isDynamics365LoggedIn) {
                        setLoginModal({
                          isOpen: true,
                          crmType: 'dynamics365',
                          action: 'create',
                          callback: () => handleCreateInCRM('dynamics365')
                        });
                      } else {
                        handleCreateInCRM('dynamics365');
                      }
                    }}
                    disabled={isSyncing}
                  >
                    新規案件としてDynamics 365に登録
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {/* CRMから作成した日報の場合 - 新規作成 */}
        {isFromCRM && isNewCRMRecord && !mapping?.mapped && (
          <>
            <Button 
              onClick={() => handleCreateInCRM(report.mode)}
              disabled={isSyncing || isDraft}
              className="primary"
              title={isDraft ? '日報を完了してから新規案件を作成してください' : ''}
            >
              {isSyncing ? '作成中...' : 
                report.mode === 'salesforce' ? '新規案件としてSalesforceに登録' : 
                '新規案件としてDynamics 365に登録'}
            </Button>
          </>
        )}
        
        {/* CRMから作成した日報の場合 - 更新（まだ連携されていない場合） */}
        {isFromCRM && isUpdateCRMRecord && !mapping?.mapped && (
          <>
            <Button 
              className="primary"
              onClick={() => setShowSearchModal(true)}
            >
              既存のCRM案件に紐付ける
            </Button>
            <Button 
              onClick={() => handleCreateInCRM(report.mode)}
              disabled={isSyncing || isDraft}
              title={isDraft ? '日報を完了してから新規案件を作成してください' : ''}
            >
              {report.mode === 'salesforce' ? '新規案件としてSalesforceに登録' : 
                '新規案件としてDynamics 365に登録'}
            </Button>
          </>
        )}
        
        {/* 既に連携済みの場合 - 各CRMごとに更新ボタンを表示 */}
        {mapping?.mappings?.length > 0 && (
          <>
            {mapping.mappings.map((m, index) => (
              <Button 
                key={`update-${m.id || index}`}
                className="success"
                onClick={() => {
                  // 特定のCRMマッピングを更新
                  syncMutation.mutate({
                    crmType: m.crm_type,
                    action: 'update',
                    crmData: {
                      ...m.crm_data,
                      customer: report.slots?.customer || report.crm_data?.customer,
                      project: report.slots?.project || report.crm_data?.project,
                      budget: report.slots?.budget,
                      schedule: report.slots?.schedule,
                      participants: report.slots?.participants,
                      location: report.slots?.location,
                      next_action: report.slots?.next_action,
                      issues: report.slots?.issues,
                      opportunityName: report.slots?.project || report.crm_data?.project
                    }
                  });
                }}
                disabled={isSyncing || isDraft}
                title={isDraft ? '日報を完了してからCRMデータを更新してください' : ''}
              >
                {isSyncing ? '同期中...' : `${m.crm_type === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}のデータを更新`}
              </Button>
            ))}
          </>
        )}
        
        {/* 後方互換性のための旧形式対応 */}
        {!mapping?.mappings?.length && mapping?.mapped && mapping?.mapping && (
          <Button 
            className="success"
            onClick={handleUpdateCRM}
            disabled={isSyncing || isDraft}
            title={isDraft ? '日報を完了してからCRMデータを更新してください' : ''}
          >
            {isSyncing ? '同期中...' : 'CRMデータを更新'}
          </Button>
        )}
      </ButtonGroup>

      {/* 同期履歴 */}
      {((syncHistory && syncHistory.length > 0) || mapping?.mapping?.last_sync_date) && (
        <SyncHistory>
          <StatusLabel>同期履歴</StatusLabel>
          {syncHistory && syncHistory.length > 0 ? syncHistory.map((history, index) => {
            const isExpanded = expandedHistoryId === history.id;
            const syncDetails = formatSyncDetail(history);
            const hasDetails = syncDetails.length > 0 || history.sync_data;
            
            return (
              <AccordionWrapper key={`${history.id}-${index}`}>
                <AccordionHeader 
                  onClick={() => hasDetails && toggleHistoryExpand(history.id)}
                  className={isExpanded ? 'expanded' : ''}
                  style={{ cursor: hasDetails ? 'pointer' : 'default' }}
                >
                  <span>
                    {history.sync_type === 'create' ? '🆕 新規作成' : 
                     history.sync_type === 'update' ? '🔄 既存更新' :
                     history.sync_type === 'append' ? '➕ 追記' :
                     history.sync_type === 'link' ? '🔗 紐付け' :
                     history.sync_type === 'sync' ? '🔄 同期' : history.sync_type}
                    {' → '}
                    {history.crm_type === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}
                    {' | '}
                    {new Date(history.created_at).toLocaleString('ja-JP', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {' | '}
                    <span style={{ 
                      color: history.sync_status === 'completed' || history.sync_status === 'synced' ? 'var(--color-success)' : 
                             history.sync_status === 'failed' ? 'var(--color-error)' : 
                             'var(--color-warning)',
                      fontWeight: 'var(--font-weight-bold)'
                    }}>
                      {history.sync_status === 'completed' || history.sync_status === 'synced' ? '✓ 成功' : 
                       history.sync_status === 'failed' ? '✗ 失敗' : '⏳ 処理中'}
                    </span>
                  </span>
                  {hasDetails && (
                    <ExpandIcon className={isExpanded ? 'expanded' : ''}>
                      ▼
                    </ExpandIcon>
                  )}
                </AccordionHeader>
                {isExpanded && hasDetails && (
                  <AccordionContent>
                    {syncDetails.map((detail, detailIndex) => (
                      <DetailRow key={detailIndex}>
                        <DetailLabel>{detail.label}</DetailLabel>
                        <DetailValue>{detail.value || '-'}</DetailValue>
                      </DetailRow>
                    ))}
                  </AccordionContent>
                )}
              </AccordionWrapper>
            );
          }) : 
          // 履歴データがない場合、最終同期日時のみ表示
          mapping?.mapping?.last_sync_date && (
            <HistoryItem>
              <span>
                {mapping.mapping.crm_data?.actionType === 'create' ? '🆕 新規作成' : 
                 mapping.mapping.crm_data?.actionType === 'update' ? '🔄 既存更新' : '🔄 同期'}
                {' → '}
                {mapping.mapping.crm_type === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}
              </span>
              <span>
                {new Date(mapping.mapping.last_sync_date).toLocaleString('ja-JP')}
                {' - '}
                <span style={{ 
                  color: mapping.mapping.sync_status === 'synced' ? 'var(--color-success)' : 
                         mapping.mapping.sync_status === 'failed' ? 'var(--color-error)' : 
                         'var(--color-warning)'
                }}>
                  {mapping.mapping.sync_status === 'synced' ? '✓ 成功' : 
                   mapping.mapping.sync_status === 'failed' ? '✗ 失敗' : '⏳ 処理中'}
                </span>
              </span>
            </HistoryItem>
          )}
        </SyncHistory>
      )}

      {/* モーダル */}
      {showSearchModal && (
        <CRMSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSelect={handleLinkToCRM}
        />
      )}
      
      {/* CRMログイン確認モーダル */}
      <CRMLoginModal
        isOpen={loginModal.isOpen}
        onClose={() => setLoginModal({ isOpen: false, crmType: null, action: null, callback: null })}
        onConfirm={async () => {
          setLoginModal({ ...loginModal, isOpen: false });
          await handleCRMLogin(loginModal.crmType);
          // ログイン成功後にコールバックを実行
          if (loginModal.callback) {
            const checkLoginInterval = setInterval(async () => {
              try {
                const result = await crmIntegrationAPI.checkAuthStatus();
                if (result.authStatus[loginModal.crmType]?.loggedIn) {
                  clearInterval(checkLoginInterval);
                  loginModal.callback();
                }
              } catch (error) {
                console.error('Login check error:', error);
              }
            }, 2000);
            // 30秒後にタイムアウト
            setTimeout(() => clearInterval(checkLoginInterval), 30000);
          }
        }}
        crmType={loginModal.crmType}
        action={loginModal.action}
      />
    </Section>
  );
};

export default CRMIntegrationSection;