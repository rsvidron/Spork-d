import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff5f0",
          100: "#ffe8db",
          200: "#ffc9a8",
          300: "#ffa075",
          400: "#ff7043",
          500: "#ff5722",
          600: "#e64a19",
          700: "#bf360c",
          800: "#8c2b0d",
          900: "#62200c",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8f7f5",
          card: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.08)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.12)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
export default config;
