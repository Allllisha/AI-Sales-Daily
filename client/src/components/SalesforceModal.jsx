import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { salesforceAPI, oauthAPI } from '../services/api';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: var(--space-4);
  
  @media (max-width: 768px) {
    padding: var(--space-2);
  }
  
  @media (max-width: 480px) {
    padding: 0;
    padding-top: 88px;
    align-items: flex-start;
  }
`;

const ModalContent = styled.div`
  background-color: var(--color-background);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  padding: 0;
  position: relative;
  margin: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    max-height: 85vh;
    max-width: calc(100% - 2 * var(--space-2));
    border-radius: 8px;
  }

  @media (max-width: 480px) {
    max-height: calc(100vh - 88px);
    width: 100%;
    max-width: 100%;
    margin: 0;
    border-radius: 0;
    border: none;
    border-top: 1px solid var(--color-border);
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  background-color: var(--color-background);
  
  @media (max-width: 768px) {
    padding: var(--space-4) var(--space-5);
  }
  
  @media (max-width: 480px) {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }
`;

const ModalTitle = styled.h2`
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.01em;
  
  @media (max-width: 480px) {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-medium);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  color: var(--color-text-tertiary);
  font-size: 24px;
  line-height: 1;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--color-text-primary);
  }
  
  @media (max-width: 480px) {
    width: 40px;
    height: 40px;
    font-size: 28px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: var(--space-5);
  
  @media (max-width: 480px) {
    margin-bottom: var(--space-4);
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
`;

const Select = styled.select`
  width: 100%;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-family: inherit;
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &:disabled {
    background-color: var(--color-surface-alt);
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: var(--space-4);
  justify-content: flex-end;
  padding: var(--space-4);
  border-top: 2px solid var(--color-border);
  flex-shrink: 0;
  background-color: var(--color-background);
  
  @media (max-width: 768px) {
    padding: var(--space-4);
  }
  
  @media (max-width: 480px) {
    position: sticky;
    bottom: 0;
    padding: var(--space-3);
    flex-direction: column-reverse;
    gap: var(--space-2);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const PrimaryButton = styled.button`
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border: 2px solid var(--color-primary);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-height: 44px;

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
  
  @media (max-width: 480px) {
    width: 100%;
    padding: var(--space-3) var(--space-4);
  }
`;

const SecondaryButton = styled.button`
  background-color: var(--color-background);
  color: var(--color-text-primary);
  border: 2px solid var(--color-border);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-height: 44px;

  &:hover {
    background-color: var(--color-surface);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
  
  @media (max-width: 480px) {
    width: 100%;
    padding: var(--space-3) var(--space-4);
  }
`;

const LoadingText = styled.div`
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  padding: var(--space-4);
`;

const ErrorText = styled.div`
  color: var(--color-error);
  font-size: var(--font-size-micro);
  margin-top: var(--space-2);
`;

const ConnectionStatus = styled.div`
  background-color: ${props => props.success ? 'var(--color-success-bg)' : 'var(--color-error-bg)'};
  color: ${props => props.success ? 'var(--color-success)' : 'var(--color-error)'};
  padding: var(--space-3);
  border-radius: var(--radius-none);
  border: 2px solid ${props => props.success ? 'var(--color-success)' : 'var(--color-error)'};
  margin-bottom: var(--space-4);
  font-size: var(--font-size-micro);
`;

const ModalScrollContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-4);
  
  @media (max-width: 480px) {
    padding: var(--space-3);
    padding-bottom: calc(80px + var(--space-4));
  }
`;

const AuthSection = styled.div`
  background-color: var(--color-surface-alt);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  text-align: center;
`;

const AuthButton = styled.button`
  background-color: #00A1E0;
  color: white;
  border: 2px solid #00A1E0;
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 auto;

  &:hover:not(:disabled) {
    background-color: #0078A0;
    border-color: #0078A0;
    transform: translateY(-1px);
  }

  &:disabled {
    background-color: var(--color-text-tertiary);
    border-color: var(--color-text-tertiary);
    cursor: not-allowed;
  }
`;

const AuthDescription = styled.p`
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
  line-height: var(--line-height-comfortable);
`;

const TabContainer = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
`;

const TabButton = styled.button`
  background: none;
  border: none;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: ${props => props.active ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
  border-bottom: 3px solid ${props => props.active ? 'var(--color-primary)' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--color-primary);
    background-color: var(--color-surface);
  }
`;

const ItemList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  padding: var(--space-2);
`;

const ItemCard = styled.div`
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  background-color: ${props => props.selected ? 'var(--color-primary-bg)' : 'var(--color-surface)'};
  border: 2px solid ${props => props.selected ? 'var(--color-primary)' : 'var(--color-border)'};
  border-radius: var(--radius-none);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--color-primary);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ItemTitle = styled.h4`
  margin: 0 0 var(--space-2) 0;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
`;

const ItemDescription = styled.p`
  margin: 0;
  font-size: var(--font-size-micro);
  color: var(--color-text-secondary);
  line-height: var(--line-height-comfortable);
  white-space: pre-wrap;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
`;

const Checkbox = styled.input`
  margin-top: 2px;
  cursor: pointer;
`;

const SalesforceModal = ({ isOpen, onClose, onSubmit }) => {
  const [accounts, setAccounts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [authStatus, setAuthStatus] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [actionType, setActionType] = useState('update'); // 'update' or 'create'
  
  // タブと議事録的情報の状態管理
  const [activeTab, setActiveTab] = useState('basic');
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [selectedMeetings, setSelectedMeetings] = useState([]);

  // Salesforce接続テスト
  useEffect(() => {
    if (isOpen) {
      console.log('SalesforceModal opened, checking auth status...');
      
      // localStorageから認証成功を確認（モバイル対応）
      const authSuccess = localStorage.getItem('oauth_auth_success');
      const authTimestamp = localStorage.getItem('oauth_auth_timestamp');
      
      if (authSuccess === 'salesforce_auth_success') {
        const timeDiff = Date.now() - parseInt(authTimestamp || '0');
        // 10秒以内の認証成功のみ処理
        if (timeDiff < 10000) {
          console.log('🎉 Salesforce auth success detected from localStorage');
          localStorage.removeItem('oauth_auth_success');
          localStorage.removeItem('oauth_auth_timestamp');
          checkAuthStatus();
        }
      }
      
      // モバイルで認証から戻ってきた場合の処理
      const authInProgress = sessionStorage.getItem('authInProgress');
      if (authInProgress === 'salesforce') {
        console.log('📱 Returning from mobile auth');
        sessionStorage.removeItem('authInProgress');
        sessionStorage.removeItem('authReturnUrl');
        setIsAuthenticating(true);
        
        // 少し待ってから認証状態を確認
        setTimeout(() => {
          checkAuthStatus().then(() => {
            setIsAuthenticating(false);
          });
        }, 1000);
      } else {
        checkAuthStatus();
      }
    }
  }, [isOpen]);

  // authStatusが変更されたらUIを更新
  useEffect(() => {
    console.log('Salesforce AuthStatus changed:', authStatus);
    if (authStatus && authStatus.authenticated) {
      console.log('Salesforce is authenticated, loading accounts...');
      // OAuth認証が成功している場合は、接続成功とみなす
      setConnectionStatus({ success: true, message: 'OAuth認証済み' });
      // 認証状態が確定したら即座にデータを読み込み
      // 既にデータを読み込み済みの場合はスキップ
      if (accounts.length === 0 && !isLoadingAccounts) {
        setTimeout(() => {
          // testConnection(); // OAuth認証済みの場合は接続テストをスキップ
          loadAccounts();
        }, 100);
      }
    } else {
      console.log('Salesforce is not authenticated, clearing data');
      setConnectionStatus(null);
      setAccounts([]);
      setOpportunities([]);
      setSelectedAccount('');
      setSelectedOpportunity('');
    }
  }, [authStatus?.authenticated]); // authenticated状態のみを依存配列に含める

  // ウィンドウがフォーカスを取得したときに認証状態を再チェック（Dynamics 365と同じ）
  useEffect(() => {
    const handleFocus = async () => {
      console.log('🔍 Window focused. isOpen:', isOpen, 'isAuthenticating:', isAuthenticating);
      
      if (isOpen && isAuthenticating) {
        console.log('✅ Window focused while authenticating, checking Salesforce auth status...');
        // 認証中にフォーカスが戻ってきた場合は、認証状態を確認
        try {
          await checkAuthStatus();
          console.log('Auth status check completed. Current authStatus:', authStatus);
          
          // 認証が成功していたら、isAuthenticatingをfalseに
          if (authStatus?.authenticated) {
            console.log('🎉 Salesforce authentication confirmed, updating UI...');
            setIsAuthenticating(false);
          }
        } catch (error) {
          console.error('Error checking auth status on focus:', error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isOpen, isAuthenticating, authStatus]);

  // 取引先変更時に商談と議事録的情報を読み込み
  useEffect(() => {
    if (selectedAccount) {
      loadOpportunities(selectedAccount);
      loadActivities(selectedAccount);
      loadNotes(selectedAccount);
      loadMeetings(selectedAccount);
    } else {
      setOpportunities([]);
      setSelectedOpportunity('');
      setActivities([]);
      setNotes([]);
      setMeetings([]);
      setSelectedActivities([]);
      setSelectedNotes([]);
      setSelectedMeetings([]);
    }
  }, [selectedAccount]);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No JWT token found');
      setAuthStatus(null);
      return;
    }

    try {
      const result = await oauthAPI.getStatus();
      console.log('Salesforce auth status check result:', result);
      
      if (result.success && result.tokens.salesforce?.authenticated) {
        console.log('✅ Salesforce is authenticated:', result.tokens.salesforce);
        setAuthStatus(result.tokens.salesforce);
        setIsAuthenticating(false); // 認証成功時にフラグをクリア
        // UI更新はuseEffectで処理
        return true;
      } else {
        console.log('❌ Salesforce is not authenticated');
        setAuthStatus(null);
        setConnectionStatus(null);
        setAccounts([]);
        setOpportunities([]);
        setSelectedAccount('');
        setSelectedOpportunity('');
        return false;
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      setAuthStatus(null);
      return false;
    }
  };

  const handleOAuthLogout = async () => {
    try {
      await oauthAPI.salesforce.logout();
      toast.success('Salesforce認証を解除しました');
      setAuthStatus(null);
      setConnectionStatus(null);
      setAccounts([]);
      setOpportunities([]);
      setSelectedAccount('');
      setSelectedOpportunity('');
      // 認証状態を再確認
      checkAuthStatus();
    } catch (error) {
      console.error('OAuth logout error:', error);
      toast.error('認証解除に失敗しました');
    }
  };

  const handleOAuthLogin = async () => {
    // 既に認証済みの場合はポップアップを出さない
    if (authStatus?.authenticated) {
      toast.info('既にSalesforceに認証済みです');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('認証トークンが見つかりません。再ログインしてください。');
      window.location.href = '/login';
      return;
    }
    
    setIsAuthenticating(true);
    try {
      const result = await oauthAPI.salesforce.authorize();
      
      if (result.success) {
        // モバイルデバイスの検出（iPadは除外してデスクトップ扱い）
        const userAgent = navigator.userAgent;
        console.log('User-Agent:', userAgent);
        
        // iPadOS 13以降はMacintoshと表示されることがあるため、タッチデバイスかどうかも確認
        const isMobile = /iPhone|iPod|Android/i.test(userAgent) && !/iPad/i.test(userAgent);
        const isIPad = /iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        console.log('Device detection:', { isMobile, isIPad, platform: navigator.platform, touchPoints: navigator.maxTouchPoints });
        
        // iPhoneやAndroidスマートフォンの場合のみ同じウィンドウで開く
        if (isMobile && !isIPad) {
          // モバイルの場合は同じウィンドウで認証ページに遷移
          console.log('📱 Mobile device detected, redirecting in same window');
          
          // 現在のURLを保存（戻ってくるため）
          sessionStorage.setItem('authReturnUrl', window.location.href);
          sessionStorage.setItem('authInProgress', 'salesforce');
          
          // 同じウィンドウで認証ページへリダイレクト
          window.location.href = result.authUrl;
          return;
        } else {
          // デスクトップの場合は新しいウィンドウで開く
          console.log('🌐 Opening Salesforce OAuth in new window/tab');
          
          // まず空のウィンドウを開く（ポップアップブロッカー回避）
          const windowFeatures = 'width=600,height=700,left=100,top=100,toolbar=no,location=yes,directories=no,status=yes,menubar=no,scrollbars=yes,resizable=yes';
          let authWindow = window.open('', 'salesforce_auth', windowFeatures);
          
          if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
            console.error('Popup blocked - trying fallback method');
            // ポップアップがブロックされた場合、新しいタブで開く
            authWindow = window.open(result.authUrl, '_blank');
            if (!authWindow) {
              toast.error('ポップアップがブロックされました。ブラウザの設定を確認してください。');
              setIsAuthenticating(false);
              return;
            }
          } else {
            // URLを設定
            authWindow.location.href = result.authUrl;
          }
        
        // ウィンドウが閉じられたかチェックする間隔も設定
        const windowCheckInterval = setInterval(() => {
          if (authWindow.closed) {
            console.log('認証ウィンドウが閉じられました');
            clearInterval(windowCheckInterval);
            clearInterval(pollInterval);
            // 認証ウィンドウが閉じられても、認証が完了している可能性があるため
            // すぐにisAuthenticatingをfalseにせず、認証状態を確認
            checkAuthStatus().then((isAuthenticated) => {
              if (!isAuthenticated) {
                setIsAuthenticating(false);
                toast('認証がキャンセルされました');
              }
            });
          }
        }, 1000); // 1秒ごとにウィンドウの状態をチェック
        
        // 認証状態を定期的にポーリングして完了を検知
        let pollCount = 0;
        const maxPolls = 90; // 最大3分間ポーリング（2秒間隔で90回）
        
        const pollInterval = setInterval(async () => {
          pollCount++;
          console.log(`🔄 Polling Salesforce auth status (${pollCount}/${maxPolls})...`);
          
          try {
            const statusData = await oauthAPI.getStatus();
            
            console.log('🔍 Status response:', statusData);
            
            if (statusData) {
              console.log('📋 Full status data:', statusData);
              
              // APIレスポンスの構造を確認（success, tokensの両方をチェック）
              const salesforceAuth = statusData.tokens?.salesforce || 
                                     (statusData.success && statusData.tokens?.salesforce);
              console.log('🎯 Salesforce auth data:', salesforceAuth);
              
              // 認証チェック（構造に応じて）
              const isAuthenticated = salesforceAuth?.authenticated || 
                                     (statusData.success && statusData.tokens?.salesforce?.authenticated);
              
              if (isAuthenticated) {
                console.log('✅ Salesforce authentication detected via polling!');
                clearInterval(pollInterval);
                clearInterval(windowCheckInterval); // ウィンドウチェックも停止
                setIsAuthenticating(false);
                
                // 認証状態を更新
                console.log('🔄 Updating auth status...');
                setAuthStatus(salesforceAuth || statusData.tokens?.salesforce);
                toast.success('✅ Salesforce認証が完了しました！');
                
                return;
              } else {
                console.log('❌ Salesforce not authenticated yet. Looking for:', {
                  'statusData.success': statusData.success,
                  'statusData.tokens': statusData.tokens,
                  'statusData.tokens?.salesforce': statusData.tokens?.salesforce
                });
              }
            } else {
              console.error('❌ Status data is null or undefined');
            }
          } catch (error) {
            console.error('Auth status polling error:', error);
          }
          
          // 最大ポーリング回数に達した場合
          if (pollCount >= maxPolls) {
            console.log('⏰ Auth polling timeout reached');
            clearInterval(pollInterval);
            clearInterval(windowCheckInterval); // ウィンドウチェックも停止
            setIsAuthenticating(false);
            toast.error('認証の確認がタイムアウトしました。再度お試しください。');
          }
        }, 2000); // 2秒間隔でポーリング（デバッグのため短縮）
        }
      } else {
        toast.error('OAuth認証の開始に失敗しました');
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error('OAuth login error:', error);
      toast.error('OAuth認証の開始に失敗しました');
      setIsAuthenticating(false);
    }
  };

  const testConnection = async () => {
    try {
      // CRMのテスト接続API使用
      const result = await salesforceAPI.testConnection();
      /*{ // 環境変数を使用
        })
      });*/
      setConnectionStatus(result);
      if (!result.success) {
        toast.error('Salesforceへの接続に失敗しました');
        // checkAuthStatusの呼び出しを削除（無限ループの原因）
      } else {
        toast.success('Salesforceに接続しました');
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setConnectionStatus({ success: false, message: 'ネットワークエラーが発生しました' });
      toast.error('Salesforceへの接続に失敗しました');
      // checkAuthStatusの呼び出しを削除（無限ループの原因）
    }
  };

  const loadAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const result = await salesforceAPI.getAccounts();
      if (result.success) {
        setAccounts(result.accounts);
      } else {
        toast.error('取引先企業の取得に失敗しました');
      }
    } catch (error) {
      console.error('Load accounts error:', error);
      toast.error('取引先企業の取得に失敗しました');
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const loadOpportunities = async (accountId) => {
    setIsLoadingOpportunities(true);
    try {
      const result = await salesforceAPI.getOpportunities(accountId, 50);
      if (result.success) {
        setOpportunities(result.opportunities);
      } else {
        toast.error('商談の取得に失敗しました');
      }
    } catch (error) {
      console.error('Load opportunities error:', error);
      toast.error('商談の取得に失敗しました');
    } finally {
      setIsLoadingOpportunities(false);
    }
  };

  const loadActivities = async (accountId) => {
    setIsLoadingActivities(true);
    try {
      const result = await salesforceAPI.getActivities(accountId, 20);
      if (result.success) {
        setActivities(result.activities);
      }
    } catch (error) {
      console.error('Load activities error:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const loadNotes = async (accountId) => {
    setIsLoadingNotes(true);
    try {
      const result = await salesforceAPI.getNotes(accountId, 20);
      if (result.success) {
        setNotes(result.notes);
      }
    } catch (error) {
      console.error('Load notes error:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const loadMeetings = async (accountId) => {
    setIsLoadingMeetings(true);
    try {
      const result = await salesforceAPI.getMeetings(accountId, 20);
      if (result.success) {
        setMeetings(result.meetings);
      }
    } catch (error) {
      console.error('Load meetings error:', error);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const handleItemToggle = (itemId, type) => {
    switch(type) {
      case 'activity':
        setSelectedActivities(prev => 
          prev.includes(itemId) 
            ? prev.filter(id => id !== itemId)
            : [...prev, itemId]
        );
        break;
      case 'note':
        setSelectedNotes(prev => 
          prev.includes(itemId) 
            ? prev.filter(id => id !== itemId)
            : [...prev, itemId]
        );
        break;
      case 'meeting':
        setSelectedMeetings(prev => 
          prev.includes(itemId) 
            ? prev.filter(id => id !== itemId)
            : [...prev, itemId]
        );
        break;
    }
  };

  const handleSubmit = async () => {
    if (!selectedAccount) {
      toast.error('取引先企業を選択してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
      const selectedOpportunityData = opportunities.find(opp => opp.id === selectedOpportunity);

      // 選択された議事録的情報を収集
      const selectedActivityData = activities.filter(a => selectedActivities.includes(a.id));
      const selectedNoteData = notes.filter(n => selectedNotes.includes(n.id));
      const selectedMeetingData = meetings.filter(m => selectedMeetings.includes(m.id));

      const data = {
        type: 'salesforce',
        actionType: actionType, // 'update' or 'create'
        salesforce_account_id: selectedAccount,
        salesforce_opportunity_id: selectedOpportunity || null,
        customer: selectedAccountData?.name || '',
        project: selectedOpportunityData?.name || '',
        // 選択された議事録的情報を含める
        selectedActivities: selectedActivityData,
        selectedNotes: selectedNoteData,
        selectedMeetings: selectedMeetingData,
        // 議事録の要約を生成
        meetingContext: [
          ...selectedActivityData.map(a => `【活動】${a.subject}: ${a.description || ''}`),
          ...selectedNoteData.map(n => `【メモ】${n.subject}: ${n.noteText || ''}`),
          ...selectedMeetingData.map(m => `【会議】${m.subject}: ${m.description || ''}`)
        ].join('\n')
      };

      await onSubmit(data);
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Salesforceから日報作成</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        {!authStatus ? (
          <ModalScrollContent>
            <AuthSection>
              <AuthDescription>
                あなたのSalesforceアカウントにログインして、取引先と商談情報を取得します。
              </AuthDescription>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <AuthButton onClick={handleOAuthLogin} disabled={isAuthenticating}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.18 0 2.34-.21 3.41-.6.4-.15.59-.59.44-.99-.15-.4-.59-.59-.99-.44-.85.31-1.76.47-2.68.47-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8c0 .93-.16 1.83-.47 2.68-.15.4.04.84.44.99.4.15.84-.04.99-.44.39-1.07.6-2.23.6-3.41C22 6.48 17.52 2 12 2z"/>
                </svg>
                {isAuthenticating ? '認証処理中...' : 'Salesforceにログイン'}
              </AuthButton>
              {isAuthenticating && (
                <AuthButton 
                  onClick={() => {
                    setIsAuthenticating(false);
                    toast('認証処理をキャンセルしました');
                  }}
                  style={{ 
                    backgroundColor: 'var(--color-error)',
                    borderColor: 'var(--color-error)'
                  }}
                >
                  キャンセル
                </AuthButton>
              )}
            </div>
            </AuthSection>
          </ModalScrollContent>
        ) : (
          <ModalScrollContent>
            {connectionStatus && connectionStatus.success && (
              <div style={{ 
                marginBottom: 'var(--space-4)', 
                padding: 'var(--space-4)', 
                backgroundColor: '#fef3f2',
                border: '2px solid #00A1E0',
                borderRadius: '8px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    backgroundColor: '#00A1E0', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: 'var(--space-3)'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: 0, 
                      color: '#0c4a6e', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-bold)'
                    }}>
                      Salesforce 認証完了
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      marginTop: 'var(--space-1)',
                      fontSize: 'var(--font-size-micro)', 
                      color: '#0369a1'
                    }}>
                      {authStatus?.user_info?.name || 'ユーザー'}として接続中
                    </p>
                  </div>
                  <button
                    onClick={handleOAuthLogout}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--font-size-micro)',
                      backgroundColor: 'white',
                      color: '#dc2626',
                      border: '1px solid #dc2626',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#dc2626';
                      e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.color = '#dc2626';
                    }}
                  >
                    認証解除
                  </button>
                </div>
                <div style={{ 
                  padding: 'var(--space-2)', 
                  backgroundColor: '#eff6ff', 
                  borderRadius: '4px',
                  fontSize: 'var(--font-size-micro)',
                  color: '#0369a1'
                }}>
                  🏢 取引先企業と商談情報にアクセスできます
                </div>
              </div>
            )}
            
            {connectionStatus && !connectionStatus.success && (
              <div style={{ 
                marginBottom: 'var(--space-4)', 
                padding: 'var(--space-3)', 
                backgroundColor: '#fef2f2',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                color: '#dc2626'
              }}>
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  ❌ Salesforce接続失敗: {connectionStatus.message}
                </div>
                <SecondaryButton
                  onClick={() => {
                    setConnectionStatus(null);
                    testConnection();
                    loadAccounts();
                  }}
                  style={{ 
                    marginTop: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)',
                    fontSize: '14px'
                  }}
                >
                  🔄 再接続
                </SecondaryButton>
              </div>
            )}

            <FormGroup>
              <Label>取引先企業 *</Label>
              {isLoadingAccounts ? (
                <LoadingText>取引先企業を読み込み中...</LoadingText>
              ) : (
                <Select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  disabled={!connectionStatus?.success}
                >
                  <option value="">-- 取引先企業を選択 --</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} {account.phone && `(${account.phone})`}
                    </option>
                  ))}
                </Select>
              )}
            </FormGroup>

            {selectedAccount && (
              <>
                <TabContainer>
                  <TabButton 
                    active={activeTab === 'basic'} 
                    onClick={() => setActiveTab('basic')}
                  >
                    基本情報
                  </TabButton>
                  <TabButton 
                    active={activeTab === 'activities'} 
                    onClick={() => setActiveTab('activities')}
                  >
                    活動記録 ({activities.length})
                  </TabButton>
                  <TabButton 
                    active={activeTab === 'notes'} 
                    onClick={() => setActiveTab('notes')}
                  >
                    メモ ({notes.length})
                  </TabButton>
                  <TabButton 
                    active={activeTab === 'meetings'} 
                    onClick={() => setActiveTab('meetings')}
                  >
                    会議 ({meetings.length})
                  </TabButton>
                </TabContainer>

                {activeTab === 'basic' && (
                  <FormGroup>
                    <Label>商談（オプション）</Label>
                    {isLoadingOpportunities ? (
                      <LoadingText>商談を読み込み中...</LoadingText>
                    ) : (
                      <Select
                        value={selectedOpportunity}
                        onChange={(e) => setSelectedOpportunity(e.target.value)}
                        disabled={!selectedAccount || !connectionStatus?.success}
                      >
                        <option value="">-- 商談を選択（オプション） --</option>
                        {opportunities.map(opportunity => (
                          <option key={opportunity.id} value={opportunity.id}>
                            {opportunity.name} ({opportunity.stage}) 
                            {opportunity.estimatedValue && ` - ¥${opportunity.estimatedValue.toLocaleString()}`}
                          </option>
                        ))}
                      </Select>
                    )}
                  </FormGroup>
                )}

                {activeTab === 'activities' && (
                  <FormGroup>
                    <Label>活動記録を選択</Label>
                    {isLoadingActivities ? (
                      <LoadingText>活動記録を読み込み中...</LoadingText>
                    ) : activities.length > 0 ? (
                      <ItemList>
                        {activities.map(activity => (
                          <ItemCard 
                            key={activity.id}
                            selected={selectedActivities.includes(activity.id)}
                            onClick={() => handleItemToggle(activity.id, 'activity')}
                          >
                            <CheckboxContainer>
                              <Checkbox 
                                type="checkbox"
                                checked={selectedActivities.includes(activity.id)}
                                onChange={() => handleItemToggle(activity.id, 'activity')}
                              />
                              <ItemTitle>{activity.subject}</ItemTitle>
                            </CheckboxContainer>
                            {activity.description && (
                              <ItemDescription>{activity.description}</ItemDescription>
                            )}
                            <div style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                              {new Date(activity.createdOn).toLocaleDateString()} • {activity.status}
                            </div>
                          </ItemCard>
                        ))}
                      </ItemList>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-4)' }}>
                        活動記録が見つかりません
                      </div>
                    )}
                  </FormGroup>
                )}

                {activeTab === 'notes' && (
                  <FormGroup>
                    <Label>メモを選択</Label>
                    {isLoadingNotes ? (
                      <LoadingText>メモを読み込み中...</LoadingText>
                    ) : notes.length > 0 ? (
                      <ItemList>
                        {notes.map(note => (
                          <ItemCard 
                            key={note.id}
                            selected={selectedNotes.includes(note.id)}
                            onClick={() => handleItemToggle(note.id, 'note')}
                          >
                            <CheckboxContainer>
                              <Checkbox 
                                type="checkbox"
                                checked={selectedNotes.includes(note.id)}
                                onChange={() => handleItemToggle(note.id, 'note')}
                              />
                              <ItemTitle>{note.subject}</ItemTitle>
                            </CheckboxContainer>
                            {note.noteText && (
                              <ItemDescription>{note.noteText}</ItemDescription>
                            )}
                            <div style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                              {new Date(note.createdOn).toLocaleDateString()}
                            </div>
                          </ItemCard>
                        ))}
                      </ItemList>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-4)' }}>
                        メモが見つかりません
                      </div>
                    )}
                  </FormGroup>
                )}

                {activeTab === 'meetings' && (
                  <FormGroup>
                    <Label>会議を選択</Label>
                    {isLoadingMeetings ? (
                      <LoadingText>会議を読み込み中...</LoadingText>
                    ) : meetings.length > 0 ? (
                      <ItemList>
                        {meetings.map(meeting => (
                          <ItemCard 
                            key={meeting.id}
                            selected={selectedMeetings.includes(meeting.id)}
                            onClick={() => handleItemToggle(meeting.id, 'meeting')}
                          >
                            <CheckboxContainer>
                              <Checkbox 
                                type="checkbox"
                                checked={selectedMeetings.includes(meeting.id)}
                                onChange={() => handleItemToggle(meeting.id, 'meeting')}
                              />
                              <ItemTitle>{meeting.subject}</ItemTitle>
                            </CheckboxContainer>
                            {meeting.description && (
                              <ItemDescription>{meeting.description}</ItemDescription>
                            )}
                            <div style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                              {new Date(meeting.scheduledStart).toLocaleDateString()} {meeting.location && `• ${meeting.location}`}
                            </div>
                          </ItemCard>
                        ))}
                      </ItemList>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-4)' }}>
                        会議情報が見つかりません
                      </div>
                    )}
                  </FormGroup>
                )}
              </>
            )}
          </ModalScrollContent>
        )}
        
        {authStatus && (
          <ButtonContainer>
            <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
            <PrimaryButton 
              onClick={handleSubmit}
              disabled={!selectedAccount || isSubmitting || !connectionStatus?.success}
            >
              {isSubmitting ? '処理中...' : 'AIヒアリング開始'}
            </PrimaryButton>
          </ButtonContainer>
        )}
        
        {/* アクション選択ラジオボタン */}
        {authStatus && (
          <div style={{ 
            padding: 'var(--space-4) var(--space-6)', 
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: 'var(--space-4)',
            alignItems: 'center',
            backgroundColor: 'var(--color-background)'
          }}>
            <span style={{ 
              fontSize: 'var(--font-size-small)', 
              color: 'var(--color-text-secondary)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              作成方法:
            </span>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-2)',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                value="update" 
                checked={actionType === 'update'}
                onChange={(e) => setActionType(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: 'var(--font-size-small)' }}>既存案件を更新</span>
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-2)',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                value="create" 
                checked={actionType === 'create'}
                onChange={(e) => setActionType(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: 'var(--font-size-small)' }}>新規案件として作成</span>
            </label>
          </div>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};

export default SalesforceModal;