import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { aiAPI, reportAPI, hearingSettingsAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import VoiceInput from '../components/VoiceInput';
import AnswerSuggestions from '../components/AnswerSuggestions';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '../styles/designSystem';
import { Card as BaseCard, PrimaryButton, SecondaryButton, GhostButton } from '../styles/componentStyles';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  min-height: calc(100vh - 72px);

  @media (max-width: 768px) {
    padding: 0 var(--space-4);
    min-height: calc(100vh - 64px);
  }
  
  @media (max-width: 480px) {
    padding: 0 var(--space-3);
    max-width: 100%;
  }
  
  @media (max-width: 390px) {
    padding: 0 var(--space-2);
  }
`;

const Card = styled.div`
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-paper);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
  position: relative;

  @media (max-width: 768px) {
    padding: var(--space-5);
    margin-bottom: var(--space-4);
  }
  
  @media (max-width: 480px) {
    padding: var(--space-4);
    margin: 0 0 var(--space-3) 0;
    border-left: none;
    border-right: none;
    border-radius: 0;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: var(--color-border);
  border-radius: var(--radius-none);
  margin-bottom: var(--space-6);
  overflow: hidden;
  position: relative;
  border: 1px solid var(--color-border);
  
  @media (max-width: 480px) {
    height: 6px;
    margin-bottom: var(--space-4);
  }
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-none);
  transition: width 0.3s ease-in-out;
  width: ${props => props.progress}%;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 100%;
    background: var(--color-accent);
    opacity: 0.8;
  }
`;

const QuestionSection = styled.div`
  margin-bottom: var(--space-6);
  padding: var(--space-5);
  background: var(--color-accent-light);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-accent);
  border-left: 6px solid var(--color-accent);
  position: relative;

  @media (max-width: 768px) {
    padding: var(--space-4);
    margin-bottom: var(--space-5);
  }
  
  @media (max-width: 480px) {
    padding: var(--space-3);
    margin-bottom: var(--space-4);
  }
`;

const QuestionText = styled.h2`
  font-size: var(--font-size-heading);
  color: var(--color-primary);
  margin-bottom: 0;
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-comfortable);
  letter-spacing: -0.01em;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  @media (max-width: 768px) {
    font-size: var(--font-size-title);
  }
  
  @media (max-width: 480px) {
    font-size: var(--font-size-body);
    line-height: var(--line-height-standard);
    font-weight: var(--font-weight-medium);
  }
`;

const AnswerSection = styled.div`
  margin-bottom: var(--space-6);
  
  @media (max-width: 480px) {
    margin-bottom: var(--space-4);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-body);
  resize: vertical;
  background: var(--color-background);
  transition: all 0.2s ease-in-out;
  line-height: var(--line-height-standard);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--color-text-primary);
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;

  &:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: var(--shadow-focused);
    background: var(--color-surface);
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }
  
  @media (max-width: 480px) {
    min-height: 120px;
    font-size: var(--font-size-small);
    padding: var(--space-3);
  }
`;

const InputModeButtons = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  
  @media (max-width: 480px) {
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
`;

const ModeButton = styled.button`
  flex: 1;
  padding: var(--space-3);
  border: 2px solid ${props => props.active ? 'var(--color-primary)' : 'var(--color-border)'};
  background: ${props => props.active ? 'var(--color-surface)' : 'var(--color-background)'};
  color: ${props => props.active ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
  border-radius: var(--radius-none);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: all 0.2s ease-in-out;
  font-size: var(--font-size-small);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-tap-highlight-color: transparent;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-height: 48px;

  &:hover:not(:disabled) {
    border-color: var(--color-accent);
    background: var(--color-surface);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 480px) {
    padding: var(--space-3) var(--space-2);
    font-size: var(--font-size-micro);
    min-height: 44px;
    
    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-top: var(--space-4);
  flex-wrap: wrap;
  
  /* 固定フッター風のスタイル */
  position: sticky;
  bottom: 0;
  background: var(--color-surface);
  padding: var(--space-4) 0;
  border-top: 2px solid var(--color-border);
  margin-left: calc(-1 * var(--space-6));
  margin-right: calc(-1 * var(--space-6));
  padding-left: var(--space-6);
  padding-right: var(--space-6);

  @media (max-width: 768px) {
    gap: var(--space-3);
    margin-left: calc(-1 * var(--space-5));
    margin-right: calc(-1 * var(--space-5));
    padding-left: var(--space-5);
    padding-right: var(--space-5);
  }
  
  @media (max-width: 480px) {
    gap: var(--space-2);
    margin-left: calc(-1 * var(--space-4));
    margin-right: calc(-1 * var(--space-4));
    padding-left: var(--space-4);
    padding-right: var(--space-4);
    padding-top: var(--space-3);
    padding-bottom: var(--space-3);
  }
  
  @media (max-width: 400px) {
    gap: var(--space-1);
    margin-left: calc(-1 * var(--space-3));
    margin-right: calc(-1 * var(--space-3));
    padding-left: var(--space-3);
    padding-right: var(--space-3);
    padding-top: var(--space-2);
    padding-bottom: var(--space-2);
  }
`;

const Button = styled.button`
  padding: ${spacing[3]} ${spacing[6]};
  border-radius: ${borderRadius.md};
  font-weight: ${typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${transitions.fast};
  border: none;
  font-size: ${typography.fontSize.sm};
  font-family: ${typography.fontFamily.sans};
  box-shadow: ${shadows.xs};

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const SkipButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  -webkit-tap-highlight-color: transparent;
  flex: 1;
  min-height: 48px;

  &:hover:not(:disabled) {
    background: var(--color-surface);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 480px) {
    min-height: 44px;
    font-size: var(--font-size-micro);
  }
  
  @media (max-width: 400px) {
    padding: var(--space-2) var(--space-3);
    min-height: 40px;
    font-size: 11px;
  }
`;

const NextButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-primary);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  -webkit-tap-highlight-color: transparent;
  flex: 1.5;
  min-height: 48px;
  box-shadow: var(--shadow-elevation);

  &:hover:not(:disabled) {
    background: var(--color-accent);
    border-color: var(--color-accent);
    transform: translateY(-1px);
    box-shadow: var(--shadow-structure);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: var(--shadow-paper);
  }
  
  @media (max-width: 480px) {
    min-height: 44px;
    font-size: var(--font-size-micro);
  }
  
  @media (max-width: 400px) {
    padding: var(--space-2) var(--space-3);
    min-height: 40px;
    font-size: 11px;
  }
`;

const BackButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  -webkit-tap-highlight-color: transparent;
  flex: 1;
  min-height: 48px;

  &:hover:not(:disabled) {
    background: var(--color-surface);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 480px) {
    min-height: 44px;
    font-size: var(--font-size-micro);
  }
  
  @media (max-width: 400px) {
    padding: var(--space-2) var(--space-3);
    min-height: 40px;
    font-size: 11px;
  }
`;

const CorrectionButton = styled.button`
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-accent);
  background: var(--color-background);
  color: var(--color-accent);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  -webkit-tap-highlight-color: transparent;
  flex: 1;
  min-height: 48px;

  &:hover:not(:disabled) {
    background: var(--color-accent-light);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 480px) {
    min-height: 44px;
    font-size: var(--font-size-micro);
  }
  
  @media (max-width: 400px) {
    padding: var(--space-2) var(--space-3);
    min-height: 40px;
    font-size: 11px;
  }
`;

const CompletedSection = styled.div`
  text-align: center;
  padding: var(--space-6);
  
  @media (max-width: 480px) {
    padding: var(--space-4);
  }
`;

const CompletedIcon = styled.div`
  margin-bottom: var(--space-4);
  display: flex;
  justify-content: center;
  
  svg {
    color: var(--color-success);
  }
`;

const CompletedText = styled.h2`
  font-size: var(--font-size-heading);
  color: var(--color-primary);
  margin-bottom: var(--space-4);
  font-weight: var(--font-weight-bold);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  @media (max-width: 480px) {
    font-size: var(--font-size-title);
  }
`;

const HearingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const forceTextMode = searchParams.get('mode') === 'text';
  const meetingMode = searchParams.get('mode') === 'meeting';
  const dynamics365Mode = searchParams.get('mode') === 'dynamics365';
  const salesforceMode = searchParams.get('mode') === 'salesforce';
  const sessionIdFromParams = searchParams.get('sessionId');
  const settingIdFromParams = searchParams.get('settingId');
  
  const [sessionId, setSessionId] = useState(sessionIdFromParams || null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [answer, setAnswer] = useState('');
  const [inputMode, setInputMode] = useState(forceTextMode ? 'text' : 'voice');
  const [allowInputModeSwitch, setAllowInputModeSwitch] = useState(true); // 入力モード切り替え可否
  const [slots, setSlots] = useState({});
  const [completed, setCompleted] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [questionsAnswers, setQuestionsAnswers] = useState([]);
  const [questionHistory, setQuestionHistory] = useState([]); // 質問履歴を保存
  const [askedQuestions, setAskedQuestions] = useState([]); // 重複防止用質問履歴
  const [isRevisiting, setIsRevisiting] = useState(false); // 戻って回答を修正中かどうか
  const [extractedInfo, setExtractedInfo] = useState(null); // 議事録から抽出された情報
  const [suggestions, setSuggestions] = useState([]); // 回答候補
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false); // 選択肢読み込み中
  const [allowMultipleSuggestions, setAllowMultipleSuggestions] = useState(true); // 複数選択許可
  const [isCorrecting, setIsCorrecting] = useState(false); // AI補正中フラグ

  // Start hearing session
  const startMutation = useMutation({
    mutationFn: (requestData = {}) => {
      // パラメータとして渡された場合はそれを使用、そうでなければ従来の方法
      if (Object.keys(requestData).length === 0) {
        // 参考データとデータソースを送信
        if (extractedInfo) {
          requestData.referenceData = extractedInfo;
          if (dynamics365Mode) {
            requestData.dataSource = 'dynamics365';
            requestData.crmType = 'dynamics365';
          } else if (salesforceMode) {
            requestData.dataSource = 'salesforce';
            requestData.crmType = 'salesforce';
          } else if (meetingMode) {
            requestData.dataSource = 'meeting';
          }
        }
      }
      return aiAPI.startHearing(requestData);
    },
    onSuccess: (data) => {
      console.log('Start hearing response:', data);
      console.log('Received question:', data.question);
      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      
      // サーバーから返された初期スロットと参照データを設定
      if (data.initialSlots) {
        setSlots(data.initialSlots);
        console.log('Setting initial slots from server:', data.initialSlots);
      }
      if (data.referenceData) {
        setExtractedInfo(data.referenceData);
        console.log('Setting extracted info from server:', data.referenceData);
      }
      
      // 初回の質問を履歴に追加
      setQuestionHistory([{
        question: data.question,
        questionIndex: data.questionIndex,
        slots: data.initialSlots || {},
        answer: '', // 初回の回答は空
        suggestions: data.suggestions || [], // 選択肢を保存
        allowMultiple: data.allowMultiple || false // 複数選択設定を保存
      }]);
      setAskedQuestions(data.askedQuestions || [data.question]);
      
      // サーバーから返された選択肢があれば設定
      if (data.suggestions && data.suggestions.length > 0) {
        // 選択肢が全て文字列であることを確認
        const validSuggestions = data.suggestions.map(item => {
          if (typeof item === 'string') {
            return item;
          } else if (typeof item === 'object' && item !== null) {
            console.warn('Initial suggestions contained object:', item);
            return item.text || item.suggestion || item.content || 
                   item.内容 || item.商談内容 || item.答え || 
                   item.value || JSON.stringify(item);
          }
          return String(item);
        }).filter(s => s && s.length > 0);
        
        setSuggestions(validSuggestions);
        setIsLoadingSuggestions(false);
      }
      // サーバーから複数選択の設定が返された場合
      if (data.allowMultiple !== undefined) {
        setAllowMultipleSuggestions(data.allowMultiple);
      }
    },
    onError: () => {
      toast.error('セッションの開始に失敗しました');
    }
  });

  // Submit answer
  const answerMutation = useMutation({
    mutationFn: (data) => aiAPI.submitAnswer(data),
    onSuccess: (data) => {
      if (data.completed) {
        setCompleted(true);
        setSlots(data.slots);
        // slotsを直接渡して保存
        saveReportWithSlots(data.slots);
      } else {
        setCurrentQuestion(data.question);
        setQuestionIndex(data.questionIndex);
        setTotalQuestions(data.totalQuestions);
        setSlots(data.slots);
        
        // 新しい質問を履歴に追加（前の回答も保存）
        setQuestionHistory(prev => {
          // 現在の質問に回答を追加
          const updatedHistory = [...prev];
          if (updatedHistory.length > 0) {
            updatedHistory[updatedHistory.length - 1].answer = answer;
            // 現在の選択肢情報も保存
            updatedHistory[updatedHistory.length - 1].suggestions = suggestions;
            updatedHistory[updatedHistory.length - 1].allowMultiple = allowMultipleSuggestions;
          }
          // 新しい質問を追加
          return [...updatedHistory, {
            question: data.question,
            questionIndex: data.questionIndex,
            slots: data.slots,
            answer: '', // 新しい質問の回答は空
            suggestions: data.suggestions || [], // 新しい選択肢
            allowMultiple: data.allowMultiple || false // 新しい複数選択設定
          }];
        });
        
        setAnswer(''); // 入力フィールドをクリア
        setIsRevisiting(false); // 修正モードをリセット
        if (data.askedQuestions) {
          setAskedQuestions(data.askedQuestions);
        }
        
        // サーバーから返された選択肢があれば即座に設定（先読みデータ）
        if (data.suggestions && data.suggestions.length > 0) {
          // 選択肢が全て文字列であることを確認
          const validSuggestions = data.suggestions.map(item => {
            if (typeof item === 'string') {
              return item;
            } else if (typeof item === 'object' && item !== null) {
              console.warn('Answer mutation suggestions contained object:', item);
              return item.text || item.suggestion || item.content || 
                     item.内容 || item.商談内容 || item.答え || 
                     item.value || JSON.stringify(item);
            }
            return String(item);
          }).filter(s => s && s.length > 0);
          
          setSuggestions(validSuggestions);
          setIsLoadingSuggestions(false);
        } else {
          // 選択肢がない場合はクリア
          setSuggestions([]);
          setIsLoadingSuggestions(false);
        }
        // サーバーから複数選択の設定が返された場合
        if (data.allowMultiple !== undefined) {
          setAllowMultipleSuggestions(data.allowMultiple);
        }
      }
    },
    onError: () => {
      toast.error('回答の送信に失敗しました');
    }
  });

  // Save report
  const saveReportMutation = useMutation({
    mutationFn: (data) => reportAPI.createReport(data),
    onSuccess: (data) => {
      toast.success('日報を保存しました');
      navigate(`/reports/${data.id}`);
    },
    onError: () => {
      toast.error('日報の保存に失敗しました');
    }
  });

  useEffect(() => {
    if (isOnline) {
      // リアルタイム音声から来た場合
      if (location.state?.fromRealtime && location.state?.initialData) {
        handleRealtimeDataInit();
      } else if (meetingMode && sessionIdFromParams) {
        // 議事録モードの場合は、既存のセッション情報を取得
        handleMeetingModeInit();
      } else if (dynamics365Mode) {
        // Dynamics 365モードの場合
        handleDynamics365ModeInit();
      } else if (salesforceMode) {
        // Salesforceモードの場合
        handleSalesforceModeInit();
      } else if (settingIdFromParams) {
        // 特定の設定IDで開始
        handleHearingWithSetting(settingIdFromParams);
      } else {
        // 通常のヒアリングモード
        startMutation.mutate();
      }
    }
  }, []);

  const handleHearingWithSetting = async (settingId) => {
    try {
      // 設定を読み込む
      const setting = await hearingSettingsAPI.get(settingId);
      
      if (setting) {
        // 設定を使用してヒアリングを開始
        const requestData = {
          settingId: setting.id,
          greeting: setting.greeting,
          customQuestions: setting.custom_questions,
          maxQuestions: setting.max_questions,
          inputMode: setting.input_mode,
          requiredSlots: setting.required_slots,
          optionalSlots: setting.optional_slots,
          enableFollowUp: setting.enable_follow_up,
          followUpThreshold: setting.follow_up_threshold,
          enableSmartSkip: setting.enable_smart_skip
        };
        
        // 入力モードを設定から適用
        if (setting.input_mode) {
          if (setting.input_mode === 'both') {
            // 両方の場合は音声をデフォルトにして切り替え可能
            setInputMode('voice');
            setAllowInputModeSwitch(true);
          } else {
            // 単一モードの場合は切り替え不可
            setInputMode(setting.input_mode);
            setAllowInputModeSwitch(false);
          }
        }
        
        // 最大質問数を設定
        if (setting.max_questions) {
          setTotalQuestions(setting.max_questions);
        }
        
        console.log('Starting hearing with setting:', requestData);
        startMutation.mutate(requestData);
        
        // 設定の使用回数を記録するためにセッション作成
        hearingSettingsAPI.createSession({
          setting_id: setting.id,
          session_start: new Date()
        }).catch(error => {
          console.error('Failed to record session:', error);
          // セッション記録の失敗は続行に影響しない
        });
      } else {
        toast.error('設定が見つかりませんでした');
        // デフォルト設定で開始
        startMutation.mutate();
      }
    } catch (error) {
      console.error('Failed to load hearing setting:', error);
      toast.error('設定の読み込みに失敗しました');
      // エラーの場合もデフォルト設定で開始
      startMutation.mutate();
    }
  };

  const handleRealtimeDataInit = async () => {
    try {
      const realtimeData = location.state?.initialData;
      if (!realtimeData) {
        toast.error('リアルタイムデータが見つかりません');
        navigate('/');
        return;
      }

      // リアルタイム音声で収集したデータをスロットに設定
      const initialSlots = {
        customer: realtimeData.customer || '',
        project: realtimeData.project || '',
        budget: realtimeData.budget || '',
        schedule: realtimeData.schedule || '',
        next_action: realtimeData.next_action || '',
        participants: realtimeData.participants || [],
        location: realtimeData.location || '',
        issues: realtimeData.issues || ''
      };

      setSlots(initialSlots);
      setExtractedInfo(initialSlots);
      
      // 会話履歴から質問と回答を抽出
      if (realtimeData.conversationHistory) {
        const qa = realtimeData.conversationHistory
          .filter((msg, index, arr) => {
            // AIの質問とユーザーの回答をペアにする
            return msg.role === 'assistant' && arr[index + 1]?.role === 'user';
          })
          .map((msg, index) => ({
            question: msg.text,
            answer: realtimeData.conversationHistory[realtimeData.conversationHistory.findIndex(m => m === msg) + 1]?.text || ''
          }));
        setQuestionsAnswers(qa);
      }

      // すでにデータが収集されているので、完了状態にする
      setCompleted(true);
      
    } catch (error) {
      console.error('Failed to initialize realtime data:', error);
      toast.error('リアルタイムデータの初期化に失敗しました');
      navigate('/');
    }
  };

  const handleMeetingModeInit = async () => {
    try {
      // location.stateから議事録データを優先的に取得
      const stateExtractedInfo = location.state?.extractedInfo;
      const stateMeetingContent = location.state?.meetingContent;
      
      let extractedInfoToUse = stateExtractedInfo;
      
      // stateにない場合は、サーバーからセッション情報を取得
      if (!extractedInfoToUse && sessionIdFromParams) {
        const sessionData = await aiAPI.getSession(sessionIdFromParams);
        if (sessionData && sessionData.extractedInfo) {
          extractedInfoToUse = sessionData.extractedInfo;
        }
      }
      
      if (extractedInfoToUse) {
        setExtractedInfo(extractedInfoToUse);
        setSlots(extractedInfoToUse);

        // 議事録モード用の設定を取得
        let meetingSettings = null;
        try {
          const allSettings = await hearingSettingsAPI.getAll();
          // 議事録モード用の設定を優先、なければデフォルト設定
          meetingSettings = allSettings.find(s => s.input_mode === 'meeting' && s.is_default) ||
                           allSettings.find(s => s.input_mode === 'meeting') ||
                           allSettings.find(s => s.is_default);

          console.log('Meeting mode settings:', meetingSettings);
        } catch (err) {
          console.log('No meeting settings found, using defaults');
        }

        // AIヒアリングセッションを開始（議事録データ + カスタム設定）
        const requestData = {
          referenceData: extractedInfoToUse,
          dataSource: 'meeting',
          meetingContent: stateMeetingContent, // 議事録の原文も送信
          // カスタム設定を適用（greetingは議事録から自動生成されるため含めない）
          customQuestions: meetingSettings?.custom_questions,
          maxQuestions: meetingSettings?.max_questions,
          requiredSlots: meetingSettings?.required_slots,
          enableFollowUp: meetingSettings?.enable_follow_up,
          enableSmartSkip: meetingSettings?.enable_smart_skip
        };

        console.log('Sending meeting data with custom settings to server:', requestData);
        startMutation.mutate(requestData);
      } else {
        toast.error('セッション情報が見つかりません');
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to initialize meeting mode:', error);
      toast.error('議事録セッションの初期化に失敗しました');
      navigate('/');
    }
  };

  const handleDynamics365ModeInit = async () => {
    try {
      // location.stateからDynamics 365データを取得
      const dynamics365Data = location.state?.dynamics365Data;
      if (!dynamics365Data) {
        toast.error('Dynamics 365データが見つかりません');
        navigate('/');
        return;
      }

      // Dynamics 365データを基にスロットを初期化
      const initialSlots = {
        customer: dynamics365Data.customer || '',
        project: dynamics365Data.project || '',
        dynamics365_account_id: dynamics365Data.dynamics365_account_id,
        dynamics365_opportunity_id: dynamics365Data.dynamics365_opportunity_id,
        actionType: dynamics365Data.crmActionType || dynamics365Data.actionType || 'update'
      };

      setSlots(initialSlots);
      setExtractedInfo(initialSlots);

      // AIヒアリングセッションを開始（Dynamics 365データを参考データとして送信）
      const requestData = {
        referenceData: initialSlots,
        dataSource: 'dynamics365',
        crmType: 'dynamics365'
      };
      
      startMutation.mutate(requestData);

    } catch (error) {
      console.error('Failed to initialize Dynamics 365 mode:', error);
      toast.error('Dynamics 365セッションの初期化に失敗しました');
      navigate('/');
    }
  };

  const handleSalesforceModeInit = async () => {
    try {
      // location.stateからSalesforceデータを取得
      const salesforceData = location.state?.salesforceData;
      if (!salesforceData) {
        toast.error('Salesforceデータが見つかりません');
        navigate('/');
        return;
      }

      // Salesforceデータを基にスロットを初期化
      const initialSlots = {
        customer: salesforceData.customer || '',
        project: salesforceData.project || '',
        salesforce_account_id: salesforceData.salesforce_account_id,
        salesforce_opportunity_id: salesforceData.salesforce_opportunity_id,
        // 選択された活動記録、メモ、会議情報を含める
        selectedActivities: salesforceData.selectedActivities || [],
        selectedNotes: salesforceData.selectedNotes || [],
        selectedMeetings: salesforceData.selectedMeetings || [],
        meetingContext: salesforceData.meetingContext || '',
        actionType: salesforceData.crmActionType || salesforceData.actionType || 'update'
      };

      setSlots(initialSlots);
      setExtractedInfo(initialSlots);

      // AIヒアリングセッションを開始（Salesforceデータを参考データとして送信）
      const requestData = {
        referenceData: initialSlots,
        dataSource: 'salesforce',
        crmType: 'salesforce'
      };
      
      startMutation.mutate(requestData);
    } catch (error) {
      console.error('Failed to initialize Salesforce mode:', error);
      toast.error('Salesforceセッションの初期化に失敗しました');
      navigate('/');
    }
  };

  const generateFirstQuestionFromSalesforceData = (data) => {
    if (data.customer && data.project) {
      return `お疲れ様です！${data.customer}さんとの「${data.project}」の件ですね。今日の商談はいかがでしたか？`;
    } else if (data.customer) {
      return `お疲れ様です！${data.customer}さんとの商談の件ですね。今日はどのような話し合いでしたか？`;
    } else {
      return `お疲れ様です！Salesforceから選択された案件についてお聞かせください。今日の商談はいかがでしたか？`;
    }
  };

  const generateFirstQuestionFromDynamics365Data = (data) => {
    if (data.customer && data.project) {
      return `お疲れ様です！${data.customer}さんとの「${data.project}」の件ですね。今日の商談はいかがでしたか？`;
    } else if (data.customer) {
      return `お疲れ様です！${data.customer}さんとの商談の件ですね。今日はどのような話し合いでしたか？`;
    } else {
      return `お疲れ様です！Dynamics 365から選択された案件についてお聞かせください。今日の商談はいかがでしたか？`;
    }
  };

  const generateFirstQuestionFromExtractedInfo = (info) => {
    const hasCustomer = info.customer;
    const hasProject = info.project;
    const hasKeyPoints = info.key_points && info.key_points.length > 0;

    if (hasCustomer && hasProject) {
      return `議事録を拝見しました。${info.customer}の${info.project}についてですね。${hasKeyPoints ? '重要なポイントも把握できました。' : ''}議事録に記載されていない詳細や、実際の雰囲気について教えてください。特に印象に残った点はありましたか？`;
    } else if (hasCustomer) {
      return `議事録を拝見しました。${info.customer}との商談についてですね。議事録に記載されていない詳細や、実際の商談の雰囲気について教えてください。`;
    } else {
      return `議事録を拝見しました。記載されている内容以外で、実際の商談の雰囲気や印象に残った点について教えてください。`;
    }
  };

  // 選択肢を取得する関数
  const fetchSuggestions = async () => {
    if (!currentQuestion || inputMode !== 'text') return;
    
    // データソースを判定
    let dataSource = null;
    let referenceData = null;
    
    if (dynamics365Mode && extractedInfo) {
      dataSource = 'dynamics365';
      referenceData = extractedInfo;
    } else if (salesforceMode && extractedInfo) {
      dataSource = 'salesforce';
      referenceData = extractedInfo;
    } else if (meetingMode && extractedInfo) {
      dataSource = 'meeting';
      referenceData = extractedInfo;
    }
    
    // 通常のテキストモードの場合も選択肢を生成
    if (!dataSource && !referenceData && !meetingMode) {
      // 議事録/CRMモードではない通常のテキスト開始の場合
      // テキスト入力モードは常にgeneralを使用
      dataSource = 'general';
      referenceData = null;
    }
    
    // 議事録モードの場合、dataSourceとreferenceDataを設定
    if (meetingMode && !dataSource) {
      dataSource = 'meeting';
      referenceData = extractedInfo || {};
    }
    
    setIsLoadingSuggestions(true);
    console.log('Fetching suggestions with:', {
      currentQuestion,
      dataSource,
      hasReferenceData: !!referenceData,
      questionIndex,
      inputMode
    });
    
    try {
      // 3問目以降は過去の質問・回答を含める
      const requestData = {
        currentQuestion,
        referenceData,
        currentSlots: slots,
        dataSource
      };
      
      // 3問目以降の場合、過去の会話履歴を追加
      if (questionIndex >= 2 && questionHistory.length > 0) {
        requestData.conversationHistory = questionHistory.map(h => ({
          question: h.question,
          answer: h.answer,
          suggestions: h.suggestions || []
        }));
      }
      
      console.log('Requesting suggestions with data:', requestData);
      const response = await aiAPI.getSuggestions(requestData);
      console.log('Suggestions response:', response);
      
      if (response.suggestions && Array.isArray(response.suggestions)) {
        // 選択肢が全て文字列であることを確認
        const validSuggestions = response.suggestions.map(item => {
          if (typeof item === 'string') {
            return item;
          } else if (typeof item === 'object' && item !== null) {
            // オブジェクトの場合は文字列に変換
            console.warn('Received object instead of string in suggestions:', item);
            // 様々なプロパティから文字列を抽出
            return item.text || item.suggestion || item.content || 
                   item.内容 || item.商談内容 || item.答え || 
                   item.value || JSON.stringify(item);
          }
          return String(item);
        }).filter(s => s && s.length > 0);
        
        console.log('Setting validated suggestions:', validSuggestions);
        setSuggestions(validSuggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // 質問が変わったときに選択肢を取得（サーバーから選択肢が返されていない場合のみ）
  useEffect(() => {
    // 既に選択肢が設定されている場合はスキップ（先読みデータ利用）
    if (suggestions.length === 0 && !isLoadingSuggestions) {
      fetchSuggestions();
    }
  }, [currentQuestion, inputMode]);

  // 選択肢を選択したときの処理
  const handleSuggestionSelect = (suggestion) => {
    setAnswer(suggestion);
  };

  const handleNext = () => {
    
    if (!answer.trim()) {
      toast.error('回答を入力してください');
      return;
    }

    if (isRevisiting) {
      // 戻って修正した場合は、その位置から再度進む
      const currentHistoryIndex = questionHistory.findIndex(
        h => h.question === currentQuestion && h.questionIndex === questionIndex
      );
      
      if (currentHistoryIndex !== -1) {
        // 履歴を現在の位置までに切り詰める
        const newHistory = questionHistory.slice(0, currentHistoryIndex + 1);
        newHistory[currentHistoryIndex].answer = answer;
        setQuestionHistory(newHistory);
        
        // 質問回答も同じ位置まで切り詰める
        const newQuestionsAnswers = questionsAnswers.slice(0, currentHistoryIndex);
        newQuestionsAnswers.push({
          question: currentQuestion,
          answer: answer,
          timestamp: new Date().toLocaleTimeString('ja-JP')
        });
        setQuestionsAnswers(newQuestionsAnswers);
        
        // askedQuestionsも調整
        const newAskedQuestions = askedQuestions.slice(0, currentHistoryIndex + 1);
        setAskedQuestions(newAskedQuestions);
      }
      
      setIsRevisiting(false);
    } else {
      // 通常の次へ処理
      const newQA = {
        question: currentQuestion,
        answer: answer,
        timestamp: new Date().toLocaleTimeString('ja-JP')
      };
      setQuestionsAnswers([...questionsAnswers, newQA]);
    }

    // 参考データとデータソースも送信
    const requestData = {
      sessionId,
      questionIndex,
      answer,
      currentSlots: slots,
      askedQuestions: isRevisiting ? askedQuestions.slice(0, questionIndex + 1) : askedQuestions
    };
    
    if (extractedInfo) {
      requestData.referenceData = extractedInfo;
      if (dynamics365Mode) {
        requestData.dataSource = 'dynamics365';
        requestData.crmType = 'dynamics365';
      } else if (salesforceMode) {
        requestData.dataSource = 'salesforce';
        requestData.crmType = 'salesforce';
      } else if (meetingMode) {
        requestData.dataSource = 'meeting';
      }
    }
    
    answerMutation.mutate(requestData);
  };

  const handleSkip = () => {
    setAnswer('スキップ');
    handleNext();
  };

  const handleGoBack = () => {
    
    if (questionHistory.length <= 1) {
      toast.error('最初の質問です');
      return;
    }

    // 最後の質問・回答を削除
    const newQuestionsAnswers = questionsAnswers.slice(0, -1);
    setQuestionsAnswers(newQuestionsAnswers);

    // 現在の回答を履歴に保存してから戻る
    const updatedHistory = [...questionHistory];
    if (updatedHistory.length > 0) {
      updatedHistory[updatedHistory.length - 1].answer = answer;
      // 現在の選択肢情報も保存
      updatedHistory[updatedHistory.length - 1].suggestions = suggestions;
      updatedHistory[updatedHistory.length - 1].allowMultiple = allowMultipleSuggestions;
    }

    // 履歴から最後のエントリを削除し、前の質問に戻る
    const newHistory = updatedHistory.slice(0, -1);
    const previousQuestion = newHistory[newHistory.length - 1];
    
    setQuestionHistory(newHistory);
    setCurrentQuestion(previousQuestion.question);
    setQuestionIndex(previousQuestion.questionIndex);
    setSlots(previousQuestion.slots);
    setAnswer(previousQuestion.answer || ''); // 履歴から前の回答を復元
    
    // 選択肢情報を復元
    if (previousQuestion.suggestions) {
      setSuggestions(previousQuestion.suggestions);
      setAllowMultipleSuggestions(previousQuestion.allowMultiple || false);
      setIsLoadingSuggestions(false);
    }
    
    setIsRevisiting(true); // 戻って修正モードをONにする
  };

  const handleVoiceResult = (transcript) => {
    setAnswer(transcript);
  };

  // AI補正処理
  const handleCorrection = async () => {
    if (!answer || isCorrecting) return;

    console.log('Starting correction for:', answer);
    setIsCorrecting(true);
    try {
      const result = await aiAPI.correctText(answer);
      console.log('Correction result:', result);
      
      if (result && result.correctedText) {
        setAnswer(result.correctedText);
        toast.success('テキストを補正しました');
      } else {
        console.warn('No corrected text in response:', result);
        toast.error('補正結果が取得できませんでした');
      }
    } catch (error) {
      console.error('Correction error:', error);
      toast.error('補正に失敗しました');
    } finally {
      setIsCorrecting(false);
    }
  };

  const saveReport = () => {
    saveReportWithSlots(slots);
  };

  const saveReportWithSlots = (slotsData) => {
    try {
      // Get current JST date (UTC+9)
      const now = new Date();
      const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      
      // slotsDataの検証とクリーンアップ
      const finalSlots = slotsData || slots || {};
      
      // オブジェクト配列を文字列に変換
      const cleanedSlots = {};
      Object.keys(finalSlots).forEach(key => {
        const value = finalSlots[key];
        if (Array.isArray(value)) {
          // 配列の場合、各要素を適切に処理
          cleanedSlots[key] = value.map(item => {
            if (typeof item === 'object' && item !== null) {
              // issues の場合
              if (key === 'issues') {
                return item.issue || item.description || item.text || item.content || '';
              }
              // next_action の場合
              if (key === 'next_action') {
                if (item.task) {
                  const parts = [item.task];
                  if (item.responsible) parts.push(`担当: ${item.responsible}`);
                  if (item.deadline) parts.push(`期限: ${item.deadline}`);
                  return parts.join(' ');
                }
                return item.action || item.text || item.content || '';
              }
              // schedule の場合
              if (key === 'schedule') {
                if (item.phase && item.due_date) {
                  return `${item.phase}(${item.due_date})`;
                }
              }
              // 参加者の場合
              if (key === 'participants') {
                if (item.name && item.company) {
                  return `${item.name}(${item.company})`;
                }
                if (item.name) return item.name;
                if (item.company && item.role) {
                  return `${item.company} ${item.role}`;
                }
              }
              // その他のオブジェクト
              return item.name || item.title || item.label || item.value || '';
            }
            return String(item);
          }).join(', ');
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // 単一のオブジェクトの場合
          cleanedSlots[key] = value.name || value.title || value.label || value.value || JSON.stringify(value);
        } else {
          // その他の値はそのまま
          cleanedSlots[key] = value;
        }
      });
      
      console.log('Saving report with cleaned slots:', cleanedSlots);
      console.log('Questions and answers:', questionsAnswers);
      
      const reportData = {
        report_date: jstDate.toISOString().split('T')[0],
        mode: dynamics365Mode ? 'dynamics365' : salesforceMode ? 'salesforce' : 'hearing',
        questions_answers: questionsAnswers || [],
        slots: cleanedSlots
      };

      // CRM関連データがある場合は追加
      if (dynamics365Mode) {
        reportData.crm_data = {
          type: 'dynamics365',
          actionType: extractedInfo?.actionType || 'update',
          account: { id: finalSlots.dynamics365_account_id },
          opportunity: { id: finalSlots.dynamics365_opportunity_id }
        };
      } else if (salesforceMode) {
        reportData.crm_data = {
          type: 'salesforce',
          actionType: extractedInfo?.actionType || 'update',
          account: { id: finalSlots.salesforce_account_id },
          opportunity: { id: finalSlots.salesforce_opportunity_id }
        };
      }

      console.log('Final report data:', reportData);
      saveReportMutation.mutate(reportData);
    } catch (error) {
      console.error('Error preparing report data:', error);
      toast.error('日報データの準備に失敗しました');
    }
  };

  const progress = ((questionIndex + 1) / totalQuestions) * 100;

  // 値を安全にレンダリングするヘルパー関数
  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    // オブジェクトの場合（スケジュールなど）
    if (typeof value === 'object' && !Array.isArray(value)) {
      // スケジュール関連のフィールドを日本語で表示
      const scheduleFields = {
        next_phase_deadline: '次フェーズ期限',
        initial_release: '初期リリース',
        customer_review_meeting: '顧客レビュー会議',
        deadline: '締切',
        start_date: '開始日',
        end_date: '終了日',
        kickoff: 'キックオフ',
        milestone: 'マイルストーン'
      };
      
      const entries = Object.entries(value);
      if (entries.length === 0) return '';
      
      // スケジュールフィールドの場合は整形して表示
      const formattedItems = entries.map(([key, val]) => {
        const label = scheduleFields[key] || key;
        // 日付形式の文字列の場合、読みやすく変換
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
          const date = new Date(val);
          const formatted = date.toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          return `${label}: ${formatted}`;
        }
        return `${label}: ${val}`;
      });
      
      return formattedItems.join('、');
    }
    
    if (Array.isArray(value)) {
      // 配列の要素がオブジェクトの場合の処理
      return value.map(item => {
        if (typeof item === 'object' && item !== null) {
          // スケジュール項目の場合
          if (item.phase && item.due_date) {
            return `${item.phase}(${item.due_date})`;
          }
          // 成果物も含む場合
          if (item.phase && item.due_date && item.deliverable) {
            return `${item.phase}(${item.due_date}): ${item.deliverable}`;
          }
          // オブジェクトから表示可能な値を抽出
          if (item.name) return item.name;
          if (item.title) return item.title;
          if (item.label) return item.label;
          if (item.value) return item.value;
          // その他のオブジェクトは文字列化
          return JSON.stringify(item);
        }
        return item;
      }).join(', ');
    }
    
    if (typeof value === 'object') {
      // オブジェクトの場合は、読みやすい形式で表示
      try {
        // 特定のプロパティを優先的に表示
        if (value.name) return value.name;
        if (value.title) return value.title;
        if (value.label) return value.label;
        if (value.value) return value.value;
        
        // それ以外の場合はキーと値を表示
        const entries = Object.entries(value);
        if (entries.length === 0) return '';
        
        return entries
          .map(([key, val]) => {
            if (val === null || val === undefined) return null;
            if (typeof val === 'object' && val !== null) {
              // ネストしたオブジェクトは再帰的に処理
              return `${key}: ${renderValue(val)}`;
            }
            return `${key}: ${val}`;
          })
          .filter(item => item !== null)
          .join(', ');
      } catch (error) {
        console.error('Error rendering object value:', error);
        return '';
      }
    }
    
    return String(value);
  };

  if (!isOnline && !forceTextMode) {
    return (
      <Container>
        <Card>
          <h2>オフラインモード</h2>
          <p>音声入力はオンライン時のみ利用可能です。</p>
          <p>テキスト入力モードで日報を作成してください。</p>
          <NextButton onClick={() => navigate('/hearing?mode=text')}>
            テキスト入力で続ける
          </NextButton>
        </Card>
      </Container>
    );
  }

  if (completed) {
    return (
      <Container>
        <Card>
          <CompletedSection>
            <CompletedIcon>
              <svg width="72" height="72" viewBox="0 0 24 24" fill={colors.success.main}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </CompletedIcon>
            <CompletedText>ヒアリングが完了しました！</CompletedText>
            <p>お疲れ様でした。日報を保存しています...</p>
          </CompletedSection>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <ProgressBar>
          <ProgressFill progress={progress} />
        </ProgressBar>

        {(meetingMode || dynamics365Mode || salesforceMode) && extractedInfo && typeof extractedInfo === 'object' && (() => {
          console.log('Rendering extractedInfo:', extractedInfo);
          return true;
        })() && (
          <div style={{ 
            marginBottom: 'var(--space-6)', 
            padding: 'var(--space-4)', 
            backgroundColor: 'var(--color-accent-light)', 
            border: '2px solid var(--color-accent)',
            borderRadius: 'var(--radius-none)'
          }}>
            <div style={{ 
              fontSize: 'var(--font-size-small)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: 'var(--color-primary)',
              marginBottom: 'var(--space-3)'
            }}>
              {meetingMode ? '📄 議事録から抽出された情報' : 
               dynamics365Mode ? '📊 Dynamics 365から取得した情報' :
               '📊 Salesforceから取得した情報'}
            </div>
            <div style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-secondary)' }}>
              {extractedInfo.customer && (
                <div><strong>顧客:</strong> {renderValue(extractedInfo.customer)}</div>
              )}
              {extractedInfo.vendor_company && (
                <div><strong>自社:</strong> {renderValue(extractedInfo.vendor_company)}</div>
              )}
              {extractedInfo.project && (
                <div><strong>案件:</strong> {renderValue(extractedInfo.project)}</div>
              )}
              {extractedInfo.customer_participants && (
                <div><strong>顧客側参加者:</strong> {renderValue(extractedInfo.customer_participants)}</div>
              )}
              {extractedInfo.vendor_participants && (
                <div><strong>自社側参加者:</strong> {renderValue(extractedInfo.vendor_participants)}</div>
              )}
              {!extractedInfo.customer_participants && !extractedInfo.vendor_participants && extractedInfo.participants && (
                <div><strong>参加者:</strong> {renderValue(extractedInfo.participants)}</div>
              )}
              {extractedInfo.location && (
                <div><strong>場所:</strong> {renderValue(extractedInfo.location)}</div>
              )}
              {extractedInfo.budget && (
                <div><strong>予算:</strong> {renderValue(extractedInfo.budget)}</div>
              )}
              {extractedInfo.schedule && (
                <div><strong>スケジュール:</strong> {renderValue(extractedInfo.schedule)}</div>
              )}
              
              {/* Salesforceから取得した活動記録・メモ・会議情報 */}
              {extractedInfo.selectedActivities && extractedInfo.selectedActivities.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>📝 選択された活動記録:</div>
                  {extractedInfo.selectedActivities.map((activity, index) => (
                    <div key={index} style={{ marginLeft: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                      <div><strong>{activity.subject}</strong></div>
                      {activity.description && <div style={{ fontSize: 'var(--font-size-micro)', marginLeft: 'var(--space-2)' }}>{activity.description}</div>}
                      <div style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-2)' }}>
                        {new Date(activity.createdOn).toLocaleDateString()} • {activity.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {extractedInfo.selectedNotes && extractedInfo.selectedNotes.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div style={{ fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>📋 選択されたメモ:</div>
                  {extractedInfo.selectedNotes.map((note, index) => (
                    <div key={index} style={{ marginLeft: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                      <div><strong>{note.subject}</strong></div>
                      {note.noteText && <div style={{ fontSize: 'var(--font-size-micro)', marginLeft: 'var(--space-2)' }}>{note.noteText}</div>}
                      <div style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-2)' }}>
                        {new Date(note.createdOn).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {extractedInfo.selectedMeetings && extractedInfo.selectedMeetings.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div style={{ fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>🗓️ 選択された会議:</div>
                  {extractedInfo.selectedMeetings.map((meeting, index) => (
                    <div key={index} style={{ marginLeft: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                      <div><strong>{meeting.subject}</strong></div>
                      {meeting.description && <div style={{ fontSize: 'var(--font-size-micro)', marginLeft: 'var(--space-2)' }}>{meeting.description}</div>}
                      <div style={{ fontSize: 'var(--font-size-micro)', color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-2)' }}>
                        {new Date(meeting.scheduledStart).toLocaleDateString()} {meeting.location && `• ${meeting.location}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <QuestionSection>
          {!currentQuestion && startMutation.isPending ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-4)',
              padding: 'var(--space-6)'
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '3px solid var(--color-border)', 
                borderTop: '3px solid var(--color-accent)', 
                borderRadius: '50%', 
                animation: 'spin 1s infinite linear' 
              }}>
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
              <QuestionText style={{ color: 'var(--color-text-secondary)' }}>
                質問を準備しています...
              </QuestionText>
            </div>
          ) : (
            <QuestionText>{currentQuestion}</QuestionText>
          )}
        </QuestionSection>

        <AnswerSection>
          {/* 入力モード切り替えボタン（切り替え可能な場合のみ表示） */}
          {allowInputModeSwitch && (
            <InputModeButtons>
              <ModeButton
                active={inputMode === 'voice'}
                onClick={() => {
                  setInputMode('voice');
                }}
                disabled={!isOnline || forceTextMode}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                  <path d="M12 2c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2zm6 6c0 3.31-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.17 8.09 7.31 8.71V20h-2v2h5.38v-2h-2v-2.29C16.83 16.09 20 12.42 20 8h-2z"/>
                </svg>
                音声入力
              </ModeButton>
              <ModeButton
                active={inputMode === 'text'}
                onClick={() => {
                  setInputMode('text');
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                テキスト入力
              </ModeButton>
            </InputModeButtons>
          )}

          {inputMode === 'voice' ? (
            <VoiceInput 
              onResult={handleVoiceResult} 
              value={answer}
            />
          ) : (
            <>
              {inputMode === 'text' && (
                <AnswerSuggestions
                  suggestions={suggestions}
                  onSelect={handleSuggestionSelect}
                  isLoading={isLoadingSuggestions}
                  allowMultiple={allowMultipleSuggestions}
                  initialSelected={
                    // 現在の回答から選択済み項目を抽出
                    answer && suggestions.length > 0
                      ? suggestions.filter(s => answer.includes(s))
                      : []
                  }
                />
              )}
              <TextArea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={!currentQuestion ? "質問を準備中..." : "回答を入力してください..."}
                autoFocus
                disabled={!currentQuestion}
              />
              {/* AI補正ボタンを追加（音声入力モード以外で表示） */}
              {answer && (
                <div style={{
                  marginTop: 'var(--space-3)',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={handleCorrection}
                    disabled={!answer || isCorrecting}
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      border: '2px solid var(--color-accent)',
                      background: 'var(--color-background)',
                      color: 'var(--color-accent)',
                      borderRadius: 'var(--radius-none)',
                      fontSize: 'var(--font-size-small)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: answer && !isCorrecting ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease-in-out',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      opacity: !answer || isCorrecting ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (answer && !isCorrecting) {
                        e.target.style.background = 'var(--color-accent-light)';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'var(--color-background)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    {isCorrecting ? '補正中...' : 'AI補正する'}
                  </button>
                </div>
              )}
            </>
          )}
        </AnswerSection>

        <ActionButtons>
          <BackButton 
            onClick={handleGoBack} 
            disabled={questionHistory.length <= 1 || answerMutation.isPending}
          >
            戻る
          </BackButton>
          <SkipButton onClick={handleSkip} disabled={!currentQuestion || answerMutation.isPending}>
            スキップ
          </SkipButton>
          <NextButton 
            onClick={handleNext} 
            disabled={!currentQuestion || !answer.trim() || answerMutation.isPending}
          >
            {answerMutation.isPending ? '送信中...' : !currentQuestion ? '準備中...' : '次へ'}
          </NextButton>
        </ActionButtons>
      </Card>
    </Container>
  );
};

export default HearingPage;