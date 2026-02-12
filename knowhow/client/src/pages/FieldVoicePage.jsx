import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { aiAPI, speechAPI, knowledgeAPI, sessionAPI } from '../services/api';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { HiOutlineArrowLeft, HiOutlineBookOpen, HiOutlineLightBulb, HiOutlineMenuAlt2, HiOutlinePlus, HiOutlineChatAlt2, HiOutlineTrash, HiOutlineThumbUp, HiOutlineSparkles } from 'react-icons/hi';
import Modal from '../components/Modal';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseRing = keyframes`
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
`;

const PageWrapper = styled.div`
  display: flex;
  height: calc(100vh - 140px);
  margin: 0 auto;

  @media (max-width: 768px) {
    height: calc(100dvh - 180px);
  }
`;

const Container = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4) var(--space-4);
  overflow: hidden;

  @media (max-width: 768px) {
    padding: var(--space-3) var(--space-3);
  }

  @media (max-width: 420px) {
    padding: var(--space-2) var(--space-2);
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  margin-bottom: var(--space-3);
  flex-shrink: 0;

  @media (max-width: 640px) {
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
`;

const BackButton = styled.button`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  font-size: 1.2rem;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }

  @media (max-width: 420px) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;

  @media (max-width: 640px) {
    font-size: var(--font-size-lg);
  }

  @media (max-width: 420px) {
    font-size: var(--font-size-base);
  }
`;

const FieldBadge = styled.span`
  padding: var(--space-1) var(--space-3);
  background: var(--gradient-accent);
  color: white;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);

  @media (max-width: 420px) {
    padding: 2px var(--space-2);
    font-size: 0.65rem;
  }
`;

const MenuButton = styled.button`
  margin-left: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  font-size: 1.2rem;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }

  @media (max-width: 420px) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
`;

const SidebarOverlay = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: ${props => props.$open ? 'block' : 'none'};
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 140;
  }
`;

const Sidebar = styled.div`
  width: ${props => props.$open ? '260px' : '0px'};
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: ${props => props.$open ? '1px solid var(--color-border)' : 'none'};
  overflow: hidden;
  transition: width 0.25s ease;

  @media (max-width: 768px) {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${props => props.$open ? 'min(280px, 85vw)' : '0px'};
    z-index: 150;
    background: var(--color-surface);
    box-shadow: ${props => props.$open ? '4px 0 24px rgba(0,0,0,0.15)' : 'none'};
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  min-width: 240px;
`;

const SidebarTitle = styled.span`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const NewChatButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: none;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }
`;

const SessionList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
  min-width: 240px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }
`;

const SessionItem = styled.div`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  background: ${props => props.$active ? 'var(--color-primary-50)' : 'transparent'};
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
  color: ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'var(--color-text-primary)'};
  position: relative;

  &:hover {
    background: ${props => props.$active ? 'var(--color-primary-50)' : 'var(--color-surface)'};
  }

  &:hover .session-delete-btn {
    display: flex;
  }
`;

const SessionDeleteButton = styled.button`
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-tertiary);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  z-index: 1;

  &:hover {
    color: var(--color-error);
    border-color: var(--color-error);
    background: var(--color-error-light, #fef2f2);
  }
`;

const SessionIcon = styled.div`
  flex-shrink: 0;
  margin-top: 2px;
  color: ${props => props.$active ? 'var(--color-primary-600, #2563eb)' : 'var(--color-text-tertiary)'};
`;

const SessionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SessionItemTitle = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SessionItemMeta = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
`;

const ResponseArea = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;
  }

  @media (max-width: 420px) {
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }
`;

const ResponseCard = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  border-bottom-left-radius: var(--radius-sm);
  padding: var(--space-5);
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-primary);
  animation: ${fadeIn} 0.3s ease-out;

  h1, h2, h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    margin: var(--space-4) 0 var(--space-2);
    color: var(--color-text-primary);
    &:first-of-type { margin-top: 0; }
  }

  h3 { font-size: var(--font-size-base); }

  p { margin: var(--space-2) 0; }
  p:first-of-type { margin-top: 0; }
  p:last-of-type { margin-bottom: 0; }

  ul, ol {
    margin: var(--space-2) 0;
    padding-left: var(--space-5);
  }

  li {
    margin: var(--space-1) 0;
  }

  strong {
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  code {
    background: var(--color-surface-alt);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: 0.9em;
  }

  @media (max-width: 420px) {
    padding: var(--space-3);
  }
`;

const UserTranscript = styled.div`
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
  font-size: var(--font-size-lg);
  align-self: flex-end;
  max-width: 90%;
  animation: ${fadeIn} 0.3s ease-out;
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.15);

  @media (max-width: 420px) {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-base);
  }
`;

const CorrectionBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.7);
  margin-top: var(--space-2);
  cursor: pointer;
  user-select: none;
  &:hover {
    color: rgba(255, 255, 255, 0.9);
  }
`;

const OriginalText = styled.div`
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.6);
  margin-top: var(--space-1);
  text-decoration: line-through;
