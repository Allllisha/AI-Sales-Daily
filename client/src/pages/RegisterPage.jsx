import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI, userAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';

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
      linear-gradient(rgba(0,0,0,0.01) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.01) 1px, transparent 1px);
    background-size: var(--space-7) var(--space-7);
    pointer-events: none;
    z-index: 0;
  }

  @media (max-width: 768px) {
    padding: var(--space-3);
  }
`;

const Card = styled.div`
  background-color: white;
  padding: var(--space-6);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-border);
  box-shadow: var(--shadow-structure);
  width: 100%;
  max-width: 480px;
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
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-5);
  position: relative;

  @media (max-width: 768px) {
    margin-bottom: var(--space-3);
  }
`;

const Logo = styled.div`
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);
  position: relative;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  @media (max-width: 768px) {
    width: 72px;
    height: 72px;
    margin-bottom: var(--space-2);
  }
`;

const Title = styled.h1`
  font-size: var(--font-size-heading);
  font-weight: var(--font-weight-bold);
  text-align: center;
  margin-bottom: var(--space-2);
  color: var(--color-accent);
  letter-spacing: -0.02em;
  line-height: var(--line-height-compressed);
  text-transform: uppercase;
  position: relative;
  
  /* Removed excessive underline accent */

  @media (max-width: 768px) {
    font-size: 2rem;
    
    &::after {
      width: 80px;
    }
  }

  @media (max-width: 480px) {
    font-size: 1.75rem;
    
    &::after {
      width: 60px;
    }
  }
