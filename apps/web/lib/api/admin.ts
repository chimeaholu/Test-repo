/**
 * Admin domain service — typed functions for analytics health, snapshots,
 * observability alerts, telemetry, rollout control, release readiness,
 * and admin audit events.
 */

import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Options type (without schema since admin endpoints return opaque shapes)
// ---------------------------------------------------------------------------

type CallOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  noAuth?: boolean;
  params?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/**
 * Fetch the admin analytics health summary.
 *
 * Backend: GET /api/v1/admin/analytics/health
 */
export async function getHealth(
  params?: { country_code?: string },
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    "/api/v1/admin/analytics/health",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.country_code ? { country_code: params.country_code } : {}),
      },
    },
  );
}

/**
 * Fetch the admin analytics snapshot.
 *
 * Backend: GET /api/v1/admin/analytics/snapshot
 */
export async function getSnapshot(
  params?: { country_code?: string },
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    "/api/v1/admin/analytics/snapshot",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.country_code ? { country_code: params.country_code } : {}),
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Observability
// ---------------------------------------------------------------------------

/**
 * Fetch observability SLO alerts.
 *
 * Backend: GET /api/v1/admin/observability/alerts
 */
export async function getObservabilityAlerts(
  params?: { country_code?: string },
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    "/api/v1/admin/observability/alerts",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.country_code ? { country_code: params.country_code } : {}),
      },
    },
  );
}

/**
 * Fetch a single telemetry observation record.
 *
 * Backend: GET /api/v1/admin/observability/telemetry/:observationId
 */
export async function getTelemetry(
  observationId: string,
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    `/api/v1/admin/observability/telemetry/${observationId}`,
    options,
  );
}

/**
 * Ingest a telemetry observation record.
 *
 * Backend: POST /api/v1/admin/observability/telemetry
 */
export async function ingestTelemetry(
  payload: Record<string, unknown>,
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>(
    "/api/v1/admin/observability/telemetry",
    payload,
    options,
  );
}

// ---------------------------------------------------------------------------
// Rollout control
// ---------------------------------------------------------------------------

/**
 * Fetch current rollout status.
 *
 * Backend: GET /api/v1/admin/rollouts/status
 */
export async function getRolloutStatus(
  params?: { country_code?: string },
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    "/api/v1/admin/rollouts/status",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.country_code ? { country_code: params.country_code } : {}),
      },
    },
  );
}

/**
 * Freeze a rollout scope.
 *
 * Backend: POST /api/v1/admin/rollouts/freeze
 */
export async function freezeRollout(
  payload: Record<string, unknown>,
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>(
    "/api/v1/admin/rollouts/freeze",
    payload,
    options,
  );
}

/**
 * Start a canary (limited release) for a rollout scope.
 *
 * Backend: POST /api/v1/admin/rollouts/canary
 */
export async function canaryRollout(
  payload: Record<string, unknown>,
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>(
    "/api/v1/admin/rollouts/canary",
    payload,
    options,
  );
}

/**
 * Promote a rollout scope back to active.
 *
 * Backend: POST /api/v1/admin/rollouts/promote
 */
export async function promoteRollout(
  payload: Record<string, unknown>,
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>(
    "/api/v1/admin/rollouts/promote",
    payload,
    options,
  );
}

/**
 * Roll back a rollout scope (re-freeze).
 *
 * Backend: POST /api/v1/admin/rollouts/rollback
 */
export async function rollbackRollout(
  payload: Record<string, unknown>,
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>(
    "/api/v1/admin/rollouts/rollback",
    payload,
    options,
  );
}

// ---------------------------------------------------------------------------
// Release readiness
// ---------------------------------------------------------------------------

/**
 * Fetch release-readiness status.
 *
 * Backend: GET /api/v1/admin/release-readiness
 */
export async function getReleaseReadiness(
  params?: { country_code?: string },
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    "/api/v1/admin/release-readiness",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.country_code ? { country_code: params.country_code } : {}),
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Admin audit events
// ---------------------------------------------------------------------------

/**
 * Fetch admin-scoped audit events.
 *
 * Backend: GET /api/v1/admin/audit/events
 */
export async function getAdminAuditEvents(
  params?: { country_code?: string; limit?: number },
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    "/api/v1/admin/audit/events",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.country_code ? { country_code: params.country_code } : {}),
        ...(params?.limit !== undefined ? { limit: String(params.limit) } : {}),
      },
    },
  );
}
