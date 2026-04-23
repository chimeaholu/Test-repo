"use client";

import { useCallback, useRef, useState } from "react";

import type { ApiError } from "@/lib/hooks/use-api-query";

interface UseApiMutationOptions<TData, TVariables> {
  /** URL to send the mutation to. */
  url: string;
  /** HTTP method. Defaults to "POST". */
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  /** Additional fetch init options merged into every request. */
  init?: RequestInit;
  /** Called when the mutation succeeds. */
  onSuccess?: (data: TData) => void;
  /** Called when the mutation fails. Receives the structured error. */
  onError?: (error: ApiError) => void;
  /**
   * Optimistic update callback. Called with the variables before the request
   * is sent. Return a rollback function that will be invoked if the request
   * fails.
   */
  onMutate?: (variables: TVariables) => (() => void) | void;
}

interface UseApiMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<void>;
  data: TData | null;
  error: ApiError | null;
  isLoading: boolean;
}

function parseApiError(status: number, body: unknown): ApiError {
  const parsed = body as Record<string, unknown> | null;
  const message =
    typeof parsed?.message === "string"
      ? parsed.message
      : typeof parsed?.error === "string"
        ? parsed.error
        : `Request failed with status ${status}`;

  const validationErrors: string[] = [];
  if (status === 422 && parsed?.errors) {
    if (Array.isArray(parsed.errors)) {
      for (const err of parsed.errors) {
        if (typeof err === "string") {
          validationErrors.push(err);
        } else if (typeof err === "object" && err !== null && typeof (err as Record<string, unknown>).message === "string") {
          validationErrors.push((err as Record<string, string>).message);
        }
      }
    }
  }

  return {
    status,
    message,
    isNetworkError: false,
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
  };
}

function createNetworkError(err: unknown): ApiError {
  return {
    status: 0,
    message: err instanceof Error ? err.message : "Network request failed",
    isNetworkError: true,
  };
}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  options: UseApiMutationOptions<TData, TVariables>,
): UseApiMutationResult<TData, TVariables> {
  const { url, method = "POST", init, onSuccess, onError, onMutate } = options;
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  // Track mounted state for safe state updates after async work
  // Using a ref updated in a layout-compatible way
  const isMounted = useCallback(() => mountedRef.current, []);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true);
      setError(null);

      let rollback: (() => void) | void = undefined;
      if (onMutate) {
        rollback = onMutate(variables);
      }

      try {
        const body = method === "DELETE" && variables === undefined ? undefined : JSON.stringify(variables);

        const response = await fetch(url, {
          ...init,
          method,
          headers: {
            "Content-Type": "application/json",
            ...init?.headers,
          },
          body,
        });

        if (!response.ok) {
          let responseBody: unknown = null;
          try {
            responseBody = await response.json();
          } catch {
            // Response body may not be JSON
          }
          const apiError = parseApiError(response.status, responseBody);

          if (rollback) {
            rollback();
          }

          if (isMounted()) {
            setError(apiError);
            setIsLoading(false);
            onError?.(apiError);
          }
          return;
        }

        let responseData: TData;
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          responseData = (await response.json()) as TData;
        } else {
          responseData = null as TData;
        }

        if (isMounted()) {
          setData(responseData);
          setError(null);
          setIsLoading(false);
          onSuccess?.(responseData);
        }
      } catch (err: unknown) {
        if (rollback) {
          rollback();
        }

        const networkError = createNetworkError(err);

        if (isMounted()) {
          setError(networkError);
          setIsLoading(false);
          onError?.(networkError);
        }
      }
    },
    [url, method, init, onSuccess, onError, onMutate, isMounted],
  );

  return { mutate, data, error, isLoading };
}
