import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiAPI, knowledgeAPI, sessionAPI } from '../services/api';
import { saveDraftMessage, getDraftMessageCount } from '../services/offlineDB';
import { syncDraftMessages, onSyncStatusChange } from '../services/syncService';
import useOnlineStatus from '../hooks/useOnlineStatus';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { HiOutlineMicrophone, HiOutlineBookOpen, HiOutlineX, HiOutlineLightBulb, HiOutlineMenuAlt2, HiOutlinePlus, HiOutlineChatAlt2, HiOutlineTrash, HiOutlineThumbUp } from 'react-icons/hi';
import { HiPaperAirplane } from 'react-icons/hi2';
import Modal from '../components/Modal';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

const voicePulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
`;

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const PageWrapper = styled.div`
  display: flex;
  height: calc(100vh - 140px);
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    height: calc(100dvh - 180px);
  }
`;

const Sidebar = styled.div`
  width: ${props => props.$open ? '240px' : '0px'};
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
    width: ${props => props.$open ? 'min(260px, 85vw)' : '0px'};
    z-index: 150;
    background: var(--color-surface);
    box-shadow: ${props => props.$open ? '4px 0 24px rgba(0,0,0,0.15)' : 'none'};
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

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  min-width: 220px;
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
  min-width: 220px;

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

const SessionTitle = styled.div`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SessionMeta = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
`;

