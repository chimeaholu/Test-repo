/**
 * RB-001 — Shared type definitions for the Agrodomain API client layer.
 *
 * Types that exist in @agrodomain/contracts should be imported from there.
 * This file contains types derived from backend response shapes that are
 * not part of the contracts package.
 */

import type {
  climateAlertAcknowledgementSchema,
  climateAlertSchema,
  climateDegradedModeSchema,
  escrowCollectionSchema,
  escrowDisputeOpenInputSchema,
  escrowFundInputSchema,
  escrowReadSchema,
  escrowReleaseInputSchema,
  escrowReverseInputSchema,
  mrvEvidenceRecordSchema,
  walletBalanceReadSchema,
  walletTransactionCollectionSchema,
} from "@agrodomain/contracts";
import type { z } from "zod";

// ---------------------------------------------------------------------------
// Wallet & Escrow types (derived from contract schemas)
// ---------------------------------------------------------------------------

export type WalletSummary = z.infer<typeof walletBalanceReadSchema>;
export type WalletTransactions = z.infer<
  typeof walletTransactionCollectionSchema
>;
export type EscrowCollection = z.infer<typeof escrowCollectionSchema>;
export type EscrowRead = z.infer<typeof escrowReadSchema>;
export type EscrowFundInput = z.infer<typeof escrowFundInputSchema>;
export type EscrowReleaseInput = z.infer<typeof escrowReleaseInputSchema>;
export type EscrowReverseInput = z.infer<typeof escrowReverseInputSchema>;
export type EscrowDisputeOpenInput = z.infer<
  typeof escrowDisputeOpenInputSchema
>;

// ---------------------------------------------------------------------------
// Climate types (derived from contract schemas)
// ---------------------------------------------------------------------------

export type ClimateAlert = z.infer<typeof climateAlertSchema>;
export type ClimateAlertAcknowledgement = z.infer<
  typeof climateAlertAcknowledgementSchema
>;
export type ClimateDegradedMode = z.infer<typeof climateDegradedModeSchema>;
export type MrvEvidenceRecord = z.infer<typeof mrvEvidenceRecordSchema>;

export type FarmProfileRead = {
  schema_version: string;
  farm_id: string;
  actor_id: string;
  country_code: string;
  farm_name: string;
  district: string;
  crop_type: string;
  hectares: number;
  latitude: number | null;
  longitude: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ClimateObservationRead = {
  schema_version: string;
  observation_id: string;
  farm_id: string;
  actor_id: string;
  country_code: string;
  source_id: string;
  source_type: string;
  observed_at: string;
  source_window_start: string;
  source_window_end: string;
  rainfall_mm: number | null;
  temperature_c: number | null;
  soil_moisture_pct: number | null;
  anomaly_score: number | null;
  ingestion_state: string;
  degraded_mode: boolean;
  degraded_reason_codes: string[];
  assumptions: string[];
  provenance: Array<Record<string, unknown>>;
  normalized_payload: Record<string, unknown>;
  farm_profile?: FarmProfileRead | null;
  created_at: string;
};

export type AdvisoryRuntimeMode = "live" | "fallback";

export type ClimateRuntimeSnapshot = {
  runtime_mode: AdvisoryRuntimeMode;
  alerts: ClimateAlert[];
  degraded_modes: ClimateDegradedMode[];
  evidence_records: MrvEvidenceRecord[];
};

// ---------------------------------------------------------------------------
// Backend API record shapes (used by normalizers in climate service)
// ---------------------------------------------------------------------------

export type ClimateAlertApiRecord = {
  alert_id: string;
  farm_id?: string;
  severity: string;
  headline?: string;
  detail?: string;
  status?: string;
  degraded_mode?: boolean;
  observation_id?: string | null;
  created_at: string;
};

export type ClimateDegradedModeApiRecord = {
  source_window_id: string;
  country_code: string;
  farm_profile_id: string;
  degraded_mode: true;
  reason_code: string;
  assumptions: string[];
  source_ids?: string[];
  detected_at: string;
};

export type MrvEvidenceApiRecord = {
  evidence_id: string;
  farm_id?: string;
  farm_profile_id?: string;
  country_code: string;
  method_tag: string;
  assumptions?: string[];
  assumption_notes?: string[];
  provenance?: Array<Record<string, unknown>>;
  source_references?: Array<Record<string, unknown>>;
  method_references?: string[];
  source_completeness_state?: string;
  source_completeness?: string;
  degraded_mode?: boolean;
  created_at: string;
};

export type FarmProfileApiRecord = FarmProfileRead;

export type ClimateObservationApiRecord = ClimateObservationRead;

// ---------------------------------------------------------------------------
// Miscellaneous API shapes not in contracts
// ---------------------------------------------------------------------------

export type ListingRevisionCollection = {
  items: Array<Record<string, unknown>>;
  schema_version?: string;
};

export type SystemSettings = {
  app_name: string;
  environment: string;
  schema_version: string;
  request_id: string;
};
