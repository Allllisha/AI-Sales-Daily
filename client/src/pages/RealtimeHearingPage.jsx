import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { reportAPI } from '../services/api';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-4) var(--space-6);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: var(--space-3) var(--space-4);
  }
`;


const Title = styled.h1`
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: var(--font-size-body);
  }
`;

const Subtitle = styled.p`
  color: var(--color-text-tertiary);
  font-size: var(--font-size-small);
  margin: var(--space-1) 0 0 0;
`;

const VoiceContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const WaveformContainer = styled.div`
  height: ${props => props.isListening ? '100px' : '0'};
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  margin-bottom: ${props => props.isListening ? 'var(--space-4)' : '0'};
  transition: height 0.3s ease, margin 0.3s ease;
  opacity: ${props => props.isListening ? '1' : '0'};
`;

const WaveformBars = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 60px;
`;

const WaveformBar = styled.div`
  width: 3px;
  background: ${props => props.isSpeaking ? 
    'var(--color-accent)' : 
    'var(--color-border)'};
  border-radius: 2px;
  height: ${props => props.height}%;
  transition: all 0.15s ease;
  opacity: ${props => props.isSpeaking ? 1 : 0.2};
`;

const ConversationArea = styled.div`
  flex: 1;
  background-color: transparent;
  padding: var(--space-4) var(--space-4) var(--space-4) 0;  /* 右側にパディング追加 */
  overflow-y: auto;
  max-height: 500px;
  min-height: 350px;
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    width: 8px;  /* スクロールバーを少し太く */
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
    margin-right: var(--space-2);  /* トラックに右マージン */
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;
    border: 2px solid transparent;  /* スクロールバーに透明な境界線で間隔を作る */
    background-clip: padding-box;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-tertiary);
  }
`;

const Message = styled.div`
  margin-bottom: var(--space-3);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  
  ${props => props.role === 'user' ? `
    flex-direction: row-reverse;
  ` : ''}
`;

const MessageContent = styled.div`
  flex: 1;
  max-width: 70%;
  margin: 0 var(--space-3);  /* しっぽのスペース確保 */
  
  @media (max-width: 768px) {
    max-width: 85%;
  }
`;

const MessageLabel = styled.div`
  font-size: var(--font-size-micro);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-1);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: ${props => props.role === 'user' ? 'right' : 'left'};
`;

const MessageText = styled.div`
  padding: var(--space-3) var(--space-4);
  background: ${props => props.role === 'user' ? 
    'white' : 
    'var(--color-surface)'};
  color: var(--color-text-primary);
  border: ${props => props.role === 'user' ? 
    '2px solid var(--color-accent)' : 
    '1px solid var(--color-border)'};
  border-radius: 18px;
  line-height: var(--line-height-comfortable);
  font-size: var(--font-size-body);
  box-shadow: ${props => props.role === 'user' ? 
    '0 1px 3px rgba(249, 115, 22, 0.1)' : 
    '0 1px 3px rgba(0, 0, 0, 0.05)'};
  position: relative;
  text-align: left;  /* 全てのメッセージを左揃えに */
  
  ${props => props.isInitial ? `
    animation: fadeInUp 0.5s ease;
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  ` : ''}
`;

const PartialText = styled.span`
  color: var(--color-text-tertiary);
  font-style: italic;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  margin-top: var(--space-4);
  padding: var(--space-4) 0;
  position: sticky;
  bottom: 0;
  background: linear-gradient(180deg, 
    transparent 0%, 
    var(--color-background) 20%);
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    
    button {
      flex: 1;
      min-width: 120px;
    }
  }
`;

const ControlButton = styled.button`
  padding: var(--space-3) var(--space-4);
  background-color: ${props => props.primary ? 
    'var(--color-accent)' : 
    props.secondary ? 'var(--color-primary)' :
    'transparent'};
  color: ${props => props.primary || props.secondary ? 
    'white' : 
    'var(--color-text-secondary)'};
  border: ${props => props.primary || props.secondary ? 
    'none' : 
    '1px solid var(--color-border)'};
  border-radius: var(--radius-full);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  position: relative;
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: var(--shadow-elevation);
    background-color: ${props => {
      if (props.primary) return 'var(--color-accent-hover)';  // Darker orange for primary
      if (props.secondary) return '#6D28D9'; // Darker purple for secondary
      return 'var(--color-surface)';
    }};
    color: ${props => props.primary || props.secondary ? 
      'white' : 
      'var(--color-text-primary)'};
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 var(--space-3) 0;
  margin-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
`;

const StatusIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-small);
  color: ${props => {
    if (props.isSpeaking) return 'var(--color-accent)';
    if (props.status === 'listening') return 'var(--color-success)';
    return 'var(--color-text-tertiary)';
  }};
  font-weight: var(--font-weight-medium);
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: currentColor;
    animation: ${props => props.isSpeaking && props.status === 'listening' ? 'pulse-dot 1s infinite' : 'none'};
  }
  
  @keyframes pulse-dot {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
`;

const ReportDataCard = styled.div`
  background-color: transparent;
  padding: var(--space-4) 0;
  margin-top: var(--space-4);
  border-top: 1px solid var(--color-border);
`;

const ReportDataTitle = styled.h3`
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const ReportDataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ReportDataItem = styled.div`
  padding: var(--space-3);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-subtle);
  }
  
  .label {
    font-size: var(--font-size-micro);
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: var(--font-weight-medium);
  }
  
  .value {
    font-size: var(--font-size-body);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-normal);
    line-height: var(--line-height-comfortable);
  }
`;

const EditButton = styled.button`
  padding: var(--space-1) var(--space-2);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-size: var(--font-size-micro);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }
`;

const EditInput = styled.input`
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
`;

const EditTextarea = styled.textarea`
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  resize: vertical;
  min-height: 60px;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
`;

const SaveButton = styled.button`
  padding: var(--space-1) var(--space-2);
  background: var(--color-success);
  border: none;
  border-radius: var(--radius-sm);
  color: white;
  font-size: var(--font-size-micro);
  cursor: pointer;
  margin-right: var(--space-1);
  
  &:hover {
    background: var(--color-success-dark);
  }
`;

const CancelButton = styled.button`
  padding: var(--space-1) var(--space-2);
  background: var(--color-text-tertiary);
  border: none;
  border-radius: var(--radius-sm);
  color: white;
  font-size: var(--font-size-micro);
  cursor: pointer;
  
  &:hover {
    background: var(--color-text-secondary);
  }
`;

const RealtimeHearingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      text: 'お疲れ様です！今日はどのような商談がありましたか？' 
    }
  ]);
  const [hasPlayedInitialMessage, setHasPlayedInitialMessage] = useState(false);
  const messagesRef = useRef(messages); // messagesの最新値を保持するref
  const [partialTranscript, setPartialTranscript] = useState('');
  const [reportData, setReportData] = useState({});
  const reportDataRef = useRef(reportData); // reportDataの最新値を保持するref
  
  // messagesが更新されたらrefも更新
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // reportDataが更新されたらrefも更新
  useEffect(() => {
    reportDataRef.current = reportData;
  }, [reportData]);
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const currentUserMessageRef = useRef('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformHeights, setWaveformHeights] = useState(Array(12).fill(20));
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState(null);
  const [smoothedLevel, setSmoothedLevel] = useState(0);
  const audioLevelRef = useRef(0);
  const animationFrameRef = useRef(null);
  
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const conversationRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const audioEnabledRef = useRef(false); // iOS音声有効化フラグ
  const webAudioContextRef = useRef(null); // iOS用のWeb Audio Context
  const isAISpeakingRef = useRef(false); // AI音声再生中フラグ

  useEffect(() => {
    // iOS: ページ読み込み時に音声コンテキストを初期化
    const initAudioContext = async () => {
      if (!webAudioContextRef.current) {
        try {
          webAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          console.log('Audio context initialized on page load');
          
          // ユーザージェスチャーなしでも音声を有効化する試み
          if (webAudioContextRef.current.state === 'suspended') {
            // 最初のユーザーインタラクションで自動的に再開
            const resumeOnInteraction = async () => {
              try {
                if (webAudioContextRef.current && webAudioContextRef.current.state === 'suspended') {
                  await webAudioContextRef.current.resume();
                }
                
                // ダミー音声を再生してiOSの制限を解除
                const oscillator = webAudioContextRef.current.createOscillator();
                const gainNode = webAudioContextRef.current.createGain();
                gainNode.gain.value = 0; // 無音
                oscillator.connect(gainNode);
                gainNode.connect(webAudioContextRef.current.destination);
                oscillator.start();
                oscillator.stop(webAudioContextRef.current.currentTime + 0.01);
                
                audioEnabledRef.current = true;
                console.log('Audio context resumed and enabled on interaction');
                toast.success('音声が有効になりました');
              } catch (e) {
                console.error('Failed to enable audio:', e);
              }
            };
            
            // 複数のイベントに対応
            document.addEventListener('click', resumeOnInteraction, { once: true });
            document.addEventListener('touchstart', resumeOnInteraction, { once: true });
            document.addEventListener('touchend', resumeOnInteraction, { once: true });
            console.log('Waiting for user interaction to enable audio');
          } else {
            audioEnabledRef.current = true;
            console.log('Audio enabled by default');
          }
        } catch (e) {
          console.log('Could not auto-enable audio:', e);
        }
      }
    };
    
    initAudioContext();
    
    // WebSocket接続を確立
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://salesdaily-api.azurewebsites.net'
      : 'ws://localhost:3002';
      
    socketRef.current = io(serverUrl, {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setStatus('connected');
      toast.success('サーバーに接続しました');
      
      // 初回メッセージの音声を常に準備（モバイル・PC共通）
      if (!hasPlayedInitialMessage) {
        console.log('Requesting initial audio message on connect');
        // 即座に送信
        socketRef.current.emit('request-initial-audio');
        setHasPlayedInitialMessage(true);
      }
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setStatus('disconnected');
      setIsListening(false);
      
      // 自動再接続を試みる
      if (reason === 'io server disconnect') {
        // サーバーからの切断
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          socketRef.current.connect();
        }, 1000);
      }
    });
    
    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      setStatus('disconnected');
    });

    socketRef.current.on('listening-started', () => {
      setStatus('listening');
      setIsListening(true);
    });

    socketRef.current.on('listening-stopped', () => {
      setStatus('connected');
      setIsListening(false);
    });

    socketRef.current.on('partial-transcript', (data) => {
      // AI音声再生中は部分認識を無視
      if (!isAISpeakingRef.current) {
        setPartialTranscript(data.text);
      }
    });

    socketRef.current.on('final-transcript', (data) => {
      // AI音声再生中は最終認識も無視
      if (!isAISpeakingRef.current) {
        // 現在のユーザーメッセージに追加（複数の文を結合）
        setCurrentUserMessage(prev => {
          const newText = prev ? prev + ' ' + data.text : data.text;
          currentUserMessageRef.current = newText; // refも更新
          return newText;
        });
        setPartialTranscript('');
        
        // ステータスを処理中に変更（ユーザーにフィードバック）
        setStatus('processing');
      }
    });

    socketRef.current.on('ai-response-text', (data) => {
      try {
        console.log('AI Response received:', data);
        console.log('Current user message ref:', currentUserMessageRef.current);
        
        // 補正されたテキストがある場合はそれを使用、なければ元のテキストを使用
        const userMessage = data.correctedUserText || (currentUserMessageRef.current ? currentUserMessageRef.current.trim() : '');
        
        console.log('User message to save:', userMessage);
        
        // ユーザーメッセージを確定してからAI応答を追加
        if (userMessage) {
          setMessages(prev => {
            const newMessages = [...prev, 
              { role: 'user', text: userMessage },
              { role: 'assistant', text: data.text }
            ];
            console.log('Updated messages:', newMessages);
            return newMessages;
          });
        } else {
          setMessages(prev => {
            const newMessages = [...prev, { role: 'assistant', text: data.text }];
            console.log('Updated messages (no user):', newMessages);
            return newMessages;
          });
        }
        
        // リセット
        setCurrentUserMessage('');
        currentUserMessageRef.current = '';
        
        // reportDataを更新
        if (data.reportData) {
          console.log('Updating reportData:', data.reportData);
          setReportData(data.reportData);
        }
        
        // 終了メッセージの場合はステータスを更新
        if (data.text && (data.text.includes('内容把握いたしました') || data.text.includes('日報作成お疲れ様でした'))) {
          console.log('Conversation completed');
          setStatus('completed');
        } else {
          setStatus('listening'); // 応答後も聞き続ける
        }
      } catch (error) {
        console.error('Error processing AI response:', error);
        setStatus('connected');
      }
    });

    socketRef.current.on('ai-audio', (data) => {
      console.log('Received AI audio data');
      // 音声データをキューに追加
      audioQueueRef.current.push(data);
      if (!isPlayingRef.current) {
        playNextAudio();
      }
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      if (error && error.message && error.message !== 'WebSocket is closed before the connection is established.') {
        toast.error(error.message);
      }
    });

    // Cleanup
    return () => {
      stopListening();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // 音声レベルに基づく波形アニメーション
  useEffect(() => {
    if (!isListening) {
      setWaveformHeights(Array(12).fill(20));
      setIsSpeaking(false);
      return;
    }

    const updateWaveform = () => {
      // スムージング処理（急激な変化を避ける）
      const targetLevel = audioLevelRef.current;
      setSmoothedLevel(prev => prev * 0.7 + targetLevel * 0.3);
      
      // 音声検出の閾値（ノイズフロアより上）
      const threshold = 0.01;
      const speaking = audioLevelRef.current > threshold;
      setIsSpeaking(speaking);
      
      if (speaking) {
        // 音声レベルに応じた波形の高さを生成
        const baseHeight = Math.min(audioLevelRef.current * 500, 100);
        setWaveformHeights(prev => 
          prev.map((_, index) => {
            // 各バーに少しランダム性を加える
            const randomFactor = 0.7 + Math.random() * 0.6;
            const phase = Math.sin((Date.now() / 100 + index) * 0.5);
            return Math.max(20, Math.min(100, baseHeight * randomFactor * (0.8 + phase * 0.2)));
          })
        );
      } else {
        // 無音時は徐々に小さくする
        setWaveformHeights(prev => 
          prev.map(height => Math.max(20, height * 0.85))
        );
      }
      
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateWaveform);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening]);

  // 会話エリアの自動スクロール（メッセージ、現在の入力、部分的なトランスクリプトの変更時）
  useEffect(() => {
    if (conversationRef.current) {
      // タイムアウトを使用して、DOMの更新後にスクロール
      setTimeout(() => {
        if (conversationRef.current) {
          conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, currentUserMessage, partialTranscript]);

  const startListening = async () => {
    try {
      // iOS: 再生用AudioContextがある場合はキープ
      const playbackContext = webAudioContextRef.current;
      
      // マイクのアクセス許可を取得（エコーキャンセレーション強化）
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 16000 }
        } 
      });
      streamRef.current = stream;

      // Web Audio APIでストリーム処理
      // iOS Safari対応: 録音用AudioContextの初期化
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000
        });
      }
      
      // iOS Safari: suspendedの場合はresume
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // iOS: 再生用AudioContextもresumeしておく
      if (playbackContext && playbackContext.state === 'suspended') {
        await playbackContext.resume();
        console.log('Kept playback context active during recording');
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // AudioWorkletが使用可能な場合は使用、そうでなければScriptProcessorを使用
      if (audioContextRef.current.audioWorklet && typeof audioContextRef.current.audioWorklet.addModule === 'function') {
        // Modern approach with AudioWorklet (将来的な実装用のプレースホルダー)
        // 現在はScriptProcessorを使用
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
          const audioData = e.inputBuffer.getChannelData(0);
          
          // RMS（Root Mean Square）で音声レベルを計算
          const rms = Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length);
          
          // ピーク検出も加える（より反応を良くする）
          const peak = Math.max(...audioData.map(Math.abs));
          
          // RMSとピークの組み合わせで最終的なレベルを決定
          const level = rms * 0.7 + peak * 0.3;
          
          // refを更新（アニメーションループで使用）
          audioLevelRef.current = level;
          setAudioLevel(level);
          
          // 音声データを送信（Float32ArrayをArrayBufferに変換）
          const buffer = new ArrayBuffer(audioData.length * 2);
          const view = new Int16Array(buffer);
          for (let i = 0; i < audioData.length; i++) {
            view[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
          }
          
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('audio-data', buffer);
          }
        };
        
        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
        processorRef.current = processor;
      } else {
        // Fallback to ScriptProcessor
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
          const audioData = e.inputBuffer.getChannelData(0);
          
          // RMS（Root Mean Square）で音声レベルを計算
          const rms = Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length);
          
          // ピーク検出も加える（より反応を良くする）
          const peak = Math.max(...audioData.map(Math.abs));
          
          // RMSとピークの組み合わせで最終的なレベルを決定
          const level = rms * 0.7 + peak * 0.3;
          
          // refを更新（アニメーションループで使用）
          audioLevelRef.current = level;
          setAudioLevel(level);
          
          // 音声データを送信（Float32ArrayをArrayBufferに変換）
          const buffer = new ArrayBuffer(audioData.length * 2);
          const view = new Int16Array(buffer);
          for (let i = 0; i < audioData.length; i++) {
            view[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
          }
          
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('audio-data', buffer);
          }
        };
        
        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
        processorRef.current = processor;
      }
      
      // サーバーに録音開始を通知
      socketRef.current.emit('start-listening');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('マイクへのアクセスが拒否されました');
    }
  };

  const stopListening = () => {
    // 録音停止
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    // iOS: 録音用AudioContextを閉じる
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // iOS: 再生用AudioContextをアクティブに保つ
    if (webAudioContextRef.current && webAudioContextRef.current.state === 'suspended') {
      webAudioContextRef.current.resume().then(() => {
        console.log('Playback context resumed after stopping recording');
      }).catch(e => {
        console.log('Could not resume playback context:', e);
      });
    }
    
    // サーバーに停止を通知
    if (socketRef.current) {
      socketRef.current.emit('stop-listening');
    }
    
    setIsListening(false);
    setStatus('connected');
    
    // 部分的なトランスクリプトのみクリア（currentUserMessageは残す）
    setPartialTranscript('');
  };

  const playNextAudio = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      isAISpeakingRef.current = false;
      return;
    }
    
    isPlayingRef.current = true;
    setIsSpeaking(true);
    isAISpeakingRef.current = true; // AI音声再生開始
    const audioData = audioQueueRef.current.shift();
    
    try {
      // iOS: 再生前にAudioContextを確認・再開
      if (webAudioContextRef.current && webAudioContextRef.current.state === 'suspended') {
        await webAudioContextRef.current.resume();
        console.log('Resumed playback context before playing audio');
      }
      
      // Base64デコード
      const audioBuffer = Uint8Array.from(atob(audioData.audio), c => c.charCodeAt(0));
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(audioUrl);
      // iOS対応: 音量を明示的に設定
      audio.volume = 1.0;
      audio.muted = false; // ミュートを明示的に解除
      audio.playsinline = true; // iOSでインライン再生
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        isAISpeakingRef.current = false; // AI音声再生終了
        playNextAudio(); // 次の音声を再生
      };
      
      audio.oncanplaythrough = () => {
        console.log('Audio can play through');
      };
      
      audio.onerror = (e) => {
        console.error('Audio error:', e);
        URL.revokeObjectURL(audioUrl);
        isPlayingRef.current = false;
        setIsSpeaking(false);
      };
      
      // iOS Safari対応: play()の結果を適切に処理
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Audio playback started successfully');
        }).catch(error => {
          console.error('Audio playback failed:', error);
          isPlayingRef.current = false;
          setIsSpeaking(false);
          isAISpeakingRef.current = false;
          
          // iOS Safariの場合、音声再生には初回ユーザーインタラクションが必要
          if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
            // 音声が再生できなかった音をキューに戻す
            audioQueueRef.current.unshift(audioData);
            
            // 初回のみ通知
            if (!audioEnabledRef.current) {
              toast.info('音声再生には画面タップが必要です', { autoClose: 3000 });
            }
            
            // ユーザーが画面をタップしたら再生を試みる
            const handleUserInteraction = async () => {
              console.log('User interaction detected, enabling audio');
              
              // AudioContextを再開
              if (webAudioContextRef.current && webAudioContextRef.current.state === 'suspended') {
                await webAudioContextRef.current.resume();
              }
              
              audioEnabledRef.current = true;
              
              // キューから再生を再開
              if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
                playNextAudio();
              }
            };
            
            document.addEventListener('click', handleUserInteraction, { once: true });
            document.addEventListener('touchstart', handleUserInteraction, { once: true });
          }
        });
      }
    } catch (error) {
      console.error('Error in playNextAudio:', error);
      isPlayingRef.current = false;
      setIsSpeaking(false);
    }
  };

  const handleComplete = async () => {
    stopListening();
    
    // 完了メッセージを表示
    toast.loading('日報を保存しています...');
    
    // 最新のmessagesとreportDataを取得するために少し待つ
    setTimeout(async () => {
      try {
        // Get current JST date (UTC+9)
        const now = new Date();
        const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        
        // refから最新のデータを取得
        const currentMessages = messagesRef.current;
        const currentReportData = reportDataRef.current;
        
        // 質問と回答のペアを作成
        const questionsAnswers = [];
        for (let i = 0; i < currentMessages.length; i++) {
        // AIの質問の後にユーザーの回答が来るパターン
        if (currentMessages[i].role === 'assistant' && currentMessages[i + 1]?.role === 'user') {
          questionsAnswers.push({
            question: currentMessages[i].text,
            answer: currentMessages[i + 1].text,
            timestamp: new Date().toLocaleTimeString('ja-JP')
          });
        }
        // ユーザーの発言の後にAIの応答が来るパターン（初回の挨拶など）
        else if (currentMessages[i].role === 'user' && currentMessages[i + 1]?.role === 'assistant' && i === 0) {
          questionsAnswers.push({
            question: 'ユーザーからの報告',
            answer: currentMessages[i].text,
            timestamp: new Date().toLocaleTimeString('ja-JP')
          });
        }
      }
      
      // slotsの形式で保存（HearingPageと同じ形式）
      const cleanedSlots = {};
      Object.keys(currentReportData).forEach(key => {
        const value = currentReportData[key];
        
        // concernsをissuesにマッピング（ReportDetailPageとの互換性のため）
        const targetKey = key === 'concerns' ? 'issues' : key;
        
        if (Array.isArray(value)) {
          cleanedSlots[targetKey] = value.join(', ');
        } else if (typeof value === 'object' && value !== null) {
          cleanedSlots[targetKey] = JSON.stringify(value);
        } else if (value) {
          cleanedSlots[targetKey] = value;
        }
      });
      
      // issuesが既に存在する場合は上書き（優先）
      if (currentReportData.issues) {
        if (Array.isArray(currentReportData.issues)) {
          cleanedSlots.issues = currentReportData.issues.join(', ');
        } else {
          cleanedSlots.issues = currentReportData.issues;
        }
      }
      
      // デバッグログ
      console.log('Messages:', currentMessages);
      console.log('Questions and Answers:', questionsAnswers);
      console.log('Report Data:', currentReportData);
      console.log('Cleaned Slots:', cleanedSlots);
      
      // 日報を保存（HearingPageと同じ形式）
      const reportToSave = {
        report_date: jstDate.toISOString().split('T')[0],
        mode: 'realtime', // モードを追加
        questions_answers: questionsAnswers,
        slots: cleanedSlots
      };
      
      console.log('Report to save:', reportToSave);
      
      const response = await reportAPI.createReport(reportToSave);
      
      toast.dismiss();
      toast.success('日報を保存しました');
      
      // 保存した日報の詳細画面へ遷移
      navigate(`/reports/${response.id}`);
      
    } catch (error) {
      console.error('Failed to save report:', error);
      toast.dismiss();
      toast.error('日報の保存に失敗しました');
    }
    }, 500); // 500ms待つ
  };

  const getStatusText = () => {
    switch(status) {
      case 'connected': return '接続済み';
      case 'listening': return '聞いています...';
      case 'processing': return 'AI処理中...';
      default: return '未接続';
    }
  };

  // 編集機能のハンドラー
  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: currentValue || '' });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValues({});
  };

  const saveEdit = (field) => {
    const newValue = editValues[field];
    setReportData(prev => ({
      ...prev,
      [field]: newValue
    }));
    
    // WebSocketでサーバーにも更新を通知
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('update-report-data', {
        field,
        value: newValue
      });
    }
    
    setEditingField(null);
    setEditValues({});
  };

  const handleEditChange = (field, value) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getFieldLabel = (key) => {
    const labels = {
      customer: '顧客',
      project: '案件',
      budget: '予算',
      schedule: '納期',
      next_action: '次のアクション',
      participants: '参加者',
      location: '場所',
      issues: '課題・リスク',
      decision_makers: '決定権者',
      concerns: '懸念事項',
      competition: '競合情報'
    };
    return labels[key] || key;
  };

  return (
    <Container>
      <VoiceContainer>
        <StatusBar>
          <div>
            <Title>リアルタイム音声モード</Title>
            <Subtitle>話しかけるだけで日報を作成します</Subtitle>
          </div>
          <StatusIndicator status={status} isSpeaking={isSpeaking}>
            {isSpeaking ? '話しています...' : getStatusText()}
          </StatusIndicator>
        </StatusBar>

        <WaveformContainer isListening={isListening}>
          <WaveformBars>
            {waveformHeights.map((height, index) => (
              <WaveformBar
                key={index}
                height={height}
                isActive={isListening}
                isSpeaking={isSpeaking}
                delay={index * 50}
              />
            ))}
          </WaveformBars>
        </WaveformContainer>

        <ConversationArea ref={conversationRef}>
          {messages.map((message, index) => (
            <Message key={index} role={message.role}>
              <MessageContent>
                <MessageLabel role={message.role}>
                  {message.role === 'user' ? 'YOU' : 'AI'}
                </MessageLabel>
                <MessageText role={message.role} isInitial={index === 0 && message.role === 'assistant'}>{message.text}</MessageText>
              </MessageContent>
            </Message>
          ))}
          {(currentUserMessage || partialTranscript) && (
            <Message role="user">
              <MessageContent>
                <MessageLabel role="user">YOU (話し中...)</MessageLabel>
                <MessageText role="user">
                  {currentUserMessage}
                  {currentUserMessage && partialTranscript && ' '}
                  {partialTranscript && <PartialText>{partialTranscript}</PartialText>}
                </MessageText>
              </MessageContent>
            </Message>
          )}
        </ConversationArea>

        {Object.keys(reportData).length > 0 && (
          <ReportDataCard>
            <ReportDataTitle>収集された情報</ReportDataTitle>
            <ReportDataGrid>
              {Object.entries(reportData).map(([key, value]) => value && (
                <ReportDataItem key={key}>
                  <div className="label">
                    <span>{getFieldLabel(key)}</span>
                    {editingField !== key && (
                      <EditButton onClick={() => startEdit(key, value)}>
                        編集
                      </EditButton>
                    )}
                  </div>
                  {editingField === key ? (
                    <div>
                      {key === 'issues' || key === 'project' ? (
                        <EditTextarea
                          value={editValues[key] || ''}
                          onChange={(e) => handleEditChange(key, e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <EditInput
                          type="text"
                          value={editValues[key] || ''}
                          onChange={(e) => handleEditChange(key, e.target.value)}
                          autoFocus
                        />
                      )}
                      <div style={{ marginTop: 'var(--space-2)' }}>
                        <SaveButton onClick={() => saveEdit(key)}>保存</SaveButton>
                        <CancelButton onClick={cancelEdit}>キャンセル</CancelButton>
                      </div>
                    </div>
                  ) : (
                    <div className="value">
                      {Array.isArray(value) ? value.join(', ') : value}
                    </div>
                  )}
                </ReportDataItem>
              ))}
            </ReportDataGrid>
          </ReportDataCard>
        )}

        <ControlsContainer>
          {!isListening ? (
            <ControlButton primary onClick={async () => {
              // iOS/Android: ユーザーインタラクションで音声を有効化
              try {
                // Web Audio Contextを作成またはresume
                if (!webAudioContextRef.current) {
                  webAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                  console.log('Created new AudioContext on button click');
                }
                
                if (webAudioContextRef.current.state === 'suspended') {
                  await webAudioContextRef.current.resume();
                  console.log('Resumed AudioContext on button click');
                }
                
                // 無音を再生して音声を有効化
                const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
                silentAudio.volume = 0.01;
                
                try {
                  await silentAudio.play();
                  audioEnabledRef.current = true;
                  console.log('Audio fully enabled via button click');
                } catch (error) {
                  console.log('Silent audio error:', error.message);
                  audioEnabledRef.current = true;
                }
                
                // 初回メッセージの音声を即座に要求（モバイル/デスクトップ共通）
                if (!hasPlayedInitialMessage && socketRef.current && socketRef.current.connected) {
                  console.log('Requesting initial audio message');
                  setTimeout(() => {
                    socketRef.current.emit('request-initial-audio');
                    setHasPlayedInitialMessage(true);
                  }, 100); // 少し遅延を入れて確実に送信
                }
              } catch (e) {
                console.log('Audio setup error:', e);
              }
              
              // マイクを開始
              startListening();
            }}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
              会話を開始
            </ControlButton>
          ) : (
            <ControlButton onClick={stopListening}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h12v12H6z"/>
              </svg>
              話し終わる
            </ControlButton>
          )}
          
          <ControlButton onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            キャンセル
          </ControlButton>
        </ControlsContainer>
      </VoiceContainer>
    </Container>
  );
};

export default RealtimeHearingPage;