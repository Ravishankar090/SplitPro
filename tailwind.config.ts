import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F0EBE3",
        surface: "#FFFFFF",
        primary: "#1E3A1E",
        accent: "#D4622A",
        muted: "#8A7B6C",
        border: "#E0D8CE",
        success: "#2D7D3A",
        tag: "#EDE8E0",
        amber: "#B8740A",
        "amber-bg": "#FFF6E0",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Segoe UI", "sans-serif"],
        mono: ["SF Mono", "Fira Mono", "monospace"],
      },
      maxWidth: {
        app: "430px",
      },
    },
  },
  plugins: [],
};

export default config;
