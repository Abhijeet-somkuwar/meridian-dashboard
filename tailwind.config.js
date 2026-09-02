/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Every neutral reads a CSS variable (defined in index.css), so the
        // light theme is one class on <html> rather than a second stylesheet.
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        'border-strong': 'rgb(var(--c-border-strong) / <alpha-value>)',
        primary: {
          DEFAULT: '#6366F1',
          soft: 'rgba(99, 102, 241, 0.14)',
          hover: '#4F46E5',
        },
        success: { DEFAULT: '#22C55E', soft: 'rgba(34, 197, 94, 0.14)' },
        warning: { DEFAULT: '#F59E0B', soft: 'rgba(245, 158, 11, 0.14)' },
        danger: { DEFAULT: '#EF4444', soft: 'rgba(239, 68, 68, 0.14)' },
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        'muted-strong': 'rgb(var(--c-muted-strong) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '12px', lg: '8px' },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
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
