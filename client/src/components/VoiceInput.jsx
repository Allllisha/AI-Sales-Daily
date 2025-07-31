import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';
import { aiAPI } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '../styles/designSystem';
import { Card as BaseCard, PrimaryButton, SecondaryButton } from '../styles/componentStyles';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${spacing[10]};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${borderRadius['2xl']};
  background: white;
  width: 100%;
  position: relative;

  @media (max-width: 768px) {
    padding: ${spacing[8]};
  }
`;

const RecordButton = styled.button`
  width: 120px;
  height: 120px;
  border-radius: ${borderRadius.full};
  border: 3px solid ${props => props.recording ? 
    colors.error.main : 
    colors.primary[500]};
  background: ${props => props.recording ? 
    colors.error.main : 
    'linear-gradient(135deg, ' + colors.primary[500] + ' 0%, ' + colors.primary[600] + ' 100%)'};
  color: white;
  font-size: 2.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${transitions.base};
  position: relative;
  box-shadow: ${props => props.recording ? 
    '0 0 20px rgba(239, 68, 68, 0.5), ' + shadows.lg :
    '0 0 20px rgba(139, 92, 246, 0.3), ' + shadows.lg};
  -webkit-tap-highlight-color: transparent;
  font-family: ${typography.fontFamily.sans};

  &:hover:not(:disabled) {
    transform: scale(1.08);
    box-shadow: ${props => props.recording ? 
      '0 0 30px rgba(239, 68, 68, 0.7), ' + shadows.xl :
      '0 0 30px rgba(139, 92, 246, 0.5), ' + shadows.xl};
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    background: ${colors.neutral[300]};
    border-color: ${colors.neutral[300]};
    cursor: not-allowed;
    box-shadow: ${shadows.sm};
  }

  @media (max-width: 768px) {
    width: 130px;
    height: 130px;
    font-size: 3rem;
  }
`;

const RecordingIndicator = styled.div`
  position: absolute;
  width: 130px;
  height: 130px;
  border-radius: ${borderRadius.full};
  border: 4px solid ${colors.error.main};
  animation: pulse 1.5s infinite;
  pointer-events: none;

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }

  @media (max-width: 768px) {
    width: 140px;
    height: 140px;
  }
`;

const StatusText = styled.p`
  margin-top: ${spacing[6]};
  color: ${colors.neutral[600]};
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  text-align: center;
  font-family: ${typography.fontFamily.sans};

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.base};
    margin-top: ${spacing[4]};
  }
`;

const TranscriptContainer = styled.div`
  width: 100%;
  margin-top: ${spacing[4]};
`;

const TranscriptLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing[2]};
  font-size: ${typography.fontSize.sm};
  color: ${colors.neutral[500]};
  font-family: ${typography.fontFamily.sans};
`;

const TranscriptBox = styled.textarea`
  width: 100%;
  padding: ${spacing[4]};
  background: white;
  border: 1px solid ${colors.neutral[300]};
  border-radius: ${borderRadius.md};
  min-height: 120px;
  color: ${colors.neutral[800]};
  font-size: ${typography.fontSize.sm};
  resize: vertical;
  font-family: ${typography.fontFamily.sans};
  line-height: ${typography.lineHeight.normal};
  transition: all ${transitions.fast};

  &:focus {
    outline: none;
    border-color: ${colors.primary[500]};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    background: ${colors.neutral[50]};
  }

  &:disabled {
    background: ${colors.neutral[50]};
    cursor: not-allowed;
    color: ${colors.neutral[400]};
  }

  &::placeholder {
    color: ${colors.neutral[400]};
  }
`;

const RealtimeText = styled.div`
  width: 100%;
  margin: ${spacing[6]} 0 ${spacing[8]} 0;
  padding: ${spacing[6]} ${spacing[4]};
  font-size: ${typography.fontSize.xl};
  color: ${colors.primary[600]};
  min-height: 60px;
  display: ${props => props.show ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  font-weight: ${typography.fontWeight.medium};
  font-family: ${typography.fontFamily.sans};
  text-align: center;
  line-height: ${typography.lineHeight.relaxed};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      ${colors.primary[400]} 25%, 
      ${colors.primary[600]} 50%, 
      ${colors.primary[400]} 75%, 
      transparent 100%);
    animation: pulse-line 2s ease-in-out infinite;
  }
  
  @keyframes pulse-line {
    0%, 100% {
      opacity: 0.4;
      transform: scaleX(0.8);
    }
    50% {
      opacity: 1;
      transform: scaleX(1.1);
    }
  }

  @media (max-width: 768px) {
    font-size: ${typography.fontSize.lg};
    margin: ${spacing[4]} 0 ${spacing[6]} 0;
    padding: ${spacing[4]} ${spacing[2]};
  }
`;


const CorrectionButton = styled(SecondaryButton)`
  padding: ${spacing[2]} ${spacing[4]};
  font-size: ${typography.fontSize.xs};

  @media (max-width: 768px) {
    padding: ${spacing[2]} ${spacing[4]};
    font-size: ${typography.fontSize.sm};
  }
`;

