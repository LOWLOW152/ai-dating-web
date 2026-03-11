/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#fff8f5',
          100: '#ffede6',
          200: '#ffd9cc',
          300: '#ffbaa8',
          400: '#ff8f75',
          500: '#ff6b4a',
          600: '#ed4c2e',
          700: '#c73a20',
          800: '#a4321e',
          900: '#872e1e',
        },
        cream: '#fef9f3',
        peach: '#ffe4d6',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}