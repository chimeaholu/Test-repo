/**
 * RB-002 — Audit domain service.
 *
 * Queries audit trail events by request ID and idempotency key.
 */

import type { ResponseEnvelope } from "@agrodomain/contracts";

import { requestJson } from "../api-client";

// ---------------------------------------------------------------------------
// Audit API
// ---------------------------------------------------------------------------

export const auditApi = {
  async getEvents(
    requestId: string,
    idempotencyKey: string,
    traceId: string,
  ): Promise<
    ResponseEnvelope<{ items: Array<Record<string, unknown>> }>
  > {
    const params = new URLSearchParams({
      request_id: requestId,
      idempotency_key: idempotencyKey,
    });
    return requestJson<{
      items: Array<Record<string, unknown>>;
    }>(
      `/api/v1/audit/events?${params.toString()}`,
      { method: "GET" },
      traceId,
      true,
    );
  },
};
