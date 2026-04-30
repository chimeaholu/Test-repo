import type { Config } from "tailwindcss";

/**
 * Tailwind config — maps design tokens to utility classes.
 *
 * CSS custom properties in globals.css remain the runtime source of truth.
 * Tailwind classes like `bg-brand-500` or `text-neutral-700` reference those
 * vars so they cascade correctly and allow dark-mode overrides later.
 */

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          200: "var(--color-brand-200)",
          300: "var(--color-brand-300)",
          400: "var(--color-brand-400)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          700: "var(--color-brand-700)",
          800: "var(--color-brand-800)",
          900: "var(--color-brand-900)",
          DEFAULT: "var(--color-brand-600)",
        },
        accent: {
          50: "var(--color-accent-50)",
          100: "var(--color-accent-100)",
          200: "var(--color-accent-200)",
          300: "var(--color-accent-300)",
          400: "var(--color-accent-400)",
          500: "var(--color-accent-500)",
          600: "var(--color-accent-600)",
          700: "var(--color-accent-700)",
          800: "var(--color-accent-800)",
          900: "var(--color-accent-900)",
          DEFAULT: "var(--color-accent-600)",
        },
        neutral: {
          50: "var(--color-neutral-50)",
          100: "var(--color-neutral-100)",
          200: "var(--color-neutral-200)",
          300: "var(--color-neutral-300)",
          400: "var(--color-neutral-400)",
          500: "var(--color-neutral-500)",
          600: "var(--color-neutral-600)",
          700: "var(--color-neutral-700)",
          800: "var(--color-neutral-800)",
          900: "var(--color-neutral-900)",
        },
        success: {
          light: "var(--color-success-light)",
          DEFAULT: "var(--color-success)",
          dark: "var(--color-success-dark)",
        },
        warning: {
          light: "var(--color-warning-light)",
          DEFAULT: "var(--color-warning)",
          dark: "var(--color-warning-dark)",
        },
        error: {
          light: "var(--color-error-light)",
          DEFAULT: "var(--color-error)",
          dark: "var(--color-error-dark)",
        },
        info: {
          light: "var(--color-info-light)",
          DEFAULT: "var(--color-info)",
          dark: "var(--color-info-dark)",
        },
        surface: {
          canvas: "var(--bg-canvas)",
          card: "var(--color-surface-card)",
          elevated: "var(--color-surface-elevated)",
          sunken: "var(--color-surface-sunken)",
          overlay: "var(--color-surface-overlay)",
        },
        role: {
          farmer: "var(--color-role-farmer)",
          buyer: "var(--color-role-buyer)",
          cooperative: "var(--color-role-cooperative)",
          transporter: "var(--color-role-transporter)",
          investor: "var(--color-role-investor)",
          advisor: "var(--color-role-advisor)",
        },
      },

      fontFamily: {
        body: "var(--font-body)",
        display: "var(--font-display)",
        mono: "'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace",
      },
      fontSize: {
        xs: "var(--font-size-xs)",
        sm: "var(--font-size-sm)",
        base: "var(--font-size-base)",
        lg: "var(--font-size-lg)",
        xl: "var(--font-size-xl)",
        "2xl": "var(--font-size-2xl)",
        "3xl": "var(--font-size-3xl)",
        "4xl": "var(--font-size-4xl)",
        "5xl": "var(--font-size-5xl)",
        "6xl": "var(--font-size-6xl)",
      },
      lineHeight: {
        tight: "var(--line-height-tight)",
        normal: "var(--line-height-normal)",
        relaxed: "var(--line-height-relaxed)",
      },
      fontWeight: {
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
      },

      spacing: {
        0: "0",
        px: "1px",
        0.5: "0.125rem",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        20: "var(--space-20)",
      },

      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        "4xl": "var(--radius-4xl)",
        full: "9999px",
      },

      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
        colored: "var(--shadow-colored)",
      },

      transitionTimingFunction: {
        "out-expo": "var(--ease-out-expo)",
        "in-out-back": "var(--ease-in-out-back)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },

      maxWidth: {
        content: "var(--max-width)",
      },

      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },

      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },

      animation: {
        "skeleton-pulse": "skeleton-pulse 2s ease-in-out infinite",
        "fade-up": "fade-up var(--duration-slow) var(--ease-out-expo) both",
      },
      keyframes: {
        "skeleton-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },

  plugins: [],
};

export default config;
