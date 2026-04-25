/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#1a1a1a",
        cream: "#faf8f5",
        sand: "#ebe5dc",
        accent: "#8b6f47",
      },
    },
  },
  plugins: [],
};

