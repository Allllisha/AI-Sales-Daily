// Component Styles using the Design System
// This file provides styled component templates for common UI patterns

import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { colors, typography, spacing, borderRadius, shadows, transitions } from './designSystem';

// Button Variants
export const BaseButton = styled.button`
  font-family: ${typography.fontFamily.sans};
  font-weight: ${typography.fontWeight.medium};
  font-size: ${typography.fontSize.sm};
  line-height: ${typography.lineHeight.normal};
  padding: ${spacing[2]} ${spacing[4]};
  border-radius: ${borderRadius.md};
  transition: all ${transitions.fast};
  cursor: pointer;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${spacing[2]};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PrimaryButton = styled(BaseButton)`
  background-color: ${colors.neutral[900]};
  color: ${colors.neutral[50]};
  border-color: ${colors.neutral[900]};
  
  &:hover:not(:disabled) {
    background-color: ${colors.neutral[800]};
    border-color: ${colors.neutral[800]};
  }
  
  &:active:not(:disabled) {
    background-color: ${colors.neutral[950]};
    border-color: ${colors.neutral[950]};
  }
`;

export const SecondaryButton = styled(BaseButton)`
  background-color: white;
  color: ${colors.neutral[700]};
  border-color: ${colors.neutral[200]};
  
  &:hover:not(:disabled) {
    background-color: ${colors.neutral[50]};
    border-color: ${colors.neutral[300]};
  }
  
  &:active:not(:disabled) {
    background-color: ${colors.neutral[100]};
    border-color: ${colors.neutral[400]};
  }
`;

export const GhostButton = styled(BaseButton)`
  background-color: transparent;
  color: ${colors.neutral[600]};
  border-color: transparent;
  
  &:hover:not(:disabled) {
    background-color: ${colors.neutral[100]};
    color: ${colors.neutral[900]};
  }
`;

// Card Components
export const Card = styled.div`
  background-color: white;
  border-radius: ${borderRadius.lg};
  border: 1px solid ${colors.neutral[200]};
  padding: ${spacing[6]};
  box-shadow: ${shadows.sm};
  transition: all ${transitions.fast};

  &:hover {
    box-shadow: ${shadows.md};
    border-color: ${colors.neutral[300]};
  }
`;

export const CardHeader = styled.div`
  margin-bottom: ${spacing[4]};
  padding-bottom: ${spacing[4]};
  border-bottom: 1px solid ${colors.neutral[100]};
`;

export const CardTitle = styled.h3`
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  letter-spacing: ${typography.letterSpacing.tight};
  margin: 0;
`;

export const CardContent = styled.div`
  color: ${colors.neutral[700]};
  font-size: ${typography.fontSize.base};
  line-height: ${typography.lineHeight.relaxed};
`;

// Form Components
export const FormGroup = styled.div`
  margin-bottom: ${spacing[4]};
`;

export const Label = styled.label`
  display: block;
  font-size: ${typography.fontSize.sm};
  font-weight: ${typography.fontWeight.medium};
  color: ${colors.neutral[700]};
  margin-bottom: ${spacing[1]};
