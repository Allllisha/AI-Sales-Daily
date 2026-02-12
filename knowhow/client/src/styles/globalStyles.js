import { css } from '@emotion/react';

export const globalStyles = css`
  h1, h2, h3, h4, h5, h6 {
    font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, 'Segoe UI', system-ui, sans-serif;
    font-weight: 700;
    line-height: 1.25;
    color: var(--color-text-primary);
    margin: 0;
    letter-spacing: -0.025em;
  }

  h1 { font-size: var(--font-size-4xl); font-weight: 800; }
  h2 { font-size: var(--font-size-3xl); font-weight: 700; }
  h3 { font-size: var(--font-size-2xl); font-weight: 600; }
  h4 { font-size: var(--font-size-xl); font-weight: 600; }

  p {
    font-size: var(--font-size-base);
    line-height: 1.75;
    color: var(--color-text-secondary);
    margin: 0;
  }

  a {
    color: var(--color-primary-600, #2563eb);
    text-decoration: none;
    transition: color var(--transition-fast);
    &:hover { color: var(--color-primary-light, #3b82f6); }
  }

  input, textarea, select {
    font-family: inherit;
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
    background-color: white;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    transition: all var(--transition-base);
    width: 100%;

    &:focus {
      outline: none;
      border-color: var(--color-primary-600, #2563eb);
      box-shadow: var(--shadow-focus);
    }
    &:disabled {
      background-color: var(--color-surface-alt);
      color: var(--color-text-tertiary);
      cursor: not-allowed;
    }
    &::placeholder {
      color: var(--color-text-tertiary);
    }
  }

  button {
    font-family: inherit;
    cursor: pointer;
    transition: all var(--transition-base);
    border: none;
    background: none;
  }

  *:focus-visible {
    outline: 2px solid var(--color-primary-600, #2563eb);
    outline-offset: 2px;
  }
`;
