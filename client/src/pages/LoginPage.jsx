import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';
import { FaUserTie } from 'react-icons/fa';

const Container = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background);
  padding: var(--space-4);
  position: relative;
  overflow: hidden;

  /* Architectural grid background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(rgba(0,0,0,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.015) 1px, transparent 1px);
    background-size: var(--space-7) var(--space-7);
    pointer-events: none;
    z-index: 0;
  }

  @media (max-width: 768px) {
    padding: var(--space-3);
  }
`;

const Card = styled.div`
  background-color: var(--color-surface);
  padding: var(--space-6);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-border);
  box-shadow: var(--shadow-structure);
  width: 100%;
  max-width: 450px;
  position: relative;
  z-index: 1;
  
  /* Removed excessive corner details */

  @media (max-width: 768px) {
    padding: var(--space-7);
    max-width: 100%;
    margin: 0 auto;
    
    &::before,
    &::after {
      width: 16px;
      height: 16px;
    }
  }

  @media (max-width: 480px) {
    padding: var(--space-6);
  }
  
  @media (max-width: 400px) {
    padding: var(--space-5);
    max-width: calc(100vw - var(--space-6));
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-5);
  position: relative;

  @media (max-width: 768px) {
    margin-bottom: var(--space-5);
  }
`;

const Logo = styled.div`
  width: 64px;
  height: 64px;
  background: var(--color-accent);
  border-radius: var(--radius-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);
  position: relative;
  box-shadow: var(--shadow-elevation);
  overflow: hidden;
  
  svg {
    font-size: 32px;
    color: white;
  }

  @media (max-width: 768px) {
    width: 64px;
    height: 64px;
    
    &::after {
      width: 24px;
      height: 24px;
      border-width: 2px;
    }

    &::before {
      width: 10px;
      height: 10px;
    }
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-display);
  font-weight: var(--font-weight-thin);
  text-align: center;
  margin-bottom: var(--space-2);
  color: var(--color-accent);
  letter-spacing: -0.025em;
  line-height: var(--line-height-compressed);
  position: relative;
  
  /* Removed excessive underline accent */

  @media (max-width: 768px) {
    font-size: var(--font-size-heading);
    
    &::after {
      width: 60px;
    }
  }

  @media (max-width: 480px) {
    font-size: var(--font-size-title);
    
    &::after {
      width: 50px;
    }
  }
`;

const Subtitle = styled.p`
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
  margin-bottom: var(--space-5);
  line-height: var(--line-height-comfortable);
  font-weight: var(--font-weight-regular);

  @media (max-width: 768px) {
    font-size: var(--font-size-body);
    margin-bottom: var(--space-6);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
`;

const FormGroup = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  transition: color 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InputContainer = styled.div`
  position: relative;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    color: var(--color-accent);
  }

  &:focus {
    outline: none;
    color: var(--color-accent);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: var(--space-5) var(--space-5);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-none);
  font-size: var(--font-size-body);
  background-color: var(--color-background);
  transition: all 0.2s ease-in-out;
  color: var(--color-text-primary);
  font-family: inherit;
  font-weight: var(--font-weight-regular);
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  height: 52px;

  /* オートフィル時の背景色を白に固定 */
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px white inset !important;
    -webkit-text-fill-color: var(--color-text-primary) !important;
    background-color: var(--color-background) !important;
  }

  &::placeholder {
    color: var(--color-text-tertiary);
    transition: opacity 0.2s ease;
  }

  &:focus {
    outline: none;
    border-color: var(--color-accent);
    background-color: var(--color-background);
    box-shadow: var(--shadow-focused);
    
    &::placeholder {
      opacity: 0.6;
    }
  }

  &:disabled {
    background-color: var(--color-surface-alt);
    cursor: not-allowed;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    padding: var(--space-5) var(--space-4);
    height: 48px;
  }
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  font-size: var(--font-size-small);
  margin-top: var(--space-2);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-standard);
`;

const Button = styled.button`
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
  padding: var(--space-5) var(--space-6);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-none);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  margin-top: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  box-shadow: var(--shadow-elevation);
  -webkit-tap-highlight-color: transparent;

  &:hover:not(:disabled) {
    background-color: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-structure);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background-color: var(--color-text-tertiary);
    border-color: var(--color-text-tertiary);
    cursor: not-allowed;
    transform: none;
    box-shadow: var(--shadow-paper);
  }
  
  /* Removed excessive corner accent */

  @media (max-width: 768px) {
    padding: var(--space-5) var(--space-5);
    font-size: var(--font-size-small);
  }
