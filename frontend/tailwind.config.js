/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          bg: '#0a0d12',
          surface: '#0f141c',
          panel: '#151b26',
          border: '#1e293b',
          accent: '#00e5ff',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          muted: '#64748b',
          text: '#f8fafc',
          subtext: '#94a3b8',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
