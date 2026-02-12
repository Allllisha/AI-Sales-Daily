import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { aiAPI } from '../services/api';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  background: var(--color-background);
  width: 100%;
  position: relative;
  min-height: 400px;
  box-shadow: var(--shadow-paper);

  @media (max-width: 768px) {
    padding: var(--space-5);
    min-height: 350px;
  }
  
  @media (max-width: 480px) {
    padding: var(--space-4);
    min-height: 320px;
    margin: 0;
  }
  
  @media (max-width: 390px) {
    padding: var(--space-3);
    min-height: 300px;
  }
`;

const RecordButton = styled.button`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: none;
  background: ${props => props.recording ? 'var(--color-error)' : 'var(--color-accent)'};
  color: var(--color-text-inverse);
  font-size: 2.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;
  position: relative;
  box-shadow: var(--shadow-elevation);
  user-select: none;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: var(--shadow-structure);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    background: var(--color-text-tertiary);
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
    font-size: 2rem;
  }
  
  @media (max-width: 480px) {
    width: 90px;
    height: 90px;
    font-size: 1.8rem;
  }
`;

const RecordingAnimation = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid var(--color-error);
  animation: pulse 1.5s infinite;
  pointer-events: none;

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    100% {
      transform: scale(1.3);
      opacity: 0;
    }
  }
`;

const StatusText = styled.p`
  margin-top: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  text-align: center;
  
  @media (max-width: 480px) {
    font-size: var(--font-size-small);
    margin-top: var(--space-3);
  }
`;

const TranscriptContainer = styled.div`
  width: 100%;
  margin-top: var(--space-5);
  
  @media (max-width: 480px) {
    margin-top: var(--space-4);
  }
`;

const TranscriptBox = styled.textarea`
  width: 100%;
  padding: var(--space-4);
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  min-height: 120px;
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  resize: vertical;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: var(--line-height-standard);
  transition: all 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: var(--shadow-focused);
  }

  &:disabled {
    background: var(--color-surface-alt);
    cursor: not-allowed;
    color: var(--color-text-tertiary);
  }
  
  @media (max-width: 480px) {
    min-height: 100px;
    font-size: var(--font-size-small);
    padding: var(--space-3);
  }
`;

const CorrectionButton = styled.button`
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover:not(:disabled) {
    background: var(--color-surface);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SimpleVoiceInput = ({ onResult, value, onRecordingStateChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(value || '');
  const [isCorrecting, setIsCorrecting] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // 録音状態が変わったら親に通知
  useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange(isRecording);
    }
  }, [isRecording, onRecordingStateChange]);

  // valueプロップが変わったら反映
  useEffect(() => {
    setTranscript(value || '');
    finalTranscriptRef.current = value || '';
  }, [value]);

  // 音声認識を開始
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('お使いのブラウザは音声入力に対応していません');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // シンプルな設定
      recognition.continuous = false; // 一定時間で自動停止
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('録音開始');
        setIsRecording(true);
        finalTranscriptRef.current = '';
        setTranscript('');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          setTranscript(finalTranscriptRef.current);
          if (onResult) {
            onResult(finalTranscriptRef.current);
          }
        } else {
          // リアルタイム表示
          setTranscript(finalTranscriptRef.current + interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error);
        setIsRecording(false);
        
        if (event.error === 'no-speech') {
          toast.error('音声が検出されませんでした');
        } else if (event.error === 'not-allowed') {
          toast.error('マイクへのアクセスが許可されていません');
        } else if (event.error !== 'aborted') {
          toast.error('音声認識エラーが発生しました');
        }
      };

      recognition.onend = () => {
        console.log('録音終了');
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('録音開始エラー:', error);
      toast.error('録音を開始できませんでした');
      setIsRecording(false);
    }
  };

  // 音声認識を停止
  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('停止エラー:', error);
      }
    }
    setIsRecording(false);
  };

  // テキスト変更
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setTranscript(newText);
    if (onResult) {
      onResult(newText);
    }
  };

  // AI補正
  const handleCorrection = async () => {
    if (!transcript || isCorrecting) return;

    setIsCorrecting(true);
    try {
      const result = await aiAPI.correctText(transcript);
      if (result && result.correctedText) {
        setTranscript(result.correctedText);
        if (onResult) {
          onResult(result.correctedText);
        }
        toast.success('テキストを補正しました');
      }
    } catch (error) {
      console.error('補正エラー:', error);
      toast.error('補正に失敗しました');
    } finally {
      setIsCorrecting(false);
    }
  };

  // コンポーネントがアンマウントされたら録音を停止
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // エラーは無視
        }
      }
    };
  }, []);

  return (
    <Container>
      <RecordButton
        recording={isRecording}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isCorrecting}
      >
        {isRecording && <RecordingAnimation />}
        {isRecording ? (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        ) : (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C10.34 2 9 3.34 9 5v6c0 1.66 1.34 3 3 3s3-1.34 3-3V5c0-1.66-1.34-3-3-3zm5.3 6c-.08 0-.16.02-.24.06-.15.08-.26.23-.26.41v1.28c0 3.32-2.69 6.02-6.02 6.02s-6.02-2.7-6.02-6.02V8.47c0-.18-.11-.33-.26-.41C4.42 8.02 4.34 8 4.26 8 3.56 8 3 8.56 3 9.26v.21c0 4.28 3.17 7.83 7.31 8.54v2.09c0 .55.45 1 1 1s1-.45 1-1v-2.09C16.45 17.3 19.62 13.75 19.62 9.47v-.21c0-.7-.56-1.26-1.26-1.26z"/>
          </svg>
        )}
      </RecordButton>
      
      <StatusText>
        {isRecording ? '録音中... タップして停止' : 'タップして録音開始'}
      </StatusText>

      {transcript && (
        <TranscriptContainer>
          <TranscriptBox
            value={transcript}
            onChange={handleTextChange}
            placeholder="音声認識の結果がここに表示されます..."
            disabled={isRecording}
          />
          <CorrectionButton 
            onClick={handleCorrection} 
            disabled={!transcript || isCorrecting || isRecording}
          >
            {isCorrecting ? '補正中...' : 'AI補正'}
          </CorrectionButton>
        </TranscriptContainer>
      )}
    </Container>
  );
};

export default SimpleVoiceInput;