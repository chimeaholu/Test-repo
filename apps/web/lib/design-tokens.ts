export const designTokens = {
  color: {
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
  },
  radius: {
    xs: "0.5rem",
    sm: "0.875rem",
    md: "1.25rem",
    lg: "1.75rem",
    pill: "999px",
  },
  shadow: {
    soft: "0 18px 60px rgba(20, 38, 29, 0.08)",
    raised: "0 28px 90px rgba(20, 38, 29, 0.14)",
  },
  spacing: {
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
  },
  type: {
    body: "var(--font-body)",
    display: "var(--font-display)",
    bodySize: "1rem",
    bodySizeSm: "0.9375rem",
    titleSize: "clamp(2.3rem, 5vw, 4.5rem)",
    sectionSize: "clamp(1.5rem, 2.4vw, 2.25rem)",
  },
} as const;

export type RoleKey =
  | "farmer"
  | "buyer"
  | "cooperative"
  | "advisor"
  | "finance"
  | "admin";
