/**
 * MiniMeet Web App - Global Theme Constants
 *
 * This file mirrors the Tailwind config for use in TypeScript/JavaScript.
 * Use Tailwind classes when possible, but import from here when you need
 * colors in inline styles, Chart.js, or other non-Tailwind contexts.
 *
 * IMPORTANT: Keep this in sync with tailwind.config.ts and globals.css
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Primary brand colors (dark blue)
  primary: {
    DEFAULT: '#1E3A5F',
    light: '#2C5282',
    dark: '#152A45',
    muted: '#E8EDF4',
  },

  // Accent colors (orange)
  accent: {
    DEFAULT: '#FF6B35',
    light: '#FF8F66',
    dark: '#E55A2B',
  },

  // Background colors
  background: {
    DEFAULT: '#FFFFFF',
    secondary: '#F7F9FC',
    tertiary: '#EDF2F7',
  },

  // Text/Foreground colors
  foreground: {
    DEFAULT: '#1A202C',
    secondary: '#4A5568',
    muted: '#718096',
  },

  // Border colors
  border: {
    DEFAULT: '#E2E8F0',
    light: '#EDF2F7',
    dark: '#CBD5E0',
  },

  // Status colors
  success: {
    DEFAULT: '#22C55E',
    light: '#DCFCE7',
    dark: '#16A34A',
  },

  warning: {
    DEFAULT: '#F59E0B',
    light: '#FEF3C7',
    dark: '#D97706',
  },

  error: {
    DEFAULT: '#EF4444',
    light: '#FEE2E2',
    dark: '#DC2626',
  },

  info: {
    DEFAULT: '#3B82F6',
    light: '#DBEAFE',
    dark: '#2563EB',
  },

  // Athletics-specific
  live: '#EF4444',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Basic colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ============================================================================
// EMERALD COLORS (for mobile-compatible components)
// ============================================================================

export const emerald = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
} as const;

// ============================================================================
// SLATE/GRAY SCALE
// ============================================================================

export const slate = {
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
} as const;

export const gray = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
  },

  fontSize: {
    xs: '11px',
    sm: '13px',
    base: '15px',
    lg: '17px',
    xl: '19px',
    '2xl': '23px',
    '3xl': '29px',
    '4xl': '35px',
    '5xl': '47px',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.2,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.6,
  },
} as const;

// ============================================================================
// SPACING (matches Tailwind defaults)
// ============================================================================

export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '4px',
  DEFAULT: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  xs: '0 1px 2px rgba(30, 58, 95, 0.04)',
  sm: '0 2px 4px rgba(30, 58, 95, 0.06)',
  DEFAULT: '0 4px 8px rgba(30, 58, 95, 0.08)',
  md: '0 6px 16px rgba(30, 58, 95, 0.10)',
  lg: '0 12px 24px rgba(30, 58, 95, 0.12)',
  xl: '0 20px 40px rgba(30, 58, 95, 0.14)',
  none: 'none',
} as const;

// ============================================================================
// Z-INDEX
// ============================================================================

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
} as const;

// ============================================================================
// BREAKPOINTS (matches Tailwind defaults)
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

// ============================================================================
// COMBINED THEME OBJECT
// ============================================================================

export const theme = {
  colors,
  emerald,
  slate,
  gray,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  transitions,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a color value by path (e.g., 'primary.light' or 'success.DEFAULT')
 */
export function getColor(path: string): string {
  const parts = path.split('.');
  let result: unknown = colors;

  for (const part of parts) {
    if (result && typeof result === 'object' && part in result) {
      result = (result as Record<string, unknown>)[part];
    } else {
      return path; // Return original if not found
    }
  }

  return typeof result === 'string' ? result : path;
}

/**
 * Convert hex to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert hex to rgba string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

// Default export
export default theme;
