import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProvider } from "@/components/app-provider";
import { ProtectedShell } from "@/components/shell";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Agrodomain App",
  description:
    "Protected Agrodomain workspace for farmers, buyers, cooperatives, investors, and staff.",
  path: "/app",
});

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <ProtectedShell showAgroGuide>{children}</ProtectedShell>
    </AppProvider>
  );
}
