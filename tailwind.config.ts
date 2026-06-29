import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple Premium Consumer tokens
        canvas: {
          black: "#000000",
          gray: "#f5f5f7",
          white: "#ffffff",
        },
        ink: {
          DEFAULT: "#1d1d1f",
          muted: "#6e6e73",
        },
        accent: {
          DEFAULT: "#ec4899",
          link: "#db2777",
          dark: "#f472b6",
        },
        border: {
          soft: "#d2d2d7",
          mid: "#86868b",
        },
        graphite: {
          1: "#272729",
          2: "#262629",
          3: "#28282b",
          4: "#2a2a2c",
        },
      },
      fontFamily: {
        display: [
          "SF Pro Display",
          "SF Pro Icons",
          "Inter Tight",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        text: [
          "SF Pro Text",
          "SF Pro Icons",
          "Inter",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xs: "5px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "18px",
        "2xl": "28px",
        "3xl": "36px",
        capsule: "980px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
        lift: "0 2px 6px rgba(0,0,0,0.08), 0 18px 40px rgba(0,0,0,0.12)",
      },
      letterSpacing: {
        tight2: "-0.024em",
      },
    },
  },
  plugins: [],
};

export default config;
