/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ramen: {
          dark: '#0f0f1a',
          card: '#1a1a2e',
          border: '#2d2d44',
          accent: '#e91e63',
          accentHover: '#c2185b',
          text: '#e0e0e0',
          muted: '#888888',
          success: '#4caf50',
          error: '#f44336'
        }
      }
    },
  },
  plugins: [],
}