`;

const Subtitle = styled.p`
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
  margin-bottom: var(--space-6);
  line-height: var(--line-height-comfortable);
  font-weight: var(--font-weight-regular);

  @media (max-width: 768px) {
    font-size: var(--font-size-small);
    margin-bottom: var(--space-5);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  @media (max-width: 768px) {
    gap: var(--space-4);
  }
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

const Select = styled.select`
  width: 100%;
  padding: var(--space-5) var(--space-5);
  height: 52px;
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
  cursor: pointer;

  /* オートフィル時の背景色を白に固定 */
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px white inset !important;
    -webkit-text-fill-color: var(--color-text-primary) !important;
    background-color: var(--color-background) !important;
  }

  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23888888' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right var(--space-3) center;
  background-repeat: no-repeat;
  background-size: 1.2em 1.2em;
  padding-right: var(--space-7);

  &:focus {
    outline: none;
    border-color: var(--color-accent);
    background-color: var(--color-background);
    box-shadow: var(--shadow-focused);
  }

  &:disabled {
    background-color: var(--color-surface-alt);
    cursor: not-allowed;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    padding: var(--space-4) var(--space-7) var(--space-4) var(--space-4);
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

const LoginLink = styled.div`
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
    color: var(--color-primary);
    
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
    background-color: var(--color-primary);
    transition: width 0.2s ease;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const RoleInfo = styled.div`
  margin-top: var(--space-5);
  padding: var(--space-4);
  background-color: var(--color-accent-light);
  border-radius: var(--radius-none);
  border: 2px solid var(--color-accent);
  border-left: 6px solid var(--color-accent);
  position: relative;
  
  /* Removed excessive corner detail */

  @media (max-width: 768px) {
    margin-top: var(--space-5);
    padding: var(--space-4);
    
    &::after {
      width: 8px;
      height: 8px;
    }
  }
`;

const RoleTitle = styled.h4`
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const RoleDescription = styled.p`
  font-size: var(--font-size-small);
  color: var(--color-text-primary);
  line-height: var(--line-height-comfortable);
  margin: 0;
  
  strong {
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
  }
`;

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm();
  const [managers, setManagers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  
  const password = watch('password');
  const selectedRole = watch('role');

  // マネージャー一覧を取得
  useEffect(() => {
    const fetchManagers = async () => {
      if (selectedRole === 'sales') {
        setLoadingManagers(true);
        try {
          const managersData = await userAPI.getManagers();
          setManagers(managersData);
        } catch (error) {
          console.error('Failed to fetch managers:', error);
          toast.error('マネージャー一覧の取得に失敗しました');
        } finally {
          setLoadingManagers(false);
        }
      } else {
        setManagers([]);
      }
    };

    fetchManagers();
  }, [selectedRole]);

  const onSubmit = async (data) => {
    try {
      const registrationData = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role
      };

      // 営業担当者の場合はマネージャーIDを追加
      if (data.role === 'sales' && data.manager) {
        registrationData.manager_id = parseInt(data.manager);
      }

      await authAPI.register(registrationData);
      
      toast.success('アカウントが作成されました。ログインしてください。');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.error || '登録に失敗しました');
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <Container>
      <Card>
        <LogoContainer>
          <Logo>
            <img src="/logo.png" alt="にっぽ係長" />
          </Logo>
        </LogoContainer>
        <Title>新規登録</Title>
        <Subtitle>にっぽ係長アカウント作成</Subtitle>
        
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="name">名前</Label>
            <InputContainer>
              <Input
                id="name"
                type="text"
                placeholder="山田太郎"
                {...register('name', {
                  required: '名前を入力してください',
                  minLength: {
                    value: 2,
                    message: '名前は2文字以上である必要があります'
                  }
                })}
                disabled={isSubmitting}
              />
            </InputContainer>
            {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
          </FormGroup>

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

          <FormGroup>
            <Label htmlFor="confirmPassword">パスワード確認</Label>
            <InputContainer>
              <Input
                id="confirmPassword"
                type={showPasswordConfirm ? "text" : "password"}
                placeholder="パスワードを再入力"
                {...register('confirmPassword', {
                  required: 'パスワード確認を入力してください',
                  validate: value => value === password || 'パスワードが一致しません'
                })}
                disabled={isSubmitting}
                style={{ paddingRight: 'calc(var(--space-5) + 40px)' }}
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                tabIndex={-1}
                aria-label={showPasswordConfirm ? "パスワードを隠す" : "パスワードを表示"}
              >
                {showPasswordConfirm ? (
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
            {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="role">役職</Label>
            <Select
              id="role"
              {...register('role', {
                required: '役職を選択してください'
              })}
              disabled={isSubmitting}
            >
              <option value="">選択してください</option>
              <option value="sales">営業担当者</option>
              <option value="manager">マネージャー</option>
            </Select>
            {errors.role && <ErrorMessage>{errors.role.message}</ErrorMessage>}
          </FormGroup>

          {/* 営業担当者の場合のみマネージャー選択を表示 */}
          {selectedRole === 'sales' && (
            <FormGroup>
              <Label htmlFor="manager">上司（マネージャー）</Label>
              <Select
                id="manager"
                {...register('manager', {
                  required: selectedRole === 'sales' ? '上司を選択してください' : false
                })}
                disabled={isSubmitting || loadingManagers}
              >
                <option value="">
                  {loadingManagers ? '読み込み中...' : '上司を選択してください'}
                </option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} ({manager.email})
                  </option>
                ))}
              </Select>
              {errors.manager && <ErrorMessage>{errors.manager.message}</ErrorMessage>}
              {managers.length === 0 && !loadingManagers && selectedRole === 'sales' && (
                <ErrorMessage>
                  利用可能なマネージャーが見つかりません。システム管理者にお問い合わせください。
                </ErrorMessage>
              )}
            </FormGroup>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '登録中...' : 'アカウント作成'}
          </Button>
        </Form>

        <RoleInfo>
          <RoleTitle>役職について</RoleTitle>
          <RoleDescription>
            <strong>営業担当者:</strong> 自分の日報作成・閲覧<br/>
            <strong>マネージャー:</strong> 自分の日報 + 部下の日報閲覧・分析
          </RoleDescription>
        </RoleInfo>

        <Divider />

        <LoginLink>
          すでにアカウントをお持ちの方は{' '}
          <Link onClick={handleLoginClick}>ログイン</Link>
        </LoginLink>
      </Card>
    </Container>
  );
};

export default RegisterPage;