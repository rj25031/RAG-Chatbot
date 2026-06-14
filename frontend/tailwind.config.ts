import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./node_modules/streamdown/dist/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        sand: "#f7f1e8",
        ochre: "#d97706",
        spruce: "#1f4d3d",
        mist: "#d8e4dc",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      boxShadow: {
        panel: "0 24px 60px rgba(17, 24, 39, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
