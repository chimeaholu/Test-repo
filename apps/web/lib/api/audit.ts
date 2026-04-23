/**
 * Audit domain service — typed function for querying audit events.
 */

import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditEvent = {
  audit_event_id: number;
  request_id: string;
  actor_id: string | null;
  event_type: string;
  command_name: string | null;
  status: string;
  reason_code: string | null;
  schema_version: string | null;
  idempotency_key: string | null;
  correlation_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type CallOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  noAuth?: boolean;
  params?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch audit events, optionally filtered by request ID and/or
 * idempotency key.
 *
 * Backend: GET /api/v1/audit/events
 */
export async function getAuditEvents(
  params?: { request_id?: string; idempotency_key?: string },
  options?: CallOptions,
): Promise<{ items: AuditEvent[] }> {
  return api.get<{ items: AuditEvent[] }>(
    "/api/v1/audit/events",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.request_id ? { request_id: params.request_id } : {}),
        ...(params?.idempotency_key ? { idempotency_key: params.idempotency_key } : {}),
      },
    },
  );
}
