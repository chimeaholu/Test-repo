export const designTokens = {
  color: {
    /* --- Legacy flat colors (preserved for backward compatibility) --- */
    ink: "#14261d",
    inkSoft: "#345246",
    surface: "#f5f1e8",
    surfaceElevated: "#fffdf8",
    surfaceStrong: "#e6efe1",
    line: "#c7d4c2",
    lineStrong: "#7f9a88",
    brand: "#2d6a4f",
    brandStrong: "#1f513b",
    accent: "#c2873b",
    accentSoft: "#f0dbc2",
    danger: "#9f3d2d",
    warning: "#b97918",
    success: "#2a6f53",
    info: "#1d5973",

    /* --- Primary palette: agricultural green --- */
    earth: {
      50: "#f0f7f2",
      100: "#d4eadb",
      200: "#a8d5b7",
      300: "#7cbf93",
      400: "#50aa6f",
      500: "#4a8c5e",
      600: "#3d7a4f",
      700: "#2d5a3d",
      800: "#234a31",
      900: "#1a2f1e",
    },

    /* --- Secondary palette: harvest gold/orange --- */
    harvest: {
      50: "#fef9f0",
      100: "#fcefd4",
      200: "#f8dda8",
      300: "#f3cb7c",
      400: "#e5a94e",
      500: "#d4922e",
      600: "#c17b2a",
      700: "#a16523",
      800: "#81501c",
      900: "#613c15",
    },

    /* --- Neutral palette: warm earth tones --- */
    soil: {
      50: "#fdfbf7",
      100: "#f8f3ea",
      200: "#efe6d5",
      300: "#e0d3be",
      400: "#c9b89a",
      500: "#a89878",
      600: "#8a7c62",
      700: "#6e634f",
      800: "#544b3c",
      900: "#3a342b",
    },

    /* --- Sky blue: weather/info --- */
    sky: {
      50: "#f0f7fc",
      100: "#d4eaf8",
      500: "#3b82c4",
      700: "#2a5c8a",
      900: "#1a3a5c",
    },

    /* --- Semantic --- */
    semantic: {
      successLight: "#d4f5dd",
      success: "#3d8c5a",
      successDark: "#2a6340",
      warningLight: "#fef3cd",
      warning: "#d4922e",
      warningDark: "#a16523",
      dangerLight: "#fde2de",
      danger: "#c44b3b",
      dangerDark: "#993327",
      infoLight: "#d4eaf8",
      info: "#3b82c4",
      infoDark: "#2a5c8a",
    },

    /* --- Surfaces --- */
    surfaces: {
      card: "var(--color-soil-50)",
      elevated: "#ffffff",
      sunken: "var(--color-soil-100)",
      overlay: "rgba(26, 47, 30, 0.5)",
    },

    /* --- Role-specific accents --- */
    role: {
      farmer: "#3d8c5a",
      buyer: "#3b82c4",
      cooperative: "#7c5ab8",
      transporter: "#c17b2a",
      investor: "#d4922e",
      advisor: "#2a8a8a",
    },
  },

  radius: {
    /* --- Legacy (preserved) --- */
    xs: "0.5rem",
    sm: "0.875rem",
    md: "1.25rem",
    lg: "1.75rem",
    pill: "999px",

    /* --- Expanded --- */
    smPx: "4px",
    mdPx: "8px",
    lgPx: "12px",
    xlPx: "16px",
    "2xlPx": "24px",
    full: "9999px",
  },

  shadow: {
    /* --- Legacy (preserved) --- */
    soft: "0 18px 60px rgba(20, 38, 29, 0.08)",
    raised: "0 28px 90px rgba(20, 38, 29, 0.14)",

    /* --- Expanded (agricultural tint) --- */
    sm: "0 1px 2px rgba(26, 47, 30, 0.05)",
    md: "0 4px 6px -1px rgba(26, 47, 30, 0.07), 0 2px 4px -2px rgba(26, 47, 30, 0.05)",
    lg: "0 10px 15px -3px rgba(26, 47, 30, 0.08), 0 4px 6px -4px rgba(26, 47, 30, 0.04)",
    xl: "0 20px 25px -5px rgba(26, 47, 30, 0.1), 0 8px 10px -6px rgba(26, 47, 30, 0.05)",
  },

  spacing: {
    0: "0",
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
    16: "4rem",
    20: "5rem",
  },

  type: {
    /* --- Legacy (preserved) --- */
    body: "var(--font-body)",
    display: "var(--font-display)",
    bodySize: "1rem",
    bodySizeSm: "0.9375rem",
    titleSize: "clamp(2.3rem, 5vw, 4.5rem)",
    sectionSize: "clamp(1.5rem, 2.4vw, 2.25rem)",

    /* --- Expanded font families --- */
    sans: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    heading: '"DM Sans", "Inter", "Segoe UI", system-ui, sans-serif',

    /* --- Font sizes --- */
    sizeXs: "0.75rem",
    sizeSm: "0.875rem",
    sizeBase: "1rem",
    sizeLg: "1.125rem",
    sizeXl: "1.25rem",
    size2xl: "1.5rem",
    size3xl: "1.875rem",
    size4xl: "2.25rem",
    size5xl: "3rem",

    /* --- Font weights --- */
    weightNormal: "400",
    weightMedium: "500",
    weightSemibold: "600",
    weightBold: "700",

    /* --- Line heights --- */
    leadingTight: "1.2",
    leadingSnug: "1.375",
    leadingNormal: "1.5",
    leadingRelaxed: "1.75",
  },

  animation: {
    easeOutExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
    durationFast: "150ms",
    durationNormal: "300ms",
    durationSlow: "500ms",
  },
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

/** Palette shade stops available on earth, harvest, and soil palettes */
export type PaletteShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

/** Semantic color intent */
export type SemanticIntent = "success" | "warning" | "danger" | "info";

/** Shadow elevation levels */
export type ShadowLevel = "sm" | "md" | "lg" | "xl" | "soft" | "raised";
