/**
 * Production HTTP client for the Agrodomain platform.
 *
 * Replaces mock-client.ts with a typed, retry-aware, contract-validated
 * fetch wrapper that talks to the real backend API.
 *
 * Features:
 *   - Base URL via NEXT_PUBLIC_API_URL env var
 *   - Automatic Bearer token injection from a pluggable auth store
 *   - Response envelope unwrapping matching backend contract
 *   - Optional Zod runtime validation with ContractViolationError
 *   - Exponential-backoff retry for 5xx (max 3 attempts)
 *   - Configurable per-request timeout (default 30 s)
 *   - GET request deduplication for identical concurrent calls
 *   - AbortController integration for unmount cleanup
 *   - Normalized ApiError / ApiRequestError for all failure modes
 */

import type { z } from "zod";

import type {
  ApiError,
  ApiResponseEnvelope,
  AuthTokenStore,
  RequestOptions,
} from "./api-types";
import {
  ApiRequestError,
  ContractViolationError,
} from "./api-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;
const TOKEN_STORAGE_KEY = "agrodomain.session-token.v1";

// ---------------------------------------------------------------------------
// Auth store (default: localStorage)
// ---------------------------------------------------------------------------

const localStorageAuthStore: AuthTokenStore = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  },
};

// ---------------------------------------------------------------------------
// Inflight GET deduplication map
// ---------------------------------------------------------------------------

const inflightGets = new Map<string, Promise<unknown>>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveBaseUrl(): string {
  return (
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL
      : undefined) ?? "https://api-prod-n6-production.up.railway.app"
  );
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const base = resolveBaseUrl().replace(/\/+$/u, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!params || Object.keys(params).length === 0) {
    return `${base}${normalizedPath}`;
  }
  const qs = new URLSearchParams(params).toString();
  return `${base}${normalizedPath}?${qs}`;
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Create an ApiError from an HTTP response or a network/timeout failure.
 */
async function errorFromResponse(response: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // body stays empty
  }

  // The backend may return the rejection inside the envelope's `error` field,
  // or as a top-level `detail` string (FastAPI default).
  const envelope = body as Partial<ApiResponseEnvelope>;
  const envelopeError = envelope?.error;

  const code: string =
    envelopeError?.code ??
    (typeof body.error_code === "string" ? body.error_code : `http_${response.status}`);

  const message: string =
    envelopeError?.message ??
    (typeof body.detail === "string"
      ? body.detail
      : typeof body.message === "string"
        ? body.message
        : response.statusText || "Request failed");

  return {
    code,
    message,
    status: response.status,
    details: envelopeError ? { reason_code: envelopeError.reason_code, retryable: envelopeError.retryable } : body,
  };
}

function networkError(err: unknown): ApiError {
  const isAbort =
    err instanceof DOMException && err.name === "AbortError";
  const isTimeout =
    err instanceof DOMException && err.name === "TimeoutError";

  if (isAbort) {
    return {
      code: "request_aborted",
      message: "The request was aborted.",
      status: -1,
      details: null,
    };
  }

  if (isTimeout) {
    return {
      code: "request_timeout",
      message: "The request timed out.",
      status: -1,
      details: null,
    };
  }

  return {
    code: "network_error",
    message: err instanceof Error ? err.message : "Unknown network error",
    status: -1,
    details: null,
  };
}

// ---------------------------------------------------------------------------
// Core fetch with retry + timeout
// ---------------------------------------------------------------------------

async function executeFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  callerSignal?: AbortSignal,
): Promise<Response> {
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Combine timeout + caller signal via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new DOMException("Timeout", "TimeoutError")), timeoutMs);

    // Forward caller abort into our controller
    const onCallerAbort = () => controller.abort(callerSignal?.reason);
    callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.ok) {
        return response;
      }

      if (!isRetryableStatus(response.status) || attempt === MAX_RETRIES - 1) {
        const apiErr = await errorFromResponse(response);
        throw new ApiRequestError(apiErr);
      }

      // Retryable 5xx — consume body so the connection is freed
      lastError = await errorFromResponse(response);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        throw err;
      }
      // Network / timeout / abort — not retryable
      throw new ApiRequestError(networkError(err));
    } finally {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    }

    // Exponential backoff before next attempt
    const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
    await sleep(backoffMs);
  }

  // Should not reach here, but guard with last known error
  throw new ApiRequestError(
    lastError ?? { code: "max_retries_exceeded", message: "All retry attempts failed.", status: -1, details: null },
  );
}

