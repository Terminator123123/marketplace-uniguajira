/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1a6b2e', 50: '#f0fdf4', 700: '#15803d', 800: '#166534' },
        secondary: { DEFAULT: '#f97316', 300: '#fdba74', 500: '#f97316', 600: '#ea580c' },
      },
    },
  },
  plugins: [],
}
