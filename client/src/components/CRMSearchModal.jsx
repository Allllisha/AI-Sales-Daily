import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  max-width: 800px;
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

const TabSelector = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  border-bottom: 2px solid var(--color-border);
`;

const Tab = styled.button`
  padding: var(--space-3) var(--space-5);
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s;
  
  &:hover {
    color: var(--color-text-primary);
  }
  
  ${props => props.active && `
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  `}
`;

const SearchBox = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
`;

const SearchInput = styled.input`
  flex: 1;
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
  
  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const SearchButton = styled.button`
  padding: var(--space-3) var(--space-5);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover:not(:disabled) {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SearchResults = styled.div`
  display: grid;
  gap: var(--space-3);
`;

const ResultCard = styled.div`
  padding: var(--space-4);
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--color-accent);
    transform: translateY(-2px);
    box-shadow: var(--shadow-elevation);
  }
`;

const ResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: var(--space-3);
`;

const ResultTitle = styled.h4`
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin: 0;
`;

const ResultLabel = styled.span`
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ResultInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
  font-size: var(--font-size-small);
  color: var(--color-text-secondary);
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

const InfoLabel = styled.span`
  font-size: var(--font-size-micro);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
`;

const InfoValue = styled.span`
  color: var(--color-text-primary);
`;

const SelectButton = styled.button`
  padding: var(--space-2) var(--space-4);
  background: var(--color-success);
  color: var(--color-text-inverse);
  border: 2px solid var(--color-success);
  border-radius: var(--radius-none);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover {
    background: var(--color-success-dark);
    border-color: var(--color-success-dark);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-secondary);
`;

const LoadingState = styled.div`
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-secondary);
`;

const DropdownSection = styled.div`
  margin-bottom: var(--space-5);
`;

const SectionTitle = styled.h4`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-3);
`;

const DropdownSelect = styled.select`
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

const QuickSelectButton = styled.button`
  margin-top: var(--space-3);
  padding: var(--space-3) var(--space-5);
  background: var(--color-success);
  color: var(--color-text-inverse);
  border: 2px solid var(--color-success);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: 100%;
  
  &:hover:not(:disabled) {
    background: var(--color-success-dark);
    border-color: var(--color-success-dark);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Divider = styled.div`
  border-top: 1px solid var(--color-border);
  margin: var(--space-5) 0;
  position: relative;
  
  &::after {
    content: 'または';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--color-surface);
    padding: 0 var(--space-3);
    color: var(--color-text-tertiary);
    font-size: var(--font-size-micro);
    text-transform: uppercase;
  }
`;

const LoginPrompt = styled.div`
  padding: var(--space-5);
  background: var(--color-accent-light);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-none);
  text-align: center;
`;

const LoginButton = styled.button`
  margin-top: var(--space-3);
  padding: var(--space-3) var(--space-5);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &:hover {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }
`;

const CRMSearchModal = ({ isOpen, onClose, onSelect }) => {
  const [selectedCRM, setSelectedCRM] = useState('salesforce');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ accounts: [], opportunities: [] });
  const [selectedOpportunity, setSelectedOpportunity] = useState('');
  const [authStatus, setAuthStatus] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // CRMログイン状態を確認
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  // 現在選択中のCRMのログイン状態
  const isCurrentCRMLoggedIn = authStatus?.[selectedCRM]?.loggedIn || false;

  // 最近の案件を取得（ログイン済みの場合のみ）
  const { data: recentOpportunities, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['recent-opportunities', selectedCRM],
    queryFn: () => crmIntegrationAPI.getRecentOpportunities(selectedCRM),
    enabled: isOpen && isCurrentCRMLoggedIn,
    staleTime: 60000, // 1分間キャッシュ
  });

  const searchMutation = useMutation({
    mutationFn: ({ searchTerm, crmType }) => 
      crmIntegrationAPI.searchCRM(searchTerm, crmType),
    onSuccess: (data) => {
      setSearchResults(data);
      if (data.accounts?.length === 0 && data.opportunities?.length === 0) {
        toast.info('該当する案件が見つかりませんでした');
      }
    },
    onError: (error) => {
      toast.error('検索に失敗しました');
    }
  });

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error('検索キーワードを入力してください');
      return;
    }
    searchMutation.mutate({ searchTerm, crmType: selectedCRM });
  };

  const handleSelect = (result) => {
    onSelect({
      crmType: selectedCRM,
      accountId: result.accountId || result.AccountId || result.accountid,
      accountName: result.accountName || result.Account?.Name || result.name,
      opportunityId: result.opportunityId || result.Id || result.opportunityid,
      opportunityName: result.opportunityName || result.Name || result.name
    });
  };

  const handleQuickSelect = () => {
    if (!selectedOpportunity) {
      toast.error('案件を選択してください');
      return;
    }
    
    const opportunity = recentOpportunities?.opportunities?.find(
      opp => (opp.Id || opp.opportunityid) === selectedOpportunity
    );
    
    if (opportunity) {
      handleSelect(opportunity);
    }
  };

  // CRMタブが切り替わったらドロップダウンをリセット
  useEffect(() => {
    setSelectedOpportunity('');
  }, [selectedCRM]);

  // CRMログイン処理
  const handleCRMLogin = async (crmType) => {
    try {
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

  if (!isOpen) return null;

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>既存のCRM案件を選択</ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <ModalBody>
          <div style={{ 
            padding: 'var(--space-3)', 
            background: 'var(--color-accent-light)', 
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--font-size-small)',
            color: 'var(--color-text-secondary)'
          }}>
            💡 この日報を既存のCRM案件に紐付けます。最近の案件から選択するか、検索して案件を見つけてください。
          </div>
          
          <TabSelector>
            <Tab 
              active={selectedCRM === 'salesforce'}
              onClick={() => setSelectedCRM('salesforce')}
            >
              Salesforce 
              {!isCheckingAuth && (
                <span style={{ 
                  marginLeft: 'var(--space-2)',
                  fontSize: 'var(--font-size-micro)',
                  color: authStatus?.salesforce?.loggedIn ? 'var(--color-success)' : 'var(--color-text-tertiary)'
                }}>
                  {authStatus?.salesforce?.loggedIn ? '●' : '○'}
                </span>
              )}
            </Tab>
            <Tab 
              active={selectedCRM === 'dynamics365'}
              onClick={() => setSelectedCRM('dynamics365')}
            >
              Dynamics 365
              {!isCheckingAuth && (
                <span style={{ 
                  marginLeft: 'var(--space-2)',
                  fontSize: 'var(--font-size-micro)',
                  color: authStatus?.dynamics365?.loggedIn ? 'var(--color-success)' : 'var(--color-text-tertiary)'
                }}>
                  {authStatus?.dynamics365?.loggedIn ? '●' : '○'}
                </span>
              )}
            </Tab>
          </TabSelector>

          {/* 最近の案件から選択（ログイン状態による表示切り替え） */}
          <DropdownSection>
            <SectionTitle>最近の案件から選択</SectionTitle>
            {isCheckingAuth ? (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)', textAlign: 'center' }}>
                ログイン状態を確認中...
              </div>
            ) : !isCurrentCRMLoggedIn ? (
              <LoginPrompt>
                <div style={{ 
                  fontSize: 'var(--font-size-small)', 
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-2)'
                }}>
                  {selectedCRM === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}にログインしていません
                </div>
                <div style={{ 
                  fontSize: 'var(--font-size-micro)', 
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-3)'
                }}>
                  最近の案件を表示するにはログインが必要です
                </div>
                <LoginButton onClick={() => handleCRMLogin(selectedCRM)}>
                  {selectedCRM === 'salesforce' ? 'Salesforceにログイン' : 'Dynamics 365にログイン'}
                </LoginButton>
              </LoginPrompt>
            ) : isLoadingRecent ? (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}>
                案件を読み込み中...
              </div>
            ) : (
              <>
                <DropdownSelect
                  value={selectedOpportunity}
                  onChange={(e) => setSelectedOpportunity(e.target.value)}
                  disabled={!recentOpportunities?.opportunities?.length}
                >
                  <option value="">
                    {recentOpportunities?.opportunities?.length > 0 
                      ? '案件を選択してください...'
                      : '最近の案件がありません'}
                  </option>
                  {recentOpportunities?.opportunities?.map((opp) => (
                    <option 
                      key={opp.Id || opp.opportunityid} 
                      value={opp.Id || opp.opportunityid}
                    >
                      {opp.Name || opp.name} 
                      {(opp.Account?.Name || opp.parentaccountid?.name) && 
                        ` (${opp.Account?.Name || opp.parentaccountid?.name})`}
                    </option>
                  ))}
                </DropdownSelect>
                <QuickSelectButton 
                  onClick={handleQuickSelect}
                  disabled={!selectedOpportunity}
                >
                  この案件に紐付ける
                </QuickSelectButton>
              </>
            )}
          </DropdownSection>

          <Divider />

          {/* キーワード検索 */}
          <SectionTitle>キーワードで検索</SectionTitle>
          {!isCurrentCRMLoggedIn && (
            <div style={{ 
              padding: 'var(--space-2)', 
              marginBottom: 'var(--space-3)',
              background: 'var(--color-warning-light)',
              fontSize: 'var(--font-size-micro)',
              color: 'var(--color-warning-dark)',
              borderRadius: 'var(--radius-none)',
              textAlign: 'center'
            }}>
              ⚠️ {selectedCRM === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}にログインしていないため検索できません
            </div>
          )}
          <SearchBox>
            <SearchInput
              type="text"
              placeholder={isCurrentCRMLoggedIn ? "顧客名または案件名で検索..." : "ログインが必要です"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && isCurrentCRMLoggedIn && handleSearch()}
              disabled={!isCurrentCRMLoggedIn}
            />
            <SearchButton 
              onClick={handleSearch}
              disabled={searchMutation.isPending || !isCurrentCRMLoggedIn}
              title={!isCurrentCRMLoggedIn ? `${selectedCRM === 'salesforce' ? 'Salesforce' : 'Dynamics 365'}にログインが必要です` : ''}
            >
              {searchMutation.isPending ? '検索中...' : '検索'}
            </SearchButton>
          </SearchBox>

          {searchMutation.isPending ? (
            <LoadingState>
              <div>検索中...</div>
            </LoadingState>
          ) : (
            <SearchResults>
              {/* アカウント検索結果 */}
              {searchResults.accounts?.map((account, index) => (
                <ResultCard key={`account-${index}`}>
                  <ResultHeader>
                    <div>
                      <ResultLabel>取引先</ResultLabel>
                      <ResultTitle>
                        {account.Name || account.name}
                      </ResultTitle>
                    </div>
                    <SelectButton onClick={() => handleSelect(account)}>
                      選択
                    </SelectButton>
                  </ResultHeader>
                  <ResultInfo>
                    {account.Industry && (
                      <InfoItem>
                        <InfoLabel>業界</InfoLabel>
                        <InfoValue>{account.Industry}</InfoValue>
                      </InfoItem>
                    )}
                    {account.Phone && (
                      <InfoItem>
                        <InfoLabel>電話</InfoLabel>
                        <InfoValue>{account.Phone}</InfoValue>
                      </InfoItem>
                    )}
                    {(account.BillingCity || account.address1_city) && (
                      <InfoItem>
                        <InfoLabel>所在地</InfoLabel>
                        <InfoValue>{account.BillingCity || account.address1_city}</InfoValue>
                      </InfoItem>
                    )}
                  </ResultInfo>
                </ResultCard>
              ))}

              {/* 商談検索結果 */}
              {searchResults.opportunities?.map((opportunity, index) => (
                <ResultCard key={`opportunity-${index}`}>
                  <ResultHeader>
                    <div>
                      <ResultLabel>商談</ResultLabel>
                      <ResultTitle>
                        {opportunity.Name || opportunity.name}
                      </ResultTitle>
                    </div>
                    <SelectButton onClick={() => handleSelect(opportunity)}>
                      選択
                    </SelectButton>
                  </ResultHeader>
                  <ResultInfo>
                    {(opportunity.Account?.Name || opportunity.parentaccountid?.name) && (
                      <InfoItem>
                        <InfoLabel>取引先</InfoLabel>
                        <InfoValue>
                          {opportunity.Account?.Name || opportunity.parentaccountid?.name}
                        </InfoValue>
                      </InfoItem>
                    )}
                    {(opportunity.Amount || opportunity.estimatedvalue) && (
                      <InfoItem>
                        <InfoLabel>金額</InfoLabel>
                        <InfoValue>
                          ¥{(opportunity.Amount || opportunity.estimatedvalue).toLocaleString()}
                        </InfoValue>
                      </InfoItem>
                    )}
                    {(opportunity.CloseDate || opportunity.estimatedclosedate) && (
                      <InfoItem>
                        <InfoLabel>予定日</InfoLabel>
                        <InfoValue>
                          {new Date(opportunity.CloseDate || opportunity.estimatedclosedate)
                            .toLocaleDateString('ja-JP')}
                        </InfoValue>
                      </InfoItem>
                    )}
                    {opportunity.StageName && (
                      <InfoItem>
                        <InfoLabel>ステージ</InfoLabel>
                        <InfoValue>{opportunity.StageName}</InfoValue>
                      </InfoItem>
                    )}
                  </ResultInfo>
                </ResultCard>
              ))}

              {searchResults.accounts?.length === 0 && 
               searchResults.opportunities?.length === 0 && 
               searchMutation.isSuccess && (
                <EmptyState>
                  検索結果が見つかりませんでした
                </EmptyState>
              )}
            </SearchResults>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CRMSearchModal;