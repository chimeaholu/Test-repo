import type { MetadataRoute } from "next";

import {
  PWA_APP_NAME,
  PWA_APP_SHORT_NAME,
  PWA_BACKGROUND_COLOR,
  PWA_DESCRIPTION,
  PWA_ICON_ENTRIES,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "@/lib/pwa/config";

export default function manifest(): MetadataRoute.Manifest {
  const icons: MetadataRoute.Manifest["icons"] = PWA_ICON_ENTRIES.map((icon) =>
    "purpose" in icon
      ? {
          purpose: icon.purpose,
          sizes: icon.sizes,
          src: icon.src,
          type: icon.type,
        }
      : {
          sizes: icon.sizes,
          src: icon.src,
          type: icon.type,
        },
  );

  return {
    name: PWA_APP_NAME,
    short_name: PWA_APP_SHORT_NAME,
    description: PWA_DESCRIPTION,
    start_url: PWA_START_URL,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    lang: "en",
    categories: ["business", "finance", "productivity", "utilities"],
    icons,
  };
}
