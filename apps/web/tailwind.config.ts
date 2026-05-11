import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0a0c14",
          800: "#11141d",
          700: "#1a1f2c",
          600: "#252b3a",
          500: "#3a4256",
        },
        accent: {
          400: "#7c7af0",
          500: "#6b6ae8",
          600: "#5856d6",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
