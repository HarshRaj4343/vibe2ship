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
      },
      animation: {
        'toast-in': 'toast-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
