/**
 * RB-002 — System domain service.
 *
 * Public system settings endpoint (no auth required).
 */

import type { ResponseEnvelope } from "@agrodomain/contracts";

import { requestJson } from "../api-client";
import type { SystemSettings } from "../api-types";

// ---------------------------------------------------------------------------
// System API
// ---------------------------------------------------------------------------

export const systemApi = {
  async getSettings(
    traceId: string,
  ): Promise<ResponseEnvelope<SystemSettings>> {
    return requestJson<SystemSettings>(
      "/api/v1/system/settings",
      { method: "GET" },
      traceId,
    );
  },
};
