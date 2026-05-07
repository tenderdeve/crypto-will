import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Instrument Serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter Tight", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          soft: "var(--accent-soft)",
          ink: "var(--accent-ink)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        // Design system colors
        bg: {
          DEFAULT: "var(--bg)",
          2: "var(--bg-2)",
        },
        paper: "var(--paper)",
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        line: {
          DEFAULT: "var(--line)",
          2: "var(--line-2)",
        },
        good: "var(--good)",
        warn: "var(--warn)",
        danger: "var(--danger)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        chips: "8px",
        inputs: "12px",
        cards: "16px",
        "cards-lg": "18px",
        hero: "20px",
        "hero-lg": "24px",
        pill: "999px",
      },
      boxShadow: {
        elevated: "0 30px 60px -30px rgba(34,29,23,0.18)",
        "elevated-lg": "0 40px 80px -20px rgba(34,29,23,0.4)",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
