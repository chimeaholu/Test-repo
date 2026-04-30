"use client";

import { useCallback, useState } from "react";

export interface UseApiMutationResult<TInput, TResult> {
  mutate: (input: TInput) => Promise<TResult>;
  error: Error | null;
  isLoading: boolean;
  reset: () => void;
}

/**
 * Lightweight hook for API mutations with loading/error state.
 *
 * @param mutator — async function that performs the mutation
 */
export function useApiMutation<TInput, TResult>(
  mutator: (input: TInput) => Promise<TResult>,
): UseApiMutationResult<TInput, TResult> {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(
    async (input: TInput): Promise<TResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await mutator(input);
        return result;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsLoading(false);
      }
    },
    [mutator],
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate, error, isLoading, reset };
}
