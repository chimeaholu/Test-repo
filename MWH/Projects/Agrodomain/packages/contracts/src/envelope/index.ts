import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  causationIdSchema,
  channelSchema,
  correlationIdSchema,
  countryCodeSchema,
  idempotencyKeySchema,
  isoTimestampSchema,
  reasonCodeSchema,
  requestIdSchema,
  schemaVersionLiteral,
  traceabilityMetadataSchema,
} from "../common/primitives.js";
import { errorCodeSchema } from "../errors/index.js";

export const requestMetadataSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    request_id: requestIdSchema,
    idempotency_key: idempotencyKeySchema,
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    channel: channelSchema,
    correlation_id: correlationIdSchema,
    causation_id: causationIdSchema.optional(),
    occurred_at: isoTimestampSchema,
    traceability: traceabilityMetadataSchema,
  })
  .strict();

export const requestEnvelopeSchema = z
  .object({
    metadata: requestMetadataSchema,
    command: z
      .object({
        name: z.string().min(1),
        aggregate_ref: z.string().min(1),
        mutation_scope: z.string().min(1),
        payload: z.record(z.string(), z.unknown()),
      })
      .strict(),
  })
  .strict();

export const requestCommandSchema = requestEnvelopeSchema.shape.command;

export const errorDetailSchema = z
  .object({
    code: errorCodeSchema,
    reason_code: reasonCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
  })
  .strict();

export const responseMetadataSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    request_id: requestIdSchema,
    correlation_id: correlationIdSchema,
    causation_id: causationIdSchema,
    emitted_at: isoTimestampSchema,
  })
  .strict();

export const responseEnvelopeSchema = z
  .object({
    metadata: responseMetadataSchema,
    status: z.enum(["accepted", "completed", "rejected"]),
    data: z.record(z.string(), z.unknown()).optional(),
    error: errorDetailSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejected responses require error details",
        path: ["error"],
      });
    }
  });

export const eventEnvelopeSchema = z
  .object({
    metadata: z
      .object({
        schema_version: schemaVersionLiteral,
        event_id: z.string().min(1),
        event_type: z.string().min(1),
        request_id: requestIdSchema,
        correlation_id: correlationIdSchema,
        causation_id: causationIdSchema,
        actor_id: actorIdSchema,
        country_code: countryCodeSchema,
        channel: channelSchema,
        occurred_at: isoTimestampSchema,
        traceability: traceabilityMetadataSchema,
      })
      .strict(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export const requestEnvelopeContract = defineContract({
  id: "envelope.request",
  name: "RequestEnvelope",
  kind: "request",
  domain: "envelope",
  schemaVersion,
  schema: requestEnvelopeSchema,
  description:
    "Universal mutation request envelope with idempotency, actor, country, channel, and correlation metadata.",
  traceability: ["AIJ-002", "IDI-003"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "legacy/staging-runtime/src/agro_v2/tool_contracts.py",
  ],
});

export const responseEnvelopeContract = defineContract({
  id: "envelope.response",
  name: "ResponseEnvelope",
  kind: "response",
  domain: "envelope",
  schemaVersion,
  schema: responseEnvelopeSchema,
  description: "Universal command response envelope with strict success and rejection semantics.",
  traceability: ["AIJ-002", "IDI-003"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "legacy/staging-runtime/src/agro_v2/tool_contracts.py",
  ],
});

export const eventEnvelopeContract = defineContract({
  id: "envelope.event",
  name: "EventEnvelope",
  kind: "event",
  domain: "envelope",
  schemaVersion,
  schema: eventEnvelopeSchema,
  description: "Canonical append-only event envelope for audit, outbox, and cross-channel propagation.",
  traceability: ["AIJ-002", "IDI-003"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "legacy/staging-runtime/src/agro_v2/tool_contracts.py",
  ],
});
