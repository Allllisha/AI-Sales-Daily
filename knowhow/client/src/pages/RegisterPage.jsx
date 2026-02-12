import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { HiOutlineUser, HiOutlineMail, HiOutlineLockClosed, HiOutlineBriefcase, HiOutlineOfficeBuilding, HiOutlineUserGroup } from 'react-icons/hi';
import api from '../services/api';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const BrandPanel = styled.div`
  flex: 0.8;
  background: var(--gradient-hero);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -30%;
    right: -20%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%);
    border-radius: 50%;
  }

  @media (max-width: 768px) {
    flex: 0;
    padding: var(--space-6);
    min-height: 160px;
  }
`;

const BrandContent = styled.div`
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
  animation: ${fadeInUp} 0.6s ease-out;
`;

const BrandLogo = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-extrabold);
  margin: 0 auto var(--space-4);

  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
    font-size: var(--font-size-xl);
  }
`;

const BrandTitle = styled.h1`
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-extrabold);
  color: white;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-2);

  @media (max-width: 768px) {
    font-size: var(--font-size-xl);
  }
`;

const BrandSubtitle = styled.p`
  font-size: var(--font-size-base);
  color: rgba(255, 255, 255, 0.7);

  @media (max-width: 768px) {
    font-size: var(--font-size-sm);
  }
`;

const FormPanel = styled.div`
  flex: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  background: var(--color-background);
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: var(--space-6) var(--space-4);
  }
`;

const FormCard = styled.div`
  width: 100%;
  max-width: 460px;
  animation: ${fadeInUp} 0.6s ease-out 0.1s both;
`;

const FormTitle = styled.h2`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
`;

const FormSubtitle = styled.p`
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-6);
`;

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
  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const Select = styled.select`
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
  appearance: none;
  cursor: pointer;

  &:focus {
    border-color: var(--color-primary-600, #2563eb);
    box-shadow: var(--shadow-focus);
  }
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  font-size: var(--font-size-xs);
  margin-top: var(--space-1);
  animation: fadeIn 0.2s ease-out;
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
  height: 52px;
  margin-top: var(--space-2);
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);

  &:hover:not(:disabled) {
    background: var(--gradient-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(26, 54, 93, 0.3);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoginLink = styled.div`
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-6);
`;

const LinkButton = styled.button`
  color: var(--color-primary-600, #2563eb);
  font-weight: var(--font-weight-semibold);
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  transition: color var(--transition-fast);

  &:hover { color: var(--color-primary-light); }
`;

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    api.get('/api/users/managers')
      .then(res => setManagers(res.data))
      .catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    const payload = { ...data };
    if (payload.manager_id) {
      payload.manager_id = parseInt(payload.manager_id);
    } else {
      delete payload.manager_id;
    }
    const result = await registerUser(payload);
    if (result.success) {
      navigate('/', { replace: true });
    }
  };

  return (
    <Container>
      <BrandPanel>
        <BrandContent>
          <BrandLogo>K</BrandLogo>
          <BrandTitle>現場のミカタ</BrandTitle>
          <BrandSubtitle>ナレッジ共有AIアシスタント</BrandSubtitle>
        </BrandContent>
      </BrandPanel>

      <FormPanel>
        <FormCard>
          <FormTitle>新規登録</FormTitle>
          <FormSubtitle>現場のミカタのアカウントを作成</FormSubtitle>

          <Form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormGroup>
              <Label htmlFor="name">氏名</Label>
              <InputWrapper>
                <InputIcon><HiOutlineUser /></InputIcon>
                <Input
                  id="name"
                  type="text"
                  placeholder="山田 太郎"
                  {...register('name', { required: '氏名を入力してください' })}
                />
              </InputWrapper>
              {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="email">メールアドレス</Label>
              <InputWrapper>
                <InputIcon><HiOutlineMail /></InputIcon>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  {...register('email', {
                    required: 'メールアドレスを入力してください',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '有効なメールアドレスを入力してください'
                    }
                  })}
                />
              </InputWrapper>
              {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="password">パスワード</Label>
              <InputWrapper>
                <InputIcon><HiOutlineLockClosed /></InputIcon>
                <Input
                  id="password"
                  type="password"
                  placeholder="8文字以上"
                  {...register('password', {
                    required: 'パスワードを入力してください',
                    minLength: { value: 8, message: 'パスワードは8文字以上です' }
                  })}
                />
              </InputWrapper>
              {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="role">役割</Label>
              <InputWrapper>
                <InputIcon><HiOutlineBriefcase /></InputIcon>
                <Select
                  id="role"
                  {...register('role', { required: '役割を選択してください' })}
                >
                  <option value="worker">作業者</option>
                  <option value="expert">熟練者</option>
                  <option value="site_manager">現場監督</option>
                </Select>
              </InputWrapper>
              {errors.role && <ErrorMessage>{errors.role.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="department">部署</Label>
              <InputWrapper>
                <InputIcon><HiOutlineOfficeBuilding /></InputIcon>
                <Input
                  id="department"
                  type="text"
                  placeholder="工事部"
                  {...register('department')}
                />
              </InputWrapper>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="manager_id">上司</Label>
              <InputWrapper>
                <InputIcon><HiOutlineUserGroup /></InputIcon>
                <Select
                  id="manager_id"
                  {...register('manager_id')}
                >
                  <option value="">選択してください</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.department ? ` (${m.department})` : ''}
                    </option>
                  ))}
                </Select>
              </InputWrapper>
            </FormGroup>

            <SubmitButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? '登録中...' : 'アカウント作成'}
            </SubmitButton>
          </Form>

          <LoginLink>
            既にアカウントをお持ちの方は{' '}
            <LinkButton onClick={() => navigate('/login')}>ログイン</LinkButton>
          </LoginLink>
        </FormCard>
      </FormPanel>
    </Container>
  );
};

export default RegisterPage;
