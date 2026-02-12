import React from 'react';
import styled from '@emotion/styled';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-6);
  text-align: center;
  animation: fadeInUp 0.5s ease-out;
`;

const IconWrapper = styled.div`
  width: 96px;
  height: 96px;
  border-radius: var(--radius-xl);
  background: var(--color-primary-50);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-6);
  color: var(--color-primary-light);
  font-size: 2.5rem;
`;

const Title = styled.h3`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
`;

const Description = styled.p`
  font-size: var(--font-size-base);
  color: var(--color-text-tertiary);
  max-width: 400px;
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--space-6);
`;

const EmptyState = ({ icon, title, description, action }) => {
  return (
    <Container>
      {icon && <IconWrapper>{icon}</IconWrapper>}
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {action && action}
    </Container>
  );
};

export default EmptyState;
