import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi';

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
  flex: 1;
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
  &::after {
    content: '';
    position: absolute;
    bottom: -20%;
    left: -15%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%);
    border-radius: 50%;
  }

  @media (max-width: 768px) {
    flex: 0;
    padding: var(--space-8) var(--space-6);
    min-height: 200px;
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
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-extrabold);
  margin: 0 auto var(--space-6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    width: 56px;
    height: 56px;
    font-size: var(--font-size-2xl);
    margin-bottom: var(--space-4);
  }
`;

const BrandTitle = styled.h1`
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-extrabold);
  color: white;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-3);

  @media (max-width: 768px) {
    font-size: var(--font-size-2xl);
    margin-bottom: var(--space-2);
  }
`;

const BrandSubtitle = styled.p`
  font-size: var(--font-size-lg);
  color: rgba(255, 255, 255, 0.75);
  line-height: var(--line-height-relaxed);
  max-width: 400px;

  @media (max-width: 768px) {
    font-size: var(--font-size-sm);
  }
`;

const FormPanel = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  background: var(--color-background);

  @media (max-width: 768px) {
    padding: var(--space-6) var(--space-4);
  }
`;

const FormCard = styled.div`
  width: 100%;
  max-width: 420px;
  animation: ${fadeInUp} 0.6s ease-out 0.1s both;
`;

const FormTitle = styled.h2`
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
  letter-spacing: -0.02em;
`;

const FormSubtitle = styled.p`
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-6);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
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
  &:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 30px white inset !important;
  }
  &::placeholder {
    color: var(--color-text-tertiary);
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
  box-shadow: 0 2px 8px rgba(26, 54, 93, 0.2);

  &:hover:not(:disabled) {
    background: var(--gradient-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(26, 54, 93, 0.3);
  }
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const DemoInfo = styled.div`
  margin-top: var(--space-6);
  padding: var(--space-4);
  background: var(--color-primary-50);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-primary-600, #2563eb);
`;

const DemoTitle = styled.h3`
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-2);
`;

const DemoAccount = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1);
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: all;
  transition: background var(--transition-fast);

  &:last-child { margin-bottom: 0; }
  &:hover { background: var(--color-surface-alt); }
`;

const Divider = styled.div`
  height: 1px;
  background: var(--color-border);
  margin: var(--space-6) 0;
`;

const SignupLink = styled.div`
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
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

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate('/', { replace: true });
    }
  };

  const fillDemoAccount = (email, password) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <Container>
      <BrandPanel>
        <BrandContent>
          <BrandLogo>K</BrandLogo>
          <BrandTitle>現場のミカタ</BrandTitle>
          <BrandSubtitle>
            建設・土木業界の知恵を共有する<br />
            AIナレッジアシスタント
          </BrandSubtitle>
        </BrandContent>
      </BrandPanel>

      <FormPanel>
        <FormCard>
          <FormTitle>ログイン</FormTitle>
          <FormSubtitle>アカウントにサインインしてください</FormSubtitle>

          <Form onSubmit={handleSubmit(onSubmit)} noValidate>
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
                  disabled={isSubmitting}
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
                  placeholder="パスワードを入力"
                  {...register('password', {
                    required: 'パスワードを入力してください',
                    minLength: { value: 6, message: 'パスワードは6文字以上です' }
                  })}
                  disabled={isSubmitting}
                />
              </InputWrapper>
              {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
            </FormGroup>

            <SubmitButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'ログイン中...' : 'ログイン'}
            </SubmitButton>
          </Form>

          <DemoInfo>
            <DemoTitle>デモアカウント</DemoTitle>
            <DemoAccount onClick={() => fillDemoAccount('admin@example.com', 'password123')}>
              管理者: admin@example.com / password123
            </DemoAccount>
            <DemoAccount onClick={() => fillDemoAccount('yamada@example.com', 'password123')}>
              現場監督: yamada@example.com / password123
            </DemoAccount>
            <DemoAccount onClick={() => fillDemoAccount('expert@example.com', 'password123')}>
              熟練者: expert@example.com / password123
            </DemoAccount>
            <DemoAccount onClick={() => fillDemoAccount('tanaka@example.com', 'password123')}>
              作業者: tanaka@example.com / password123
            </DemoAccount>
          </DemoInfo>

          <Divider />

          <SignupLink>
            アカウントをお持ちでない方は{' '}
            <LinkButton onClick={() => navigate('/register')}>新規登録</LinkButton>
          </SignupLink>
        </FormCard>
      </FormPanel>
    </Container>
  );
};

export default LoginPage;
