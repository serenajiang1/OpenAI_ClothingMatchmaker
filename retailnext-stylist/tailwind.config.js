/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        soft: "8px",
        softer: "10px",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#2a201a",
        cream: "#f7f1ea",
        sand: "#ebe2d8",
        accent: "#c9a896",
        panel: "#ffffff",
      },
    },
  },
  plugins: [],
};
