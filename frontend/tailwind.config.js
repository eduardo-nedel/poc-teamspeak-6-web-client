/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ts: {
          bg: '#0F1318',
          card: '#161B22',
          border: '#2A323D',
          hover: '#1F2630',
          blue: '#1E6CEB',
          accent: '#3B82F6',
          active: '#10B981',
          muted: '#6B7280',
        },
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(16, 185, 129, 0)' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
      },
    },
  },
  plugins: [],
}
