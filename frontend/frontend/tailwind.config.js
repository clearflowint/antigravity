/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./frontend/index.html",
    "./frontend/src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'clearflow-slate': {
          DEFAULT: '#0F172A',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        'clearflow-blue': {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        'clearflow-surplus': {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
          dark: '#15803D'
        },
        'clearflow-deficit': {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#B91C1C'
        },
        'clearflow-pending': {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#D97706'
        }
      }
    },
  },
  plugins: [],
}
