import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Royal blue — primary brand
        brand: {
          50: "#eef2ff",
          100: "#dde6fd",
          200: "#bccdfb",
          300: "#8fa8f7",
          400: "#5f7ef1",
          500: "#3a58e8",
          600: "#263aa7",
          700: "#1e2f87",
          800: "#172265",
          900: "#0f1544",
          950: "#080b25",
        },
        // Teal — client portal
        portal: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
        primary: {
          50: "#eef2ff",
          100: "#dde6fd",
          200: "#bccdfb",
          300: "#8fa8f7",
          400: "#5f7ef1",
          500: "#3a58e8",
          600: "#263aa7",
          700: "#1e2f87",
          800: "#172265",
          900: "#0f1544",
          950: "#080b25",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "brand-hero":
          "linear-gradient(135deg, #263aa7 0%, #3a58e8 50%, #5f7ef1 100%)",
        "portal-hero":
          "linear-gradient(135deg, #0D9488 0%, #14B8A6 50%, #263aa7 100%)",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // Restrained, intentional scale (Linear/Stripe/Vercel feel).
        DEFAULT: "6px",
        md: "8px",
        lg: "8px",
        xl: "10px",
        "2xl": "12px",
      },
      boxShadow: {
        // Hairline + barely-there depth. Borders do the structural work, not shadows.
        soft: "0 1px 1px 0 rgb(15 23 42 / 0.03)",
        card: "0 1px 1px 0 rgb(15 23 42 / 0.03)",
        glow: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        fadeIn: "fadeIn 220ms ease-out",
        slideDown: "slideDown 200ms ease-out",
        "slide-in-right": "slide-in-right 280ms cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
