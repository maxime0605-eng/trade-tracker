/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ct: '#378ADD',
        nasdaq: '#7F77DD',
        europe: '#1D9E75',
        em: '#D85A30',
        crypto: '#E9A827',
      },
    },
  },
  plugins: [],
};
