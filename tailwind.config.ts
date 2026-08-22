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
        // Irani Koyla Brand Colors (matching https://irani-koyla-shawarma-franchise.vercel.app/)
        koyla: {
          black: "#161618",
          dark: "#161618",
          card: "#1f1f1f",
          "card-hover": "#303030",
          ember: "#303030",
          "ember-hover": "#38383f",
          gold: "#f97316",
          flame: "#ea580c",
          cream: "#b8b8c5",
        },
        // Warm Ember Gold brand scale
        brand: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        // Portal accents
        portal: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        primary: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "brand-hero":
          "linear-gradient(135deg, #b45309 0%, #ea580c 50%, #ffb703 100%)",
        "portal-hero":
          "linear-gradient(135deg, #150d0a 0%, #2d160e 50%, #ea580c 100%)",
        "koyla-ember":
          "radial-gradient(90% 55% at 50% -5%, rgba(255, 106, 0, 0.15), transparent 65%), linear-gradient(#080402, #0d0705, #080402)",
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
