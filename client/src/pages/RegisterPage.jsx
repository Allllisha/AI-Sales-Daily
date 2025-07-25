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
  max-width: 450px;
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
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    margin-bottom: 1.25rem;
  }
`;

const Logo = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  position: relative;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  
  &::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid white;
    border-radius: 50%;
    background: transparent;
    top: 10px;
    left: 12px;
  }

  &::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border: 2px solid white;
    border-radius: 50%;
    background: transparent;
    top: 20px;
    right: 8px;
  }

  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    
    &::after {
      width: 16px;
      height: 16px;
      border: 2px solid white;
      top: 8px;
      left: 10px;
    }

    &::before {
      width: 12px;
      height: 12px;
      border: 2px solid white;
      top: 18px;
      right: 6px;
    }
  }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.5rem;
  color: #1f2937;
  letter-spacing: -0.025em;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }

  @media (max-width: 480px) {
    font-size: 1.375rem;
  }
`;

const Subtitle = styled.p`
  text-align: center;
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 1.75rem;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (max-width: 768px) {
    gap: 1rem;
  }
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
  padding: 0.9rem 1.1rem;
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
    padding: 1rem 1.1rem;
    border-radius: 12px;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.9rem 1.1rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #1f2937;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;

  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;

  &:focus {
    outline: none;
    border-color: #667eea;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 
      0 0 0 4px rgba(102, 126, 234, 0.1),
      0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  &:disabled {
    background: rgba(243, 244, 246, 0.8);
    cursor: not-allowed;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    padding: 1rem 2.5rem 1rem 1.1rem;
    border-radius: 12px;
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
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 1.05rem;
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
    padding: 1.1rem 1.5rem;
    font-size: 1.075rem;
    border-radius: 12px;
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

const LoginLink = styled.div`
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

const RoleInfo = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(245, 243, 255, 0.9);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.2);

  @media (max-width: 768px) {
    margin-top: 1.25rem;
    padding: 0.875rem;
    border-radius: 10px;
  }
`;

const RoleTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 700;
  color: #5B21B6;
  margin-bottom: 0.5rem;
`;

const RoleDescription = styled.p`
  font-size: 0.8rem;
  color: #44403C;
  line-height: 1.4;
  margin: 0;
`;

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm();
  const [managers, setManagers] = useState([]);
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
          <Logo />
        </LogoContainer>
        <Title>新規登録</Title>
        <Subtitle>Sales Dailyアカウント作成</Subtitle>
        
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

          <FormGroup>
            <Label htmlFor="confirmPassword">パスワード確認</Label>
            <InputContainer>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="パスワードを再入力"
                {...register('confirmPassword', {
                  required: 'パスワード確認を入力してください',
                  validate: value => value === password || 'パスワードが一致しません'
                })}
                disabled={isSubmitting}
              />
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