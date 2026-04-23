/**
 * Typed API response and error types for the Agrodomain production HTTP client.
 *
 * These types align with the backend envelope contract defined in
 * `@agrodomain/contracts` (envelope/index.ts) and the error catalog
 * (errors/index.ts).
 */

import type { z } from "zod";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/**
 * Normalized API error returned by every failed request through the client.
 * Covers HTTP errors, network failures, timeouts, and backend rejections.
 */
export interface ApiError {
  /** Machine-readable error code (maps to backend error_code or synthetic client codes). */
  code: string;
  /** Human-readable description of the failure. */
  message: string;
  /** HTTP status code when available, -1 for network/timeout errors. */
  status: number;
  /** Optional structured details from the backend error envelope. */
  details: Record<string, unknown> | null;
}

/**
 * Thrown when a response payload fails Zod runtime validation against the
 * expected contract schema. This indicates a backend/contract drift.
 */
export class ContractViolationError extends Error {
  public readonly code = "contract_violation" as const;
  public readonly zodErrors: z.ZodError;

  constructor(message: string, zodErrors: z.ZodError) {
    super(message);
    this.name = "ContractViolationError";
    this.zodErrors = zodErrors;
  }
}

/**
 * Thrown for all HTTP and network errors that pass through the API client.
 * Carries a structured {@link ApiError} payload for programmatic handling.
 */
export class ApiRequestError extends Error {
  public readonly apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiRequestError";
    this.apiError = apiError;
  }
}

// ---------------------------------------------------------------------------
// Response envelope
// ---------------------------------------------------------------------------

/**
 * Mirrors the backend `ResponseEnvelope` shape from `@agrodomain/contracts`.
 * The generic `TData` parameter carries the domain payload.
 */
export interface ApiResponseEnvelope<TData = unknown> {
  metadata: {
    schema_version: string;
    request_id: string;
    correlation_id: string;
    causation_id: string;
    emitted_at: string;
  };
  status: "accepted" | "completed" | "rejected";
  data?: TData;
  error?: {
    code: string;
    reason_code: string;
    message: string;
    retryable: boolean;
  };
}

// ---------------------------------------------------------------------------
// Request configuration
// ---------------------------------------------------------------------------

/** Per-request options accepted by every HTTP method on the api client. */
export interface RequestOptions<TResponse = unknown> {
  /** Optional Zod schema to validate the response payload at runtime. */
  schema?: z.ZodType<TResponse>;
  /** Request timeout in milliseconds. Defaults to 30 000 ms. */
  timeout?: number;
  /** Additional headers merged into the request. */
  headers?: Record<string, string>;
  /** Caller-supplied AbortSignal for component-unmount cleanup. */
  signal?: AbortSignal;
  /** When true, skip automatic session-token injection. */
  noAuth?: boolean;
  /** Custom query parameters appended to the URL. */
  params?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Auth store interface
// ---------------------------------------------------------------------------

/**
 * Pluggable interface for reading the current session token.
 * The default implementation reads from localStorage, but consumers can
 * swap in cookie-based or server-side stores.
 */
export interface AuthTokenStore {
  getToken(): string | null;
}
