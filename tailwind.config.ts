import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'Cambria', 'serif'],
      },
      colors: {
        // Sarvam-inspired palette: deep navy ink + blue→orange spectrum
        ink: '#1c1b2e',
        sarvam: {
          blue: '#5b6cff',
          sky: '#9db4ff',
          orange: '#ff8a3d',
          peach: '#ffd9b0',
        },
        category: {
          pothole: '#F97316',
          water: '#3B82F6',
          streetlight: '#EAB308',
          waste: '#22C55E',
          other: '#6B7280',
        },
      },
      keyframes: {
        'toast-in': {
          '0%': { transform: 'translateY(20px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // Map marker drop-in: falls from above and settles with a soft bounce.
        'pin-drop': {
          '0%': { transform: 'translateY(-90%) scale(0.6)', opacity: '0' },
          '60%': { transform: 'translateY(8%) scale(1.02)', opacity: '1' },
          '80%': { transform: 'translateY(-4%) scale(0.99)' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        // Badge award: pops in with a slight overshoot + wobble.
        'badge-pop': {
          '0%': { transform: 'scale(0.4) rotate(-12deg)', opacity: '0' },
          '55%': { transform: 'scale(1.12) rotate(4deg)', opacity: '1' },
          '75%': { transform: 'scale(0.96) rotate(-2deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.3s ease-out',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.7s ease-out both',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 6s ease-in-out infinite',
        'pin-drop': 'pin-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        'badge-pop': 'badge-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
