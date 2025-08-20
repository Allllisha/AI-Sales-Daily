import React, { useState } from 'react';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';

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
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04);
  max-width: 800px;
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
  padding: var(--space-6) var(--space-6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  background: linear-gradient(to bottom, var(--color-background), rgba(250, 250, 250, 0.5));
  
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
  font-size: calc(var(--font-size-large) * 1.1);
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.02em;
  
  @media (max-width: 480px) {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-medium);
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.15s ease;
  color: rgba(0, 0, 0, 0.4);
  font-size: 20px;
  line-height: 1;
  font-weight: 300;

  &:hover {
    background-color: rgba(0, 0, 0, 0.06);
    color: rgba(0, 0, 0, 0.7);
    transform: rotate(90deg);
  }
  
  @media (max-width: 480px) {
    width: 40px;
    height: 40px;
    font-size: 28px;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: var(--space-6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background-color: rgba(0, 0, 0, 0.02);
  
  @media (max-width: 480px) {
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
`;

const Tab = styled.button`
  background: ${props => props.active ? 'var(--color-background)' : 'transparent'};
  border: none;
  border-bottom: ${props => props.active ? '2px solid var(--color-primary)' : '2px solid transparent'};
  padding: var(--space-4) var(--space-6);
  font-size: var(--font-size-small);
  font-weight: ${props => props.active ? '500' : '400'};
  color: ${props => props.active ? 'var(--color-primary)' : 'rgba(0, 0, 0, 0.6)'};
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-bottom: -1px;

  &:hover:not(:disabled) {
    background: ${props => props.active ? 'var(--color-background)' : 'rgba(0, 0, 0, 0.03)'};
    color: ${props => props.active ? 'var(--color-primary)' : 'var(--color-text-primary)'};
  }
  
  @media (max-width: 480px) {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-micro);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 300px;
  padding: var(--space-5);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: var(--font-size-small);
  font-family: inherit;
  resize: vertical;
  background-color: rgba(255, 255, 255, 0.8);
  color: var(--color-text-primary);
  transition: all 0.2s ease;
  line-height: 1.6;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    background-color: var(--color-background);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
  }

  &::placeholder {
    color: rgba(0, 0, 0, 0.4);
    font-style: italic;
  }
  
  @media (max-width: 768px) {
    margin: 0 var(--space-4);
    width: calc(100% - 2 * var(--space-4));
    min-height: 200px;
  }
  
  @media (max-width: 480px) {
    margin: 0 var(--space-3);
    width: calc(100% - 2 * var(--space-3));
    min-height: 150px;
    margin-bottom: calc(80px + var(--space-4));
  }
`;

const FileUploadArea = styled.div`
  border: 2px dashed rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  padding: var(--space-8);
  text-align: center;
  background: linear-gradient(135deg, rgba(250, 250, 250, 0.5), rgba(245, 245, 245, 0.3));
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;

  &:hover {
    border-color: var(--color-primary);
    background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.05), rgba(var(--color-primary-rgb), 0.02));
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  input[type="file"] {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    opacity: 0;
    cursor: pointer;
  }
  
  @media (max-width: 768px) {
    margin: 0 var(--space-4);
    padding: var(--space-6);
  }
  
  @media (max-width: 480px) {
    margin: 0 var(--space-3);
    padding: var(--space-4);
    margin-bottom: calc(80px + var(--space-4));
  }
`;

const UploadIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  border-radius: 50%;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: inherit;
    opacity: 0.2;
    transform: scale(1.2);
  }
  
  &::after {
    content: '↑';
    color: white;
    font-size: 24px;
    font-weight: bold;
    position: relative;
    z-index: 1;
  }
`;

const UploadText = styled.p`
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2) 0;
`;

const UploadSubText = styled.p`
  font-size: var(--font-size-micro);
  color: rgba(0, 0, 0, 0.5);
  margin: 0;
  line-height: 1.5;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: var(--space-4);
  justify-content: flex-end;
  padding: var(--space-5) var(--space-6);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  background: linear-gradient(to top, var(--color-background), rgba(250, 250, 250, 0.5));
  
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
  background: var(--color-primary);
  color: white;
  border: none;
  padding: var(--space-3) var(--space-7);
  font-size: var(--font-size-small);
  font-weight: 500;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.02em;
  min-height: 44px;
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.4);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.15));
    cursor: not-allowed;
    box-shadow: none;
  }
  
  @media (max-width: 480px) {
    width: 100%;
    padding: var(--space-3) var(--space-4);
  }
`;

const SecondaryButton = styled.button`
  background-color: transparent;
  color: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.2);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-small);
  font-weight: 400;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.02em;
  min-height: 44px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.3);
    color: var(--color-text-primary);
  }
  
  @media (max-width: 480px) {
    width: 100%;
    padding: var(--space-3) var(--space-4);
  }
`;

const FileInfo = styled.div`
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: linear-gradient(135deg, rgba(0, 100, 200, 0.05), rgba(0, 150, 250, 0.02));
  border: 1px solid rgba(0, 100, 200, 0.15);
  border-radius: 8px;
  font-size: var(--font-size-small);
  color: var(--color-text-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
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

const RemoveFileButton = styled.button`
  background: none;
  border: none;
  color: rgba(200, 50, 50, 0.8);
  cursor: pointer;
  font-size: var(--font-size-micro);
  padding: var(--space-2) var(--space-3);
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(200, 50, 50, 0.1);
    color: var(--color-error);
  }
`;

const MeetingNotesModal = ({ isOpen, onClose, onSubmit }) => {
  const [activeTab, setActiveTab] = useState('text');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // サポートするファイル形式を拡張
      const validTypes = [
        'application/pdf',
        'text/plain', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'audio/mpeg',
        'audio/wav',
        'audio/mp3',
        'audio/m4a',
        'audio/ogg'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error('PDF、テキスト、Word文書、または音声ファイル（MP3、WAV、M4A）をアップロードしてください');
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB制限（音声ファイル対応のため拡張）
        toast.error('ファイルサイズは50MB以下にしてください');
        return;
      }
      
      setUploadedFile(file);
      toast.success(`ファイル「${file.name}」をアップロードしました`);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleSubmit = async () => {
    if (activeTab === 'text' && !meetingNotes.trim()) {
      toast.error('議事録を入力してください');
      return;
    }
    
    if (activeTab === 'file' && !uploadedFile) {
      toast.error('ファイルをアップロードしてください');
      return;
    }

    setIsProcessing(true);
    try {
      if (activeTab === 'text') {
        const data = {
          type: 'text',
          content: meetingNotes
        };
        await onSubmit(data);
      } else {
        // ファイルアップロード処理
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('type', 'file');
        
        const data = {
          type: 'file',
          formData: formData,
          fileName: uploadedFile.name,
          fileType: uploadedFile.type
        };
        await onSubmit(data);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>議事録から日報作成</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <TabContainer>
          <Tab active={activeTab === 'text'} onClick={() => setActiveTab('text')}>
            テキスト入力
          </Tab>
          <Tab active={activeTab === 'file'} onClick={() => setActiveTab('file')}>
            ファイルアップロード
          </Tab>
        </TabContainer>

        {activeTab === 'text' ? (
          <div>
            <TextArea
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder={`議事録をここに貼り付けてください。

例：
2025年8月5日 14:00-15:00
場所：ABC建設本社会議室
参加者：田中（営業）、山田部長、ABC建設工事部長、設計課長

議題：新社屋建設プロジェクトについて
- BIMを活用した設計提案
- 予算：約5000万円
- 工期：2025年10月〜2026年3月
- 次回打ち合わせ：8月12日

課題：
- 工期が非常にタイト
- 資材価格の高騰への対応検討`}
            />
          </div>
        ) : (
          <div>
            <FileUploadArea>
              <input
                type="file"
                accept=".pdf,.txt,.docx,.doc,.mp3,.wav,.m4a,.ogg"
                onChange={handleFileUpload}
              />
              <UploadIcon />
              <UploadText>ファイルをアップロード</UploadText>
              <UploadSubText>
                PDF、Word、テキスト、音声ファイル対応<br/>
                最大 50MB まで
              </UploadSubText>
            </FileUploadArea>
            {uploadedFile && (
              <FileInfo>
                <span>{uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                <RemoveFileButton onClick={handleRemoveFile}>削除</RemoveFileButton>
              </FileInfo>
            )}
          </div>
        )}

        <ButtonContainer>
          <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
          <PrimaryButton 
            onClick={handleSubmit} 
            disabled={isProcessing || (activeTab === 'text' ? !meetingNotes.trim() : !uploadedFile)}
          >
            {isProcessing ? '処理中...' : 'AIヒアリング開始'}
          </PrimaryButton>
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default MeetingNotesModal;