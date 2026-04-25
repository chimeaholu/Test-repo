import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { AppProvider } from "@/components/app-provider";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Onboarding",
  description: "Finish your Agrodomain onboarding setup before entering the platform.",
  path: "/onboarding",
});

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="onboarding-shell">
        <header className="onboarding-topbar">
          <Link href="/" className="onboarding-logo" aria-label="Agrodomain home">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="var(--color-brand-600, #1f6d52)" />
              <path d="M16 6C10.5 6 8 12 8 16c0 5 3 10 8 10s8-5 8-10c0-4-2.5-10-8-10z" fill="#fff" opacity="0.9" />
              <path d="M16 10c-2 0-4 3-4 6s2 6 4 6 4-3 4-6-2-6-4-6z" fill="var(--color-brand-600, #1f6d52)" />
            </svg>
            <span className="onboarding-logo-text">Agrodomain</span>
          </Link>
          <div id="onboarding-topbar-right" />
        </header>
        <div className="onboarding-content">
          {children}
        </div>
      </div>
    </AppProvider>
  );
}
