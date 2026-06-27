import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#FCE4F3',
          100: '#F9BBDF',
          200: '#F58ECC',
          500: '#E8197D',
          600: '#C21A7F',
          700: '#9E1568',
        },
        secondary: {
          500: '#3C71C2',
          600: '#2D5899',
        },
        neutral: {
          0: '#ffffff',
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
        },
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          50: '#FFFBEB',
          400: '#FBBF24',
          500: '#F59E0B',
        },
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
        },
        info: {
          50: '#EFF6FF',
          500: '#3B82F6',
          600: '#2563EB',
        },
        purple: {
          50: '#F5F3FF',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        teal: {
          50: '#F0FDFA',
          500: '#14B8A6',
          600: '#0D9488',
        },
      },
      borderRadius: {
        sm: '12px',
        md: '14px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(24,24,27,.05),0 2px 8px rgba(24,24,27,.04)',
        md: '0 4px 16px rgba(24,24,27,.07),0 1px 2px rgba(24,24,27,.05)',
        lg: '0 10px 28px rgba(24,24,27,.10),0 2px 6px rgba(24,24,27,.05)',
      },
    },
  },
  plugins: [],
} satisfies Config
