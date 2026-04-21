import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  channelSchema,
  countryCodeSchema,
  idempotencyKeySchema,
  isoTimestampSchema,
  reasonCodeSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";
import {
  adminAlertSeveritySchema,
  adminServiceNameSchema,
} from "../analytics/index.js";

const operatorRoleSchema = z.enum(["admin", "finance_ops", "compliance"]);
const rolloutStateSchema = z.enum(["active", "hold", "frozen", "limited_release"]);
const rolloutIntentSchema = z.enum(["freeze", "hold", "limited_release", "resume"]);
const telemetrySourceKindSchema = z.enum(["api_runtime", "web_runtime", "manual_backfill"]);
const sloObjectiveKindSchema = z.enum(["success_rate", "latency_p95_ms", "freshness_seconds"]);
const sloStatusSchema = z.enum(["healthy", "degraded", "breached", "unavailable"]);
const releaseReadinessStateSchema = z.enum(["ready", "degraded", "blocked"]);

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

const rolloutControlInputBaseSchema = z
  .object({
    ...adminControlPlaneMetadataShape,
    audit_event_id: z.number().int().nonnegative().default(0),
    idempotency_key: idempotencyKeySchema,
    actor_role: operatorRoleSchema,
    scope_key: z.string().min(2).max(96),
    intent: rolloutIntentSchema,
    reason_code: reasonCodeSchema,
    reason_detail: z.string().min(8).max(280),
    limited_release_percent: z.number().int().min(1).max(99).nullable().optional(),
  })
  .strict();

export const rolloutControlInputSchema = rolloutControlInputBaseSchema.superRefine(
  (value, ctx) => {
    if (value.intent === "limited_release" && value.limited_release_percent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limited_release_percent"],
        message: "limited release requires a bounded release percent",
      });
    }
    if (value.intent !== "limited_release" && value.limited_release_percent != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limited_release_percent"],
        message: "release percent may only be sent with limited_release intent",
      });
    }
  },
);

export const rolloutStatusSchema = z
  .object({
    ...adminControlPlaneMetadataShape,
    actor_role: operatorRoleSchema,
    scope_key: z.string().min(2).max(96),
    state: rolloutStateSchema,
    previous_state: rolloutStateSchema.nullable(),
    intent: rolloutIntentSchema,
    reason_code: reasonCodeSchema,
    reason_detail: z.string().min(8).max(280),
    limited_release_percent: z.number().int().min(1).max(99).nullable(),
    changed_at: isoTimestampSchema,
  })
  .strict();

export const rolloutStatusCollectionSchema = z
  .object({
    ...adminControlPlaneMetadataShape,
    generated_at: isoTimestampSchema,
    items: z.array(rolloutStatusSchema),
  })
  .strict();

const telemetryObservationInputBaseSchema = z
  .object({
    ...adminControlPlaneMetadataShape,
    audit_event_id: z.number().int().nonnegative().default(0),
    idempotency_key: idempotencyKeySchema,
    observation_id: z.string().min(1).max(96),
    source_kind: telemetrySourceKindSchema,
    window_started_at: isoTimestampSchema,
    window_ended_at: isoTimestampSchema,
    success_count: z.number().int().nonnegative(),
    error_count: z.number().int().nonnegative(),
    sample_count: z.number().int().nonnegative(),
    latency_p95_ms: z.number().nonnegative(),
    stale_after_seconds: z.number().int().positive(),
    release_blocking: z.boolean(),
    note: z.string().min(3).max(240).nullable().optional(),
  })
  .strict();

export const telemetryObservationInputSchema = telemetryObservationInputBaseSchema.superRefine(
  (value, ctx) => {
    if (value.success_count + value.error_count > value.sample_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sample_count"],
        message: "sample_count must be at least the sum of success and error counts",
      });
    }
  },
);

export const telemetryObservationRecordSchema = z
  .object({
    ...telemetryObservationInputBaseSchema.shape,
    audit_event_id: z.number().int().nonnegative(),
    ingested_at: isoTimestampSchema,
  })
  .strict();

export const sloEvaluationSchema = z
  .object({
    ...adminControlPlaneMetadataShape,
    objective_kind: sloObjectiveKindSchema,
    objective_target: z.number().nonnegative(),
    observed_value: z.number().nonnegative().nullable(),
    status: sloStatusSchema,
    breach_count: z.number().int().nonnegative(),
    window_started_at: isoTimestampSchema.nullable(),
    window_ended_at: isoTimestampSchema.nullable(),
    supporting_observation_ids: z.array(z.string().min(1).max(96)),
    rationale: z.string().min(8).max(320),
    evaluated_at: isoTimestampSchema,
  })
  .strict();

