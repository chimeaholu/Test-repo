import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  channelSchema,
  correlationIdSchema,
  countryCodeSchema,
  idempotencyKeySchema,
  isoTimestampSchema,
  reasonCodeSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

const currencySchema = z.string().regex(/^[A-Z]{3}$/u);
const actorRoleSchema = z.enum(["farmer", "buyer", "cooperative", "advisor", "finance", "finance_ops", "admin"]);
const decisionSourceSchema = z.enum(["partner", "operator"]);
const financeProductTypeSchema = z.enum(["invoice_advance", "working_capital", "input_credit"]);
const financeRequestStatusSchema = z.enum([
  "pending_partner",
  "pending_review",
  "partner_approved",
  "partner_declined",
  "blocked",
  "hitl_required",
]);
const financeQueueStatusSchema = z.enum(["pending_review", "approved", "blocked", "hitl_required"]);
const climateSignalSchema = z.enum(["rainfall_mm", "temperature_c", "soil_moisture_pct", "anomaly_score"]);
const comparatorSchema = z.enum(["gte", "lte"]);
const evidenceValidationStateSchema = z.enum(["pending_validation", "validated", "rejected"]);
const traceMilestoneSchema = z.enum([
  "harvested",
  "handoff_confirmed",
  "dispatched",
  "in_transit",
  "delivered",
  "exception_logged",
]);

const responsibilityBoundarySchema = z
  .object({
    owner: z.enum(["partner", "internal", "shared"]),
    internal_can_prepare: z.boolean(),
    internal_can_block: z.boolean(),
    internal_can_approve: z.boolean(),
    partner_decision_required: z.boolean(),
  })
  .strict();

const policyContextSchema = z
  .object({
    policy_id: z.string().min(1),
    policy_version: z.string().min(1),
    matched_rule: z.string().min(1).nullable(),
    requires_hitl: z.boolean(),
  })
  .strict();

const transcriptEntrySchema = z
  .object({
    speaker: z.string().min(1),
    message: z.string().min(1).max(500),
    channel: channelSchema,
    captured_at: isoTimestampSchema,
  })
  .strict();

const climateSourceReferenceSchema = z
  .object({
    source_id: z.string().min(1),
    source_type: z.string().min(1).max(64),
    observation_id: z.string().min(1).nullable(),
    observed_at: isoTimestampSchema,
  })
  .strict();

export const financePartnerRequestInputSchema = z
  .object({
    case_reference: z.string().min(1),
    product_type: financeProductTypeSchema,
    requested_amount: z.number().positive(),
    currency: currencySchema,
    partner_id: z.string().min(1),
    partner_reference_id: z.string().min(1).max(128).nullable().optional(),
    actor_role: actorRoleSchema,
    responsibility_boundary: responsibilityBoundarySchema,
    policy_context: policyContextSchema,
    transcript_entries: z.array(transcriptEntrySchema).default([]),
  })
  .strict();

export const financeDecisionInputSchema = z
  .object({
    finance_request_id: z.string().min(1),
    decision_source: decisionSourceSchema,
    outcome: z.enum(["approved", "declined", "blocked", "hitl_required"]),
    actor_role: actorRoleSchema,
    reason_code: reasonCodeSchema,
    note: z.string().min(3).max(300).nullable().optional(),
    partner_reference_id: z.string().min(1).max(128).nullable().optional(),
    transcript_link: z.string().min(1).max(255).nullable().optional(),
  })
  .strict();

