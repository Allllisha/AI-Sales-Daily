// Design System - Professional SaaS Style
// Inspired by Linear, Notion, and Stripe

export const colors = {
  // Neutral palette - sophisticated grays
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A'
  },
  
  // Primary palette - muted indigo
  primary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95'
  },
  
  // Secondary palette - warm gray
  secondary: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917'
  },
  
  // Semantic colors
  success: {
    light: '#86EFAC',
    main: '#22C55E',
    dark: '#16A34A'
  },
  
  warning: {
    light: '#FDE68A',
    main: '#F59E0B',
    dark: '#D97706'
  },
  
  error: {
    light: '#FCA5A5',
    main: '#EF4444',
    dark: '#DC2626'
  },
  
  info: {
    light: '#93C5FD',
    main: '#3B82F6',
    dark: '#2563EB'
  }
};

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", system-ui, -apple-system, sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", "Consolas", monospace'
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  
  lineHeight: {
    tight: '1.25',
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
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem'     // 96px
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px'
};

export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none'
};

export const transitions = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
  slower: '500ms ease-in-out'
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Helper function to create media queries
export const media = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`
};

// Common component styles
export const commonStyles = {
  button: {
    base: `
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
    `,
    
    primary: `
      background-color: ${colors.neutral[900]};
      color: ${colors.neutral[50]};
      border-color: ${colors.neutral[900]};
      
      &:hover {
        background-color: ${colors.neutral[800]};
        border-color: ${colors.neutral[800]};
      }
      
      &:active {
        background-color: ${colors.neutral[950]};
        border-color: ${colors.neutral[950]};
      }
    `,
    
    secondary: `
      background-color: ${colors.neutral[50]};
      color: ${colors.neutral[700]};
      border-color: ${colors.neutral[200]};
      
      &:hover {
        background-color: ${colors.neutral[100]};
        border-color: ${colors.neutral[300]};
      }
      
      &:active {
        background-color: ${colors.neutral[200]};
        border-color: ${colors.neutral[400]};
      }
    `,
    
    danger: `
      background-color: ${colors.error.main};
      color: white;
      border-color: ${colors.error.main};
      
      &:hover {
        background-color: ${colors.error.dark};
        border-color: ${colors.error.dark};
      }
    `
  }
};