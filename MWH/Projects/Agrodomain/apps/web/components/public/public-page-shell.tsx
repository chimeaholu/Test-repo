import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicNav } from "@/components/public/public-nav";

export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="pub-page">
      <PublicNav />
      {children}
      <PublicFooter />
    </div>
  );
}
