/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F1117',
        surface: '#1A1D27',
        'surface-2': '#212533',
        border: '#2A2D3A',
        'border-strong': '#3A3F52',
        primary: {
          DEFAULT: '#6366F1',
          soft: 'rgba(99, 102, 241, 0.14)',
          hover: '#4F46E5',
        },
        success: { DEFAULT: '#22C55E', soft: 'rgba(34, 197, 94, 0.14)' },
        warning: { DEFAULT: '#F59E0B', soft: 'rgba(245, 158, 11, 0.14)' },
        danger: { DEFAULT: '#EF4444', soft: 'rgba(239, 68, 68, 0.14)' },
        ink: '#F1F5F9',
        muted: '#64748B',
        'muted-strong': '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '12px', lg: '8px' },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4)',
        lift: '0 8px 24px rgba(0,0,0,0.45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
