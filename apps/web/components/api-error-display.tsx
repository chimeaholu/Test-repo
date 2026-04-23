"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ui-primitives";
import type { ApiError } from "@/lib/hooks/use-api-query";

interface ApiErrorDisplayProps {
  error: ApiError;
  onRetry?: () => void;
}

export function ApiErrorDisplay({ error, onRetry }: ApiErrorDisplayProps) {
  const router = useRouter();

  useEffect(() => {
    if (error.status === 401) {
      router.replace("/signin");
    }
  }, [error.status, router]);

  if (error.status === 401) {
    return (
      <ErrorState
        title="Session expired"
        body="Your session has expired. Redirecting to sign in..."
      />
    );
  }

  if (error.status === 403) {
    return (
      <ErrorState
        title="Access denied"
        body="You don't have permission to access this resource."
      />
    );
  }

  if (error.status === 404) {
    return (
      <ErrorState
        title="Not found"
        body="The requested resource was not found."
      />
    );
  }

  if (error.status === 422) {
    const validationDetails =
      error.validationErrors && error.validationErrors.length > 0
        ? error.validationErrors.join(". ")
        : error.message;

    return (
      <ErrorState
        title="Validation error"
        body={validationDetails}
      />
    );
  }

  if (error.isNetworkError) {
    return (
      <ErrorState
        title="Connection problem"
        body="You appear to be offline. Check your connection and try again."
        action={
          onRetry ? (
            <button className="button-primary" onClick={onRetry} type="button">
              Retry
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <ErrorState
      title="Server error"
      body="Something went wrong on our end. Please try again."
      action={
        onRetry ? (
          <button className="button-primary" onClick={onRetry} type="button">
            Try again
          </button>
        ) : undefined
      }
    />
  );
}