const MainArea = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  overflow: hidden;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  font-size: 1.2rem;
  flex-shrink: 0;

  &:hover {
    color: var(--color-text-primary);
    background: var(--color-surface-alt, #f1f5f9);
  }

  @media (max-width: 420px) {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
`;

const ChatSection = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--space-4);
  opacity: ${props => props.$dimmed ? 0.5 : 1};
  pointer-events: ${props => props.$dimmed ? 'none' : 'auto'};
  transition: opacity 0.3s ease;

  @media (max-width: 768px) {
    display: ${props => props.$dimmed ? 'none' : 'flex'};
    padding: 0 var(--space-2);
  }

  @media (max-width: 420px) {
    padding: 0 var(--space-1);
  }
`;

const KnowledgePanel = styled.div`
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 2px solid var(--color-primary-600, #2563eb);
  border-radius: var(--radius-lg);
  animation: ${slideIn} 0.3s ease-out;
  overflow: hidden;

  @media (max-width: 768px) {
    position: fixed;
    inset: 0;
    width: 100%;
    border: none;
    border-radius: 0;
    z-index: 100;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  flex-shrink: 0;

  @media (max-width: 420px) {
    padding: var(--space-3) var(--space-4);
  }
`;

const PanelTitle = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
`;

const PanelCloseButton = styled.button`
  background: rgba(255,255,255,0.2);
  border: none;
  color: var(--color-text-inverse);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  font-size: 1.1rem;

  &:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  @media (max-width: 420px) {
    padding: var(--space-3);
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

const FormLabel = styled.label`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
`;

const FormInput = styled.input`
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-surface);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
`;

const FormSelect = styled.select`
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-surface);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
`;

const FormTextarea = styled.textarea`
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-surface);
  resize: vertical;
  min-height: ${props => props.$tall ? '200px' : '80px'};
  line-height: var(--line-height-relaxed);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

const TagChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-lighter);
  border-radius: var(--radius-full, 9999px);
  font-size: var(--font-size-sm);
  color: var(--color-primary-600, #2563eb);
`;

const TagRemove = styled.button`
  background: none;
  border: none;
  color: var(--color-primary-600, #2563eb);
  cursor: pointer;
  padding: 0;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  opacity: 0.6;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const PanelFooter = styled.div`
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;

  @media (max-width: 420px) {
    padding: var(--space-3) var(--space-4);
    gap: var(--space-2);
  }
`;

const PanelButton = styled.button`
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);

  ${props => props.$primary ? `
    background: var(--gradient-primary);
    color: var(--color-text-inverse);
    border: none;
    box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(26, 54, 93, 0.3);
    }
  ` : `
    background: var(--color-surface);
    color: var(--color-text-secondary);
    border: 1.5px solid var(--color-border);

    &:hover:not(:disabled) {
      border-color: var(--color-primary-600, #2563eb);
      color: var(--color-primary-600, #2563eb);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SuggestionActions = styled.div`
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
`;

const SuggestionButton = styled.button`
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);

  ${props => props.$accept ? `
    background: var(--color-primary-600, #2563eb);
    color: white;
    border: none;
    &:hover { opacity: 0.85; transform: translateY(-1px); }
  ` : `
    background: var(--color-surface);
    color: var(--color-text-secondary);
    border: 1.5px solid var(--color-border);
    &:hover { border-color: var(--color-text-secondary); }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const KnowledgeButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full, 9999px);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 420px) {
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
    gap: var(--space-1);
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  flex-shrink: 0;

  @media (max-width: 420px) {
    gap: var(--space-2);
    padding: var(--space-2) 0;
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  flex: 1;

  @media (max-width: 420px) {
    font-size: var(--font-size-base);
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;
  }
`;

const MessageBubble = styled.div`
  max-width: 85%;
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  line-height: var(--line-height-relaxed);
  font-size: var(--font-size-base);
  animation: ${fadeInUp} 0.3s ease-out;

  ${props => props.$role === 'assistant' ? `
    align-self: flex-start;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    border-bottom-left-radius: var(--radius-sm);

    h1, h2, h3 {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      margin: var(--space-4) 0 var(--space-2);
      color: var(--color-text-primary);
    }
    h1:first-of-type, h2:first-of-type, h3:first-of-type { margin-top: 0; }
    h3 { font-size: var(--font-size-base); }
    p { margin-bottom: var(--space-2); }
    p:last-child { margin-bottom: 0; }
    ul, ol { padding-left: var(--space-5); margin: var(--space-2) 0; }
    li { margin-bottom: var(--space-1); }
    strong { color: var(--color-primary-600, #2563eb); }
    code {
      background-color: var(--color-surface-alt);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
    }
  ` : `
    align-self: flex-end;
    background: var(--gradient-primary);
    color: var(--color-text-inverse);
    border-bottom-right-radius: var(--radius-sm);
    box-shadow: 0 2px 8px rgba(26, 54, 93, 0.15);
  `}

  @media (max-width: 420px) {
    max-width: 95%;
    padding: var(--space-3);
    font-size: var(--font-size-sm);
  }
`;

const TypingIndicator = styled.div`
  align-self: flex-start;
  display: flex;
  gap: 5px;
  padding: var(--space-4) var(--space-5);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  border-bottom-left-radius: var(--radius-sm);

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--color-primary-600, #2563eb);
    opacity: 0.5;
    animation: ${bounce} 1.4s infinite ease-in-out;

    &:nth-of-type(1) { animation-delay: -0.32s; }
    &:nth-of-type(2) { animation-delay: -0.16s; }
  }
`;

const RelatedKnowledgeSection = styled.div`
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const RelatedKnowledgeLabel = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const RelatedKnowledgeLink = styled.span`
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
    transform: translateY(-1px);
  }
`;

const InlineKnowledgeLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 2px;
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
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
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

const InputArea = styled.div`
  flex-shrink: 0;
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  border-top: 1px solid var(--color-border);
  align-items: flex-end;

  @media (max-width: 768px) {
    padding: var(--space-3) 0;
  }

  @media (max-width: 420px) {
    gap: var(--space-2);
    padding: var(--space-2) 0;
  }
`;

const TextInput = styled.textarea`
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  font-family: inherit;
  resize: none;
  min-height: 48px;
  max-height: 200px;
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
  background: var(--color-surface);
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }

  &:disabled {
    background: var(--color-surface-alt);
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }

  @media (max-width: 420px) {
    font-size: var(--font-size-sm);
    padding: var(--space-2) var(--space-3);
    min-height: 40px;
  }
`;

const IconButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  font-size: 1.2rem;
`;

const SendButton = styled(IconButton)`
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);

  &:hover:not(:disabled) {
    background: var(--gradient-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(26, 54, 93, 0.3);
  }
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  @media (max-width: 420px) {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }
`;

const VoiceButton = styled(IconButton)`
  border: 1.5px solid ${props => props.$recording ? 'var(--color-error)' : 'var(--color-border)'};
  background: ${props => props.$recording ? 'var(--color-error-light, #fef2f2)' : 'var(--color-surface)'};
  color: ${props => props.$recording ? 'var(--color-error)' : 'var(--color-text-secondary)'};

  ${props => props.$recording && `
    animation: ${voicePulse} 1.5s infinite;
  `}

  &:hover {
    border-color: var(--color-primary-600, #2563eb);
    color: var(--color-primary-600, #2563eb);
    background: var(--color-primary-50);
  }

  @media (max-width: 420px) {
    width: 40px;
    height: 40px;
    min-width: 40px;
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

const CATEGORY_OPTIONS = [
  { value: 'procedure', label: '手順' },
  { value: 'safety', label: '安全' },
  { value: 'quality', label: '品質' },
  { value: 'cost', label: 'コスト' },
  { value: 'equipment', label: '設備' },
  { value: 'material', label: '資材' },
];

const RISK_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '重大' },
];

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'お疲れ様です。事務作業モードのAIアシスタントです。施工検討や確認事項について、何でもお聞きください。\n\n**作業内容や工種を教えていただければ、関連するナレッジ・注意点・チェックリストをお伝えします。**\n\n例えば：\n- 「杭打ち工事の注意点を教えて」\n- 「現場で試した方法がうまくいったので共有したい」\n- 「先月の類似事例を検索して」\n\n会話の中で有益な知見が出てきたら、右上の「ナレッジ化」ボタンでナレッジとして登録できます。'
};

const OfficeChatPage = () => {
  const navigate = useNavigate();
  const { isOnline } = useOnlineStatus();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState(0);
  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Knowledge useful tracking
  const [markedUseful, setMarkedUseful] = useState({});

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Knowledge panel state
  const [knowledgePanelOpen, setKnowledgePanelOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [knowledgeSuggested, setKnowledgeSuggested] = useState(false);
  const [knowledgeDraft, setKnowledgeDraft] = useState({
    title: '',
    category: 'procedure',
    work_type: '',
    risk_level: 'low',
    content: '',
    summary: '',
    tags: [],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, knowledgePanelOpen]);

  // Track pending draft count
  useEffect(() => {
    getDraftMessageCount().then(setPendingDrafts).catch(() => {});
  }, []);

  // Listen for sync completion and auto-sync on reconnect
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status) => {
      if (!status.isSyncing) {
        getDraftMessageCount().then(setPendingDrafts).catch(() => {});
        if (status.synced > 0) {
          toast.success(`${status.synced}件の下書きを送信しました`);
        }
        if (status.failed > 0) {
          toast.error(`${status.failed}件の送信に失敗しました`);
        }
      }
    });
    return unsubscribe;
  }, []);

  // Trigger sync when coming back online
  useEffect(() => {
    if (isOnline && pendingDrafts > 0) {
      syncDraftMessages();
    }
  }, [isOnline, pendingDrafts]);

  // セッション一覧取得
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await sessionAPI.list({ mode: 'office', limit: 50 });
        setSessions(data.sessions || []);
      } catch (e) {
        console.error('Failed to fetch sessions:', e);
      }
    };
    fetchSessions();
  }, []);

  // セッション一覧を更新（新しいセッション作成後など）
  const refreshSessions = async () => {
    try {
      const data = await sessionAPI.list({ mode: 'office', limit: 50 });
      setSessions(data.sessions || []);
    } catch (e) { /* ignore */ }
  };

  // セッション切り替え
  const handleSelectSession = async (sessionId) => {
    if (sessionId === activeSessionId) return;
    try {
      const data = await sessionAPI.getById(sessionId);
      const loaded = (data.messages || []).map(m => ({
        role: m.role,
        content: m.content,
      }));
      setMessages(loaded.length > 0 ? loaded : [INITIAL_MESSAGE]);
      sessionIdRef.current = sessionId;
      setActiveSessionId(sessionId);
      setKnowledgeSuggested(false);
      setKnowledgePanelOpen(false);
      setSidebarOpen(false);
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
        setMessages([INITIAL_MESSAGE]);
        sessionIdRef.current = null;
        setActiveSessionId(null);
        setKnowledgeSuggested(false);
        setKnowledgePanelOpen(false);
        setInput('');
      }
      toast.success('会話を削除しました');
    } catch (err) {
      console.error('Failed to delete session:', err);
      toast.error('削除に失敗しました');
    }
  };

  // 新規会話
  const handleNewChat = () => {
    setMessages([INITIAL_MESSAGE]);
    sessionIdRef.current = null;
    setActiveSessionId(null);
    setKnowledgeSuggested(false);
    setKnowledgePanelOpen(false);
    setInput('');
  };

  // Minimum messages for knowledge extraction (initial + 2 rounds of user+assistant)
  const canExtractKnowledge = messages.length >= 5;

  const handleExtractKnowledge = async () => {
    if (isExtracting) return;
    setIsExtracting(true);

    try {
      const conversationMessages = messages.map(m => ({ role: m.role, content: m.content }));
      const result = await aiAPI.analyzeConversation({ messages: conversationMessages });

      if (!result.should_register) {
        toast('登録すべきナレッジが見つかりませんでした', { icon: 'ℹ️' });
        return;
      }

      const extracted = result.extracted;
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
      const normCat = (v) => CATEGORY_MAP[(v || '').trim().toLowerCase()] || CATEGORY_MAP[(v || '').trim()] || 'procedure';
      const normRisk = (v) => RISK_MAP[(v || '').trim().toLowerCase()] || RISK_MAP[(v || '').trim()] || 'low';
      setKnowledgeDraft({
        title: extracted.title || '',
        category: normCat(extracted.category),
        work_type: extracted.work_type || '',
        risk_level: normRisk(extracted.risk_level),
        content: extracted.content || '',
        summary: extracted.summary || '',
        tags: extracted.tags || [],
      });
      setKnowledgePanelOpen(true);
    } catch (error) {
      console.error('Knowledge extraction error:', error);
      toast.error('ナレッジの抽出に失敗しました');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveKnowledge = async (status) => {
    if (!knowledgeDraft.title.trim() || !knowledgeDraft.content.trim()) {
      toast.error('タイトルと内容は必須です');
      return;
    }
    setIsSaving(true);

    try {
      const created = await knowledgeAPI.create({
        title: knowledgeDraft.title,
        category: knowledgeDraft.category,
        work_type: knowledgeDraft.work_type || undefined,
        risk_level: knowledgeDraft.risk_level,
        content: knowledgeDraft.content,
        summary: knowledgeDraft.summary || undefined,
        tags: knowledgeDraft.tags,
        status,
      });

      const knowledgeId = created?.id || created?.item?.id;
      const link = knowledgeId ? `[[knowledge:${knowledgeId}|${knowledgeDraft.title}]]` : `「**${knowledgeDraft.title}**」`;
      const msg = status === 'published'
        ? `${link} をナレッジとして登録しました。`
        : `${link} を下書きとして保存しました。`;
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
      setKnowledgePanelOpen(false);

      // セッションにも保存（履歴に残す）
      if (sessionIdRef.current) {
        sessionAPI.addMessages(sessionIdRef.current, [{ role: 'assistant', content: msg }]).catch(() => {});
      }
    } catch (error) {
      console.error('Knowledge save error:', error);
      toast.error('ナレッジの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = (index) => {
    setKnowledgeDraft(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  // 提案の「登録する」→ 事前分析済みデータでそのままパネルを開く
  const handleSuggestionAccept = () => {
    setKnowledgeSuggested(false);
    setKnowledgePanelOpen(true);
  };

  const handleSuggestionDismiss = () => {
    setKnowledgeSuggested(false);
    const dismissMsg = 'ナレッジ登録をスキップしました。';
    setMessages(prev => [...prev, { role: 'assistant', content: dismissMsg }]);
    if (sessionIdRef.current) {
      sessionAPI.addMessages(sessionIdRef.current, [{ role: 'assistant', content: dismissMsg }]).catch(() => {});
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    if (textInputRef.current) textInputRef.current.style.height = 'auto';

    // Offline: save as draft instead of calling API
    if (!navigator.onLine) {
      try {
        await saveDraftMessage({
          message: text.trim(),
          mode: 'office',
          sessionId: sessionIdRef.current || null,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        });
        const count = await getDraftMessageCount();
        setPendingDrafts(count);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'オフラインのため下書きとして保存しました。オンライン復帰後に送信されます。',
        }]);
        toast('下書きとして保存しました', { icon: '\u{1F4E6}' });
      } catch (err) {
        console.error('Failed to save draft:', err);
        toast.error('下書きの保存に失敗しました');
      }
      return;
    }

    setIsLoading(true);

    // Create session on first user message
    const isFirstMessage = !sessionIdRef.current;
    if (isFirstMessage) {
      try {
        const { session } = await aiAPI.startVoiceSession({ mode: 'office' });
        sessionIdRef.current = session.id;
        setActiveSessionId(session.id);
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    }

    try {
      const response = await aiAPI.chat({
        message: text.trim(),
        mode: 'office',
        session_id: sessionIdRef.current || undefined,
        conversation_history: messages.map(m => ({ role: m.role, content: m.content }))
      });

      const assistantContent = response.response || response.message || response.content || 'すみません、応答を生成できませんでした。';

      const assistantMessage = {
        role: 'assistant',
        content: assistantContent,
        relatedKnowledge: response.related_knowledge || [],
        showKnowledgeSuggestion: false,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // 初回メッセージ後はセッション一覧をリフレッシュ（タイトルが生成されている）
      if (isFirstMessage) {
        refreshSessions();
      }

      // 会話が十分に進んだら、バックグラウンドでAI分析 → 登録すべきナレッジがあれば提案
      const shouldAnalyze = messages.length + 2 >= 5 && !knowledgeSuggested && !knowledgePanelOpen;
      if (shouldAnalyze) {
        try {
          const allMessages = [...messages, userMessage, { role: 'assistant', content: assistantContent }];
          const result = await aiAPI.analyzeConversation({
            messages: allMessages.map(m => ({ role: m.role, content: m.content }))
          });

          if (result.should_register && result.extracted) {
            const extracted = result.extracted;
            setKnowledgeDraft({
              title: extracted.title || '',
              category: extracted.category || 'procedure',
              work_type: extracted.work_type || '',
              risk_level: extracted.risk_level || 'low',
              content: extracted.content || '',
              summary: extracted.summary || '',
              tags: extracted.tags || [],
            });
            // メッセージに提案フラグを付ける
            setMessages(prev => prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, showKnowledgeSuggestion: true } : m
            ));
            setKnowledgeSuggested(true);
          }
        } catch (analyzeError) {
          console.error('Background analysis error:', analyzeError);
          // 分析失敗は静かに無視（チャット体験を邪魔しない）
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。'
      }]);
      toast.error('送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart;
      // 直前が改行 = 空行でEnter → 送信
      if (cursorPos > 0 && value[cursorPos - 1] === '\n' && value.trim()) {
        e.preventDefault();
        sendMessage(value);
      }
      // それ以外は通常の改行（デフォルト動作）
    }
  };

  const toggleVoice = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('音声入力に対応していないブラウザです');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP';

    let finalTranscript = '';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript = transcript;
        }
      }
      setInput(transcript);
      if (textInputRef.current) {
        const el = textInputRef.current;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
      }
    };
    recognition.onend = async () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        try {
          const { corrected } = await aiAPI.correctSpeech(finalTranscript);
          if (corrected && corrected !== finalTranscript) {
            setInput(corrected);
            if (textInputRef.current) {
              const el = textInputRef.current;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 200) + 'px';
            }
          }
        } catch (e) {
          // 補正失敗時は元のテキストのまま
        }
      }
    };
    recognition.onerror = () => {
      setIsRecording(false);
      toast.error('音声認識エラー');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ReactMarkdown 用カスタムリンク: /knowledge/ と /checklists/ パスは内部遷移
  const markdownComponents = {
    a: ({ href, children }) => {
      if (href?.startsWith('/knowledge/')) {
        return (
          <InlineKnowledgeLink
            href={href}
            onClick={(e) => { e.preventDefault(); navigate(href); }}
          >
            <HiOutlineBookOpen size={14} style={{ flexShrink: 0 }} />
            {children}
          </InlineKnowledgeLink>
        );
      }
      if (href?.startsWith('/checklists/')) {
        return (
          <InlineKnowledgeLink
            href={href}
            onClick={(e) => { e.preventDefault(); navigate(href); }}
          >
            <HiOutlineBookOpen size={14} style={{ flexShrink: 0 }} />
            {children}
          </InlineKnowledgeLink>
        );
      }
      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    }
  };

  // テキスト内のマーカーに含まれないナレッジだけ下部に表示
  const getUnreferencedKnowledge = (content, relatedKnowledge) => {
    if (!relatedKnowledge || relatedKnowledge.length === 0) return [];
    return relatedKnowledge.filter(k => {
      const marker = `[[knowledge:${k.id}|`;
      return !content.includes(marker);
    });
  };

  const handleMarkUseful = async (knowledgeId, title) => {
    if (markedUseful[knowledgeId]) return;
    try {
      await knowledgeAPI.markUseful(knowledgeId);
      setMarkedUseful(prev => ({ ...prev, [knowledgeId]: true }));
      toast.success('評価しました');

      // セッション履歴にも記録
      const usefulMsg = `「${title}」が役に立った`;
      const replyMsg = `お役に立てたようでよかったです。他にも気になることがあればお気軽にご質問ください。`;
      setMessages(prev => [...prev, { role: 'user', content: usefulMsg }, { role: 'assistant', content: replyMsg }]);
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
                <SessionTitle>
                  {s.title || '新しい会話'}
                </SessionTitle>
                <SessionMeta>{formatSessionDate(s.created_at)}</SessionMeta>
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

      <MainArea>
        <ChatSection $dimmed={knowledgePanelOpen}>
          <Container>
            <Header>
              <MenuButton onClick={() => setSidebarOpen(prev => !prev)}>
                <HiOutlineMenuAlt2 />
              </MenuButton>
              <Title>事務作業モード</Title>
              <KnowledgeButton
                onClick={handleExtractKnowledge}
                disabled={!canExtractKnowledge || isExtracting || isLoading}
              >
                <HiOutlineLightBulb size={16} />
                {isExtracting ? '分析中...' : 'ナレッジ化'}
              </KnowledgeButton>
            </Header>

          <MessagesContainer>
            {messages.map((msg, idx) => {
              const unreferenced = msg.role === 'assistant'
                ? getUnreferencedKnowledge(msg.content, msg.relatedKnowledge)
                : [];
              return (
                <React.Fragment key={idx}>
                  <MessageBubble $role={msg.role}>
                    {msg.role === 'assistant' ? (
                      <>
                        <ReactMarkdown components={markdownComponents}>
                          {processKnowledgeLinks(msg.content)}
                        </ReactMarkdown>
                        {unreferenced.length > 0 && (
                          <RelatedKnowledgeSection>
                            <RelatedKnowledgeLabel>関連ナレッジ</RelatedKnowledgeLabel>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                              {unreferenced.map((k, ki) => (
                                <RelatedKnowledgeLink key={ki} onClick={() => navigate(`/knowledge/${k.id}`)}>
                                  <HiOutlineBookOpen size={14} />
                                  {k.title}
                                </RelatedKnowledgeLink>
                              ))}
                            </div>
                          </RelatedKnowledgeSection>
                        )}
                        {msg.showKnowledgeSuggestion && knowledgeSuggested && (
                          <RelatedKnowledgeSection>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                              <HiOutlineLightBulb size={16} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--color-warning)' }} />
                              この会話には有益な知見が含まれているようです。ナレッジとして登録しますか？
                            </div>
                            <SuggestionActions>
                              <SuggestionButton $accept onClick={handleSuggestionAccept} disabled={isExtracting}>
                                {isExtracting ? '分析中...' : '登録する'}
                              </SuggestionButton>
                              <SuggestionButton onClick={handleSuggestionDismiss}>
                                今はしない
                              </SuggestionButton>
                            </SuggestionActions>
                          </RelatedKnowledgeSection>
                        )}
                        {(() => {
                          const knowledgeRefs = extractKnowledgeRefs(msg.content);
                          if (knowledgeRefs.length === 0) return null;
                          return (
                            <KnowledgeActions>
                              {knowledgeRefs.map(ref => (
                                <UsefulButton
                                  key={ref.id}
                                  $marked={!!markedUseful[ref.id]}
                                  disabled={!!markedUseful[ref.id]}
                                  onClick={() => handleMarkUseful(ref.id, ref.title)}
                                >
                                  <HiOutlineThumbUp size={14} />
                                  {markedUseful[ref.id] ? `${ref.title} に評価済み` : `${ref.title} が役に立った`}
                                </UsefulButton>
                              ))}
                            </KnowledgeActions>
                          );
                        })()}
                      </>
                    ) : (
                      msg.content
                    )}
                  </MessageBubble>
                </React.Fragment>
              );
            })}
            {isLoading && (
              <TypingIndicator>
                <span /><span /><span />
              </TypingIndicator>
            )}
            <div ref={messagesEndRef} />
          </MessagesContainer>

          <InputArea>
            <VoiceButton $recording={isRecording} onClick={toggleVoice}>
              <HiOutlineMicrophone />
            </VoiceButton>
            <TextInput
              ref={textInputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 200) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="質問を入力... (Enterで改行、空行でEnter送信)"
              disabled={isLoading}
              rows={1}
            />
            <SendButton
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
            >
              <HiPaperAirplane />
            </SendButton>
          </InputArea>
        </Container>
      </ChatSection>

      {knowledgePanelOpen && (
        <KnowledgePanel>
          <PanelHeader>
            <PanelTitle>
              <HiOutlineLightBulb size={20} />
              ナレッジ登録
            </PanelTitle>
            <PanelCloseButton onClick={() => {
              setKnowledgePanelOpen(false);
              const dismissMsg = 'ナレッジ登録をスキップしました。';
              setMessages(prev => [...prev, { role: 'assistant', content: dismissMsg }]);
              if (sessionIdRef.current) {
                sessionAPI.addMessages(sessionIdRef.current, [{ role: 'assistant', content: dismissMsg }]).catch(() => {});
              }
            }}>
              <HiOutlineX />
            </PanelCloseButton>
          </PanelHeader>

          <PanelBody>
            <FormGroup>
              <FormLabel>タイトル *</FormLabel>
              <FormInput
                value={knowledgeDraft.title}
                onChange={e => setKnowledgeDraft(prev => ({ ...prev, title: e.target.value }))}
                placeholder="ナレッジのタイトル"
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>カテゴリ *</FormLabel>
              <FormSelect
                value={knowledgeDraft.category}
                onChange={e => setKnowledgeDraft(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </FormSelect>
            </FormGroup>

            <FormGroup>
              <FormLabel>工種</FormLabel>
              <FormInput
                value={knowledgeDraft.work_type}
                onChange={e => setKnowledgeDraft(prev => ({ ...prev, work_type: e.target.value }))}
                placeholder="例: 杭打ち工事"
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>リスクレベル</FormLabel>
              <FormSelect
                value={knowledgeDraft.risk_level}
                onChange={e => setKnowledgeDraft(prev => ({ ...prev, risk_level: e.target.value }))}
              >
                {RISK_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </FormSelect>
            </FormGroup>

            <FormGroup>
              <FormLabel>内容 *</FormLabel>
              <FormTextarea
                $tall
                value={knowledgeDraft.content}
                onChange={e => setKnowledgeDraft(prev => ({ ...prev, content: e.target.value }))}
                placeholder="ナレッジの内容"
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>要約</FormLabel>
              <FormTextarea
                value={knowledgeDraft.summary}
                onChange={e => setKnowledgeDraft(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="2-3文の要約"
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>タグ</FormLabel>
              <TagsContainer>
                {knowledgeDraft.tags.map((tag, i) => (
                  <TagChip key={i}>
                    {tag}
                    <TagRemove onClick={() => handleRemoveTag(i)}>
                      <HiOutlineX size={12} />
                    </TagRemove>
                  </TagChip>
                ))}
                {knowledgeDraft.tags.length === 0 && (
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                    タグなし
                  </span>
                )}
              </TagsContainer>
            </FormGroup>
          </PanelBody>

          <PanelFooter>
            <PanelButton
              onClick={() => handleSaveKnowledge('draft')}
              disabled={isSaving}
            >
              下書き保存
            </PanelButton>
            <PanelButton
              $primary
              onClick={() => handleSaveKnowledge('published')}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '公開保存'}
            </PanelButton>
          </PanelFooter>
        </KnowledgePanel>
      )}
      </MainArea>

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

export default OfficeChatPage;