export const insuranceTriggerEvaluationInputSchema = z
  .object({
    trigger_id: z.string().min(1),
    partner_id: z.string().min(1),
    partner_reference_id: z.string().min(1).max(128).nullable().optional(),
    actor_role: actorRoleSchema,
    product_code: z.string().min(1).max(64),
    climate_signal: climateSignalSchema,
    comparator: comparatorSchema,
    threshold_value: z.number(),
    threshold_unit: z.string().min(1).max(32),
    evaluation_window_hours: z.number().int().positive(),
    threshold_source_id: z.string().min(1),
    threshold_source_type: z.string().min(1).max(64),
    threshold_source_reference: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    observed_value: z.number(),
    source_event_id: z.string().min(1),
    source_observation_id: z.string().min(1).nullable().optional(),
    observed_at: isoTimestampSchema,
    payout_amount: z.number().positive(),
    payout_currency: currencySchema,
    policy_context: policyContextSchema,
  })
  .strict();

export const financePartnerRequestSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    finance_request_id: z.string().min(1),
    request_id: requestIdSchema,
    idempotency_key: idempotencyKeySchema,
    actor_id: actorIdSchema,
    actor_role: actorRoleSchema,
    country_code: countryCodeSchema,
    channel: channelSchema,
    correlation_id: correlationIdSchema,
    case_reference: z.string().min(1),
    product_type: financeProductTypeSchema,
    requested_amount: z.number().positive(),
    currency: currencySchema,
    partner_id: z.string().min(1),
    partner_reference_id: z.string().min(1).max(128).nullable(),
    status: financeRequestStatusSchema,
    responsibility_boundary: responsibilityBoundarySchema,
    policy_context: policyContextSchema,
    transcript_entries: z.array(transcriptEntrySchema),
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
  })
  .strict();

export const financeDecisionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    decision_id: z.string().min(1),
    finance_request_id: z.string().min(1),
    request_id: requestIdSchema,
    actor_id: actorIdSchema,
    actor_role: actorRoleSchema,
    decision_source: decisionSourceSchema,
    outcome: z.enum(["approved", "declined", "blocked", "hitl_required"]),
    reason_code: reasonCodeSchema,
    note: z.string().max(300).nullable(),
    partner_reference_id: z.string().max(128).nullable(),
    responsibility_boundary: responsibilityBoundarySchema,
    policy_context: policyContextSchema,
    transcript_link: z.string().max(255).nullable(),
    decided_at: isoTimestampSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.outcome === "approved" && value.decision_source !== "partner") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "approved finance decisions require an explicit partner source",
        path: ["decision_source"],
      });
    }
  });

export const financeReviewQueueItemSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    queue_item_id: z.string().min(1),
    finance_request_id: z.string().min(1),
    partner_id: z.string().min(1),
    partner_reference_id: z.string().max(128).nullable(),
    actor_id: actorIdSchema,
    actor_role: actorRoleSchema,
    country_code: countryCodeSchema,
    status: financeQueueStatusSchema,
    responsibility_boundary: responsibilityBoundarySchema,
    policy_context: policyContextSchema,
    summary: z.string().min(3).max(240),
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
  })
  .strict();

export const financeReviewDetailSchema = financeReviewQueueItemSchema
  .extend({
    request: financePartnerRequestSchema,
    decisions: z.array(financeDecisionSchema),
  })
  .strict();

export const financeApprovalActionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    finance_request_id: z.string().min(1),
    action: z.enum(["approve", "block", "escalate"]),
    actor_id: actorIdSchema,
    actor_role: actorRoleSchema,
    note: z.string().min(3).max(300).nullable(),
    created_at: isoTimestampSchema,
  })
  .strict();

export const insuranceTriggerRegistrySchema = z
  .object({
    schema_version: schemaVersionLiteral,
    trigger_id: z.string().min(1),
    actor_id: actorIdSchema,
    actor_role: actorRoleSchema,
    country_code: countryCodeSchema,
    partner_id: z.string().min(1),
    partner_reference_id: z.string().max(128).nullable(),
    product_code: z.string().min(1).max(64),
    climate_signal: climateSignalSchema,
    comparator: comparatorSchema,
    threshold_value: z.number(),
    threshold_unit: z.string().min(1).max(32),
    evaluation_window_hours: z.number().int().positive(),
    threshold_source_id: z.string().min(1),
    threshold_source_type: z.string().min(1).max(64),
    threshold_source_reference: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    payout_amount: z.number().positive(),
    payout_currency: currencySchema,
    policy_context: policyContextSchema,
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
  })
  .strict();

export const insuranceTriggerEvaluationSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    evaluation_id: z.string().min(1),
    trigger_id: z.string().min(1),
    request_id: requestIdSchema,
    idempotency_key: idempotencyKeySchema,
    actor_id: actorIdSchema,
    actor_role: actorRoleSchema,
    country_code: countryCodeSchema,
    source_event_id: z.string().min(1),
    source_observation_id: z.string().min(1).nullable(),
    climate_source_reference: climateSourceReferenceSchema,
    observed_value: z.number(),
    threshold_value: z.number(),
    evaluation_state: z.enum(["no_payout", "payout_emitted", "duplicate_payout"]),
    triggered: z.boolean(),
    payout_dedupe_key: z.string().min(1),
    partner_reference_id: z.string().max(128).nullable(),
    evaluated_at: isoTimestampSchema,
  })
  .strict();

export const insurancePayoutEventSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    payout_event_id: z.string().min(1),
    trigger_id: z.string().min(1),
    evaluation_id: z.string().min(1),
    actor_id: actorIdSchema,
    actor_role: actorRoleSchema,
    country_code: countryCodeSchema,
    partner_id: z.string().min(1),
    partner_reference_id: z.string().max(128).nullable(),
    payout_dedupe_key: z.string().min(1),
    payout_amount: z.number().positive(),
    payout_currency: currencySchema,
    climate_source_reference: climateSourceReferenceSchema,
    created_at: isoTimestampSchema,
  })
  .strict();

export const evidenceAttachmentSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    evidence_attachment_id: z.string().min(1),
    trace_event_id: z.string().min(1),
    consignment_id: z.string().min(1),
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    media_type: z.string().min(1).max(64),
    file_name: z.string().min(1).max(160),
    storage_url: z.string().url(),
    checksum_sha256: z.string().length(64),
    validation_state: evidenceValidationStateSchema,
    captured_at: isoTimestampSchema,
    created_at: isoTimestampSchema,
  })
  .strict();

const sourceArtifacts = [
  "execution/specs/2026-04-18-n5-wave5-finance-insurance-traceability-tranche.md",
] as const;

export const financePartnerRequestInputContract = defineContract({
  id: "finance.finance_partner_request_input",
  name: "FinancePartnerRequestInput",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: financePartnerRequestInputSchema,
  description: "Canonical finance partner request payload with responsibility-boundary and policy metadata.",
  traceability: ["CJ-004", "DI-003"],
  sourceArtifacts,
});

export const financeDecisionInputContract = defineContract({
  id: "finance.finance_decision_input",
  name: "FinanceDecisionInput",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: financeDecisionInputSchema,
  description: "Partner or operator finance decision input preserving source, actor-role, and transcript linkage.",
  traceability: ["CJ-004", "CJ-008", "DI-003"],
  sourceArtifacts,
});

export const insuranceTriggerEvaluationInputContract = defineContract({
  id: "finance.insurance_trigger_evaluation_input",
  name: "InsuranceTriggerEvaluationInput",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: insuranceTriggerEvaluationInputSchema,
  description: "Parametric insurance trigger evaluation input carrying threshold-source provenance and payout configuration.",
  traceability: ["EP-008", "DI-006"],
  sourceArtifacts,
});

export const financePartnerRequestContract = defineContract({
  id: "finance.finance_partner_request",
  name: "FinancePartnerRequest",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: financePartnerRequestSchema,
  description: "Persisted finance partner request DTO used by review and partner-bound decision flows.",
  traceability: ["CJ-004", "DI-003"],
  sourceArtifacts,
});

