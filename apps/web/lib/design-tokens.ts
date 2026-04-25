/**
 * Agrodomain Design Tokens — TS mirror of CSS custom properties.
 *
 * CSS custom properties in globals.css are the canonical runtime tokens.
 * This file mirrors them for JS/TS consumers (Tailwind config, server
 * components, dynamic styles) and adds semantic aliases.
 *
 * Palette expanded per PRD RB-014. Values match globals.css exactly.
 */

export const colors = {
  brand: {
    50: "#eef5f1",
    100: "#d3e8db",
    200: "#a7d1b8",
    300: "#7ab994",
    400: "#4ea271",
    500: "#2d8a53",
    600: "#1f6d52",
    700: "#1a5842",
    800: "#144332",
    900: "#0e2e22",
  },
  accent: {
    50: "#fdf4e8",
    100: "#fae3c4",
    200: "#f4c88b",
    300: "#eead53",
    400: "#e5a94e",
    500: "#d4922b",
    600: "#bc7121",
    700: "#9a5c1b",
    800: "#784715",
    900: "#563210",
  },
  neutral: {
    50: "#fdfbf7",
    100: "#f8f3ea",
    200: "#ede5d4",
    300: "#ddd2ba",
    400: "#c4b799",
    500: "#9a8d78",
    600: "#746a56",
    700: "#4e4538",
    800: "#2d261d",
    900: "#1a1610",
  },
  success: { light: "#eef7f1", DEFAULT: "#3d8c5a", dark: "#2a6f43" },
  warning: { light: "#fef7eb", DEFAULT: "#d4922b", dark: "#9a6a14" },
  error: { light: "#fdf0ee", DEFAULT: "#c44b3b", dark: "#9a3329" },
  info: { light: "#edf5fb", DEFAULT: "#3b82c4", dark: "#2960a0" },
  surface: {
    canvas: "#f4efdf",
    card: "#ffffff",
    elevated: "#fdfbf7",
    sunken: "#f4efdf",
    overlay: "rgba(26,47,30,0.60)",
  },
  role: {
    farmer: "#2d8a53",
    buyer: "#3b82c4",
    cooperative: "#7c3aed",
    transporter: "#e5731a",
    investor: "#d4922b",
    advisor: "#0d9488",
  },
} as const;

export const typography = {
  fontFamily: {
    body: "var(--font-body)",
    display: "var(--font-display)",
    mono: "'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.2",
    normal: "1.5",
    relaxed: "1.75",
  },
} as const;

export const spacing = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.5rem",
  6: "2rem",
  7: "3rem",
  8: "4rem",
  9: "5rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
} as const;

export const radius = {
  sm: "10px",
  md: "13px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "30px",
  "4xl": "38px",
  full: "9999px",
} as const;

export const shadow = {
  xs: "0 1px 2px rgba(26,47,30,0.05)",
  sm: "0 1px 3px rgba(26,47,30,0.08), 0 1px 2px rgba(26,47,30,0.04)",
  md: "0 4px 6px rgba(26,47,30,0.07), 0 2px 4px rgba(26,47,30,0.04)",
  lg: "0 10px 15px rgba(26,47,30,0.08), 0 4px 6px rgba(26,47,30,0.04)",
  xl: "0 20px 25px rgba(26,47,30,0.10), 0 8px 10px rgba(26,47,30,0.04)",
  "2xl": "0 25px 50px rgba(26,47,30,0.18)",
  inner: "inset 0 2px 4px rgba(26,47,30,0.06)",
  colored: "0 10px 30px rgba(31,109,82,0.15)",
} as const;

export const animation = {
  easing: {
    outExpo: "cubic-bezier(0.16,1,0.3,1)",
    inOutBack: "cubic-bezier(0.68,-0.6,0.32,1.6)",
    default: "cubic-bezier(0.2,0.8,0.2,1)",
  },
  duration: {
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
  },
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
} as const;

export type RoleKey =
  | "farmer"
  | "buyer"
  | "cooperative"
  | "advisor"
  | "finance"
  | "admin"
  | "transporter"
  | "investor";