export const sloEvaluationCollectionSchema = z
  .object({
    ...adminControlPlaneMetadataShape,
    generated_at: isoTimestampSchema,
    items: z.array(sloEvaluationSchema).min(1),
  })
  .strict();

export const releaseReadinessStatusSchema = z
  .object({
    ...adminControlPlaneMetadataShape,
    generated_at: isoTimestampSchema,
    readiness_status: releaseReadinessStateSchema,
    blocking_reasons: z.array(z.string().min(3).max(160)),
    rollout_states: z.array(rolloutStatusSchema),
    slo_evaluations: z.array(sloEvaluationSchema).min(1),
    telemetry_freshness_state: sloStatusSchema,
  })
  .strict();

export const rolloutControlInputContract = defineContract({
  id: "observability.rollout_control_input",
  name: "RolloutControlInput",
  kind: "dto",
  domain: "observability",
  schemaVersion,
  schema: rolloutControlInputSchema,
  description:
    "Explicit rollout-control action payload requiring actor, country, scope, reason, and bounded release intent metadata.",
  traceability: ["EP-005", "DI-003"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b026_partner_api_gateway_contract.json",
  ],
});

export const rolloutStatusContract = defineContract({
  id: "observability.rollout_status",
  name: "RolloutStatus",
  kind: "dto",
  domain: "observability",
  schemaVersion,
  schema: rolloutStatusSchema,
  description:
    "Append-only rollout-control state record carrying explicit actor attribution, scope, country, and audit linkage.",
  traceability: ["EP-005", "PF-004", "DI-003"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b026_partner_api_gateway_contract.json",
  ],
});

export const rolloutStatusCollectionContract = defineContract({
  id: "observability.rollout_status_collection",
  name: "RolloutStatusCollection",
  kind: "dto",
  domain: "observability",
  schemaVersion,
  schema: rolloutStatusCollectionSchema,
  description:
    "Current rollout posture across scoped services, countries, and channels for operator reads.",
  traceability: ["EP-005", "DI-003"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const telemetryObservationInputContract = defineContract({
  id: "observability.telemetry_observation_input",
  name: "TelemetryObservationInput",
  kind: "dto",
  domain: "observability",
  schemaVersion,
  schema: telemetryObservationInputSchema,
  description:
    "Telemetry ingestion payload for admin SLO evaluation with explicit freshness, success-rate, and release-blocking fields.",
  traceability: ["PF-001", "PF-004", "DI-002"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b027_observability_contract.json",
  ],
});

export const telemetryObservationRecordContract = defineContract({
  id: "observability.telemetry_observation_record",
  name: "TelemetryObservationRecord",
  kind: "dto",
  domain: "observability",
  schemaVersion,
  schema: telemetryObservationRecordSchema,
  description:
    "Persisted telemetry observation with audit linkage used to power replay-safe ingestion and SLO evaluation.",
  traceability: ["PF-001", "PF-004", "DI-002"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b027_observability_contract.json",
  ],
});

export const sloEvaluationContract = defineContract({
  id: "observability.slo_evaluation",
  name: "SloEvaluation",
  kind: "dto",
  domain: "observability",
  schemaVersion,
  schema: sloEvaluationSchema,
  description:
    "SLO evaluation result describing observed value, threshold, severity, and supporting telemetry evidence for operator actions.",
  traceability: ["PF-001", "PF-004", "DI-002"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b027_observability_contract.json",
  ],
});

export const sloEvaluationCollectionContract = defineContract({
  id: "observability.slo_evaluation_collection",
  name: "SloEvaluationCollection",
  kind: "dto",
  domain: "observability",
  schemaVersion,
  schema: sloEvaluationCollectionSchema,
  description: "Release-facing SLO evaluation set for admin reads and readiness decisions.",
  traceability: ["PF-001", "PF-004", "DI-002"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const releaseReadinessStatusContract = defineContract({
  id: "observability.release_readiness_status",
  name: "ReleaseReadinessStatus",
  kind: "dto",
  domain: "observability",
  schemaVersion,
  schema: releaseReadinessStatusSchema,
  description:
    "Release-readiness read model summarizing rollout posture, telemetry freshness, and SLO decisions without mutating external systems.",
  traceability: ["PF-001", "PF-004", "EP-005", "DI-002", "DI-003"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b027_observability_contract.json",
  ],
});
