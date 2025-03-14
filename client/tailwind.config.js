/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
      fontFamily: {
        sans: [
          'Inter var',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
  safelist: [
    'bg-indigo-50',
    'bg-indigo-100',
    'bg-indigo-500',
    'bg-indigo-600',
    'text-indigo-600',
    'text-indigo-900',
    'bg-emerald-50',
    'bg-emerald-100',
    'bg-emerald-500',
    'bg-emerald-600',
    'text-emerald-600',
    'text-emerald-900',
    'bg-violet-50',
    'bg-violet-100',
    'bg-violet-500',
    'bg-violet-600',
    'text-violet-600',
    'bg-blue-50',
    'bg-blue-100',
    'bg-blue-500',
    'bg-blue-600',
    'text-blue-600',
    'hover:bg-indigo-50',
    'hover:bg-indigo-100',
    'hover:bg-indigo-700',
    'hover:bg-emerald-100',
    'focus:ring-indigo-500',
    'focus:ring-emerald-500'
  ]
} 