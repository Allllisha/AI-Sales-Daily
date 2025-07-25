import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';

const Container = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="80" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="60" r="1" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
    animation: float 20s infinite linear;
  }

  @keyframes float {
    0% { transform: translateY(0px) translateX(0px); }
    50% { transform: translateY(-10px) translateX(5px); }
    100% { transform: translateY(0px) translateX(0px); }
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 2.5rem;
  border-radius: 24px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    border-radius: 20px;
    max-width: 100%;
    margin: 0 auto;
    box-shadow: 
      0 20px 40px -12px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 480px) {
    padding: 1.75rem 1.25rem;
    border-radius: 16px;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }
`;

const Logo = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  position: relative;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  
  &::after {
    content: '';
    position: absolute;
    width: 24px;
    height: 24px;
    border: 3px solid white;
    border-radius: 4px;
    background: transparent;
  }

  &::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 2px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }

  @media (max-width: 768px) {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    
    &::after {
      width: 20px;
      height: 20px;
      border: 2px solid white;
    }

    &::before {
      width: 12px;
      height: 12px;
    }
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.5rem;
  color: #1f2937;
  letter-spacing: -0.025em;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
  margin-bottom: 2rem;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  transition: color 0.2s ease;
`;

const InputContainer = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #1f2937;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;

  &::placeholder {
    color: #9ca3af;
    transition: opacity 0.3s ease;
  }

  &:focus {
    outline: none;
    border-color: #667eea;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 
      0 0 0 4px rgba(102, 126, 234, 0.1),
      0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
    
    &::placeholder {
      opacity: 0.6;
    }
  }

  &:disabled {
    background: rgba(243, 244, 246, 0.8);
    cursor: not-allowed;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    padding: 1.1rem 1.25rem;
    border-radius: 14px;
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  font-weight: 500;
  line-height: 1.4;
`;

const Button = styled.button`
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  color: white;
  padding: 1.1rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 0.5rem;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #A3A3A3;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 8px rgba(163, 163, 163, 0.3);
  }

  @media (max-width: 768px) {
    padding: 1.25rem 1.5rem;
    font-size: 1.125rem;
    border-radius: 14px;
  }
`;

const DemoInfo = styled.div`
  margin-top: 2rem;
  padding: 1.25rem;
  background: rgba(245, 243, 255, 0.9);
  border-radius: 16px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    margin-top: 1.5rem;
    padding: 1rem;
    border-radius: 14px;
  }
`;

const DemoTitle = styled.h3`
  font-size: 0.95rem;
  font-weight: 700;
  color: #5B21B6;
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    font-size: 0.875rem;
  }
`;

const DemoAccount = styled.div`
  font-size: 0.875rem;
  color: #44403C;
  margin-bottom: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: all;
  border: 1px solid rgba(139, 92, 246, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(139, 92, 246, 0.2);
  }

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(107, 114, 128, 0.3), transparent);
  margin: 1.5rem 0;

  @media (max-width: 768px) {
    margin: 1.25rem 0;
  }
`;

const SignupLink = styled.div`
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 0.875rem;
  }
`;

const Link = styled.button`
  color: #8B5CF6;
  text-decoration: none;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    color: #7C3AED;
    text-decoration: underline;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      console.log('Attempting login with:', data.email);
      const result = await login(data.email, data.password);
      console.log('Login result:', result);
      if (result.success) {
        console.log('Login successful, navigating to home...');
        navigate('/', { replace: true });
      } else {
        console.error('Login failed:', result.error);
      }
    } catch (error) {
      console.error('Login error caught:', error);
      // The error is already handled by the login function with toast
    }
  };

  const handleSignupClick = () => {
    navigate('/register');
  };

  return (
    <Container>
      <Card>
        <LogoContainer>
          <Logo />
        </LogoContainer>
        <Title>Sales Daily</Title>
        <Subtitle>営業日報をAIでスマートに管理</Subtitle>
        
        <Form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormGroup>
            <Label htmlFor="email">メールアドレス</Label>
            <InputContainer>
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
            </InputContainer>
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">パスワード</Label>
            <InputContainer>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                {...register('password', {
                  required: 'パスワードを入力してください',
                  minLength: {
                    value: 6,
                    message: 'パスワードは6文字以上である必要があります'
                  }
                })}
                disabled={isSubmitting}
              />
            </InputContainer>
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </FormGroup>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </Button>
        </Form>

        <DemoInfo>
          <DemoTitle>デモアカウント</DemoTitle>
          <DemoAccount>マネージャー: yamada@example.com / password123</DemoAccount>
          <DemoAccount>営業担当者: tanaka@example.com / password123</DemoAccount>
        </DemoInfo>

        <Divider />

        <SignupLink>
          アカウントをお持ちでない方は{' '}
          <Link onClick={handleSignupClick}>新規登録</Link>
        </SignupLink>
      </Card>
    </Container>
  );
};

export default LoginPage;