`;

export const Input = styled.input`
  width: 100%;
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.base};
  color: ${colors.neutral[900]};
  background-color: white;
  border: 1px solid ${colors.neutral[300]};
  border-radius: ${borderRadius.md};
  padding: ${spacing[2]} ${spacing[3]};
  transition: all ${transitions.fast};

  &:focus {
    outline: none;
    border-color: ${colors.primary[500]};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &:disabled {
    background-color: ${colors.neutral[100]};
    color: ${colors.neutral[500]};
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${colors.neutral[400]};
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.base};
  color: ${colors.neutral[900]};
  background-color: white;
  border: 1px solid ${colors.neutral[300]};
  border-radius: ${borderRadius.md};
  padding: ${spacing[2]} ${spacing[3]};
  transition: all ${transitions.fast};
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${colors.primary[500]};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`;

// Badge Components
export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${spacing[1]} ${spacing[2]};
  font-size: ${typography.fontSize.xs};
  font-weight: ${typography.fontWeight.medium};
  border-radius: ${borderRadius.full};
  background-color: ${colors.neutral[100]};
  color: ${colors.neutral[700]};
  border: 1px solid ${colors.neutral[200]};
`;

export const SuccessBadge = styled(Badge)`
  background-color: rgba(34, 197, 94, 0.1);
  color: ${colors.success.dark};
  border-color: ${colors.success.light};
`;

export const WarningBadge = styled(Badge)`
  background-color: rgba(245, 158, 11, 0.1);
  color: ${colors.warning.dark};
  border-color: ${colors.warning.light};
`;

export const ErrorBadge = styled(Badge)`
  background-color: rgba(239, 68, 68, 0.1);
  color: ${colors.error.dark};
  border-color: ${colors.error.light};
`;

// List Components
export const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const ListItem = styled.li`
  padding: ${spacing[3]} ${spacing[4]};
  border-bottom: 1px solid ${colors.neutral[100]};
  transition: background-color ${transitions.fast};

  &:hover {
    background-color: ${colors.neutral[50]};
  }

  &:last-child {
    border-bottom: none;
  }
`;

// Section Components
export const Section = styled.section`
  margin-bottom: ${spacing[8]};
`;

export const SectionHeader = styled.div`
  margin-bottom: ${spacing[4]};
`;

export const SectionTitle = styled.h2`
  font-size: ${typography.fontSize['2xl']};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  letter-spacing: ${typography.letterSpacing.tight};
  margin: 0;
`;

export const SectionDescription = styled.p`
  font-size: ${typography.fontSize.base};
  color: ${colors.neutral[600]};
  margin-top: ${spacing[2]};
`;

// Empty State
export const EmptyState = styled.div`
  text-align: center;
  padding: ${spacing[12]} ${spacing[4]};
`;

export const EmptyStateIcon = styled.div`
  font-size: 3rem;
  color: ${colors.neutral[400]};
  margin-bottom: ${spacing[4]};
`;

export const EmptyStateTitle = styled.h3`
  font-size: ${typography.fontSize.lg};
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.neutral[900]};
  margin-bottom: ${spacing[2]};
`;

export const EmptyStateDescription = styled.p`
  font-size: ${typography.fontSize.base};
  color: ${colors.neutral[600]};
  max-width: 400px;
  margin: 0 auto;
`;

// Loading State
export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${spacing[8]};
`;

export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${colors.neutral[200]};
  border-top-color: ${colors.neutral[600]};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Table Components
export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const TableHeader = styled.th`
  font-weight: ${typography.fontWeight.semibold};
  text-align: left;
  padding: ${spacing[3]} ${spacing[4]};
  background-color: ${colors.neutral[50]};
  border-bottom: 1px solid ${colors.neutral[200]};
  color: ${colors.neutral[700]};
  font-size: ${typography.fontSize.sm};
`;

export const TableCell = styled.td`
  padding: ${spacing[3]} ${spacing[4]};
  border-bottom: 1px solid ${colors.neutral[100]};
  color: ${colors.neutral[800]};
  font-size: ${typography.fontSize.base};
`;

// Alert Components
export const Alert = styled.div`
  padding: ${spacing[3]} ${spacing[4]};
  border-radius: ${borderRadius.md};
  border: 1px solid;
  margin-bottom: ${spacing[4]};
`;

export const InfoAlert = styled(Alert)`
  background-color: rgba(59, 130, 246, 0.05);
  border-color: ${colors.info.light};
  color: ${colors.info.dark};
`;

export const SuccessAlert = styled(Alert)`
  background-color: rgba(34, 197, 94, 0.05);
  border-color: ${colors.success.light};
  color: ${colors.success.dark};
`;

export const WarningAlert = styled(Alert)`
  background-color: rgba(245, 158, 11, 0.05);
  border-color: ${colors.warning.light};
  color: ${colors.warning.dark};
`;

export const ErrorAlert = styled(Alert)`
  background-color: rgba(239, 68, 68, 0.05);
  border-color: ${colors.error.light};
  color: ${colors.error.dark};
`;