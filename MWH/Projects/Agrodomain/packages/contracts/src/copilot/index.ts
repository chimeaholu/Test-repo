import { z } from "zod";

import { advisoryTranscriptEntrySchema } from "../advisory/index.js";
import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  countryCodeSchema,
  isoTimestampSchema,
  localeSchema,
  reasonCodeSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";
import { membershipRoleSchema } from "../identity/index.js";
import {
  notificationDispatchPlanSchema,
  notificationResultSchema,
} from "../notifications/index.js";

export const copilotIntentSchema = z.enum([
  "advisory.ask",
  "market.listings.publish",
  "market.negotiations.confirm.approve",
  "market.negotiations.confirm.reject",
  "climate.alerts.acknowledge",
  "transport.shipments.pickup",
  "unsupported",
]);

export const copilotAdapterSchema = z.enum([
  "advisory.requests.submit",
  "market.listings.publish",
  "market.negotiations.confirm.approve",
  "market.negotiations.confirm.reject",
  "climate.alerts.acknowledge",
  "transport.shipments.events.create",
]);

export const copilotResolutionStatusSchema = z.enum([
  "ready",
  "confirmation_required",
  "information_needed",
  "escalate_to_human",
  "unsupported",
]);

export const copilotExecutionDecisionSchema = z.enum([
  "confirm",
  "escalate",
]);

export const copilotExecutionStatusSchema = z.enum([
  "completed",
  "escalated",
  "blocked",
]);

export const copilotContextSchema = z
  .object({
    listing_id: z.string().min(1).nullable().optional(),
    thread_id: z.string().min(1).nullable().optional(),
    alert_id: z.string().min(1).nullable().optional(),
    shipment_id: z.string().min(1).nullable().optional(),
  })
  .strict();

export const copilotTargetSchema = z
  .object({
    aggregate_type: z.string().min(1).max(64),
    aggregate_id: z.string().min(1).max(128),
    label: z.string().min(1).max(200),
  })
  .strict();

export const copilotActionSchema = z
  .object({
    adapter: copilotAdapterSchema,
    command_name: z.string().min(1).max(128).nullable(),
    aggregate_ref: z.string().min(1).max(128),
    mutation_scope: z.string().min(1).max(128),
    confirmation_required: z.boolean(),
    target: copilotTargetSchema.nullable(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export const copilotHumanHandoffSchema = z
  .object({
    required: z.boolean(),
    queue_label: z.string().min(1).max(120),
    reason_code: reasonCodeSchema,
    reviewer_roles: z.array(z.string().min(2).max(32)).min(1),
  })
  .strict();

export const copilotResolveInputSchema = z
  .object({
    route_path: z.string().min(1).max(240),
    locale: localeSchema,
    message: z.string().min(3).max(2000),
    transcript_entries: z.array(advisoryTranscriptEntrySchema).max(20).default([]),
    context: copilotContextSchema.default({}),
  })
  .strict();

export const copilotResolutionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    resolution_id: requestIdSchema,
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    locale: localeSchema,
    route_path: z.string().min(1).max(240),
    request_text: z.string().min(3).max(2000),
    intent: copilotIntentSchema,
    status: copilotResolutionStatusSchema,
    summary: z.string().min(8).max(600),
    explanation: z.string().min(8).max(1200),
    confirmation_copy: z.string().min(8).max(300).nullable(),
    action: copilotActionSchema.nullable(),
    channel_dispatch: notificationDispatchPlanSchema,
    human_handoff: copilotHumanHandoffSchema,
    created_at: isoTimestampSchema,
  })
  .strict();

export const copilotExecutionInputSchema = z
  .object({
    resolution_id: requestIdSchema,
    intent: copilotIntentSchema,
    adapter: copilotAdapterSchema,
    route_path: z.string().min(1).max(240),
    decision: copilotExecutionDecisionSchema,
    payload: z.record(z.string(), z.unknown()),
    note: z.string().min(3).max(500).nullable().optional(),
  })
  .strict();

export const copilotExecutionResultSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    resolution_id: requestIdSchema,
    intent: copilotIntentSchema,
    adapter: copilotAdapterSchema,
    status: copilotExecutionStatusSchema,
    summary: z.string().min(8).max(600),
    audit_event_id: z.number().int().nonnegative(),
    result: z.record(z.string(), z.unknown()),
    notification: notificationResultSchema,
    channel_dispatch: notificationDispatchPlanSchema,
    human_handoff: copilotHumanHandoffSchema,
    completed_at: isoTimestampSchema,
  })
  .strict();

