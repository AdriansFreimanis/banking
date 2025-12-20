/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Add ALL missing custom classes
      colors: {
        'gray-25': '#FCFCFD',
        'blue-25': '#EFF6FF',
        'blue-600': '#2563EB',
        'sky-1': '#F3F8FF',
        'black-1': '#151515',
        'black-2': '#1C1C1C',
        'bankGradient': '#1E3A8A',
      },
      boxShadow: {
        'chart': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'creditCard': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'profile': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'form': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      backgroundImage: {
        'gradient-mesh': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'bank-gradient': 'linear-gradient(90deg, #1e3a8a 0%, #1e40af 100%)',
      },
      fontFamily: {
        'ibm-plex-serif': ['IBM Plex Serif', 'serif'],
      },
    },
  },
  plugins: [],
}