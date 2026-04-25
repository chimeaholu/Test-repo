import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, DM_Sans } from "next/font/google";

import { PwaProvider } from "@/components/pwa/pwa-provider";
import {
  PWA_APP_NAME,
  PWA_BACKGROUND_COLOR,
  PWA_DESCRIPTION,
  PWA_ICON_ENTRIES,
  PWA_THEME_COLOR,
} from "@/lib/pwa/config";
import { getSiteUrl } from "@/lib/seo";
import "./globals.css";
import "./design-system.css";
import "./public-pages.css";
import "./r3-pages.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: PWA_APP_NAME,
  title: {
    default: `${PWA_APP_NAME} | Super-Platform for Agriculture`,
    template: `%s | ${PWA_APP_NAME}`,
  },
  description: PWA_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      ...PWA_ICON_ENTRIES.map((entry) => ({
        url: entry.src,
        sizes: entry.sizes,
        type: entry.type,
      })),
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PWA_APP_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PWA_THEME_COLOR,
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body style={{ backgroundColor: PWA_BACKGROUND_COLOR }}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <PwaProvider />
        {children}
      </body>
    </html>
  );
}
