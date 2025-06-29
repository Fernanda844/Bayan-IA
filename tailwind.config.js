/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aurora-start': '#FFECD2', // Light peach
        'aurora-end': '#FCB69F',   // Soft coral
        'brand-accent': '#FF8C69',  // A stronger coral/tomato color for buttons
        'brand-text': '#4A4A4A',    // Dark gray for readability
        'card-bg': 'rgba(255, 255, 255, 0.7)',
      },
      fontFamily: {
        'sans': ['Poppins', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'bounce-sm': 'bounce-sm 1.4s infinite ease-in-out both'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
         'bounce-sm': {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1.0)' }
        }
      }
    },
  },
  plugins: [],
}