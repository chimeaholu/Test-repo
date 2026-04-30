import type { ReactNode } from "react";
import type { Metadata } from "next";

import { AppProvider } from "@/components/app-provider";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Sign Up",
  description:
    "Create your Agrodomain account. Join farmers, buyers, cooperatives, transporters, investors, and advisers on the agricultural super-platform.",
  path: "/signup",
});

export default function SignupLayout({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
