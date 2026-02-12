// Design System - Construction Industry / Professional Dark Blue
// High contrast for outdoor visibility, large touch targets for gloved hands

export const colors = {
  // Primary palette - Dark Blue (trust, professionalism)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1a365d',
    950: '#0f172a'
  },

  // Accent palette - Construction Amber/Orange (high visibility, safety)
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },

  // Neutral palette - Slate
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },

  // Semantic colors
  success: { light: '#dcfce7', main: '#22c55e', dark: '#15803d' },
  warning: { light: '#ffedd5', main: '#f97316', dark: '#c2410c' },
  error: { light: '#fee2e2', main: '#ef4444', dark: '#dc2626' },
  info: { light: '#dbeafe', main: '#3b82f6', dark: '#1d4ed8' },

  // Safety colors - ISO standard
  safety: {
    safe: '#22c55e',
    safeLight: '#dcfce7',
    warning: '#f97316',
    warningLight: '#ffedd5',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    info: '#3b82f6',
    infoLight: '#dbeafe',
    mandatory: '#1d4ed8',
    mandatoryLight: '#bfdbfe'
  }
};

export const gradients = {
  primary: 'linear-gradient(135deg, #1a365d 0%, #2563eb 100%)',
  primaryHover: 'linear-gradient(135deg, #1e3a6e 0%, #3b82f6 100%)',
  accent: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
  hero: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1a365d 100%)',
  success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  glass: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  dark: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
};

export const typography = {
  fontFamily: {
    sans: "-apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, 'Segoe UI', system-ui, sans-serif",
    mono: "'SF Mono', Monaco, 'Fira Code', Consolas, monospace"
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem'      // 48px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800'
  },
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.75'
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em'
  }
};

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px'
};

export const borderRadius = {
  none: '0',
  sm: '6px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  full: '9999px'
};

export const shadows = {
  xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
  sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
  md: '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
  lg: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
  xl: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
  '2xl': '0 25px 50px -12px rgba(15, 23, 42, 0.2)',
  focus: '0 0 0 3px rgba(37, 99, 235, 0.25)',
  glass: '0 8px 32px rgba(15, 23, 42, 0.08)'
};

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)'
};

export const breakpoints = {
  xs: '400px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

export const glass = {
  background: 'rgba(255, 255, 255, 0.7)',
  backgroundDark: 'rgba(15, 23, 42, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderDark: '1px solid rgba(255, 255, 255, 0.1)',
  blur: 'blur(12px)',
  blurHeavy: 'blur(20px)'
};

// Minimum touch target for gloved hands
export const touchTarget = {
  min: '48px',
  field: '56px'
};

export const zIndex = {
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1600,
  tooltip: 1700
};
