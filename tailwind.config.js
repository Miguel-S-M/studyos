/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0b0c', graphite: { 900: '#141416', 800: '#1b1b1e', 700: '#26262a', 600: '#35353a' },
        copper: { DEFAULT: '#c77b3e', soft: '#e3a56f' }, ember: '#ff7a1a', bone: '#ece8e3', mute: '#a39e97',
      },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
}
