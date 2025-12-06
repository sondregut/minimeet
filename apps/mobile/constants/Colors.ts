/**
 * MiniMeet Mobile App - Global Colors & Theme
 *
 * All colors should be imported from this file.
 * Never hardcode color values in components.
 */

// ============================================================================
// BASE COLORS (Tailwind-inspired palette)
// ============================================================================

export const palette = {
  // Primary - Emerald (brand color)
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',  // Primary
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Red (errors, destructive)
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Amber/Orange (warnings)
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // Warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Blue (info, links)
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Info
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Slate (neutrals/grays)
  slate: {
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
  },

  // Gray (alternative neutrals)
  gray: {
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
  },

  // Special colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ============================================================================
// SEMANTIC COLORS (use these in components)
// ============================================================================

export const colors = {
  // Brand
  primary: palette.emerald[500],
  primaryLight: palette.emerald[50],
  primaryDark: palette.emerald[700],

  // Status
  success: palette.emerald[500],
  successLight: palette.emerald[50],
  error: palette.red[500],
  errorLight: palette.red[50],
  warning: palette.amber[500],
  warningLight: palette.amber[50],
  info: palette.blue[500],
  infoLight: palette.blue[50],

  // Text
  textPrimary: palette.gray[900],
  textSecondary: palette.gray[600],
  textTertiary: palette.gray[500],
  textMuted: palette.gray[400],
  textInverse: palette.white,

  // Backgrounds
  background: palette.slate[50],
  backgroundCard: palette.white,
  backgroundInput: palette.gray[100],
  backgroundDisabled: palette.gray[300],

  // Borders
  border: palette.gray[200],
  borderLight: palette.gray[100],
  borderDark: palette.gray[300],

  // Medals (for rankings)
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Misc
  white: palette.white,
  black: palette.black,
  transparent: palette.transparent,
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font families (system fonts)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    mono: 'Menlo',
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },

  // Font weights (for StyleSheet)
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// ============================================================================
// THEME OBJECT (combines everything)
// ============================================================================

export const theme = {
  colors,
  palette,
  typography,
  spacing,
  borderRadius,
  shadows,
} as const;

// Default export for backward compatibility
export default {
  light: {
    text: colors.textPrimary,
    background: colors.background,
    tint: colors.primary,
    tabIconDefault: colors.textMuted,
    tabIconSelected: colors.primary,
  },
  dark: {
    text: colors.textInverse,
    background: palette.gray[900],
    tint: colors.primary,
    tabIconDefault: colors.textMuted,
    tabIconSelected: colors.primary,
  },
};
