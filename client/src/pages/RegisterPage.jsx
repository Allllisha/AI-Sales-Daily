import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI } from '../services/api';
import styled from '@emotion/styled';
import toast from 'react-hot-toast';

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

const Select = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  transition: border-color 0.2s;
  background-color: white;

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

const LoginLink = styled.div`
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

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm();
  
  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      await authAPI.register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role
      });
      
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
        <Title>新規登録</Title>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              type="text"
              {...register('name', {
                required: '名前を入力してください',
                minLength: {
                  value: 2,
                  message: '名前は2文字以上である必要があります'
                }
              })}
              disabled={isSubmitting}
            />
            {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
          </FormGroup>

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

          <FormGroup>
            <Label htmlFor="confirmPassword">パスワード確認</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword', {
                required: 'パスワード確認を入力してください',
                validate: value => value === password || 'パスワードが一致しません'
              })}
              disabled={isSubmitting}
            />
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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '登録中...' : '登録'}
          </Button>
        </Form>

        <LoginLink>
          すでにアカウントをお持ちの方は{' '}
          <Link onClick={handleLoginClick}>ログイン</Link>
        </LoginLink>
      </Card>
    </Container>
  );
};

export default RegisterPage;