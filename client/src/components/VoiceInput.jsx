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
  width: 140px;
  height: 140px;
  border-radius: var(--radius-none);
  border: 4px solid ${props => props.recording ? 
    'var(--color-error)' : 
    'var(--color-accent)'};
  background: ${props => props.recording ? 
    'var(--color-error)' : 
    'var(--color-accent)'};
  color: var(--color-text-inverse);
  font-size: 2.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;
  position: relative;
  box-shadow: var(--shadow-elevation);
  -webkit-tap-highlight-color: transparent;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  user-select: none;
  touch-action: none; /* preventDefaultを使うため */
  
  /* iOS用の最適化 */
  -webkit-appearance: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: var(--shadow-structure);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
    transition: transform 0.1s;
  }

  &:disabled {
    background: var(--color-text-tertiary);
    border-color: var(--color-text-tertiary);
    cursor: not-allowed;
    box-shadow: var(--shadow-paper);
    opacity: 0.6;
  }

  @media (max-width: 768px) {
    width: 120px;
    height: 120px;
    font-size: 2.2rem;
  }
  
  @media (max-width: 480px) {
    width: 100px;
    height: 100px;
    font-size: 2rem;
    border-width: 3px;
  }
  
  @media (max-width: 390px) {
    width: 90px;
    height: 90px;
    font-size: 1.8rem;
  }
`;

const RecordingIndicator = styled.div`
  position: absolute;
  width: 150px;
  height: 150px;
  border-radius: var(--radius-none);
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

  @media (max-width: 768px) {
    width: 130px;
    height: 130px;
  }
  
  @media (max-width: 480px) {
    width: 110px;
    height: 110px;
  }
  
  @media (max-width: 390px) {
    width: 100px;
    height: 100px;
  }
`;

const StatusText = styled.p`
  margin-top: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  text-align: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: var(--line-height-standard);

  @media (max-width: 768px) {
    font-size: var(--font-size-body);
    margin-top: var(--space-3);
  }
  
  @media (max-width: 480px) {
    font-size: var(--font-size-small);
    margin-top: var(--space-3);
    padding: 0 var(--space-2);
  }
`;

const TranscriptContainer = styled.div`
  width: 100%;
  margin-top: var(--space-4);
  
  @media (max-width: 480px) {
    margin-top: var(--space-3);
  }
`;

const TranscriptLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-small);
  color: var(--color-text-tertiary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: var(--space-2);
    align-items: stretch;
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
  font-size: var(--font-size-small);
  resize: vertical;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: var(--line-height-standard);
  transition: all 0.2s ease-in-out;
  -webkit-appearance: none;
  
  /* iOS用の最適化 */
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: text;
  border-radius: 0; /* iOSの丸みを無効化 */

  &:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: var(--shadow-focused);
    background: var(--color-surface);
  }

  &:disabled {
    background: var(--color-surface-alt);
    cursor: not-allowed;
    color: var(--color-text-tertiary);
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }
  
  @media (max-width: 480px) {
    min-height: 100px;
    font-size: var(--font-size-body);
    padding: var(--space-3);
  }
`;

const RealtimeText = styled.div`
  width: 100%;
  margin: var(--space-4) 0 var(--space-5) 0;
  padding: var(--space-4);
  font-size: var(--font-size-title);
  color: var(--color-accent);
  min-height: 80px;
  display: ${props => props.show ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-medium);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-align: center;
  line-height: var(--line-height-comfortable);
  position: relative;
  background: var(--color-accent-light);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-none);
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--color-accent) 25%, 
      var(--color-accent) 50%, 
      var(--color-accent) 75%, 
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
    font-size: var(--font-size-body);
    margin: var(--space-3) 0 var(--space-4) 0;
    padding: var(--space-3);
    min-height: 70px;
  }
  
  @media (max-width: 480px) {
    font-size: var(--font-size-small);
    margin: var(--space-3) 0;
    padding: var(--space-3) var(--space-2);
    min-height: 50px;
  }
  
  @media (max-width: 390px) {
    font-size: var(--font-size-small);
    min-height: 45px;
    padding: var(--space-2);
  }
`;


