/**
 * Climate domain service — typed functions for climate alerts, degraded
 * modes, farm profiles, observations, and MRV evidence.
 */

import type { z } from "zod";
import {
  climateAlertSchema,
  climateAlertAcknowledgementSchema,
  climateDegradedModeSchema,
  mrvEvidenceRecordSchema,
} from "@agrodomain/contracts";

import { api } from "@/lib/api-client";
import type { RequestOptions } from "@/lib/api-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClimateAlert = z.infer<typeof climateAlertSchema>;
type ClimateAlertAcknowledgement = z.infer<typeof climateAlertAcknowledgementSchema>;
type ClimateDegradedMode = z.infer<typeof climateDegradedModeSchema>;
type MrvEvidenceRecord = z.infer<typeof mrvEvidenceRecordSchema>;

/** Options without the schema field, used when we build options internally. */
type CallOptions = Omit<RequestOptions, "schema">;

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

/**
 * List climate alerts for the authenticated actor.
 *
 * Backend: GET /api/v1/climate/alerts
 */
export async function getClimateAlerts(
  params?: { farm_id?: string },
  options?: CallOptions,
): Promise<{ schema_version: string; items: ClimateAlert[] }> {
  return api.get<{ schema_version: string; items: ClimateAlert[] }>(
    "/api/v1/climate/alerts",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.farm_id ? { farm_id: params.farm_id } : {}),
      },
    },
  );
}

/**
 * Fetch a single climate alert by ID.
 *
 * Backend: GET /api/v1/climate/alerts/:alertId
 */
export async function getClimateAlert(
  alertId: string,
  options?: CallOptions,
): Promise<ClimateAlert> {
  return api.get<ClimateAlert>(
    `/api/v1/climate/alerts/${alertId}`,
    options,
  );
}

/**
 * Acknowledge a climate alert.
 *
 * Backend: POST /api/v1/climate/alerts/:alertId/acknowledge
 */
export async function acknowledgeAlert(
  alertId: string,
  actorId: string,
  note?: string,
  options?: CallOptions,
): Promise<ClimateAlertAcknowledgement> {
  return api.post<ClimateAlertAcknowledgement>(
    `/api/v1/climate/alerts/${alertId}/acknowledge`,
    { actor_id: actorId, note: note ?? null },
    { ...options, schema: climateAlertAcknowledgementSchema },
  );
}

// ---------------------------------------------------------------------------
// Degraded modes
// ---------------------------------------------------------------------------

/**
 * List degraded climate-data modes.
 *
 * Backend: GET /api/v1/climate/degraded-modes
 */
export async function getDegradedModes(
  params?: { farm_id?: string },
  options?: CallOptions,
): Promise<ClimateDegradedMode[]> {
  return api.get<ClimateDegradedMode[]>(
    "/api/v1/climate/degraded-modes",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.farm_id ? { farm_id: params.farm_id } : {}),
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Farm profiles
// ---------------------------------------------------------------------------

/**
 * Fetch a farm profile by farm ID.
 *
 * Backend: GET /api/v1/climate/farms/:farmId
 */
export async function getFarmProfile(
  farmId: string,
  options?: CallOptions,
): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>(
    `/api/v1/climate/farms/${farmId}`,
    options,
  );
}

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

/**
 * List climate observations for a farm.
 *
 * Backend: GET /api/v1/climate/observations?farm_id=...
 */
export async function getObservations(
  farmId: string,
  options?: CallOptions,
): Promise<{ schema_version: string; items: unknown[] }> {
  return api.get<{ schema_version: string; items: unknown[] }>(
    "/api/v1/climate/observations",
    {
      ...options,
      params: { ...options?.params, farm_id: farmId },
    },
  );
}

// ---------------------------------------------------------------------------
// MRV evidence
// ---------------------------------------------------------------------------

/**
 * List MRV evidence records.
 *
 * Backend: GET /api/v1/climate/mrv-evidence
 */
export async function getMrvEvidence(
  params?: { farm_id?: string },
  options?: CallOptions,
): Promise<MrvEvidenceRecord[]> {
  return api.get<MrvEvidenceRecord[]>(
    "/api/v1/climate/mrv-evidence",
    {
      ...options,
      params: {
        ...options?.params,
        ...(params?.farm_id ? { farm_id: params.farm_id } : {}),
      },
    },
  );
}
