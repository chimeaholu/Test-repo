import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description:
    "Contact Agrodomain support, partnerships, and onboarding teams across Ghana, Nigeria, and Jamaica.",
  path: "/contact",
  keywords: [
    "contact Agrodomain",
    "agritech support",
    "farmer platform contact",
    "Agrodomain customer support",
  ],
});

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
