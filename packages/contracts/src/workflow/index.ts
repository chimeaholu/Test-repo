import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  countryCodeSchema,
  isoTimestampSchema,
  reasonCodeSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";
import { membershipRoleSchema } from "../identity/index.js";

export const workflowStateSchema = z.enum([
  "draft",
  "active",
  "blocked",
  "completed",
  "cancelled",
]);

export const workflowInstanceSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    workflow_id: z.string().min(1),
    workflow_type: z.string().min(1),
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    state: workflowStateSchema,
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
  })
  .strict();

export const workflowStepSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    workflow_id: z.string().min(1),
    step_id: z.string().min(1),
    step_type: z.string().min(1),
    status: z.enum(["pending", "in_progress", "completed", "blocked"]),
    blocked_reason_code: reasonCodeSchema.nullable().optional(),
    completed_at: isoTimestampSchema.nullable().optional(),
  })
  .strict();

export const policyDecisionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    tool_name: z.string().min(1),
    actor_role: membershipRoleSchema,
    country_code: countryCodeSchema,
    risk_score: z.number().int().min(0).max(100),
    hitl_approved: z.boolean(),
    request_id: requestIdSchema,
    decision: z.enum(["allow", "deny", "challenge"]),
    reason_code: reasonCodeSchema,
    hitl_required: z.boolean(),
    matched_rule: z.string().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.decision === "challenge" && !value.hitl_required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "challenge decisions must mark hitl_required=true",
        path: ["hitl_required"],
      });
    }
  });

export const workflowInstanceContract = defineContract({
  id: "workflow.instance",
  name: "WorkflowInstance",
  kind: "dto",
  domain: "workflow",
  schemaVersion,
  schema: workflowInstanceSchema,
  description: "Canonical workflow instance shared across identity, marketplace, and audit boundaries.",
  traceability: ["CJ-001", "EP-007"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const workflowStepContract = defineContract({
  id: "workflow.step",
  name: "WorkflowStep",
  kind: "dto",
  domain: "workflow",
  schemaVersion,
  schema: workflowStepSchema,
  description: "Workflow step snapshot with explicit blocked reason metadata.",
  traceability: ["CJ-001", "EP-007"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const policyDecisionContract = defineContract({
  id: "workflow.policy_decision",
  name: "PolicyDecision",
  kind: "dto",
  domain: "workflow",
  schemaVersion,
  schema: policyDecisionSchema,
  description: "Policy decision contract with reason codes and HITL semantics.",
  traceability: ["CJ-001", "EP-007", "DI-004"],
  sourceArtifacts: [
    "execution/contracts/b002_identity_consent_contract.json",
    "legacy/staging-runtime/src/agro_v2/policy_guardrails.py",
  ],
});
