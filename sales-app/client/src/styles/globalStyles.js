import { css } from '@emotion/react';
import { colors, typography, spacing, borderRadius, shadows, transitions } from './designSystem';

export const globalStyles = css`
  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    font-family: ${typography.fontFamily.sans};
    font-weight: ${typography.fontWeight.semibold};
    line-height: ${typography.lineHeight.tight};
    letter-spacing: ${typography.letterSpacing.tight};
    color: ${colors.neutral[900]};
    margin: 0;
  }

  h1 {
    font-size: ${typography.fontSize['4xl']};
    font-weight: ${typography.fontWeight.bold};
  }

  h2 {
    font-size: ${typography.fontSize['3xl']};
  }

  h3 {
    font-size: ${typography.fontSize['2xl']};
  }

  h4 {
    font-size: ${typography.fontSize.xl};
  }

  h5 {
    font-size: ${typography.fontSize.lg};
  }

  h6 {
    font-size: ${typography.fontSize.base};
  }

  /* Paragraphs */
  p {
    font-family: ${typography.fontFamily.sans};
    font-size: ${typography.fontSize.base};
    line-height: ${typography.lineHeight.relaxed};
    color: ${colors.neutral[700]};
    margin: 0;
  }

  /* Links */
  a {
    color: ${colors.primary[600]};
    text-decoration: none;
    transition: color ${transitions.fast};

    &:hover {
      color: ${colors.primary[700]};
    }

    &:active {
      color: ${colors.primary[800]};
    }
  }

  /* Forms */
  input, textarea, select {
    font-family: ${typography.fontFamily.sans};
    font-size: ${typography.fontSize.base};
    line-height: ${typography.lineHeight.normal};
    color: ${colors.neutral[900]};
    background-color: white;
    border: 1px solid ${colors.neutral[300]};
    border-radius: ${borderRadius.md};
    padding: ${spacing[2]} ${spacing[3]};
    transition: all ${transitions.fast};
    width: 100%;

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
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }

  /* Labels */
  label {
    font-family: ${typography.fontFamily.sans};
    font-size: ${typography.fontSize.sm};
    font-weight: ${typography.fontWeight.medium};
    color: ${colors.neutral[700]};
    margin-bottom: ${spacing[1]};
    display: block;
  }

  /* Buttons - Additional Styles */
  button {
    font-family: ${typography.fontFamily.sans};
    cursor: pointer;
    transition: all ${transitions.fast};
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    font-family: ${typography.fontFamily.sans};
  }

  th {
    font-weight: ${typography.fontWeight.semibold};
    text-align: left;
    padding: ${spacing[3]} ${spacing[4]};
    background-color: ${colors.neutral[50]};
    border-bottom: 1px solid ${colors.neutral[200]};
    color: ${colors.neutral[700]};
    font-size: ${typography.fontSize.sm};
  }

  td {
    padding: ${spacing[3]} ${spacing[4]};
    border-bottom: 1px solid ${colors.neutral[100]};
    color: ${colors.neutral[800]};
    font-size: ${typography.fontSize.base};
  }

  /* Lists */
  ul, ol {
    margin: 0;
    padding-left: ${spacing[6]};
    color: ${colors.neutral[700]};
  }

  li {
    margin-bottom: ${spacing[1]};
  }

  /* Utility Classes */
  .text-muted {
    color: ${colors.neutral[500]};
  }

  .text-small {
    font-size: ${typography.fontSize.sm};
  }

  .text-xs {
    font-size: ${typography.fontSize.xs};
  }

  .font-medium {
    font-weight: ${typography.fontWeight.medium};
  }

  .font-semibold {
    font-weight: ${typography.fontWeight.semibold};
  }

  /* Cards */
  .card {
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
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: ${spacing[1]} ${spacing[2]};
    font-size: ${typography.fontSize.xs};
    font-weight: ${typography.fontWeight.medium};
    border-radius: ${borderRadius.full};
    background-color: ${colors.neutral[100]};
    color: ${colors.neutral[700]};
    border: 1px solid ${colors.neutral[200]};
  }

  .badge-success {
    background-color: rgba(34, 197, 94, 0.1);
    color: ${colors.success.dark};
    border-color: ${colors.success.light};
  }

  .badge-warning {
    background-color: rgba(245, 158, 11, 0.1);
    color: ${colors.warning.dark};
    border-color: ${colors.warning.light};
  }

  .badge-error {
    background-color: rgba(239, 68, 68, 0.1);
    color: ${colors.error.dark};
    border-color: ${colors.error.light};
  }

  /* Dividers */
  hr {
    border: none;
    border-top: 1px solid ${colors.neutral[200]};
    margin: ${spacing[6]} 0;
  }

  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${colors.neutral[100]};
  }

  ::-webkit-scrollbar-thumb {
    background: ${colors.neutral[400]};
    border-radius: ${borderRadius.full};
    
    &:hover {
      background: ${colors.neutral[500]};
    }
  }

  /* Selection */
  ::selection {
    background-color: rgba(139, 92, 246, 0.2);
    color: ${colors.neutral[900]};
  }

  /* Focus Visible */
  *:focus-visible {
    outline: 2px solid ${colors.primary[500]};
    outline-offset: 2px;
  }
`;