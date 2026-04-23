"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiError {
  status: number;
  message: string;
  isNetworkError: boolean;
  validationErrors?: string[];
}

interface UseApiQueryOptions<T> {
  /** URL to fetch. Pass `null` to skip fetching (conditional queries). */
  url: string | null;
  /** Additional fetch init options. */
  init?: RequestInit;
  /** Polling interval in milliseconds. Set to 0 or omit to disable polling. */
  pollInterval?: number;
  /** Transform the raw JSON response before storing. Defaults to identity. */
  select?: (raw: unknown) => T;
}

interface UseApiQueryResult<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  refetch: () => void;
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

export function useApiQuery<T = unknown>(options: UseApiQueryOptions<T>): UseApiQueryResult<T> {
  const { url, init, pollInterval, select } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(url !== null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (url === null) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (controller.signal.aborted || !mountedRef.current) {
        return;
      }

      if (!response.ok) {
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          // Response body may not be JSON
        }
        const apiError = parseApiError(response.status, body);
        setError(apiError);
        setData(null);
        setIsLoading(false);
        return;
      }

      const json: unknown = await response.json();
      const transformed = select ? select(json) : (json as T);

      if (!controller.signal.aborted && mountedRef.current) {
        setData(transformed);
        setError(null);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (mountedRef.current) {
        setError(createNetworkError(err));
        setData(null);
        setIsLoading(false);
      }
    }
  }, [url, init, select]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchData();

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fetchData]);

  useEffect(() => {
    if (!pollInterval || pollInterval <= 0 || url === null) {
      return;
    }

    const id = setInterval(() => {
      void fetchData();
    }, pollInterval);

    return () => {
      clearInterval(id);
    };
  }, [fetchData, pollInterval, url]);

  const refetch = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  return { data, error, isLoading, refetch };
}
