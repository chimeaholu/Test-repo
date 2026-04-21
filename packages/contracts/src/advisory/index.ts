import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  channelSchema,
  correlationIdSchema,
  countryCodeSchema,
  isoTimestampSchema,
  localeSchema,
  reasonCodeSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";
import { membershipRoleSchema } from "../identity/index.js";

export const advisoryConfidenceBandSchema = z.enum(["low", "medium", "high"]);
export const reviewerOutcomeSchema = z.enum(["approve", "revise", "block", "hitl_required"]);
export const advisoryDeliveryStatusSchema = z.enum([
  "ready",
  "delivered",
  "revised",
  "blocked",
  "hitl_required",
]);

export const advisoryTranscriptEntrySchema = z
  .object({
    speaker: z.enum(["user", "assistant", "reviewer", "system"]),
    message: z.string().min(1).max(2000),
    captured_at: isoTimestampSchema,
    channel: channelSchema,
  })
  .strict();

export const advisoryPolicyContextSchema = z
  .object({
    crop: z.string().min(2).max(80).nullable().optional(),
    farm_profile_id: z.string().min(1).nullable().optional(),
    region: z.string().min(2).max(80).nullable().optional(),
    sensitive_topics: z.array(z.string().min(2).max(80)).default([]),
  })
  .strict();

export const advisoryRequestInputSchema = z
  .object({
    advisory_conversation_id: z.string().min(1).nullable().optional(),
    topic: z.string().min(3).max(120),
    question_text: z.string().min(12).max(2000),
    locale: localeSchema,
    transcript_entries: z.array(advisoryTranscriptEntrySchema).max(20).default([]),
    policy_context: advisoryPolicyContextSchema.default({ sensitive_topics: [] }),
  })
  .strict();

export const advisoryCitationSchema = z
  .object({
    source_id: z.string().min(1),
    title: z.string().min(3).max(160),
    source_type: z.enum(["policy", "extension", "weather", "manual"]),
    locale: localeSchema,
    country_code: countryCodeSchema,
    citation_url: z.string().url().nullable(),
    published_at: isoTimestampSchema,
    excerpt: z.string().min(12).max(400),
    method_tag: z.string().min(2).max(64),
  })
  .strict();

export const reviewerDecisionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    advisory_request_id: z.string().min(1),
    decision_id: z.string().min(1),
    actor_id: actorIdSchema,
    actor_role: membershipRoleSchema,
    outcome: reviewerOutcomeSchema,
    reason_code: reasonCodeSchema,
    note: z.string().min(3).max(500).nullable().optional(),
    transcript_link: z.string().min(1).nullable().optional(),
    policy_context: z
      .object({
        matched_policy: z.string().min(1).nullable().optional(),
        confidence_threshold: z.number().min(0).max(1),
        policy_sensitive: z.boolean(),
      })
      .strict(),
    created_at: isoTimestampSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.outcome === "approve" && value.policy_context.policy_sensitive) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["policy_context", "policy_sensitive"],
        message: "policy-sensitive advice cannot be auto-approved without HITL",
      });
    }
  });

export const advisoryResponseSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    advisory_request_id: z.string().min(1),
    advisory_conversation_id: z.string().min(1),
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    locale: localeSchema,
    topic: z.string().min(3).max(120),
    question_text: z.string().min(12).max(2000),
    response_text: z.string().min(12).max(4000),
    status: advisoryDeliveryStatusSchema,
    confidence_band: advisoryConfidenceBandSchema,
    confidence_score: z.number().min(0).max(1),
    grounded: z.boolean(),
    citations: z.array(advisoryCitationSchema),
    transcript_entries: z.array(advisoryTranscriptEntrySchema).min(1),
    reviewer_decision: reviewerDecisionSchema,
    source_ids: z.array(z.string().min(1)),
    model_name: z.string().min(2).max(80),
    model_version: z.string().min(2).max(80),
    correlation_id: correlationIdSchema,
    request_id: requestIdSchema,
    delivered_at: isoTimestampSchema.nullable(),
    created_at: isoTimestampSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.grounded && value.citations.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["citations"],
        message: "grounded advisory responses require at least one citation",
      });
    }
    if (value.grounded && value.source_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source_ids"],
        message: "grounded advisory responses require source identifiers",
      });
    }
    if (value.status === "delivered" && value.reviewer_decision.outcome === "hitl_required") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "HITL-required responses cannot be marked delivered",
      });
    }
  });

export const advisoryConversationCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    items: z.array(advisoryResponseSchema),
  })
  .strict();

export const reviewerDecisionInputSchema = z
  .object({
    advisory_request_id: z.string().min(1),
    outcome: reviewerOutcomeSchema,
    reason_code: reasonCodeSchema,
    note: z.string().min(3).max(500).nullable().optional(),
    transcript_link: z.string().min(1).nullable().optional(),
  })
  .strict();

export const advisoryRequestInputContract = defineContract({
  id: "advisory.advisory_request_input",
  name: "AdvisoryRequestInput",
  kind: "dto",
  domain: "advisory",
  schemaVersion,
  schema: advisoryRequestInputSchema,
  description:
    "Canonical advisory query payload with locale, transcript context, and policy-context hints for grounded retrieval.",
  traceability: ["CJ-005", "DI-005"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
    "v2-planning/AGRO-V2-PRD.md",
  ],
});

export const advisoryCitationContract = defineContract({
  id: "advisory.advisory_citation",
  name: "AdvisoryCitation",
  kind: "dto",
  domain: "advisory",
  schemaVersion,
  schema: advisoryCitationSchema,
  description: "Vetted citation payload attached to grounded advisory responses.",
  traceability: ["CJ-005", "DI-005"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
  ],
});

export const reviewerDecisionContract = defineContract({
  id: "advisory.reviewer_decision",
  name: "ReviewerDecision",
  kind: "dto",
  domain: "advisory",
  schemaVersion,
  schema: reviewerDecisionSchema,
  description:
    "Reviewer decision payload enforcing approve, revise, block, and hitl_required outcomes with role and policy metadata.",
  traceability: ["CJ-005", "EP-006", "DI-005"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
  ],
});

export const advisoryResponseContract = defineContract({
  id: "advisory.advisory_response",
  name: "AdvisoryResponse",
  kind: "dto",
  domain: "advisory",
  schemaVersion,
  schema: advisoryResponseSchema,
  description:
    "Grounded advisory response payload with citations, confidence indicators, transcript metadata, and reviewer state.",
  traceability: ["CJ-005", "RJ-003", "DI-005"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
    "v2-planning/AGRO-V2-TEST-PLAN.md",
  ],
});

export const advisoryConversationCollectionContract = defineContract({
  id: "advisory.advisory_conversation_collection",
  name: "AdvisoryConversationCollection",
  kind: "dto",
  domain: "advisory",
  schemaVersion,
  schema: advisoryConversationCollectionSchema,
  description: "Conversation history read model for advisory requests and responses.",
  traceability: ["CJ-005", "RJ-003", "DI-005"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
  ],
});

export const reviewerDecisionInputContract = defineContract({
  id: "advisory.reviewer_decision_input",
  name: "ReviewerDecisionInput",
  kind: "dto",
  domain: "advisory",
  schemaVersion,
  schema: reviewerDecisionInputSchema,
  description: "Manual reviewer command payload used to enforce explicit HITL transitions for advisory responses.",
  traceability: ["CJ-005", "EP-006", "DI-005"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n4-wave4-advisory-reviewer-climate-tranche.md",
  ],
});
