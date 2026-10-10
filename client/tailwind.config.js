/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080D1C",
        panel: "#0F1630",
        raise: "#161F3F",
        line: "#232D55",
        mist: "#ECEBF5",
        dim: "#9AA3C7",
        volt: "#3D7BFF",
        iris: "#8B5CF6",
        good: "#34D399",
        warn: "#FBBF24",
        bad: "#F87171",
        none: "#64748B",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Source Sans 3"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
