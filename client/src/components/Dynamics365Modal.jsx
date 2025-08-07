import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { dynamics365API } from '../services/api';

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
  
  @media (max-width: 768px) {
    padding: 0 var(--space-4);
  }
  
  @media (max-width: 480px) {
    margin-bottom: var(--space-4);
    padding: 0 var(--space-3);
    
    &:last-of-type {
      margin-bottom: calc(80px + var(--space-4));
    }
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

const AuthSection = styled.div`
  background-color: var(--color-surface-alt);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  text-align: center;
  
  @media (max-width: 768px) {
    margin: 0 var(--space-4) var(--space-4);
  }
  
  @media (max-width: 480px) {
    margin: 0 var(--space-3) var(--space-3);
  }
`;

const AuthButton = styled.button`
  background-color: #0078d4;
  color: white;
  border: 2px solid #0078d4;
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
    background-color: #005a9e;
    border-color: #005a9e;
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

const Dynamics365Modal = ({ isOpen, onClose, onSubmit }) => {
  const [accounts, setAccounts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState('');
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [selectedMeetings, setSelectedMeetings] = useState([]);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'activities', 'notes', 'meetings'
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [actionType, setActionType] = useState('update'); // 'update' or 'create'

  // OAuth認証状態チェック
  useEffect(() => {
    if (isOpen) {
      console.log('Dynamics365Modal opened, checking auth status...');
      
      // モバイルで認証から戻ってきた場合の処理
      const authInProgress = sessionStorage.getItem('authInProgress');
      if (authInProgress === 'dynamics365') {
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

  // ウィンドウがフォーカスを取得したときに認証状態を再チェック
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen && isAuthenticating) {
        console.log('Window focused while authenticating, checking Dynamics 365 auth status...');
        // 認証中にフォーカスが戻ってきた場合は、認証状態を確認
        setTimeout(() => {
          checkAuthStatus();
        }, 500);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isOpen, isAuthenticating]);

  // 認証が完了したらアカウントを読み込み
  useEffect(() => {
    console.log('Dynamics 365 isAuthenticated changed:', isAuthenticated);
    if (isAuthenticated) {
      console.log('Dynamics 365 is authenticated, loading accounts...');
      loadAccounts();
    }
  }, [isAuthenticated]);

  // authStatusが変更されたらログ出力
  useEffect(() => {
    console.log('Dynamics 365 AuthStatus changed:', authStatus);
  }, [authStatus]);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No JWT token found');
      setIsAuthenticated(false);
      setAuthStatus(null);
      return;
    }

    try {
      const response = await fetch('/api/oauth/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        console.error('JWT token is invalid, please re-login');
        toast.error('認証が無効です。再ログインしてください。');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dynamics 365 auth status check result:', data);
        const dynamics365Auth = data.tokens?.dynamics365;
        const isAuth = dynamics365Auth?.authenticated || false;
        
        console.log('🔍 Dynamics 365 auth check result:', { isAuth, dynamics365Auth });
        
        if (isAuth) {
          console.log('✅ Dynamics 365 is authenticated:', dynamics365Auth);
          setIsAuthenticated(true);
          setAuthStatus(dynamics365Auth);
          
          // UI状態を即座に更新 - より結果を確実にする
          setTimeout(() => {
            console.log('🚀 Loading Dynamics 365 accounts after auth confirmation...');
            loadAccounts();
          }, 200);
          
        } else {
          console.log('❌ Dynamics 365 is not authenticated');
          setIsAuthenticated(false);
          setAuthStatus(null);
          setAccounts([]);
          setOpportunities([]);
        }
      }
    } catch (error) {
      console.error('Failed to check Dynamics 365 auth status:', error);
      setIsAuthenticated(false);
      setAuthStatus(null);
    }
  };

  const handleOAuthLogout = async () => {
    try {
      const response = await fetch('/api/oauth/dynamics365', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        toast.success('Dynamics 365認証を解除しました');
        setIsAuthenticated(false);
        setAuthStatus(null);
        setAccounts([]);
        setOpportunities([]);
        setSelectedAccount('');
        setSelectedOpportunity('');
        // 認証状態を再確認
        checkAuthStatus();
      } else {
        toast.error('認証解除に失敗しました');
      }
    } catch (error) {
      console.error('OAuth logout error:', error);
      toast.error('認証解除に失敗しました');
    }
  };

  const handleOAuthLogin = async () => {
    // 既に認証済みの場合はポップアップを出さない
    if (isAuthenticated) {
      toast.info('既にDynamics 365に認証済みです');
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
      const response = await fetch('/api/oauth/dynamics365/authorize', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        toast.error('認証が無効です。再ログインしてください。');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        
        // モバイルデバイスの検出
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
          // モバイルの場合は同じウィンドウで認証ページに遷移
          console.log('📱 Mobile device detected, redirecting in same window');
          
          // 現在のURLを保存（戻ってくるため）
          sessionStorage.setItem('authReturnUrl', window.location.href);
          sessionStorage.setItem('authInProgress', 'dynamics365');
          
          // 同じウィンドウで認証ページへリダイレクト
          window.location.href = data.authUrl;
          return;
        } else {
          // デスクトップの場合は新しいウィンドウで開く
          console.log('🌐 Opening Dynamics 365 OAuth in new window/tab');
          const authWindow = window.open(data.authUrl, '_blank');
          
          if (!authWindow) {
            toast.error('ポップアップがブロックされました。ブラウザの設定を確認してください。');
            setIsAuthenticating(false);
            return;
          }
        
        // 認証状態を定期的にポーリングして完了を検知
        let pollCount = 0;
        const maxPolls = 90; // 最大3分間ポーリング（2秒間隔で90回）
        let authDetected = false;
        
        // ウィンドウが閉じられたかチェックする間隔も設定
        const windowCheckInterval = setInterval(() => {
          if (authWindow.closed) {
            console.log('認証ウィンドウが閉じられました');
            clearInterval(windowCheckInterval);
            clearInterval(pollInterval);
            
            // 認証が検出されていない場合のみ、最終確認を行う
            if (!authDetected) {
              setTimeout(async () => {
                console.log('Window closed, checking final auth status...');
                const finalCheck = await checkAuthStatus();
                // checkAuthStatusが認証を検出できなかった場合のみキャンセル扱い
                if (!isAuthenticated) {
                  setIsAuthenticating(false);
                  console.log('No auth detected after window close');
                }
              }, 1000);
            }
          }
        }, 1000); // 1秒ごとにウィンドウの状態をチェック
        
        const pollInterval = setInterval(async () => {
          pollCount++;
          console.log(`🔄 Polling Dynamics 365 auth status (${pollCount}/${maxPolls})...`);
          
          try {
            const statusResponse = await fetch('/api/oauth/status', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              const dynamics365Auth = statusData.tokens?.dynamics365;
              
              if (dynamics365Auth?.authenticated) {
                console.log('✅ Dynamics 365 authentication detected via polling!');
                authDetected = true;
                clearInterval(pollInterval);
                clearInterval(windowCheckInterval); // ウィンドウチェックも停止
                setIsAuthenticating(false);
                
                // 認証状態を更新
                setIsAuthenticated(true);
                setAuthStatus(dynamics365Auth);
                toast.success('✅ Dynamics 365認証が完了しました！');
                
                // アカウントをすぐに読み込む
                setTimeout(() => {
                  loadAccounts();
                }, 100);
                
                return;
              }
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
        }, 2000); // 2秒間隔でポーリング
        }
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('OAuth login failed:', error);
      toast.error('Dynamics 365認証に失敗しました');
      setIsAuthenticating(false);
    }
  };


  // 取引先変更時に関連データを読み込み
  useEffect(() => {
    if (selectedAccount) {
      loadOpportunities(selectedAccount);
      loadActivities(selectedAccount);
      loadNotes(selectedAccount);
      loadMeetings(selectedAccount);
    } else {
      setOpportunities([]);
      setActivities([]);
      setNotes([]);
      setMeetings([]);
      setSelectedOpportunity('');
      setSelectedActivities([]);
      setSelectedNotes([]);
      setSelectedMeetings([]);
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const result = await dynamics365API.getAccounts(100);
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
      const result = await dynamics365API.getOpportunities(accountId, 50);
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
      const result = await dynamics365API.getActivities(accountId, 20);
      if (result.success) {
        setActivities(result.activities);
      } else {
        console.warn('活動の取得に失敗しました');
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
      const result = await dynamics365API.getNotes(accountId, 20);
      if (result.success) {
        setNotes(result.notes);
      } else {
        console.warn('メモの取得に失敗しました');
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
      const result = await dynamics365API.getMeetings(accountId, 20);
      if (result.success) {
        setMeetings(result.meetings);
      } else {
        console.warn('会議情報の取得に失敗しました');
      }
    } catch (error) {
      console.error('Load meetings error:', error);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const handleItemToggle = (itemId, itemType) => {
    switch (itemType) {
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
      
      // 選択された議事録データを収集
      const selectedActivityData = activities.filter(a => selectedActivities.includes(a.id));
      const selectedNoteData = notes.filter(n => selectedNotes.includes(n.id));
      const selectedMeetingData = meetings.filter(m => selectedMeetings.includes(m.id));

      // 議事録テキストを結合
      let meetingNotesText = '';
      
      if (selectedActivityData.length > 0) {
        meetingNotesText += '【活動記録】\n';
        selectedActivityData.forEach(activity => {
          meetingNotesText += `■ ${activity.subject}\n`;
          if (activity.description) {
            meetingNotesText += `${activity.description}\n`;
          }
          meetingNotesText += `（作成日: ${new Date(activity.createdOn).toLocaleDateString()}）\n\n`;
        });
      }

      if (selectedNoteData.length > 0) {
        meetingNotesText += '【メモ・議事録】\n';
        selectedNoteData.forEach(note => {
          meetingNotesText += `■ ${note.subject || 'メモ'}\n`;
          if (note.noteText) {
            meetingNotesText += `${note.noteText}\n`;
          }
          meetingNotesText += `（作成日: ${new Date(note.createdOn).toLocaleDateString()}）\n\n`;
        });
      }

      if (selectedMeetingData.length > 0) {
        meetingNotesText += '【会議記録】\n';
        selectedMeetingData.forEach(meeting => {
          meetingNotesText += `■ ${meeting.subject}\n`;
          if (meeting.description) {
            meetingNotesText += `${meeting.description}\n`;
          }
          if (meeting.location) {
            meetingNotesText += `場所: ${meeting.location}\n`;
          }
          meetingNotesText += `（開催日: ${new Date(meeting.scheduledStart).toLocaleDateString()}）\n\n`;
        });
      }

      const data = {
        type: 'dynamics365',
        dynamics365_account_id: selectedAccount,
        dynamics365_opportunity_id: selectedOpportunity || null,
        customer: selectedAccountData?.name || '',
        project: selectedOpportunityData?.name || '',
        meetingNotes: meetingNotesText || null,
        crmData: {
          selectedActivities: selectedActivityData,
          selectedNotes: selectedNoteData,
          selectedMeetings: selectedMeetingData
        }
      };

      // actionTypeを追加
      data.actionType = actionType; // 'update' or 'create'
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
          <ModalTitle>Dynamics 365から日報作成</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        {!isAuthenticated ? (
          <AuthSection>
            <AuthDescription>
              あなたのDynamics 365アカウントにログインして、取引先と商談情報を取得します。
            </AuthDescription>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <AuthButton onClick={handleOAuthLogin} disabled={isAuthenticating}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 11.4H2V2h9.4v9.4zm10.6 0h-9.4V2H22v9.4zM11.4 22H2v-9.4h9.4V22zm10.6 0h-9.4v-9.4H22V22z"/>
                </svg>
                {isAuthenticating ? '認証処理中...' : 'Dynamics 365にログイン'}
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
        ) : (
          <ModalScrollContent>

            {authStatus && (
              <div style={{ 
                marginBottom: 'var(--space-4)', 
                padding: 'var(--space-4)', 
                backgroundColor: '#e3f2fd',
                border: '2px solid #0078d4',
                borderRadius: '8px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    backgroundColor: '#0078d4', 
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
                      color: '#004578', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-bold)'
                    }}>
                      Dynamics 365 認証完了
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      marginTop: 'var(--space-1)',
                      fontSize: 'var(--font-size-micro)', 
                      color: '#0078d4'
                    }}>
                      {authStatus?.user_info?.displayName || 'ユーザー'}として接続中
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
                  backgroundColor: '#bbdefb', 
                  borderRadius: '4px',
                  fontSize: 'var(--font-size-micro)',
                  color: '#004578'
                }}>
                  🏢 取引先企業と商談情報にアクセスできます
                </div>
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
                  disabled={!isAuthenticated}
                >
                  <option value="">-- 取引先企業を選択 --</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
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
                        disabled={!selectedAccount || !isAuthenticated}
                      >
                        <option value="">-- 商談を選択（オプション） --</option>
                        {opportunities.map(opportunity => (
                          <option key={opportunity.id} value={opportunity.id}>
                            {opportunity.name} ({opportunity.status})
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
                    <Label>メモ・議事録を選択</Label>
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
                              <ItemTitle>{note.subject || 'メモ'}</ItemTitle>
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
                    <Label>会議記録を選択</Label>
                    {isLoadingMeetings ? (
                      <LoadingText>会議記録を読み込み中...</LoadingText>
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
                              {new Date(meeting.scheduledStart).toLocaleDateString()} • {meeting.location || '場所未設定'}
                            </div>
                          </ItemCard>
                        ))}
                      </ItemList>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-4)' }}>
                        会議記録が見つかりません
                      </div>
                    )}
                  </FormGroup>
                )}
              </>
            )}
          </ModalScrollContent>
        )}

        {isAuthenticated && (
          <ButtonContainer>
            <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
            <PrimaryButton 
              onClick={handleSubmit}
              disabled={!selectedAccount || isSubmitting || !isAuthenticated}
            >
              {isSubmitting ? '処理中...' : 'AIヒアリング開始'}
            </PrimaryButton>
          </ButtonContainer>
        )}
        
        {/* アクション選択ラジオボタン */}
        {isAuthenticated && (
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

export default Dynamics365Modal;