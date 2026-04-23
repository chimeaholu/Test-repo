/**
 * Identity domain service — typed functions for session, consent, and
 * protected-action endpoints.
 *
 * Replaces mock-client identity call sites with real HTTP requests through
 * the production api-client.
 */

import type {
  IdentitySession,
  ProtectedActionStatus,
} from "@agrodomain/contracts";

import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Shared options (without generic schema)
// ---------------------------------------------------------------------------

type CallOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  noAuth?: boolean;
  params?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Payload types (match mock-client's SignInPayload / ConsentCapturePayload)
// ---------------------------------------------------------------------------

export type SignInPayload = {
  display_name: string;
  email: string;
  role: string;
  country_code: string;
};

export type ConsentCapturePayload = {
  policy_version: string;
  scope_ids: string[];
  captured_at: string;
};

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * Create a new session (sign in).
 *
 * Backend: POST /api/v1/identity/session
 * Returns `{ access_token, session }`.
 */
export async function createSession(
  payload: SignInPayload,
  options?: CallOptions,
): Promise<{ access_token: string; session: IdentitySession }> {
  return api.post<{ access_token: string; session: IdentitySession }>(
    "/api/v1/identity/session",
    payload,
    options,
  );
}

/**
 * Restore / fetch the current session.
 *
 * Backend: GET /api/v1/identity/session
 */
export async function getSession(
  options?: CallOptions,
): Promise<IdentitySession> {
  return api.get<IdentitySession>("/api/v1/identity/session", options);
}

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

/**
 * Grant consent (capture).
 *
 * Backend: POST /api/v1/identity/consent
 */
export async function grantConsent(
  payload: ConsentCapturePayload,
  options?: CallOptions,
): Promise<IdentitySession> {
  return api.post<IdentitySession>(
    "/api/v1/identity/consent",
    payload,
    options,
  );
}

/**
 * Revoke previously-granted consent.
 *
 * Backend: POST /api/v1/identity/consent/revoke
 */
export async function revokeConsent(
  reason: string,
  options?: CallOptions,
): Promise<{ reason: string; session: IdentitySession }> {
  return api.post<{ reason: string; session: IdentitySession }>(
    "/api/v1/identity/consent/revoke",
    { reason },
    options,
  );
}

// ---------------------------------------------------------------------------
// Protected action
// ---------------------------------------------------------------------------

/**
 * Check whether the current session allows a protected (regulated) action.
 *
 * Backend: GET /api/v1/identity/protected-action
 */
export async function checkProtectedAction(
  options?: CallOptions,
): Promise<ProtectedActionStatus> {
  return api.get<ProtectedActionStatus>(
    "/api/v1/identity/protected-action",
    options,
  );
}
