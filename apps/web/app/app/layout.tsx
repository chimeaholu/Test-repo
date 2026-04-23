import type { ReactNode } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { ProtectedShell } from "@/components/shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedShell>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ProtectedShell>
  );
}
