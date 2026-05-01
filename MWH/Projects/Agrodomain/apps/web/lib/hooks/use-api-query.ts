"use client";

import type { ResponseEnvelope } from "@agrodomain/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseApiQueryResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Lightweight hook for API queries with loading/error/refetch.
 *
 * @param fetcher — async function returning a ResponseEnvelope
 * @param deps — dependency array; refetches when deps change
 */
export function useApiQuery<T>(
  fetcher: () => Promise<ResponseEnvelope<T>>,
  deps: unknown[] = [],
): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const versionRef = useRef(0);

  const execute = useCallback(() => {
    const version = ++versionRef.current;
    setIsLoading(true);
    setError(null);
    fetcher()
      .then((envelope) => {
        if (version === versionRef.current) {
          setData(envelope.data);
        }
      })
      .catch((err: unknown) => {
        if (version === versionRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (version === versionRef.current) {
          setIsLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, error, isLoading, refetch: execute };
}