`;

const DemoInfo = styled.div`
  margin-top: var(--space-5);
  padding: var(--space-4);
  background-color: var(--color-accent-light);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-accent);
  border-left: 6px solid var(--color-accent);
  position: relative;
  
  /* Removed excessive corner detail */

  @media (max-width: 768px) {
    margin-top: var(--space-6);
    padding: var(--space-4);
  }
`;

const DemoTitle = styled.h3`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent);
  margin-bottom: var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;

  @media (max-width: 768px) {
    font-size: var(--font-size-micro);
  }
`;

const DemoAccount = styled.div`
  font-size: var(--font-size-small);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-background);
  border-radius: var(--radius-none);
  font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-weight: var(--font-weight-medium);
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: all;
  border: 1px solid var(--color-border);
  position: relative;
  word-break: break-all;

  &:hover {
    background-color: var(--color-surface);
    border-color: var(--color-accent);
    transform: translateY(-1px);
  }
  
  /* Removed excessive corner accent */

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 768px) {
    font-size: var(--font-size-micro);
    padding: var(--space-3) var(--space-3);
  }
  
  @media (max-width: 400px) {
    font-size: 11px;
    padding: var(--space-2) var(--space-3);
  }
`;

const Divider = styled.div`
  height: 1px;
  background: var(--color-border);
  margin: var(--space-6) 0;
  position: relative;
  
  /* Removed excessive accent elements */

  @media (max-width: 768px) {
    margin: var(--space-5) 0;
  }
`;

const SignupLink = styled.div`
  text-align: center;
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  line-height: var(--line-height-standard);

  @media (max-width: 768px) {
    font-size: var(--font-size-small);
  }
`;

const Link = styled.button`
  color: var(--color-accent);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    color: var(--color-accent-hover);
    
    &::after {
      width: 100%;
    }
  }
  
  /* Simplified underline - only on hover */
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 1px;
    background-color: var(--color-accent-hover);
    transition: width 0.2s ease;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [showSignupPrompt, setShowSignupPrompt] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

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
        // 認証エラーの場合、新規登録を促す
        if (result.isAuthError) {
          setShowSignupPrompt(true);
          // 5秒後に自動的に非表示
          setTimeout(() => setShowSignupPrompt(false), 5000);
        }
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
          <Logo>
            <FaUserTie />
          </Logo>
        </LogoContainer>
        <Title>にっぽ係長</Title>
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
                type={showPassword ? "text" : "password"}
                placeholder="パスワードを入力"
                {...register('password', {
                  required: 'パスワードを入力してください',
                  minLength: {
                    value: 6,
                    message: 'パスワードは6文字以上である必要があります'
                  }
                })}
                disabled={isSubmitting}
                style={{ paddingRight: 'calc(var(--space-5) + 40px)' }}
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </PasswordToggle>
            </InputContainer>
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </FormGroup>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </Button>
        </Form>

        {/* 新規登録を促すメッセージ */}
        {showSignupPrompt && (
          <div style={{
            marginTop: 'var(--space-5)',
            padding: 'var(--space-5)',
            backgroundColor: 'var(--color-accent-light)',
            border: '2px solid var(--color-accent)',
            borderLeft: '6px solid var(--color-accent)',
            borderRadius: 'var(--radius-none)',
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease-in',
            position: 'relative'
          }}>
            <style>
              {`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}
            </style>
            <div style={{
              content: '""',
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '10px',
              height: '10px',
              borderTop: '2px solid var(--color-accent)',
              borderRight: '2px solid var(--color-accent)'
            }}></div>
            <p style={{
              color: 'var(--color-accent)',
              fontSize: 'var(--font-size-small)',
              marginBottom: 'var(--space-2)',
              fontWeight: 'var(--font-weight-bold)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              アカウントが見つかりませんでした
            </p>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-small)',
              marginBottom: 'var(--space-4)',
              lineHeight: 'var(--line-height-standard)'
            }}>
              新規登録してにっぽ係長を始めましょう！
            </p>
            <button
              onClick={handleSignupClick}
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-inverse)',
                padding: 'var(--space-3) var(--space-5)',
                borderRadius: 'var(--radius-none)',
                border: '2px solid var(--color-accent)',
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-bold)',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                boxShadow: 'var(--shadow-elevation)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = 'var(--color-accent)';
                e.target.style.borderColor = 'var(--color-accent)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = 'var(--shadow-structure)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'var(--color-accent)';
                e.target.style.borderColor = 'var(--color-accent)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'var(--shadow-elevation)';
              }}
            >
              新規登録ページへ →
            </button>
          </div>
        )}

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