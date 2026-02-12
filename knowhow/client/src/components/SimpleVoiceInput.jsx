import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import toast from 'react-hot-toast';
import { aiAPI } from '../services/api';
import { HiOutlineSparkles } from 'react-icons/hi';

const pulseRing = keyframes`
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.5); opacity: 0; }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6);
  width: 100%;
`;

const RecordButton = styled.button`
  width: ${props => props.$large ? '160px' : '120px'};
  height: ${props => props.$large ? '160px' : '120px'};
  border-radius: 50%;
  border: none;
  background: ${props => props.$recording
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : 'var(--gradient-primary)'};
  color: var(--color-text-inverse);
  font-size: ${props => props.$large ? '3rem' : '2.5rem'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  position: relative;
  box-shadow: ${props => props.$recording
    ? '0 8px 30px rgba(239, 68, 68, 0.4)'
    : '0 8px 30px rgba(26, 54, 93, 0.3)'};
  -webkit-tap-highlight-color: transparent;

  &:hover:not(:disabled) {
    transform: scale(1.06);
    box-shadow: ${props => props.$recording
      ? '0 12px 40px rgba(239, 68, 68, 0.5)'
      : '0 12px 40px rgba(26, 54, 93, 0.4)'};
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    background: var(--color-text-tertiary);
    cursor: not-allowed;
    opacity: 0.5;
    box-shadow: none;
  }

  @media (max-width: 768px) {
    width: ${props => props.$large ? '140px' : '100px'};
    height: ${props => props.$large ? '140px' : '100px'};
    font-size: ${props => props.$large ? '2.5rem' : '2rem'};
  }
`;

const RecordingPulse = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid var(--color-error);
  animation: ${pulseRing} 1.5s ease-out infinite;
  pointer-events: none;
`;

const RecordingPulse2 = styled(RecordingPulse)`
  animation-delay: 0.5s;
`;

const StatusText = styled.p`
  margin-top: var(--space-4);
  color: var(--color-text-secondary);
  font-size: ${props => props.$large ? 'var(--font-size-lg)' : 'var(--font-size-base)'};
  font-weight: var(--font-weight-medium);
  text-align: center;
`;

const TranscriptContainer = styled.div`
  width: 100%;
  margin-top: var(--space-5);
  animation: fadeInUp 0.3s ease-out;
`;

const TranscriptBox = styled.textarea`
  width: 100%;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  min-height: 120px;
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  font-family: inherit;
  resize: vertical;
  line-height: var(--line-height-relaxed);
  transition: all var(--transition-base);

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
  &:disabled {
    background: var(--color-surface-alt);
    cursor: not-allowed;
    color: var(--color-text-tertiary);
  }
`;

const CorrectionButton = styled.button`
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);

  &:hover:not(:disabled) {
    background: var(--color-primary-50);
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SimpleVoiceInput = ({ onResult, value, onRecordingStateChange, large = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(value || '');
  const [isCorrecting, setIsCorrecting] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange(isRecording);
    }
  }, [isRecording, onRecordingStateChange]);

  useEffect(() => {
    setTranscript(value || '');
    finalTranscriptRef.current = value || '';
  }, [value]);

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('お使いのブラウザは音声入力に対応していません');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        finalTranscriptRef.current = '';
        setTranscript('');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t;
          } else {
            interimTranscript += t;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          setTranscript(finalTranscriptRef.current);
          if (onResult) onResult(finalTranscriptRef.current);
        } else {
          setTranscript(finalTranscriptRef.current + interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'no-speech') {
          toast.error('音声が検出されませんでした');
        } else if (event.error === 'not-allowed') {
          toast.error('マイクへのアクセスが許可されていません');
        } else if (event.error !== 'aborted') {
          toast.error('音声認識エラーが発生しました');
        }
      };

      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Recording start error:', error);
      toast.error('録音を開始できませんでした');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    setIsRecording(false);
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setTranscript(newText);
    if (onResult) onResult(newText);
  };

  const handleCorrection = async () => {
    if (!transcript || isCorrecting) return;
    setIsCorrecting(true);
    try {
      const result = await aiAPI.correctText(transcript);
      if (result?.correctedText) {
        setTranscript(result.correctedText);
        if (onResult) onResult(result.correctedText);
        toast.success('テキストを補正しました');
      }
    } catch (error) {
      console.error('Correction error:', error);
      toast.error('補正に失敗しました');
    } finally {
      setIsCorrecting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  return (
    <Container>
      <RecordButton
        $recording={isRecording}
        $large={large}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isCorrecting}
      >
        {isRecording && <RecordingPulse />}
        {isRecording && <RecordingPulse2 />}
        {isRecording ? (
          <svg width={large ? 48 : 40} height={large ? 48 : 40} viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        ) : (
          <svg width={large ? 56 : 48} height={large ? 56 : 48} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C10.34 2 9 3.34 9 5v6c0 1.66 1.34 3 3 3s3-1.34 3-3V5c0-1.66-1.34-3-3-3zm5.3 6c-.08 0-.16.02-.24.06-.15.08-.26.23-.26.41v1.28c0 3.32-2.69 6.02-6.02 6.02s-6.02-2.7-6.02-6.02V8.47c0-.18-.11-.33-.26-.41C4.42 8.02 4.34 8 4.26 8 3.56 8 3 8.56 3 9.26v.21c0 4.28 3.17 7.83 7.31 8.54v2.09c0 .55.45 1 1 1s1-.45 1-1v-2.09C16.45 17.3 19.62 13.75 19.62 9.47v-.21c0-.7-.56-1.26-1.26-1.26z"/>
          </svg>
        )}
      </RecordButton>

      <StatusText $large={large}>
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
            <HiOutlineSparkles />
            {isCorrecting ? '補正中...' : 'AI補正'}
          </CorrectionButton>
        </TranscriptContainer>
      )}
    </Container>
  );
};

export default SimpleVoiceInput;
