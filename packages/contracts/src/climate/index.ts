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

export const weatherDaySchema = z
  .object({
    date: z.string().min(10).max(10),
    temperature_max_c: z.number().nullable(),
    temperature_min_c: z.number().nullable(),
    precipitation_mm: z.number().nullable(),
    precipitation_probability_pct: z.number().nullable(),
    evapotranspiration_mm: z.number().nullable(),
    weather_code: z.number().int().nullable(),
  })
  .strict();

export const weatherDatasetSchema = z
  .object({
    kind: z.enum(["forecast", "history"]),
    provider: z.string().min(2).max(40),
    provider_mode: z.enum(["live", "degraded"]),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    timezone: z.string().nullable(),
    generated_at: isoTimestampSchema,
    degraded_mode: z.boolean(),
    degraded_reasons: z.array(z.string().min(3)).default([]),
    source_window_start: z.string().nullable().optional(),
    source_window_end: z.string().nullable().optional(),
    days: z.array(weatherDaySchema),
  })
  .strict();

export const weatherOutlookSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    farm_profile_id: z.string().min(1),
    forecast: weatherDatasetSchema,
    history: weatherDatasetSchema,
  })
  .strict();

export const climateActionPackSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    farm_profile_id: z.string().min(1),
    forecast: weatherDatasetSchema,
    history: weatherDatasetSchema,
    open_alert_ids: z.array(z.string().min(1)),
    action_pack: z
      .object({
        crop_calendar: z
          .object({
            crop_type: z.string().min(1),
            country_code: countryCodeSchema,
            stage: z.string().min(3).max(64),
            season_label: z.string().min(3).max(64),
            reference_date: z.string().min(10).max(10),
            planting_window_start: z.string().nullable(),
            planting_window_end: z.string().nullable(),
            expected_harvest_window_start: z.string().nullable(),
            expected_harvest_window_end: z.string().nullable(),
          })
          .strict(),
        risks: z.array(
          z
            .object({
              code: z.string().min(2).max(64),
              severity: z.enum(["critical", "high", "medium", "low"]),
              title: z.string().min(3).max(200),
              summary: z.string().min(12).max(400),
              recommended_due_date: z.string().nullable(),
              linked_alert_id: z.string().nullable(),
              source: z.string().min(3).max(64),
            })
            .strict(),
        ),
        tasks: z.array(
          z
            .object({
              task_id: z.string().min(1),
              title: z.string().min(3).max(160),
              description: z.string().min(12).max(400),
              priority: z.enum(["critical", "high", "medium", "low"]),
              due_date: z.string().nullable(),
              source: z.string().min(3).max(64),
              advisory_topic: z.string().min(3).max(160),
              linked_alert_id: z.string().nullable(),
            })
            .strict(),
        ),
        advisory: z
          .object({
            topic: z.string().min(3).max(200),
            draft_question: z.string().min(12).max(300),
            draft_response: z.string().min(20).max(1000),
            policy_context: z.record(z.any()),
            requires_human_review: z.boolean(),
          })
          .strict(),
        degraded_mode: z.boolean(),
        degraded_reasons: z.array(z.string().min(3)),
      })
      .strict(),
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

export const weatherOutlookContract = defineContract({
  id: "climate.weather_outlook",
  name: "WeatherOutlook",
  kind: "dto",
  domain: "climate",
  schemaVersion,
  schema: weatherOutlookSchema,
  description: "Provider-backed forecast and recent history bundle normalized behind the weather adapter seam.",
  traceability: ["DI-31", "EP-31"],
  sourceArtifacts: ["output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md"],
});

export const climateActionPackContract = defineContract({
  id: "climate.climate_action_pack",
  name: "ClimateActionPack",
  kind: "dto",
  domain: "climate",
  schemaVersion,
  schema: climateActionPackSchema,
  description: "Climate-to-task and advisory linkage payload joining provider weather, risk rules, and action recommendations.",
  traceability: ["DI-32", "EP-34"],
  sourceArtifacts: ["output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md"],
});