export const financeDecisionContract = defineContract({
  id: "finance.finance_decision",
  name: "FinanceDecision",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: financeDecisionSchema,
  description: "Finance decision DTO that forbids internal approval shortcuts and preserves accountability fields.",
  traceability: ["CJ-004", "CJ-008", "DI-003"],
  sourceArtifacts,
});

export const financeReviewQueueItemContract = defineContract({
  id: "finance.finance_review_queue_item",
  name: "FinanceReviewQueueItem",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: financeReviewQueueItemSchema,
  description: "Operator queue item for finance and insurance review surfaces.",
  traceability: ["CJ-008", "DI-003"],
  sourceArtifacts,
});

export const financeReviewDetailContract = defineContract({
  id: "finance.finance_review_detail",
  name: "FinanceReviewDetail",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: financeReviewDetailSchema,
  description: "Detailed review payload combining finance request context and decision history.",
  traceability: ["CJ-008", "DI-003"],
  sourceArtifacts,
});

export const financeApprovalActionContract = defineContract({
  id: "finance.finance_approval_action",
  name: "FinanceApprovalAction",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: financeApprovalActionSchema,
  description: "Actor-attributed finance approval action DTO for HITL console workflows.",
  traceability: ["CJ-008", "DI-003"],
  sourceArtifacts,
});

export const insuranceTriggerRegistryContract = defineContract({
  id: "finance.insurance_trigger_registry",
  name: "InsuranceTriggerRegistry",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: insuranceTriggerRegistrySchema,
  description: "Insurance trigger registry DTO preserving threshold source metadata and payout setup.",
  traceability: ["EP-008", "DI-006"],
  sourceArtifacts,
});

export const insuranceTriggerEvaluationContract = defineContract({
  id: "finance.insurance_trigger_evaluation",
  name: "InsuranceTriggerEvaluation",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: insuranceTriggerEvaluationSchema,
  description: "Insurance trigger evaluation outcome DTO with payout dedupe markers and climate-source references.",
  traceability: ["EP-008", "DI-006"],
  sourceArtifacts,
});

export const insurancePayoutEventContract = defineContract({
  id: "finance.insurance_payout_event",
  name: "InsurancePayoutEvent",
  kind: "dto",
  domain: "finance",
  schemaVersion,
  schema: insurancePayoutEventSchema,
  description: "Payout event DTO with immutable provenance back to the trigger evaluation and climate source.",
  traceability: ["CJ-004", "EP-008", "DI-006"],
  sourceArtifacts,
});

export const evidenceAttachmentContract = defineContract({
  id: "traceability.evidence_attachment",
  name: "EvidenceAttachment",
  kind: "dto",
  domain: "traceability",
  schemaVersion,
  schema: evidenceAttachmentSchema,
  description: "Evidence attachment DTO scoped to a trace event and consignment with validation visibility.",
  traceability: ["CJ-007", "DI-006"],
  sourceArtifacts,
});

export type FinancePartnerRequestInput = z.infer<typeof financePartnerRequestInputSchema>;
export type FinanceDecisionInput = z.infer<typeof financeDecisionInputSchema>;
export type InsuranceTriggerEvaluationInput = z.infer<typeof insuranceTriggerEvaluationInputSchema>;
export type FinancePartnerRequest = z.infer<typeof financePartnerRequestSchema>;
export type FinanceDecision = z.infer<typeof financeDecisionSchema>;
export type FinanceReviewQueueItem = z.infer<typeof financeReviewQueueItemSchema>;
export type FinanceReviewDetail = z.infer<typeof financeReviewDetailSchema>;
export type FinanceApprovalAction = z.infer<typeof financeApprovalActionSchema>;
export type InsuranceTriggerRegistry = z.infer<typeof insuranceTriggerRegistrySchema>;
export type InsuranceTriggerEvaluation = z.infer<typeof insuranceTriggerEvaluationSchema>;
export type InsurancePayoutEvent = z.infer<typeof insurancePayoutEventSchema>;
export type EvidenceAttachment = z.infer<typeof evidenceAttachmentSchema>;
