import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProvider } from "@/components/app-provider";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Sign In",
  description: "Sign in to your Agrodomain account to continue to your role-based workspace.",
  path: "/signin",
});

export default function SigninLayout({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