export type CopilotIntent = z.infer<typeof copilotIntentSchema>;
export type CopilotAdapter = z.infer<typeof copilotAdapterSchema>;
export type CopilotResolutionStatus = z.infer<typeof copilotResolutionStatusSchema>;
export type CopilotExecutionDecision = z.infer<typeof copilotExecutionDecisionSchema>;
export type CopilotExecutionStatus = z.infer<typeof copilotExecutionStatusSchema>;
export type CopilotContext = z.infer<typeof copilotContextSchema>;
export type CopilotAction = z.infer<typeof copilotActionSchema>;
export type CopilotHumanHandoff = z.infer<typeof copilotHumanHandoffSchema>;
export type CopilotResolveInput = z.infer<typeof copilotResolveInputSchema>;
export type CopilotResolution = z.infer<typeof copilotResolutionSchema>;
export type CopilotExecutionInput = z.infer<typeof copilotExecutionInputSchema>;
export type CopilotExecutionResult = z.infer<typeof copilotExecutionResultSchema>;

export const copilotResolveInputContract = defineContract({
  id: "copilot.resolve_input",
  name: "CopilotResolveInput",
  kind: "dto",
  domain: "copilot",
  schemaVersion,
  schema: copilotResolveInputSchema,
  description:
    "Assist-and-act copilot prompt input with route context, transcript context, and optional aggregate references.",
  traceability: ["CJ-010", "EP-003", "EP-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const copilotResolutionContract = defineContract({
  id: "copilot.resolution",
  name: "CopilotResolution",
  kind: "dto",
  domain: "copilot",
  schemaVersion,
  schema: copilotResolutionSchema,
  description:
    "Canonical copilot resolution envelope covering intent classification, safe action boundaries, confirmation copy, channel seam metadata, and human handoff posture.",
  traceability: ["CJ-010", "EP-003", "EP-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const copilotExecutionInputContract = defineContract({
  id: "copilot.execution_input",
  name: "CopilotExecutionInput",
  kind: "dto",
  domain: "copilot",
  schemaVersion,
  schema: copilotExecutionInputSchema,
  description:
    "Explicit confirm-or-escalate execution input for bounded copilot actions.",
  traceability: ["CJ-010", "EP-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
  ],
});

export const copilotExecutionResultContract = defineContract({
  id: "copilot.execution_result",
  name: "CopilotExecutionResult",
  kind: "dto",
  domain: "copilot",
  schemaVersion,
  schema: copilotExecutionResultSchema,
  description:
    "Execution result for confirmable copilot actions with audit linkage and reusable channel-delivery seam metadata.",
  traceability: ["CJ-010", "EP-003", "EP-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const copilotRecommendationPrioritySchema = z.enum(["critical", "high", "medium"]);
export const copilotRecommendationCategorySchema = z.enum([
  "climate",
  "marketplace",
  "transport",
]);
export const copilotRecommendationActionKindSchema = z.enum([
  "workflow_command",
  "transport_endpoint",
  "open_route",
]);
export const copilotRecommendationDeliveryChannelSchema = z.enum(["web", "whatsapp", "sms"]);

export const copilotRecommendationChannelSeamSchema = z
  .object({
    delivery_key: z.string().min(3).max(120),
    fallback_channels: z.array(copilotRecommendationDeliveryChannelSchema).default([]),
    supported_channels: z.array(copilotRecommendationDeliveryChannelSchema).min(1),
    web_label: z.string().min(3).max(120),
  })
  .strict();

export const copilotRecommendationTransportEndpointSchema = z
  .object({
    method: z.literal("POST"),
    path: z.string().min(1),
  })
  .strict();

export const copilotRecommendationActionSchema = z
  .object({
    aggregate_ref: z.string().min(1),
    channel_seam: copilotRecommendationChannelSeamSchema,
    command_name: z.string().min(1).nullable().optional(),
    data_check_ids: z.array(z.string().min(1)).default([]),
    journey_ids: z.array(z.string().min(1)).default([]),
    kind: copilotRecommendationActionKindSchema,
    label: z.string().min(3).max(120),
    mutation_scope: z.string().min(1).nullable().optional(),
    payload: z.record(z.unknown()).default({}),
    requires_confirmation: z.boolean(),
    route: z.string().min(1).nullable().optional(),
    transport_endpoint: copilotRecommendationTransportEndpointSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.kind === "workflow_command" && (!value.command_name || !value.mutation_scope)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["command_name"],
        message: "workflow_command actions require command_name and mutation_scope",
      });
    }
    if (value.kind === "transport_endpoint" && !value.transport_endpoint) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transport_endpoint"],
        message: "transport_endpoint actions require transport endpoint metadata",
      });
    }
    if (value.kind === "open_route" && !value.route) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["route"],
        message: "open_route actions require route",
      });
    }
    if ((value.kind === "workflow_command" || value.kind === "transport_endpoint") && !value.requires_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requires_confirmation"],
        message: "mutating recommendations must stay behind confirmation",
      });
    }
  });

