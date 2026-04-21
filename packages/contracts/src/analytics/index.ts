import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  channelSchema,
  countryCodeSchema,
  isoTimestampSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

export const adminServiceNameSchema = z.enum([
  "admin_control_plane",
  "marketplace",
  "advisory",
  "finance",
  "traceability",
  "climate",
  "rollout_control",
]);

export const adminAlertSeveritySchema = z.enum(["none", "info", "warning", "critical"]);

const adminControlPlaneMetadataShape = {
  schema_version: schemaVersionLiteral,
  request_id: requestIdSchema,
  actor_id: actorIdSchema,
  country_code: countryCodeSchema,
  channel: channelSchema,
  service_name: adminServiceNameSchema,
  slo_id: z.string().min(1).max(32).nullable(),
  alert_severity: adminAlertSeveritySchema.nullable(),
  audit_event_id: z.number().int().nonnegative(),
} as const;

export const adminAnalyticsProvenanceSchema = z
  .object({
    citation_id: z.string().min(1).max(96),
    source_service: adminServiceNameSchema,
    entity_type: z.string().min(2).max(64),
    record_count: z.number().int().nonnegative(),
    last_recorded_at: isoTimestampSchema.nullable(),
    coverage_state: z.enum(["current", "degraded", "empty"]),
    note: z.string().min(3).max(240).nullable(),
  })
  .strict();

export const adminServiceLevelSummarySchema = z
  .object({
    ...adminControlPlaneMetadataShape,
    generated_at: isoTimestampSchema,
    total_records: z.number().int().nonnegative(),
    healthy_records: z.number().int().nonnegative(),
    degraded_records: z.number().int().nonnegative(),
    empty_records: z.number().int().nonnegative(),
    health_state: z.enum(["current", "degraded", "empty"]),
    last_recorded_at: isoTimestampSchema.nullable(),
    provenance: z.array(adminAnalyticsProvenanceSchema).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.healthy_records + value.degraded_records + value.empty_records !==
      value.total_records
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total_records"],
        message:
          "service-level totals must reconcile to healthy, degraded, and empty buckets",
      });
    }
  });

export const adminAnalyticsSnapshotSchema = z
  .object({
    ...adminControlPlaneMetadataShape,
    generated_at: isoTimestampSchema,
    window_started_at: isoTimestampSchema,
    window_ended_at: isoTimestampSchema,
    summaries: z.array(adminServiceLevelSummarySchema).min(1),
    provenance: z.array(adminAnalyticsProvenanceSchema).min(1),
    stale_services: z.array(adminServiceNameSchema),
  })
  .strict();

export const adminAnalyticsProvenanceContract = defineContract({
  id: "analytics.admin_analytics_provenance",
  name: "AdminAnalyticsProvenance",
  kind: "dto",
  domain: "analytics",
  schemaVersion,
  schema: adminAnalyticsProvenanceSchema,
  description:
    "Operator-safe provenance citation for admin analytics mart rollups, including entity coverage and freshness state.",
  traceability: ["PF-004", "DI-002"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b025_enterprise_analytics_mart_contract.json",
  ],
});

export const adminServiceLevelSummaryContract = defineContract({
  id: "analytics.admin_service_level_summary",
  name: "AdminServiceLevelSummary",
  kind: "dto",
  domain: "analytics",
  schemaVersion,
  schema: adminServiceLevelSummarySchema,
  description:
    "Service-level admin mart summary that rolls live packaged runtime entities into operator health buckets without exposing customer-specific detail.",
  traceability: ["PF-001", "PF-004", "DI-002"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b025_enterprise_analytics_mart_contract.json",
  ],
});

export const adminAnalyticsSnapshotContract = defineContract({
  id: "analytics.admin_analytics_snapshot",
  name: "AdminAnalyticsSnapshot",
  kind: "dto",
  domain: "analytics",
  schemaVersion,
  schema: adminAnalyticsSnapshotSchema,
  description:
    "Admin analytics mart snapshot spanning marketplace, advisory, finance, traceability, and climate operator rollups with provenance citations.",
  traceability: ["PF-001", "PF-004", "DI-002"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b025_enterprise_analytics_mart_contract.json",
  ],
});