// ---------------------------------------------------------------------------
// Envelope unwrapping + Zod validation
// ---------------------------------------------------------------------------

function unwrapEnvelope<T>(body: unknown): T {
  // The backend returns a ResponseEnvelope: { metadata, status, data, error? }
  // When present, extract `data`. Some endpoints return a bare object (e.g. direct JSON).
  if (
    body !== null &&
    typeof body === "object" &&
    "status" in (body as Record<string, unknown>) &&
    "data" in (body as Record<string, unknown>)
  ) {
    const envelope = body as ApiResponseEnvelope;
    if (envelope.status === "rejected" && envelope.error) {
      throw new ApiRequestError({
        code: envelope.error.code,
        message: envelope.error.message,
        status: 422,
        details: {
          reason_code: envelope.error.reason_code,
          retryable: envelope.error.retryable,
        },
      });
    }
    return envelope.data as T;
  }
  // Bare object — return as-is
  return body as T;
}

function validateWithSchema<T>(data: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ContractViolationError(
      `Response payload failed contract validation: ${result.error.message}`,
      result.error,
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// API client factory
// ---------------------------------------------------------------------------

function createApiClient(authStore: AuthTokenStore = localStorageAuthStore) {
  /**
   * Internal request dispatcher used by all HTTP method helpers.
   */
  async function request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    options: RequestOptions<T> = {},
  ): Promise<T> {
    const {
      schema,
      timeout = DEFAULT_TIMEOUT_MS,
      headers: extraHeaders,
      signal,
      noAuth = false,
      params,
    } = options;

    const url = buildUrl(path, params);
    const traceId = crypto.randomUUID();

    const headers = new Headers(extraHeaders);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    headers.set("X-Request-ID", traceId);
    headers.set("X-Correlation-ID", traceId);

    if (!noAuth) {
      const token = authStore.getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const init: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined && body !== null) {
      init.body = JSON.stringify(body);
    }

    const response = await executeFetch(url, init, timeout, signal);
    const responseBody: unknown = await response.json();
    const unwrapped = unwrapEnvelope<T>(responseBody);

    if (schema) {
      return validateWithSchema(unwrapped, schema);
    }

    return unwrapped;
  }

  return {
    /**
     * Perform a GET request with optional Zod validation and deduplication.
     *
     * Identical concurrent GET requests (same path + params) are deduplicated:
     * only one fetch is in-flight, and all callers receive the same promise.
     */
    async get<T = unknown>(
      path: string,
      options: RequestOptions<T> = {},
    ): Promise<T> {
      const dedupeKey = `${path}|${JSON.stringify(options.params ?? {})}`;
      const existing = inflightGets.get(dedupeKey) as Promise<T> | undefined;
      if (existing) {
        return existing;
      }

      const promise = request<T>("GET", path, undefined, options).finally(() => {
        inflightGets.delete(dedupeKey);
      });

      inflightGets.set(dedupeKey, promise);
      return promise;
    },

    /**
     * Perform a POST request with optional Zod validation.
     */
    async post<T = unknown>(
      path: string,
      body?: unknown,
      options: RequestOptions<T> = {},
    ): Promise<T> {
      return request<T>("POST", path, body, options);
    },

    /**
     * Perform a PUT request with optional Zod validation.
     */
    async put<T = unknown>(
      path: string,
      body?: unknown,
      options: RequestOptions<T> = {},
    ): Promise<T> {
      return request<T>("PUT", path, body, options);
    },

    /**
     * Perform a DELETE request with optional Zod validation.
     */
    async delete<T = unknown>(
      path: string,
      options: RequestOptions<T> = {},
    ): Promise<T> {
      return request<T>("DELETE", path, undefined, options);
    },

    /**
     * Replace the auth token store at runtime (e.g. for SSR or testing).
     */
    setAuthStore(store: AuthTokenStore): void {
      Object.assign(authStore, store);
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * Pre-configured singleton API client.
 *
 * ```ts
 * import { api } from "@/lib/api-client";
 * import { listingRecordSchema } from "@agrodomain/contracts";
 *
 * const listing = await api.get("/api/v1/marketplace/listings/abc", {
 *   schema: listingRecordSchema,
 * });
 * ```
 */
export const api = createApiClient();

export { createApiClient };
