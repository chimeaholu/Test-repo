"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui-primitives";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      body="An unexpected error occurred in the application. Please try again or navigate to a different page."
      action={
        <button className="button-primary" onClick={reset} type="button">
          Try again
        </button>
      }
    />
  );
}
