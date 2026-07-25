/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        voltrix: { red: "#dc2626", dark: "#0f0f0f" },
      },
    },
  },
  plugins: [],
};
