/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        beige: {
          50: '#faf8f5',
          100: '#f5f1e8',
          200: '#ebe3d1',
          300: '#dfd4b9',
          400: '#d4c5a1',
          500: '#c9b689',
          600: '#b8a276',
          700: '#a08762',
          800: '#7d6b4f',
          900: '#5a4d38',
        },
        primary: {
          50: '#faf8f5',
          100: '#f5f1e8',
          200: '#ebe3d1',
          300: '#dfd4b9',
          400: '#d4c5a1',
          500: '#c9b689',
          600: '#b8a276',
          700: '#a08762',
          800: '#7d6b4f',
          900: '#5a4d38',
        },
      },
    },
  },
  plugins: [],
}
