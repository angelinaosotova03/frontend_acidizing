import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          900: '#0F172A', 700: '#334155', 500: '#64748B',
          400: '#94A3B8', 300: '#CBD5E1', 200: '#E2E8F0',
          100: '#F1F5F9', 50:  '#F8FAFC',
        },
        brand: {
          50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE',
          500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
          800: '#1E40AF', 900: '#1E3A8A',
        },
      },
      boxShadow: {
        card:   '0 1px 2px 0 rgba(15,23,42,.04), 0 1px 3px 0 rgba(15,23,42,.06)',
        cardlg: '0 4px 10px -2px rgba(15,23,42,.06), 0 2px 6px -2px rgba(15,23,42,.04)',
        pop:    '0 12px 32px -8px rgba(15,23,42,.18), 0 4px 8px -4px rgba(15,23,42,.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
