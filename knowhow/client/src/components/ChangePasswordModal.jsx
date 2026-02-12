import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import { HiOutlineLockClosed } from 'react-icons/hi';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
`;

const InputWrapper = styled.div`
  position: relative;
`;

const InputIcon = styled.span`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  display: flex;
  font-size: 1.15rem;
  pointer-events: none;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-surface);
  color: var(--color-text-primary);
  height: 48px;
  transition: all var(--transition-base);
  outline: none;

  &:focus {
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
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  font-size: var(--font-size-xs);
  margin-top: var(--space-1);
`;

const SubmitButton = styled.button`
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  padding: 14px;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-base);
  height: 48px;

  &:hover:not(:disabled) {
    background: var(--gradient-primary-hover);
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled.button`
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  height: 48px;

  &:hover {
    background: var(--color-border);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
`;

const HelpText = styled.p`
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-1);
`;

const ChangePasswordModal = ({ open, onClose }) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    if (newPassword.length < 8) {
      setError('新しいパスワードは8文字以上で入力してください');
      return;
    }

    if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
      setError('パスワードは英数字混在で入力してください');
      return;
    }

    setSubmitting(true);
    const result = await changePassword(currentPassword, newPassword);
    setSubmitting(false);

    if (result.success) {
      handleClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="パスワード変更" size="sm">
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>現在のパスワード</Label>
          <InputWrapper>
            <InputIcon><HiOutlineLockClosed /></InputIcon>
            <Input
              type="password"
              placeholder="現在のパスワード"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </InputWrapper>
        </FormGroup>

        <FormGroup>
          <Label>新しいパスワード</Label>
          <InputWrapper>
            <InputIcon><HiOutlineLockClosed /></InputIcon>
            <Input
              type="password"
              placeholder="新しいパスワード"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </InputWrapper>
          <HelpText>8文字以上、英数字混在</HelpText>
        </FormGroup>

        <FormGroup>
          <Label>新しいパスワード（確認）</Label>
          <InputWrapper>
            <InputIcon><HiOutlineLockClosed /></InputIcon>
            <Input
              type="password"
              placeholder="パスワードの再入力"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </InputWrapper>
        </FormGroup>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonGroup>
          <CancelButton type="button" onClick={handleClose}>
            キャンセル
          </CancelButton>
          <SubmitButton type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '変更中...' : 'パスワードを変更'}
          </SubmitButton>
        </ButtonGroup>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
