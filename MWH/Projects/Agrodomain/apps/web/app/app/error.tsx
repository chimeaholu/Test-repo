"use client";

import { ErrorState } from "@/components/error-state";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      context="Workspace error"
      error={error}
      onPrimaryAction={reset}
      secondaryHref="/app"
      secondaryLabel="Back to workspace"
      title="This workspace view could not finish loading."
    />
  );
}
