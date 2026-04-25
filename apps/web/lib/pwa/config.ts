export const PWA_APP_NAME = "Agrodomain";
export const PWA_APP_SHORT_NAME = "Agrodomain";
export const PWA_DESCRIPTION =
  "Agrodomain connects farmers, buyers, transporters, investors, and advisors across trade, finance, insurance, and climate workflows.";

export const PWA_THEME_COLOR = "#1f6d52";
export const PWA_BACKGROUND_COLOR = "#f4efdf";
export const PWA_START_URL = "/signin?source=pwa";
export const PWA_OFFLINE_URL = "/offline";
export const PWA_SW_PATH = "/sw.js";

export const PWA_ICON_ENTRIES = [
  {
    src: "/apple-touch-icon.png",
    sizes: "180x180",
    type: "image/png",
  },
  {
    src: "/icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "maskable",
  },
  {
    src: "/icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
] as const;
