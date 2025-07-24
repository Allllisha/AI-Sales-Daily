import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  padding: 1rem;
`;

const Card = styled.div`
  background-color: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;

  @media (max-width: 768px) {
    padding: 1.5rem;
    box-shadow: none;
    border-radius: 0;
    max-width: 100%;
  }
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 1.5rem;
  color: #1f2937;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const Input = styled.input`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 16px; /* Prevent iOS zoom */
  }
`;

const ErrorMessage = styled.span`
  color: #dc2626;
  font-size: 0.875rem;
`;

const Button = styled.button`
  background-color: #2563eb;
  color: white;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 0.5rem;
  -webkit-tap-highlight-color: transparent;

  &:hover:not(:disabled) {
    background-color: #1d4ed8;
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    font-size: 1.125rem;
  }
`;

const DemoInfo = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #fef3c7;
  border-radius: 0.375rem;
  border: 1px solid #fbbf24;
`;

const DemoTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.5rem;
`;

const DemoAccount = styled.div`
  font-size: 0.875rem;
  color: #78350f;
  margin-bottom: 0.25rem;
`;

const SignupLink = styled.div`
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
`;

const Link = styled.button`
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  
  &:hover {
    text-decoration: underline;
  }
`;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate('/');
    }
  };

  const handleSignupClick = () => {
    navigate('/register');
  };

  return (
    <Container>
      <Card>
        <Title>Sales Daily</Title>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              {...register('email', {
                required: 'メールアドレスを入力してください',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '有効なメールアドレスを入力してください'
                }
              })}
              disabled={isSubmitting}
            />
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              {...register('password', {
                required: 'パスワードを入力してください',
                minLength: {
                  value: 8,
                  message: 'パスワードは8文字以上である必要があります'
                }
              })}
              disabled={isSubmitting}
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </FormGroup>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </Button>
        </Form>

        <DemoInfo>
          <DemoTitle>デモアカウント</DemoTitle>
          <DemoAccount>マネージャー: manager@example.com / manager123</DemoAccount>
          <DemoAccount>営業担当者: tanaka@example.com / sales123</DemoAccount>
        </DemoInfo>

        <SignupLink>
          アカウントをお持ちでない方は{' '}
          <Link onClick={handleSignupClick}>新規登録</Link>
        </SignupLink>
      </Card>
    </Container>
  );
};

export default LoginPage;