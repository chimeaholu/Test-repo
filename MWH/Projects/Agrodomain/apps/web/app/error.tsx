"use client";

import { ErrorState } from "@/components/error-state";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell" id="main-content">
      <ErrorState
        context="Application error"
        error={error}
        onPrimaryAction={reset}
        secondaryHref="/"
        secondaryLabel="Back to home"
        title="We could not finish loading Agrodomain."
      />
    </main>
  );
}