const CorrectionButton = styled.button`
  padding: var(--space-2) var(--space-3);
  border: 2px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  border-radius: var(--radius-none);
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: var(--color-surface);
    border-color: var(--color-accent);
    color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-small);
  }
  
  @media (max-width: 480px) {
    width: 100%;
    justify-self: stretch;
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
  const mediaStreamRef = useRef(null);

  // stopRecordingを関数として定義（useEffectの外で使用可能にする）
  const stopRecordingInternal = () => {
    console.log('SpeechRecognitionManager: Internal cleanup stopping...');
    
    // 録音状態のみクリア（テキストは保持）
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterimTranscript(''); // リアルタイム表示のみクリア
    
    if (recognitionRef.current) {
      try {
        // 全てのハンドラーを無効化
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        
        // abort()で強制終了（stop()より高速）
        recognitionRef.current.abort();
      } catch (e) {
        console.log('SpeechRecognitionManager: Error during cleanup:', e);
      }
      
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    // Check if Web Speech API is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
    }
    
    // ページが非表示になった時に録音を停止
    const handleVisibilityChange = () => {
      if (document.hidden && isRecordingRef.current) {
        console.log('Page hidden, stopping recording');
        stopRecordingInternal();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // クリーンアップ処理：コンポーネントがアンマウントされる時にマイクを確実に停止
    return () => {
      console.log('SpeechRecognitionManager: Component cleanup');
      stopRecordingInternal();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    setTranscript(value || '');
    finalTranscriptRef.current = value || '';
  }, [value]);

  const startRecording = () => {
    if (!isSupported) {
      toast.error('お使いのブラウザは音声入力に対応していません');
      return;
    }

    // 新しいインスタンスを作成してマイクアクセスをクリアにする
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'ja-JP';
    recognitionRef.current.maxAlternatives = 1;
    
    // イベントハンドラーを設定
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

    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended, isRecording:', isRecordingRef.current);
      
      // 録音状態のみクリア（テキストは保持）
      setIsRecording(false);
      setInterimTranscript(''); // リアルタイム表示のみクリア
      
      // ユーザーが意図的に停止した場合は再起動しない
      if (!isRecordingRef.current) {
        console.log('User stopped recording, not restarting');
        recognitionRef.current = null;
        return;
      }
      
      // 録音中に自動停止した場合のみ1回だけ再起動を試みる
      console.log('Attempting to restart recognition once...');
      isRecordingRef.current = false; // 再起動ループを防ぐため一旦false
      
      try {
        setTimeout(() => {
          // 再起動時にはstateを再設定
          if (recognitionRef.current) {
            isRecordingRef.current = true;
            setIsRecording(true);
            recognitionRef.current.start();
          }
        }, 500); // 少し長めの待機時間
      } catch (error) {
        console.log('Failed to restart recognition:', error);
        isRecordingRef.current = false;
        recognitionRef.current = null;
      }
    };

    setIsRecording(true);
    isRecordingRef.current = true;
    
    // 新規録音開始の場合のみテキストをクリア
    if (!transcript) {
      setTranscript('');
      finalTranscriptRef.current = '';
    }
    
    setInterimTranscript('');
    recognitionRef.current.start();
  };

  const stopRecording = () => {
    console.log('SpeechRecognitionManager: Stopping recognition');
    
    // 即座に録音状態を停止（テキストは保持）
    isRecordingRef.current = false;
    setIsRecording(false);
    
    // リアルタイム表示のみクリア（確定済みテキストは保持）
    setInterimTranscript('');
    
    if (recognitionRef.current) {
      try {
        // 全てのハンドラーを即座に無効化
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        
        // abort()を使って強制的に即座に停止
        recognitionRef.current.abort();
        console.log('SpeechRecognitionManager: Recognition aborted immediately');
      } catch (e) {
        console.log('SpeechRecognitionManager: Error during abort:', e);
      }
      
      // インスタンスを即座に破棄
      recognitionRef.current = null;
    }
    
    // 確定済みテキストがあれば最終結果として通知
    if (finalTranscriptRef.current && onResult) {
      onResult(finalTranscriptRef.current);
    }
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
          <RecordButton 
            onClick={startRecording}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C10.34 2 9 3.34 9 5v6c0 1.66 1.34 3 3 3s3-1.34 3-3V5c0-1.66-1.34-3-3-3zm5.3 6c-.08 0-.16.02-.24.06-.15.08-.26.23-.26.41v1.28c0 3.32-2.69 6.02-6.02 6.02s-6.02-2.7-6.02-6.02V8.47c0-.18-.11-.33-.26-.41C4.42 8.02 4.34 8 4.26 8 3.56 8 3 8.56 3 9.26v.21c0 4.28 3.17 7.83 7.31 8.54v2.09c0 .55.45 1 1 1s1-.45 1-1v-2.09C16.45 17.3 19.62 13.75 19.62 9.47v-.21c0-.7-.56-1.26-1.26-1.26z"/>
            </svg>
          </RecordButton>
          <StatusText>タップして録音開始</StatusText>
        </>
      ) : (
        <>
          <RecordButton 
            recording 
            onClick={stopRecording}
          >
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