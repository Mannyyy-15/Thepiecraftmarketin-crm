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
        // ── Semantic theme tokens (WCAG 2.1 AA verified, see globals.css) ──
        // Backgrounds: bg-app / bg-panel / bg-elevated / bg-muted
        app: "var(--bg-app)",
        panel: "var(--bg-panel)",
        elevated: "var(--bg-elevated)",
        // Borders: border-line / border-strong
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        // Text: text-primary / text-secondary / text-muted
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        // Accent: accent-primary / accent-hover / accent-solid / accent-fg
        "accent-primary": "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-solid": "var(--accent-solid, var(--accent))",
        "accent-fg": "var(--accent-fg)",
        // Electric blue brand — vivid on dark, clean on light
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
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
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "brand-hero":
          "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)",
        "portal-hero":
          "linear-gradient(135deg, #0D9488 0%, #14B8A6 50%, #2563eb 100%)",
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
        soft: "0 1px 1px 0 rgb(15 23 42 / 0.03)",
        card: "0 1px 1px 0 rgb(15 23 42 / 0.03)",
        glow: "0 0 0 1px rgba(59,130,246,0.2), 0 4px 20px rgba(59,130,246,0.12)",
        "glow-sm": "0 0 0 1px rgba(59,130,246,0.15), 0 2px 10px rgba(59,130,246,0.10)",
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
