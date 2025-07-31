import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { aiAPI, reportAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import VoiceInput from '../components/VoiceInput';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '../styles/designSystem';
import { Card as BaseCard, PrimaryButton, SecondaryButton, GhostButton } from '../styles/componentStyles';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 ${spacing[8]};

  @media (max-width: 768px) {
    padding: 0 ${spacing[4]};
  }
`;

const Card = styled(BaseCard)`
  margin-bottom: ${spacing[8]};

  @media (max-width: 768px) {
    padding: ${spacing[8]};
    border-radius: ${borderRadius.lg};
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${colors.neutral[200]};
  border-radius: 3px;
  margin-bottom: ${spacing[10]};
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${colors.neutral[900]};
  border-radius: 3px;
  transition: width ${transitions.slower};
  width: ${props => props.progress}%;
  position: relative;
`;

const QuestionSection = styled.div`
  margin-bottom: ${spacing[10]};
  padding: ${spacing[8]};
  background: ${colors.neutral[50]};
  border-radius: ${borderRadius.xl};
  border: 1px solid ${colors.neutral[200]};

  @media (max-width: 768px) {
    padding: ${spacing[6]};
  }
`;

const QuestionText = styled.h2`
  font-size: ${typography.fontSize['2xl']};
  color: ${colors.neutral[900]};
  margin-bottom: ${spacing[6]};
  font-weight: ${typography.fontWeight.semibold};
  line-height: ${typography.lineHeight.normal};
  letter-spacing: ${typography.letterSpacing.tight};
`;

const AnswerSection = styled.div`
  margin-bottom: ${spacing[10]};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: ${spacing[4]};
  border: 1px solid ${colors.neutral[300]};
  border-radius: ${borderRadius.md};
  font-size: ${typography.fontSize.sm};
  resize: vertical;
  background: white;
  transition: all ${transitions.fast};
  line-height: ${typography.lineHeight.normal};
  font-family: ${typography.fontFamily.sans};

  &:focus {
    outline: none;
    border-color: ${colors.primary[500]};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    background: ${colors.neutral[50]};
  }

  &::placeholder {
    color: ${colors.neutral[400]};
  }
`;

const InputModeButtons = styled.div`
  display: flex;
  gap: ${spacing[4]};
  margin-bottom: ${spacing[4]};
`;

const ModeButton = styled.button`
  flex: 1;
  padding: ${spacing[4]};
  border: 1px solid ${props => props.active ? colors.neutral[700] : colors.neutral[200]};
  background: ${props => props.active ? colors.neutral[100] : 'white'};
  color: ${props => props.active ? colors.neutral[900] : colors.neutral[600]};
  border-radius: ${borderRadius.md};
  font-weight: ${typography.fontWeight.medium};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${spacing[2]};
  transition: all ${transitions.fast};
  font-size: ${typography.fontSize.sm};
  font-family: ${typography.fontFamily.sans};

  &:hover:not(:disabled) {
    border-color: ${colors.neutral[300]};
    background: ${colors.neutral[50]};
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${spacing[4]};
  justify-content: space-between;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${spacing[3]};
    
    > div {
      display: flex;
      gap: ${spacing[3]};
    }
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

const SkipButton = styled(SecondaryButton)`
  padding: ${spacing[3]} ${spacing[6]};
`;

const NextButton = styled(PrimaryButton)`
  padding: ${spacing[3]} ${spacing[6]};
`;

const BackButton = styled(GhostButton)`
  padding: ${spacing[3]} ${spacing[6]};
`;

const CompletedSection = styled.div`
  text-align: center;
  padding: ${spacing[8]};
`;

const CompletedIcon = styled.div`
  margin-bottom: ${spacing[6]};
  display: flex;
  justify-content: center;
`;

const CompletedText = styled.h2`
  font-size: ${typography.fontSize['2xl']};
  color: ${colors.neutral[800]};
  margin-bottom: ${spacing[8]};
  font-weight: ${typography.fontWeight.semibold};
`;

const HearingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceTextMode = searchParams.get('mode') === 'text';
  
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [answer, setAnswer] = useState('');
  const [inputMode, setInputMode] = useState(forceTextMode ? 'text' : 'voice');
  const [slots, setSlots] = useState({});
  const [completed, setCompleted] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [questionsAnswers, setQuestionsAnswers] = useState([]);
  const [questionHistory, setQuestionHistory] = useState([]); // 質問履歴を保存
  const [askedQuestions, setAskedQuestions] = useState([]); // 重複防止用質問履歴
  const [isRevisiting, setIsRevisiting] = useState(false); // 戻って回答を修正中かどうか

  // Start hearing session
  const startMutation = useMutation({
    mutationFn: () => aiAPI.startHearing(),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      // 初回の質問を履歴に追加
      setQuestionHistory([{
        question: data.question,
        questionIndex: data.questionIndex,
        slots: {},
        answer: '' // 初回の回答は空
      }]);
      setAskedQuestions([data.question]);
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
        saveReport();
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
          }
          // 新しい質問を追加
          return [...updatedHistory, {
            question: data.question,
            questionIndex: data.questionIndex,
            slots: data.slots,
            answer: '' // 新しい質問の回答は空
          }];
        });
        
        setAnswer(''); // 入力フィールドをクリア
        setIsRevisiting(false); // 修正モードをリセット
        if (data.askedQuestions) {
          setAskedQuestions(data.askedQuestions);
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
      startMutation.mutate();
    }
  }, []);

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

    answerMutation.mutate({
      sessionId,
      questionIndex,
      answer,
      currentSlots: slots,
      askedQuestions: isRevisiting ? askedQuestions.slice(0, questionIndex + 1) : askedQuestions
    });
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
    }

    // 履歴から最後のエントリを削除し、前の質問に戻る
    const newHistory = updatedHistory.slice(0, -1);
    const previousQuestion = newHistory[newHistory.length - 1];
    
    setQuestionHistory(newHistory);
    setCurrentQuestion(previousQuestion.question);
    setQuestionIndex(previousQuestion.questionIndex);
    setSlots(previousQuestion.slots);
    setAnswer(previousQuestion.answer || ''); // 履歴から前の回答を復元
    setIsRevisiting(true); // 戻って修正モードをONにする
  };

  const handleVoiceResult = (transcript) => {
    setAnswer(transcript);
  };

  const saveReport = () => {
    // Get current JST date (UTC+9)
    const now = new Date();
    const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const reportData = {
      report_date: jstDate.toISOString().split('T')[0],
      mode: 'hearing',
      questions_answers: questionsAnswers,
      slots: slots
    };
    saveReportMutation.mutate(reportData);
  };

  const progress = ((questionIndex + 1) / totalQuestions) * 100;

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

        <QuestionSection>
          <QuestionText>{currentQuestion}</QuestionText>
        </QuestionSection>

        <AnswerSection>
          <InputModeButtons>
            <ModeButton
              active={inputMode === 'voice'}
              onClick={() => setInputMode('voice')}
              disabled={!isOnline || forceTextMode}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                <path d="M12 2c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2zm6 6c0 3.31-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.17 8.09 7.31 8.71V20h-2v2h5.38v-2h-2v-2.29C16.83 16.09 20 12.42 20 8h-2z"/>
              </svg>
              音声入力
            </ModeButton>
            <ModeButton
              active={inputMode === 'text'}
              onClick={() => setInputMode('text')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.5rem' }}>
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
              テキスト入力
            </ModeButton>
          </InputModeButtons>

          {inputMode === 'voice' ? (
            <VoiceInput onResult={handleVoiceResult} value={answer} />
          ) : (
            <TextArea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="回答を入力してください..."
              autoFocus
            />
          )}
        </AnswerSection>

        <ActionButtons>
          <BackButton 
            onClick={handleGoBack} 
            disabled={questionHistory.length <= 1 || answerMutation.isPending}
          >
            戻る
          </BackButton>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <SkipButton onClick={handleSkip} disabled={answerMutation.isPending}>
              スキップ
            </SkipButton>
            <NextButton 
              onClick={handleNext} 
              disabled={!answer.trim() || answerMutation.isPending}
            >
              {answerMutation.isPending ? '送信中...' : '次へ'}
            </NextButton>
          </div>
        </ActionButtons>
      </Card>
    </Container>
  );
};

export default HearingPage;