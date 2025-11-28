import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '#1E3A5F',
          light: '#2C5282',
          dark: '#152A45',
          muted: '#E8EDF4',
        },
        // Accent colors
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
        // Text colors
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
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
        },
        // Athletics-specific
        live: '#EF4444',
        gold: '#FFD700',
        silver: '#C0C0C0',
        bronze: '#CD7F32',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.4' }],
        base: ['15px', { lineHeight: '1.5' }],
        lg: ['17px', { lineHeight: '1.5' }],
        xl: ['19px', { lineHeight: '1.4' }],
        '2xl': ['23px', { lineHeight: '1.3' }],
        '3xl': ['29px', { lineHeight: '1.2' }],
        '4xl': ['35px', { lineHeight: '1.2' }],
        '5xl': ['47px', { lineHeight: '1.1' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(30, 58, 95, 0.04)',
        sm: '0 2px 4px rgba(30, 58, 95, 0.06)',
        DEFAULT: '0 4px 8px rgba(30, 58, 95, 0.08)',
        md: '0 6px 16px rgba(30, 58, 95, 0.10)',
        lg: '0 12px 24px rgba(30, 58, 95, 0.12)',
        xl: '0 20px 40px rgba(30, 58, 95, 0.14)',
      },
      animation: {
        'pulse-live': 'pulse-live 2s infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
