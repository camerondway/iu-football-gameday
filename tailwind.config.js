/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        hoosier: {
          red: '#990000',
          slate: '#3d3d3d',
          cream: '#f4f2f2',
        },
      },
    },
  },
  plugins: [],
}