export const copilotRecommendationSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    recommendation_id: z.string().min(1),
    actor_id: actorIdSchema,
    role: membershipRoleSchema,
    country_code: countryCodeSchema,
    title: z.string().min(3).max(160),
    summary: z.string().min(12).max(400),
    rationale: z.string().min(12).max(400),
    priority: copilotRecommendationPrioritySchema,
    category: copilotRecommendationCategorySchema,
    source_domains: z.array(z.string().min(2).max(64)).min(1),
    source_refs: z.array(z.string().min(1)).min(1),
    guardrails: z.array(z.string().min(3).max(200)).min(1),
    action: copilotRecommendationActionSchema,
    created_at: isoTimestampSchema,
  })
  .strict();

export const copilotRecommendationCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    supports_non_web_delivery: z.literal(true),
    items: z.array(copilotRecommendationSchema),
  })
  .strict();

export const copilotEvaluationCheckSchema = z
  .object({
    check: z.string().min(3).max(120),
    passed: z.boolean(),
    detail: z.string().min(3).max(240),
  })
  .strict();

export const copilotEvaluationScenarioSchema = z
  .object({
    scenario_id: z.string().min(1),
    actor_id: actorIdSchema,
    role: membershipRoleSchema,
    expected_action_kinds: z.array(copilotRecommendationActionKindSchema).min(1),
    checks: z.array(copilotEvaluationCheckSchema).min(1),
    passed: z.boolean(),
  })
  .strict();

export const copilotEvaluationReportSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    evaluator_version: z.string().min(3).max(80),
    evaluated_at: isoTimestampSchema,
    scenarios: z.array(copilotEvaluationScenarioSchema).min(1),
  })
  .strict();

export type CopilotRecommendationAction = z.infer<typeof copilotRecommendationActionSchema>;
export type CopilotRecommendation = z.infer<typeof copilotRecommendationSchema>;
export type CopilotRecommendationCollection = z.infer<
  typeof copilotRecommendationCollectionSchema
>;
export type CopilotEvaluationCheck = z.infer<typeof copilotEvaluationCheckSchema>;
export type CopilotEvaluationScenario = z.infer<typeof copilotEvaluationScenarioSchema>;
export type CopilotEvaluationReport = z.infer<typeof copilotEvaluationReportSchema>;

export const copilotRecommendationContract = defineContract({
  id: "copilot.recommendation",
  name: "CopilotRecommendation",
  kind: "dto",
  domain: "copilot",
  schemaVersion,
  schema: copilotRecommendationSchema,
  description:
    "Bounded proactive recommendation payload joining live role context, guardrails, and an explicitly typed action seam.",
  traceability: ["CJ-010", "EP-003", "EP-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const copilotRecommendationCollectionContract = defineContract({
  id: "copilot.recommendation_collection",
  name: "CopilotRecommendationCollection",
  kind: "dto",
  domain: "copilot",
  schemaVersion,
  schema: copilotRecommendationCollectionSchema,
  description:
    "Recommendation collection payload proving the copilot contract is channel-aware and not architecturally web-only.",
  traceability: ["CJ-010", "EP-003", "EP-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const copilotEvaluationReportContract = defineContract({
  id: "copilot.evaluation_report",
  name: "CopilotEvaluationReport",
  kind: "dto",
  domain: "copilot",
  schemaVersion,
  schema: copilotEvaluationReportSchema,
  description:
    "Deterministic evaluator report covering role scenarios, supported action kinds, and confirmation safety checks.",
  traceability: ["CJ-010", "EP-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});