const VoiceInput = ({ onResult, value }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(value || '');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);
  const recognitionRef = useRef(null);
  const [isSupported, setIsSupported] = useState(false);
  const finalTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);
  const recognitionStateRef = useRef('inactive'); // 'inactive', 'starting', 'active', 'stopping'

  useEffect(() => {
    // Check if Web Speech API is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ja-JP';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final) {
          finalTranscriptRef.current += final;
          setTranscript(finalTranscriptRef.current);
          if (onResult) {
            onResult(finalTranscriptRef.current);
          }
        }
        
        setInterimTranscript(interim);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        switch (event.error) {
          case 'no-speech':
            // Don't show error for no speech
            break;
          case 'aborted':
            // Don't show error for user-initiated abort
            console.log('Speech recognition aborted by user');
            break;
          case 'not-allowed':
            toast.error('マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。');
            break;
          case 'network':
            toast.error('ネットワークエラーが発生しました。接続を確認してください。');
            break;
          case 'audio-capture':
            toast.error('マイクが見つかりません。マイクが接続されているか確認してください。');
            break;
          case 'service-not-allowed':
            toast.error('音声認識サービスが利用できません。');
            break;
          default:
            toast.error(`音声認識エラー: ${event.error}`);
        }
      };

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        recognitionStateRef.current = 'active';
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended, state:', recognitionStateRef.current);
        recognitionStateRef.current = 'inactive';
        
        // 録音中に自動的に停止した場合は再開を試みる
        if (isRecordingRef.current && recognitionRef.current) {
          console.log('Attempting to restart recognition...');
          setTimeout(() => {
            if (isRecordingRef.current && recognitionRef.current && recognitionStateRef.current === 'inactive') {
              try {
                recognitionStateRef.current = 'starting';
                recognitionRef.current.start();
              } catch (error) {
                console.log('Failed to restart recognition:', error);
                setIsRecording(false);
                setInterimTranscript('');
                isRecordingRef.current = false;
                recognitionStateRef.current = 'inactive';
              }
            }
          }, 100);
        } else {
          setIsRecording(false);
          setInterimTranscript('');
          isRecordingRef.current = false;
        }
      };
    }
  }, [onResult]);

  useEffect(() => {
    setTranscript(value || '');
    finalTranscriptRef.current = value || '';
  }, [value]);

  const startRecording = () => {
    if (!isSupported) {
      toast.error('お使いのブラウザは音声入力に対応していません');
      return;
    }

    // 既に録音中または開始中の場合は何もしない
    if (isRecordingRef.current || recognitionStateRef.current !== 'inactive') {
      console.log('Already recording or starting, ignoring start request. State:', recognitionStateRef.current);
      return;
    }

    setIsRecording(true);
    isRecordingRef.current = true;
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    
    try {
      recognitionStateRef.current = 'starting';
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      if (error.message.includes('already started')) {
        // 既に開始されている場合は状態をリセット
        console.log('Recognition already started, resetting state');
        recognitionStateRef.current = 'active';
      } else {
        setIsRecording(false);
        isRecordingRef.current = false;
        recognitionStateRef.current = 'inactive';
        toast.error('音声認識を開始できませんでした');
      }
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (recognitionRef.current && recognitionStateRef.current !== 'inactive') {
      recognitionStateRef.current = 'stopping';
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setTranscript(newText);
    if (onResult) {
      onResult(newText);
    }
  };

  const handleCorrection = async () => {
    if (!transcript || isCorrecting) return;

    console.log('Starting correction for:', transcript);
    setIsCorrecting(true);
    try {
      const result = await aiAPI.correctText(transcript);
      console.log('Correction result:', result);
      
      if (result && result.correctedText) {
        setTranscript(result.correctedText);
        if (onResult) {
          onResult(result.correctedText);
        }
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

  if (!isSupported) {
    return (
      <Container>
        <StatusText>
          お使いのブラウザは音声入力に対応していません。
          テキスト入力をご利用ください。
        </StatusText>
      </Container>
    );
  }

  return (
    <Container>
      <RealtimeText show={isRecording && interimTranscript}>
        {interimTranscript}
      </RealtimeText>
      
      {!isRecording ? (
        <>
          <RecordButton onClick={startRecording}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C10.34 2 9 3.34 9 5v6c0 1.66 1.34 3 3 3s3-1.34 3-3V5c0-1.66-1.34-3-3-3zm5.3 6c-.08 0-.16.02-.24.06-.15.08-.26.23-.26.41v1.28c0 3.32-2.69 6.02-6.02 6.02s-6.02-2.7-6.02-6.02V8.47c0-.18-.11-.33-.26-.41C4.42 8.02 4.34 8 4.26 8 3.56 8 3 8.56 3 9.26v.21c0 4.28 3.17 7.83 7.31 8.54v2.09c0 .55.45 1 1 1s1-.45 1-1v-2.09C16.45 17.3 19.62 13.75 19.62 9.47v-.21c0-.7-.56-1.26-1.26-1.26z"/>
            </svg>
          </RecordButton>
          <StatusText>タップして録音開始</StatusText>
        </>
      ) : (
        <>
          <RecordButton recording onClick={stopRecording}>
            <RecordingIndicator />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </RecordButton>
          <StatusText>録音中... タップして停止・送信</StatusText>
        </>
      )}

      {(transcript || isRecording) && (
        <TranscriptContainer>
          <TranscriptLabel>
            <span>音声認識結果（編集可能）</span>
            <CorrectionButton 
              onClick={handleCorrection} 
              disabled={!transcript || isCorrecting || isRecording}
            >
              {isCorrecting ? '補正中...' : 'AI補正する'}
            </CorrectionButton>
          </TranscriptLabel>
          <TranscriptBox
            value={transcript}
            onChange={handleTextChange}
            placeholder="音声認識の結果がここに表示されます..."
            disabled={isRecording}
          />
        </TranscriptContainer>
      )}
    </Container>
  );
};

export default VoiceInput;