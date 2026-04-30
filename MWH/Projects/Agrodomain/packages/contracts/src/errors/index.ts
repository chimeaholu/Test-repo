import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import { reasonCodeSchema, schemaVersionLiteral } from "../common/primitives.js";

export const errorCodeSchema = z.enum([
  "invalid_schema",
  "unknown_tool",
  "missing_consent",
  "policy_denied",
  "policy_hitl_required",
  "country_not_supported",
  "channel_not_supported",
  "delivery_failed",
  "session_timeout",
  "offline_conflict",
  "idempotency_conflict",
  "grounded_response_ready",
  "low_confidence_sources",
  "policy_sensitive_guidance",
  "revision_needed_for_clarity",
]);

export const reasonCatalogSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    reason_codes: z
      .array(
        z
          .object({
            code: reasonCodeSchema,
            category: z.enum(["validation", "policy", "channel", "delivery", "conflict"]),
            retryable: z.boolean(),
            description: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const reasonCatalogContract = defineContract({
  id: "errors.reason_catalog",
  name: "ReasonCatalog",
  kind: "catalog",
  domain: "errors",
  schemaVersion,
  schema: reasonCatalogSchema,
  description: "Central error and reason catalog shared across request, policy, and channel contracts.",
  traceability: ["AIJ-002", "IDI-003"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "legacy/staging-runtime/src/agro_v2/tool_contracts.py",
  ],
});

export const reasonCatalog = reasonCatalogContract.schema.parse({
  schema_version: schemaVersion,
  reason_codes: [
    {
      code: "invalid_schema",
      category: "validation",
      retryable: false,
      description: "Payload failed strict validation or required schema_version checks.",
    },
    {
      code: "unknown_tool",
      category: "validation",
      retryable: false,
      description: "Fail-closed rejection for unregistered tool or command names.",
    },
    {
      code: "missing_consent",
      category: "policy",
      retryable: false,
      description: "Regulated mutation blocked until consent status is granted.",
    },
    {
      code: "policy_denied",
      category: "policy",
      retryable: false,
      description: "Policy engine denied the operation for role, country, or rule reasons.",
    },
    {
      code: "policy_hitl_required",
      category: "policy",
      retryable: true,
      description: "Operation requires human approval before it can proceed.",
    },
    {
      code: "country_not_supported",
      category: "policy",
      retryable: false,
      description: "Country pack is not available for the requested country or locale.",
    },
    {
      code: "channel_not_supported",
      category: "channel",
      retryable: false,
      description: "Requested channel is not supported by the country pack or feature profile.",
    },
    {
      code: "delivery_failed",
      category: "delivery",
      retryable: true,
      description: "Primary delivery failed and fallback or replay may be required.",
    },
    {
      code: "session_timeout",
      category: "delivery",
      retryable: true,
      description: "Interactive channel session expired before the operation completed.",
    },
    {
      code: "offline_conflict",
      category: "conflict",
      retryable: true,
      description: "Offline replay detected a conflict that requires reconciliation metadata.",
    },
    {
      code: "idempotency_conflict",
      category: "conflict",
      retryable: true,
      description: "Idempotency key has already been applied for the given mutation scope.",
    },
    {
      code: "grounded_response_ready",
      category: "policy",
      retryable: false,
      description: "Grounded advisory response met citation and confidence requirements for delivery.",
    },
    {
      code: "low_confidence_sources",
      category: "policy",
      retryable: true,
      description: "Grounded advisory response lacks enough vetted source confidence for direct delivery.",
    },
    {
      code: "policy_sensitive_guidance",
      category: "policy",
      retryable: true,
      description: "Advice touches a policy-sensitive topic and requires human review before delivery.",
    },
    {
      code: "revision_needed_for_clarity",
      category: "policy",
      retryable: true,
      description: "Grounded draft exists, but reviewer policy requires clarification before delivery.",
    },
  ],
});
