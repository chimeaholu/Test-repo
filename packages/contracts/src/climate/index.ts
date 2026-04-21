import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  countryCodeSchema,
  isoTimestampSchema,
  localeSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

export const climateSeveritySchema = z.enum(["info", "warning", "critical"]);

export const climateAlertSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    alert_id: z.string().min(1),
    farm_profile_id: z.string().min(1),
    country_code: countryCodeSchema,
    locale: localeSchema,
    severity: climateSeveritySchema,
    title: z.string().min(3).max(160),
    summary: z.string().min(12).max(400),
    source_ids: z.array(z.string().min(1)).min(1),
    degraded_mode: z.boolean(),
    acknowledged: z.boolean(),
    created_at: isoTimestampSchema,
  })
  .strict();

export const climateAlertAcknowledgementSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    alert_id: z.string().min(1),
    actor_id: actorIdSchema,
    acknowledged_at: isoTimestampSchema,
    note: z.string().min(3).max(300).nullable().optional(),
  })
  .strict();

export const climateDegradedModeSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    source_window_id: z.string().min(1),
    country_code: countryCodeSchema,
    farm_profile_id: z.string().min(1),
    degraded_mode: z.literal(true),
    reason_code: z.string().min(1),
    assumptions: z.array(z.string().min(3).max(240)).min(1),
    source_ids: z.array(z.string().min(1)).default([]),
    detected_at: isoTimestampSchema,
  })
  .strict();

export const mrvEvidenceRecordSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    evidence_id: z.string().min(1),
    farm_profile_id: z.string().min(1),
    country_code: countryCodeSchema,
    method_tag: z.string().min(2).max(80),
    assumption_notes: z.array(z.string().min(3).max(240)).min(1),
    source_references: z
      .array(
        z
          .object({
            source_id: z.string().min(1),
            title: z.string().min(3).max(160),
            method_reference: z.string().min(2).max(120),
          })
          .strict(),
      )
      .min(1),
    source_completeness: z.enum(["complete", "partial", "degraded"]),
    created_at: isoTimestampSchema,
  })
  .strict();

export const climateAlertContract = defineContract({
  id: "climate.climate_alert",
  name: "ClimateAlert",
  kind: "dto",
  domain: "climate",
  schemaVersion,
  schema: climateAlertSchema,
  description: "Climate-risk alert payload with severity, source linkage, and degraded-mode visibility.",
  traceability: ["CJ-006", "DI-006"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
  ],
});

export const climateAlertAcknowledgementContract = defineContract({
  id: "climate.climate_alert_acknowledgement",
  name: "ClimateAlertAcknowledgement",
  kind: "dto",
  domain: "climate",
  schemaVersion,
  schema: climateAlertAcknowledgementSchema,
  description: "Acknowledgement payload for operator-visible climate alerts.",
  traceability: ["CJ-006", "DI-006"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
  ],
});

export const climateDegradedModeContract = defineContract({
  id: "climate.climate_degraded_mode",
  name: "ClimateDegradedMode",
  kind: "dto",
  domain: "climate",
  schemaVersion,
  schema: climateDegradedModeSchema,
  description: "Explicit degraded-mode payload for climate source gaps or stale windows.",
  traceability: ["EP-008", "DI-006"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
  ],
});

export const mrvEvidenceRecordContract = defineContract({
  id: "climate.mrv_evidence_record",
  name: "MrvEvidenceRecord",
  kind: "dto",
  domain: "climate",
  schemaVersion,
  schema: mrvEvidenceRecordSchema,
  description: "MRV evidence record payload preserving assumptions, method tags, and provenance completeness.",
  traceability: ["CJ-006", "EP-008", "DI-006"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
  ],
});