`;

const InterimTranscript = styled.div`
  background: rgba(26, 54, 93, 0.08);
  border: 1.5px dashed var(--color-primary-600, #2563eb);
  color: var(--color-text-secondary);
  border-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
  font-size: var(--font-size-lg);
  align-self: flex-end;
  max-width: 90%;
  font-style: italic;
`;

const ProcessingCard = styled(ResponseCard)`
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const ProcessingDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--color-primary-600, #2563eb);
  border-radius: 50%;
  opacity: 0.5;
  animation: ${keyframes`
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  `} 1.4s infinite ease-in-out;

  &:nth-of-type(1) { animation-delay: -0.32s; }
  &:nth-of-type(2) { animation-delay: -0.16s; }
`;

const MicSection = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  flex-shrink: 0;
  width: 100%;

  @media (max-width: 640px) {
    gap: var(--space-3);
    padding: var(--space-2) 0;
  }
`;

const BigMicButton = styled.button`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  flex-shrink: 0;
  background: ${props => props.$recording
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : 'var(--gradient-primary)'};
  color: var(--color-text-inverse);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: ${props => props.$recording
    ? '0 4px 16px rgba(239, 68, 68, 0.4)'
    : '0 4px 16px rgba(26, 54, 93, 0.3)'};
  transition: all var(--transition-base);
  -webkit-tap-highlight-color: transparent;

  svg { width: 28px; height: 28px; }

  &:hover:not(:disabled) {
    transform: scale(1.05);
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  @media (max-width: 420px) {
    width: 56px;
    height: 56px;
    svg { width: 24px; height: 24px; }
  }
`;

const PulseRing = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid var(--color-error);
  animation: ${pulseRing} 1.5s ease-out infinite;
  pointer-events: none;
`;

const PulseRing2 = styled(PulseRing)`
  animation-delay: 0.5s;
`;

const MicInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StatusText = styled.p`
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: ${props => props.$recording ? 'var(--color-error)' : 'var(--color-text-secondary)'};
  letter-spacing: -0.01em;

  @media (max-width: 420px) {
    font-size: var(--font-size-sm);
  }
`;

const HintText = styled.p`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
`;

const KnowledgeSuggestionCard = styled.div`
  background: var(--color-surface);
  border: 1.5px solid var(--color-primary-600, #2563eb);
  border-radius: var(--radius-lg);
  border-bottom-left-radius: var(--radius-sm);
  padding: var(--space-4);
  animation: ${fadeIn} 0.3s ease-out;

  @media (max-width: 420px) {
    padding: var(--space-3);
  }
`;

const KnowledgeSuggestionTitle = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-600, #2563eb);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const KnowledgeFieldCompact = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--space-2);

  strong {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
  }
`;

const KnowledgeTagsInline = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
`;

const KnowledgeTagSmall = styled.span`
  padding: 2px var(--space-2);
  background: var(--color-primary-50);
  color: var(--color-primary-600, #2563eb);
  border-radius: var(--radius-full, 9999px);
  font-size: var(--font-size-xs);
`;

const KnowledgeInlineActions = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
`;

const KnowledgeInlineButton = styled.button`
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 38px;

  ${props => props.$primary ? `
    background: var(--color-primary-600, #2563eb);
    color: white;
    border: none;
    &:hover:not(:disabled) { opacity: 0.85; }
    &:active:not(:disabled) { transform: scale(0.95); opacity: 0.7; }
  ` : `
    background: var(--color-surface);
    color: var(--color-text-secondary);
    border: 1.5px solid var(--color-border);
    &:hover:not(:disabled) { border-color: var(--color-text-secondary); }
    &:active:not(:disabled) { transform: scale(0.95); background: var(--color-bg-secondary); }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RelatedKnowledgeSection = styled.div`
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

const RelatedKnowledgeChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-lighter);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-primary-600, #2563eb);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;

  &:hover {
    background: var(--color-primary-lighter);
    box-shadow: var(--shadow-sm);
  }
`;

const InlineKnowledgeLink = styled.a`
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  border-bottom: 1px dashed var(--color-primary-600, #2563eb);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-primary-50);
    border-bottom-style: solid;
  }
`;

const KnowledgeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
`;

const UsefulButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  color: ${props => props.$marked ? 'var(--color-success-dark)' : 'var(--color-text-tertiary)'};
  background: ${props => props.$marked ? 'var(--color-success-light)' : 'transparent'};
  border: 1px solid ${props => props.$marked ? 'var(--color-success)' : 'var(--color-border)'};
  border-radius: var(--radius-full);
  cursor: ${props => props.$marked ? 'default' : 'pointer'};
  transition: all var(--transition-fast);
  font-weight: var(--font-weight-medium);

  &:hover:not(:disabled) {
    color: var(--color-success-dark);
    border-color: var(--color-success);
    background: var(--color-success-light);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

// [[knowledge:ID|タイトル]] と [[checklist:ID|名前]] マーカーを markdown リンクに変換
const processKnowledgeLinks = (content) => {
  return content
    .replace(
      /\[\[knowledge:(\d+)\|([^\]]+)\]\]/g,
      '[$2](/knowledge/$1)'
    )
    .replace(
      /\[\[checklist:(\d+)\|([^\]]+)\]\]/g,
      '[チェックリスト: $2](/checklists/$1)'
    );
};

// テキスト内のマーカーに含まれないナレッジだけ下部に表示
const getUnreferencedKnowledge = (content, relatedKnowledge) => {
  if (!relatedKnowledge || relatedKnowledge.length === 0) return [];
  return relatedKnowledge.filter(k => {
    const marker = `[[knowledge:${k.id}|`;
    return !content.includes(marker);
  });
};

// メッセージ内の [[knowledge:ID|タイトル]] からナレッジ情報を抽出
const extractKnowledgeRefs = (content) => {
  const refs = [];
  const regex = /\[\[knowledge:(\d+)\|([^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    refs.push({ id: parseInt(match[1]), title: match[2] });
  }
  return refs;
};

const FIELD_GREETING = 'お疲れ様です。現場の状況や確認したいことを音声で話しかけてください。\n\n**作業内容を教えていただければ、関連するナレッジや注意点をお伝えします。**\n\n作業中に気づいたことや対処法は「記録して」と言えばナレッジとして登録できます。';

const FieldVoicePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isConversing, setIsConversing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: FIELD_GREETING }
  ]);
  const messagesRef = useRef([]); // stale closure対策: 常に最新のmessagesを参照
  const recognitionRef = useRef(null);
  const interimRef = useRef('');
  const silenceTimerRef = useRef(null);
  const sendingRef = useRef(false);
  const conversingRef = useRef(false);
  const audioRef = useRef(null);
  const responseAreaRef = useRef(null);
  const speakingTextRef = useRef(''); // AIが今読み上げ中のテキスト（エコー安全ネット用）
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const vadTimerRef = useRef(null);
  const shouldEndRef = useRef(false); // 会話終了フラグ
  const [knowledgeProposal, setKnowledgeProposal] = useState(null);
  const [registrationPhase, _setRegistrationPhase] = useState('none'); // 'none' | 'analyzing' | 'confirming' | 'saving' | 'done'
  const registrationPhaseRef = useRef('none');
  const setRegistrationPhase = (phase) => { registrationPhaseRef.current = phase; _setRegistrationPhase(phase); };
  const knowledgeAnalyzedRef = useRef(false); // バックグラウンド分析中 or 提案済みフラグ（セッションごとにリセット）
  const sessionIdRef = useRef(null);
  const [markedUseful, setMarkedUseful] = useState({});
  const [showOriginal, setShowOriginal] = useState({});

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const SILENCE_TIMEOUT = 2500;

  // 会話終了の意図を検知
  const isEndingPhrase = (text) => {
    const t = text.replace(/[\s　]/g, '');
    // 明確な終了フレーズ
    const strongEnd = [
      /もう大丈夫/, /以上です/, /それだけです/, /終わりで/,
      /もう結構/, /お疲れ様/, /おつかれさま/, /ありがとうございました/,
    ];
    for (const p of strongEnd) {
      if (p.test(t)) return true;
    }
    // 短い発話で終了っぽいもの（会話途中の相槌と区別するため短文限定）
    if (t.length < 25) {
      const softEnd = [
        /大丈夫です/, /ありがとうございます/, /ありがとう$/,
        /なさそうです/, /ないです$/, /いいです$/,
      ];
      for (const p of softEnd) {
        if (p.test(t)) return true;
      }
    }
    return false;
  };

  // マイクストリーム初期化（echoCancellation付きでVADに使用）
  const setupMicStream = async () => {
    if (micStreamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      micStreamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;
      return true;
    } catch (err) {
      console.warn('VAD用マイク設定失敗:', err);
      return false;
    }
  };

  // AI読み上げ中のVAD（Voice Activity Detection）: ユーザーの声を検知
  // 適応型: まずエコーの音量ベースラインを測定し、それを大幅に超えた時だけ割り込み判定
  const startVAD = () => {
    if (!analyserRef.current) return;
    stopVAD();

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const baselineSamples = [];
    let baseline = 0;
    let calibrated = false;
    const CALIBRATION_FRAMES = 15; // 約1.5秒間エコー音量を計測

    vadTimerRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, v) => sum + v, 0) / bufferLength;

      // キャリブレーション期間: エコーの音量ベースラインを測定
      if (!calibrated) {
        baselineSamples.push(avg);
        if (baselineSamples.length >= CALIBRATION_FRAMES) {
          baseline = baselineSamples.reduce((s, v) => s + v, 0) / baselineSamples.length;
          calibrated = true;
          console.log('[VAD] エコーベースライン:', baseline.toFixed(1));
        }
        return;
      }

      // ユーザーの声はエコーより明らかに大きいはず
      // エコーベースライン ~7 に対し、ユーザー音声 ~40 なので閾値25で十分区別可能
      const threshold = Math.max(baseline * 2.5, baseline + 15, 25);

      if (avg > threshold) {
        console.log('[VAD] ユーザー音声検知, volume:', avg.toFixed(1), '> threshold:', threshold.toFixed(1));
        stopVAD();
        // エコーフィルタ用にspeakingTextRefを残したまま音声だけ停止
        stopSpeaking(true);

        // 会話終了フラグが立っている場合は自動停止
        if (shouldEndRef.current) {
          shouldEndRef.current = false;
          speakingTextRef.current = '';
          stopConversation(true);
          return;
        }

        // SpeechRecognitionはspeakResponse開始時に既に起動済み（beginListening）
        // エコーフィルタがAI音声を弾き、ユーザーの声だけを認識中
        // → ここで再起動すると話し始めを逃すので呼ばない

        // エコーフィルタ用テキストを少し残してからクリア（残響対策）
        setTimeout(() => { speakingTextRef.current = ''; }, 1000);
      }
    }, 100);
  };

  const stopVAD = () => {
    if (vadTimerRef.current) {
      clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
  };

  // 安全ネット: 万一エコーがSpeechRecognitionに入った場合のフィルタ
  const isEcho = (recognizedText) => {
    const aiText = speakingTextRef.current;
    if (!aiText) return false;
    const normalize = (str) =>
      str.replace(/[\s　、。,.!！?？・「」『』()\-\—（）：:；;]/g, '').toLowerCase();
    const normRec = normalize(recognizedText);
    const normAI = normalize(aiText);
    if (!normRec || normRec.length < 2) return false;
    if (normAI.includes(normRec)) return true;
    // 3文字n-gram類似度
    const ngram = (str, n) => {
      const grams = new Set();
      for (let i = 0; i <= str.length - n; i++) grams.add(str.slice(i, i + n));
      return grams;
    };
    const rGrams = ngram(normRec, 3);
    const aGrams = ngram(normAI, 3);
    if (rGrams.size === 0) return false;
    let m = 0;
    for (const g of rGrams) { if (aGrams.has(g)) m++; }
    return (m / rGrams.size) >= 0.35;
  };

  // messagesが更新されたらrefも同期（stale closure対策）
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (responseAreaRef.current) {
      responseAreaRef.current.scrollTop = responseAreaRef.current.scrollHeight;
    }
  }, [messages, interimText]);

  // セッション一覧取得
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await sessionAPI.list({ mode: 'field', limit: 50 });
        setSessions(data.sessions || []);
      } catch (e) {
        console.error('Failed to fetch sessions:', e);
      }
    };
    fetchSessions();
  }, []);

  const refreshSessions = async () => {
    try {
      const data = await sessionAPI.list({ mode: 'field', limit: 50 });
      setSessions(data.sessions || []);
    } catch (e) { /* ignore */ }
  };

  // セッション切り替え
  const handleSelectSession = async (sessionId) => {
    if (sessionId === activeSessionId) {
      if (window.innerWidth <= 768) setSidebarOpen(false);
      return;
    }
    // 進行中の会話を停止
    if (isConversing) {
      stopConversation();
    }
    try {
      const data = await sessionAPI.getById(sessionId);
      const loaded = (data.messages || []).map(m => ({
        role: m.role,
        content: m.content,
      }));
      setMessages(loaded.length > 0 ? loaded : [
        { role: 'assistant', content: FIELD_GREETING }
      ]);
      sessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
      setKnowledgeProposal(null);
      setRegistrationPhase('none');
      knowledgeAnalyzedRef.current = false;
      if (window.innerWidth <= 768) setSidebarOpen(false);
    } catch (e) {
      toast.error('セッションの読み込みに失敗しました');
    }
  };

  // セッション削除
  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    setDeleteConfirmId(sessionId);
  };

  const confirmDeleteSession = async () => {
    const sessionId = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await sessionAPI.delete(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        if (isConversing) stopConversation();
        setMessages([
          { role: 'assistant', content: FIELD_GREETING }
        ]);
        sessionIdRef.current = null;
        setActiveSessionId(null);
        setKnowledgeProposal(null);
        setRegistrationPhase('none');
      }
      toast.success('会話を削除しました');
    } catch (err) {
      console.error('Failed to delete session:', err);
      toast.error('削除に失敗しました');
    }
  };

  // 新規会話
  const handleNewChat = () => {
    if (isConversing) {
      stopConversation();
    }
    setMessages([
      { role: 'assistant', content: FIELD_GREETING }
    ]);
    sessionIdRef.current = null;
    setActiveSessionId(null);
    setKnowledgeProposal(null);
    setRegistrationPhase('none');
    knowledgeAnalyzedRef.current = false;
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const formatSessionDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) {
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (diff < 86400000 * 7) {
      return `${Math.floor(diff / 86400000)}日前`;
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // AI読み上げを停止する
  const stopSpeaking = (keepEchoFilter = false) => {
    if (!keepEchoFilter) {
      speakingTextRef.current = '';
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // 録音を開始する内部関数
  const beginListening = () => {
    if (!conversingRef.current) return;
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;

    // 既にリスニング中なら二重起動しない
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP';

    recognition.onstart = () => {
      setIsRecording(true);
      setInterimText('');
      interimRef.current = '';
      sendingRef.current = false;
    };

    recognition.onresult = (event) => {
      // 送信処理中は遅延した認識結果を無視（二重送信防止）
      if (sendingRef.current) return;

      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      const currentText = final + interim;

      // エコー判定: AI音声がマイクに拾われた場合は無視
      if (speakingTextRef.current && isEcho(currentText)) {
        console.log('[Echo filtered]', currentText.slice(0, 30));
        return;
      }

      interimRef.current = currentText;
      setInterimText(currentText);

      // ユーザーが話し始めたらAI音声を割り込み停止
      if (currentText.trim()) {
        stopSpeaking();
        speakingTextRef.current = ''; // 割り込み後はエコー判定をリセット
      }

      resetSilenceTimer();
    };

    recognition.onerror = (event) => {
      clearTimeout(silenceTimerRef.current);
      setInterimText('');
      interimRef.current = '';
      if (event.error === 'no-speech' && conversingRef.current) {
        // 無音タイムアウト → 表示を切り替えずシームレスに再開
        setTimeout(() => beginListening(), 300);
      } else if (event.error === 'not-allowed') {
        setIsRecording(false);
        toast.error('マイクへのアクセスが許可されていません');
        stopConversation();
      } else if (event.error !== 'aborted' && conversingRef.current) {
        // その他エラー → 再リスニング（表示維持）
        setTimeout(() => beginListening(), 500);
      } else {
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      // 会話モード中で送信中でなければ再リスニング（表示を切り替えずシームレスに再開）
      if (conversingRef.current && !sendingRef.current) {
        setTimeout(() => beginListening(), 300);
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const resetSilenceTimer = () => {
    clearTimeout(silenceTimerRef.current);
    if (interimRef.current.trim()) {
      silenceTimerRef.current = setTimeout(() => {
        finishAndSend();
      }, SILENCE_TIMEOUT);
    }
  };

  const finishAndSend = async () => {
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsRecording(false);

    let text = interimRef.current.trim();
    interimRef.current = '';
    // interimTextはクリアしない — ユーザーメッセージ追加時に消す（ちらつき防止）

    if (text) {
      sendingRef.current = true;
      stopSpeaking();

      // ナレッジ登録確認中の音声コマンド検出（短い応答なので補正不要）
      if (registrationPhaseRef.current === 'confirming') {
        const draftKeywords = ['下書き', '下書きで', '下書き保存'];
        const confirmKeywords = ['はい', '登録', 'お願い', '登録して', 'オーケー', 'OK', '公開'];
        const dismissKeywords = ['いいえ', 'やめる', 'キャンセル', 'いらない', '不要'];
        const isDraft = draftKeywords.some(kw => text.includes(kw));
        const isConfirm = confirmKeywords.some(kw => text.includes(kw));
        const isDismiss = dismissKeywords.some(kw => text.includes(kw));
        if (isDraft) {
          setInterimText('');
          sendingRef.current = false;
          handleRegisterKnowledge('draft');
          return;
        }
        if (isConfirm) {
          setInterimText('');
          sendingRef.current = false;
          handleRegisterKnowledge('published');
          return;
        }
        if (isDismiss) {
          setInterimText('');
          sendingRef.current = false;
          handleDismissKnowledge();
          if (conversingRef.current) {
            setTimeout(() => beginListening(), 300);
          }
          return;
        }
      }

      // AI音声補正（建設・土木用語の誤変換を修正）
      let originalText = null;
      try {
        const { corrected } = await aiAPI.correctSpeech(text);
        if (corrected && corrected !== text) {
          originalText = text;
          text = corrected;
        }
      } catch (e) {
        // 補正失敗時は元のテキストのまま
      }

      // ナレッジ登録コマンドの検出
      const registrationKeywords = [
        '記録して', '登録して', '保存して',
        'ナレッジに保存', 'ナレッジ登録', 'ナレッジを登録',
        '登録したい', '保存したい', '記録したい',
        'ナレッジとして登録', 'ナレッジとして保存', 'ナレッジとして記録',
        'ナレッジにして', '知見を登録', '知見を保存',
      ];
      const isRegistrationCommand = registrationKeywords.some(kw => text.includes(kw));
      if (isRegistrationCommand) {
        setInterimText('');
        setMessages(prev => [...prev, { role: 'user', content: text, ...(originalText && { originalText }) }]);
        analyzeConversationForKnowledge();
        sendingRef.current = false;
        // beginListeningは呼ばない。analyzeConversationForKnowledge内のspeakResponse→onFinishedで自動再開される
        return;
      }

      sendToAI(text, originalText);
    } else {
      setInterimText('');
      if (conversingRef.current) {
        setTimeout(() => beginListening(), 300);
      }
    }
  };

  // AI読み上げ（読み上げ中はVADで割り込み検知、終了後にSpeechRecognition開始）
  const speakResponse = async (plainText) => {
    setIsSpeaking(true);
    speakingTextRef.current = plainText;

    const onFinished = () => {
      speakingTextRef.current = '';
      setIsSpeaking(false);
      stopVAD();

      // 会話終了フラグが立っている場合 → 挨拶後に自動停止
      if (shouldEndRef.current) {
        shouldEndRef.current = false;
        stopConversation(true);
        return;
      }

      // SpeechRecognitionはspeakResponse開始時に既に起動済み
      // 割り込みがなかった場合でもそのまま継続（エコーフィルタは上でクリア済み）
      // recognitionが動いていない場合のみ起動（フォールバック）
      if (conversingRef.current && !sendingRef.current && !recognitionRef.current) {
        beginListening();
      }
    };

    // AI読み上げ中はVADで音量監視（割り込み検知用）+ SpeechRecognitionも事前起動
    // エコーフィルタがAI音声を弾き、ユーザーの割り込み時は既に動いているrecognitionが即座に拾う
    if (conversingRef.current) {
      startVAD();
      beginListening();
    }

    try {
      const audioBlob = await speechAPI.synthesize(plainText);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        onFinished();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        onFinished();
      };
      audio.play();
    } catch (ttsError) {
      console.warn('Azure TTS failed, falling back to browser TTS:', ttsError);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        utterance.onend = onFinished;
        utterance.onerror = onFinished;
        speechSynthesis.speak(utterance);
      } else {
        onFinished();
      }
    }
  };

  const sendToAI = async (transcript, originalText = null) => {
    // sendingRef is already set by finishAndSend - don't guard here
    setInterimText(''); // interimテキストをクリア（ユーザーメッセージに置き換わるため）

    // 提案中にユーザーが会話を続けた場合 → 古い提案を消して再分析可能にする
    let dismissedProposal = false;
    if (registrationPhaseRef.current === 'confirming') {
      setMessages(prev => prev.map(m => m.showKnowledgeProposal ? { ...m, showKnowledgeProposal: false } : m));
      setKnowledgeProposal(null);
      setRegistrationPhase('none');
      knowledgeAnalyzedRef.current = false;
      dismissedProposal = true;
    }

    setMessages(prev => [...prev, { role: 'user', content: transcript, ...(originalText && { originalText }) }]);
    setIsProcessing(true);

    // 終了フレーズ検知
    const ending = isEndingPhrase(transcript);
    shouldEndRef.current = ending;

    try {
      const response = await aiAPI.chat({
        message: transcript,
        mode: 'field',
        session_id: sessionIdRef.current || undefined,
        conversation_history: messagesRef.current
          .filter(m => !m.isSystemMessage)
          .map(m => ({ role: m.role, content: m.content })),
        system_hint: ending ? 'ユーザーは会話を終了したいようです。簡潔に挨拶して締めくくってください' : undefined
      });

      const aiResponse = response.response || response.message || response.content || 'すみません、応答を生成できませんでした。';
      const relatedKnowledge = response.related_knowledge || [];
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, relatedKnowledge }]);

      // 初回のユーザーメッセージ後、タイトル生成が完了しているのでセッション一覧をリフレッシュ
      const userMsgCount = messagesRef.current.filter(m => m.role === 'user').length;
      if (userMsgCount <= 1) {
        refreshSessions();
      }

      // 会話が十分に進んだら、バックグラウンドでAI分析 → 登録すべきナレッジがあれば提案
      const allMsgs = [...messagesRef.current, { role: 'user', content: transcript }, { role: 'assistant', content: aiResponse }];
      const canAnalyze = registrationPhaseRef.current === 'none' || dismissedProposal;
      const shouldAnalyze = allMsgs.length >= 5 && !knowledgeAnalyzedRef.current && canAnalyze;
      if (shouldAnalyze) {
        knowledgeAnalyzedRef.current = true;
        aiAPI.analyzeConversation({
          messages: allMsgs
            .filter(m => (m.role === 'user' || m.role === 'assistant') && !m.isLoading)
            .map(m => ({ role: m.role, content: m.content }))
        }).then(result => {
          if (result.should_register && result.extracted) {
            setKnowledgeProposal(result);
            setRegistrationPhase('confirming');
            const proposalMsg = `この会話に有益な知見が含まれています。ナレッジとして登録しますか？\n\n**${result.extracted.title}**\n${result.extracted.summary || ''}`;
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: proposalMsg,
              showKnowledgeProposal: true,
              isSystemMessage: true,
            }]);
            // セッションにも保存
            if (sessionIdRef.current) {
              sessionAPI.addMessages(sessionIdRef.current, [
                { role: 'assistant', content: proposalMsg }
              ]).catch(err => console.error('Failed to save proposal message:', err));
            }
          } else {
            // 見つからなかった → 次のAI応答で再分析できるようにリセット
            knowledgeAnalyzedRef.current = false;
          }
        }).catch(err => {
          console.error('Background analysis error:', err);
          knowledgeAnalyzedRef.current = false;
        });
      }

      // TTS用: マークダウンとナレッジ・チェックリストマーカーを除去して平文に
      const plainText = aiResponse
        .replace(/\[\[knowledge:\d+\|([^\]]+)\]\]/g, '$1')
        .replace(/\[\[checklist:\d+\|([^\]]+)\]\]/g, '$1')
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/[-*]\s/g, '')
        .replace(/\n{2,}/g, '。')
        .replace(/\n/g, '。')
        .trim();

      setIsProcessing(false);
      sendingRef.current = false;

      // 読み上げ開始（VADで割り込み検知、終了後にSpeechRecognition自動開始）
      speakResponse(plainText);
    } catch (error) {
      console.error('Voice chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。'
      }]);
      toast.error('応答の取得に失敗しました');
      setIsProcessing(false);
      sendingRef.current = false;
      // エラーでも会話モード中なら再リスニング
      if (conversingRef.current) {
        setTimeout(() => beginListening(), 1000);
      }
    }
  };

  // 会話モード開始
  const startConversation = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('音声入力に対応していないブラウザです');
      return;
    }
    await setupMicStream();

    // まず会話を開始してから、セッション作成は非同期で行う
    setIsConversing(true);
    conversingRef.current = true;
    beginListening();

    // Create a new session in the background (don't block voice start)
    if (!sessionIdRef.current) {
      aiAPI.startVoiceSession({ mode: 'field' }).then(({ session }) => {
        sessionIdRef.current = session.id;
        setActiveSessionId(session.id);
        refreshSessions();
      }).catch(err => {
        console.error('Failed to create voice session:', err);
      });
    }
  };

  // 会話モード終了
  const stopConversation = (endSession = false) => {
    conversingRef.current = false;
    setIsConversing(false);
    clearTimeout(silenceTimerRef.current);
    stopVAD();

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    setIsRecording(false);
    setIsSpeaking(false);
    setInterimText('');
    interimRef.current = '';

    // Mark session as completed only on ending phrase
    if (endSession && sessionIdRef.current) {
      sessionAPI.complete(sessionIdRef.current).catch(err =>
        console.error('Failed to complete session:', err)
      );
      sessionIdRef.current = null;
    }
  };

  // 会話を分析してナレッジ登録を提案
  const analyzeConversationForKnowledge = async () => {
    // messagesRefを使って最新のメッセージを取得（setMessages直後でもstale closureを回避）
    const conversationMessages = messagesRef.current
      .filter(m => (m.role === 'user' || m.role === 'assistant') && !m.isLoading)
      .map(m => ({ role: m.role, content: m.content }));

    // TTS再生前に音声認識を停止（エコー防止）
    const stopRecognition = () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
    };

    if (conversationMessages.length < 4) {
      const guideMsg = 'ナレッジ登録するには、もう少し会話を続けてから「記録して」「登録して」と言ってください。会話の内容を分析してナレッジとして保存できます。';
      setMessages(prev => [...prev, { role: 'assistant', content: guideMsg }]);
      stopRecognition();
      if (conversingRef.current) {
        speakResponse(guideMsg);
      }
      return;
    }

    setMessages(prev => [...prev, { role: 'assistant', content: '会話を分析中...', isLoading: true }]);
    try {
      const result = await aiAPI.analyzeConversation({ messages: conversationMessages });
      // 分析中メッセージを削除
      setMessages(prev => prev.filter(m => !m.isLoading));
      if (result.should_register && result.extracted) {
        setKnowledgeProposal(result);
        setRegistrationPhase('confirming');
        // 提案メッセージをチャットに追加（showKnowledgeProposalフラグ付き）
        const proposalMsg = `この会話に有益な知見が含まれています。ナレッジとして登録しますか？\n\n**${result.extracted.title}**\n${result.extracted.summary || ''}`;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: proposalMsg,
          showKnowledgeProposal: true,
        }]);
        // セッションにも保存
        if (sessionIdRef.current) {
          sessionAPI.addMessages(sessionIdRef.current, [
            { role: 'assistant', content: proposalMsg }
          ]).catch(err => console.error('Failed to save proposal message:', err));
        }
        stopRecognition();
        if (conversingRef.current) {
          speakResponse(`この会話に有益な知見が含まれています。${result.extracted.title}。ナレッジとして登録しますか？はい、下書き、キャンセルで応答できます。`);
        }
      } else {
        const noResultMsg = '会話を分析しましたが、登録すべきナレッジは見つかりませんでした。もう少し具体的な内容を話してから再度お試しください。';
        setMessages(prev => [...prev, { role: 'assistant', content: noResultMsg }]);
        // セッションにも保存
        if (sessionIdRef.current) {
          sessionAPI.addMessages(sessionIdRef.current, [
            { role: 'assistant', content: noResultMsg }
          ]).catch(err => console.error('Failed to save noResult message:', err));
        }
        setRegistrationPhase('done');
        stopRecognition();
        if (conversingRef.current) {
          speakResponse(noResultMsg);
        }
      }
    } catch (error) {
      console.error('Conversation analysis error:', error);
      setMessages(prev => prev.filter(m => !m.isLoading));
      setRegistrationPhase('done');
    }
  };

  // ナレッジ登録を実行（status: 'published' | 'draft'）
  const handleRegisterKnowledge = async (status = 'published') => {
    if (!knowledgeProposal?.extracted) return;

    setRegistrationPhase('saving');
    try {
      const { title, category, risk_level, work_type, content, tags, summary } = knowledgeProposal.extracted;
      // AIが日本語カテゴリを返す場合があるので正規化
      const CATEGORY_MAP = {
        procedure: 'procedure', safety: 'safety', quality: 'quality',
        cost: 'cost', equipment: 'equipment', material: 'material',
        '手順': 'procedure', '安全': 'safety', '品質': 'quality',
        'コスト': 'cost', '機械': 'equipment', '資材': 'material',
        '安全管理': 'safety', '品質管理': 'quality', 'コスト管理': 'cost',
        '機械管理': 'equipment', '資材管理': 'material',
      };
      const RISK_MAP = {
        low: 'low', medium: 'medium', high: 'high', critical: 'critical',
        '低': 'low', '中': 'medium', '高': 'high', '重大': 'critical',
      };
      const normalizedCategory = CATEGORY_MAP[(category || '').trim().toLowerCase()] || CATEGORY_MAP[(category || '').trim()] || 'procedure';
      const normalizedRisk = RISK_MAP[(risk_level || '').trim().toLowerCase()] || RISK_MAP[(risk_level || '').trim()] || 'low';
      const created = await knowledgeAPI.create({
        title,
        category: normalizedCategory,
        risk_level: normalizedRisk,
        work_type: work_type || '',
        content,
        tags: tags || [],
        summary,
        status
      });
      const knowledgeId = created?.id || created?.item?.id;
      const link = knowledgeId ? `[[knowledge:${knowledgeId}|${title}]]` : `**${title}**`;
      const msg = status === 'published'
        ? `${link} をナレッジとして登録しました。他の現場でも活用できる知見ですね。引き続き何かあればお声がけください。`
        : `${link} を下書きとして保存しました。あとから編集・公開できます。引き続き何かあればお声がけください。`;
      const speakMsg = status === 'published'
        ? `${title}をナレッジとして登録しました。他の現場でも活用できる知見ですね。引き続き何かあればお声がけください。`
        : `${title}を下書きとして保存しました。あとから編集・公開できます。引き続き何かあればお声がけください。`;
      // 提案メッセージのボタンを非表示にして、結果メッセージを追加
      setMessages(prev => [
        ...prev.map(m => m.showKnowledgeProposal ? { ...m, showKnowledgeProposal: false } : m),
        { role: 'assistant', content: msg, isRegistrationResult: true, isSystemMessage: true }
      ]);
      // セッションにも保存
      if (sessionIdRef.current) {
        sessionAPI.addMessages(sessionIdRef.current, [
          { role: 'assistant', content: msg }
        ]).catch(err => console.error('Failed to save registration message:', err));
      }
      // ナレッジ一覧キャッシュを無効化（HomePageの「最近のナレッジ」に反映）
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      setKnowledgeProposal(null);
      setRegistrationPhase('done');
      // 再生中の音声を停止してから新しい音声を再生
      stopSpeaking();
      // マイクを即停止（エコー防止）し、AIが喋り終わったら会話終了
      // sendingRef=trueでonendからの再リスニングを防止
      sendingRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      setIsRecording(false);
      shouldEndRef.current = true;
      speakResponse(speakMsg);
    } catch (error) {
      console.error('Knowledge registration error:', error);
      toast.error('ナレッジの登録に失敗しました');
      setRegistrationPhase('confirming');
    }
  };

  // ナレッジ登録をキャンセル
  const handleDismissKnowledge = () => {
    const dismissMsg = 'わかりました、ナレッジ登録はスキップします。引き続き何かあればお声がけください。';
    setMessages(prev => [
      ...prev.map(m => m.showKnowledgeProposal ? { ...m, showKnowledgeProposal: false } : m),
      { role: 'assistant', content: dismissMsg, isSystemMessage: true }
    ]);
    // セッションにも保存
    if (sessionIdRef.current) {
      sessionAPI.addMessages(sessionIdRef.current, [
        { role: 'assistant', content: dismissMsg }
      ]).catch(err => console.error('Failed to save dismiss message:', err));
    }
    setKnowledgeProposal(null);
    setRegistrationPhase('done');
    // 再生中の音声を停止してから新しい音声を再生
    stopSpeaking();
    // マイクを即停止（エコー防止）し、AIが喋り終わったら会話終了
    // sendingRef=trueでonendからの再リスニングを防止
    sendingRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    setIsRecording(false);
    shouldEndRef.current = true;
    speakResponse(dismissMsg);
  };

  const handleMarkUseful = async (knowledgeId, title) => {
    if (markedUseful[knowledgeId]) return;
    try {
      await knowledgeAPI.markUseful(knowledgeId);
      setMarkedUseful(prev => ({ ...prev, [knowledgeId]: true }));
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      toast.success('評価しました');

      // セッション履歴にも記録
      const usefulMsg = `「${title}」が役に立った`;
      const replyMsg = `お役に立てたようでよかったです。引き続き何かあればお声がけください。`;
      setMessages(prev => [...prev, { role: 'user', content: usefulMsg, isSystemMessage: true }, { role: 'assistant', content: replyMsg, isSystemMessage: true }]);
      if (sessionIdRef.current) {
        sessionAPI.addMessages(sessionIdRef.current, [
          { role: 'user', content: usefulMsg },
          { role: 'assistant', content: replyMsg }
        ]).catch(() => {});
      }
    } catch (error) {
      console.error('Mark useful error:', error);
      toast.error('評価に失敗しました');
    }
  };

  // 会話終了時にナレッジ分析を自動実行
  useEffect(() => {
    if (!isConversing && messages.length >= 4 && registrationPhaseRef.current === 'none' && !knowledgeAnalyzedRef.current) {
      knowledgeAnalyzedRef.current = true;
      analyzeConversationForKnowledge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConversing]);

  useEffect(() => {
    return () => {
      conversingRef.current = false;
      clearTimeout(silenceTimerRef.current);
      stopVAD();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      // Leave session as-is (active sessions can be viewed in history)
      sessionIdRef.current = null;
      // マイクストリーム解放
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  return (
    <PageWrapper>
    <SidebarOverlay $open={sidebarOpen} onClick={() => setSidebarOpen(false)} />
    <Sidebar $open={sidebarOpen}>
      <SidebarHeader>
        <SidebarTitle>会話履歴</SidebarTitle>
        <NewChatButton onClick={handleNewChat}>
          <HiOutlinePlus size={14} />
          新規
        </NewChatButton>
      </SidebarHeader>
      <SessionList>
        {sessions.map(s => (
          <SessionItem
            key={s.id}
            $active={s.id === activeSessionId}
            onClick={() => handleSelectSession(s.id)}
          >
            <SessionIcon $active={s.id === activeSessionId}>
              <HiOutlineChatAlt2 size={16} />
            </SessionIcon>
            <SessionInfo>
              <SessionItemTitle>
                {s.title || '新しい会話'}
              </SessionItemTitle>
              <SessionItemMeta>{formatSessionDate(s.created_at)}</SessionItemMeta>
            </SessionInfo>
            <SessionDeleteButton className="session-delete-btn" onClick={(e) => handleDeleteSession(e, s.id)}>
              <HiOutlineTrash size={14} />
            </SessionDeleteButton>
          </SessionItem>
        ))}
        {sessions.length === 0 && (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            履歴はまだありません
          </div>
        )}
      </SessionList>
    </Sidebar>

    <Container>
      <Header>
        <BackButton onClick={() => navigate('/')}>
          <HiOutlineArrowLeft />
        </BackButton>
        <Title>現場作業モード</Title>
        <MenuButton onClick={() => setSidebarOpen(prev => !prev)}>
          <HiOutlineMenuAlt2 />
        </MenuButton>
        <FieldBadge>現場</FieldBadge>
      </Header>

      <ResponseArea ref={responseAreaRef}>
        {messages.map((msg, idx) => {
          if (msg.role === 'assistant') {
            // ナレッジ提案メッセージ
            if (msg.showKnowledgeProposal && knowledgeProposal?.extracted) {
              const ext = knowledgeProposal.extracted;
              return (
                <KnowledgeSuggestionCard key={idx}>
                  <KnowledgeSuggestionTitle>
                    <HiOutlineLightBulb size={18} style={{ flexShrink: 0, color: 'var(--color-warning)' }} />
                    ナレッジとして登録しますか？
                  </KnowledgeSuggestionTitle>
                  <KnowledgeFieldCompact>
                    <strong>{ext.title}</strong>
                  </KnowledgeFieldCompact>
                  {ext.summary && (
                    <KnowledgeFieldCompact>{ext.summary}</KnowledgeFieldCompact>
                  )}
                  {ext.tags?.length > 0 && (
                    <KnowledgeTagsInline>
                      {ext.tags.map((tag, i) => (
                        <KnowledgeTagSmall key={i}>{tag}</KnowledgeTagSmall>
                      ))}
                    </KnowledgeTagsInline>
                  )}
                  <KnowledgeInlineActions>
                    <KnowledgeInlineButton
                      $primary
                      disabled={registrationPhase === 'saving'}
                      onClick={() => handleRegisterKnowledge('published')}
                    >
                      {registrationPhase === 'saving' ? '登録中...' : '登録する'}
                    </KnowledgeInlineButton>
                    <KnowledgeInlineButton
                      disabled={registrationPhase === 'saving'}
                      onClick={() => handleRegisterKnowledge('draft')}
                    >
                      下書き
                    </KnowledgeInlineButton>
                    <KnowledgeInlineButton
                      disabled={registrationPhase === 'saving'}
                      onClick={handleDismissKnowledge}
                    >
                      やめる
                    </KnowledgeInlineButton>
                  </KnowledgeInlineActions>
                </KnowledgeSuggestionCard>
              );
            }

            const unreferenced = getUnreferencedKnowledge(msg.content, msg.relatedKnowledge);
            const knowledgeRefs = extractKnowledgeRefs(msg.content);
            return (
              <ResponseCard key={idx}>
                <ReactMarkdown components={{
                  a: ({ href, children }) => {
                    if (href?.startsWith('/knowledge/') || href?.startsWith('/checklists/')) {
                      return (
                        <a
                          href={href}
                          onClick={(e) => { e.preventDefault(); navigate(href); }}
                          style={{ color: 'var(--color-primary-600, #2563eb)', textDecoration: 'none', fontWeight: 'var(--font-weight-medium)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        >
                          <HiOutlineBookOpen size={14} style={{ flexShrink: 0 }} />
                          {children}
                        </a>
                      );
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                  }
                }}>
                  {processKnowledgeLinks(msg.content)}
                </ReactMarkdown>
                {unreferenced.length > 0 && (
                  <RelatedKnowledgeSection>
                    {unreferenced.map((k, ki) => (
                      <RelatedKnowledgeChip key={ki} onClick={() => navigate(`/knowledge/${k.id}`)}>
                        <HiOutlineBookOpen size={14} />
                        {k.title}
                      </RelatedKnowledgeChip>
                    ))}
                  </RelatedKnowledgeSection>
                )}
                {knowledgeRefs.length > 0 && !msg.isRegistrationResult && (
                  <KnowledgeActions>
                    {knowledgeRefs.map((ref) => (
                      <UsefulButton
                        key={ref.id}
                        $marked={!!markedUseful[ref.id]}
                        disabled={!!markedUseful[ref.id]}
                        onClick={() => handleMarkUseful(ref.id, ref.title)}
                      >
                        <HiOutlineThumbUp size={16} />
                        {markedUseful[ref.id] ? '役に立った' : `「${ref.title}」が役に立った`}
                      </UsefulButton>
                    ))}
                  </KnowledgeActions>
                )}
              </ResponseCard>
            );
          }
          return (
            <UserTranscript key={idx}>
              {msg.content}
              {msg.originalText && (
                <>
                  <CorrectionBadge onClick={() => setShowOriginal(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                    <HiOutlineSparkles size={12} />
                    AI補正済み {showOriginal[idx] ? '▲' : '▼'}
                  </CorrectionBadge>
                  {showOriginal[idx] && (
                    <OriginalText>元: {msg.originalText}</OriginalText>
                  )}
                </>
              )}
            </UserTranscript>
          );
        })}
        {interimText && (
          <InterimTranscript>{interimText}</InterimTranscript>
        )}
        {isProcessing && (
          <ProcessingCard>
            <ProcessingDot /><ProcessingDot /><ProcessingDot />
            <span>応答を生成中...</span>
          </ProcessingCard>
        )}
      </ResponseArea>

      <MicSection>
        <BigMicButton
          $recording={isConversing}
          onClick={isConversing ? stopConversation : startConversation}
        >
          {isRecording && <PulseRing />}
          {isRecording && <PulseRing2 />}
          {isConversing ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C10.34 2 9 3.34 9 5v6c0 1.66 1.34 3 3 3s3-1.34 3-3V5c0-1.66-1.34-3-3-3zm5.3 6c-.08 0-.16.02-.24.06-.15.08-.26.23-.26.41v1.28c0 3.32-2.69 6.02-6.02 6.02s-6.02-2.7-6.02-6.02V8.47c0-.18-.11-.33-.26-.41C4.42 8.02 4.34 8 4.26 8 3.56 8 3 8.56 3 9.26v.21c0 4.28 3.17 7.83 7.31 8.54v2.09c0 .55.45 1 1 1s1-.45 1-1v-2.09C16.45 17.3 19.62 13.75 19.62 9.47v-.21c0-.7-.56-1.26-1.26-1.26z"/>
            </svg>
          )}
        </BigMicButton>
        <MicInfo>
          <StatusText $recording={isConversing}>
            {!isConversing
              ? 'タップして会話開始'
              : isProcessing
                ? '考え中...'
                : isSpeaking && !isRecording
                  ? '応答中...'
                  : isSpeaking && isRecording
                    ? '応答中（割り込み可）'
                    : isRecording
                      ? '聞いています...'
                      : '準備中...'}
          </StatusText>
          <HintText>
            {isConversing
              ? 'ボタンを押すと会話を終了します'
              : 'あとはハンズフリーで会話できます'}
          </HintText>
        </MicInfo>
      </MicSection>

    </Container>
    <Modal
      open={deleteConfirmId !== null}
      onClose={() => setDeleteConfirmId(null)}
      title="会話の削除"
      size="sm"
      footer={
        <>
          <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '8px 20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>キャンセル</button>
          <button onClick={confirmDeleteSession} style={{ padding: '8px 20px', border: 'none', borderRadius: 'var(--radius-md)', background: '#ef4444', color: 'white', cursor: 'pointer' }}>削除する</button>
        </>
      }
    >
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>この会話を削除しますか？<br />削除すると元に戻せません。</p>
    </Modal>
    </PageWrapper>
  );
};

export default FieldVoicePage;
