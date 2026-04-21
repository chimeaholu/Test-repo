import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  channelSchema,
  correlationIdSchema,
  countryCodeSchema,
  idempotencyKeySchema,
  isoTimestampSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

const sourceArtifacts = [
  "execution/specs/2026-04-18-n5-wave5-finance-insurance-traceability-tranche.md",
] as const;

const milestoneSchema = z.enum([
  "harvested",
  "handoff_confirmed",
  "dispatched",
  "in_transit",
  "delivered",
  "exception_logged",
]);

const consignmentStatusSchema = z.enum(["draft", "in_transit", "delivered", "exception"]);

export const consignmentCreateInputSchema = z
  .object({
    partner_reference_id: z.string().min(1).max(128).nullable().optional(),
    current_custody_actor_id: actorIdSchema.nullable().optional(),
  })
  .strict();

export const traceabilityEventAppendInputSchema = z
  .object({
    consignment_id: z.string().min(1),
    milestone: milestoneSchema,
    event_reference: z.string().min(1).max(128),
    previous_event_reference: z.string().min(1).max(128).nullable(),
    occurred_at: isoTimestampSchema,
    current_custody_actor_id: actorIdSchema.nullable().optional(),
  })
  .strict();

export const consignmentSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    consignment_id: z.string().min(1),
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    partner_reference_id: z.string().max(128).nullable(),
    status: consignmentStatusSchema,
    current_custody_actor_id: actorIdSchema.nullable(),
    correlation_id: correlationIdSchema,
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
  })
  .strict();

export const traceabilityEventSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    trace_event_id: z.string().min(1),
    consignment_id: z.string().min(1),
    actor_id: actorIdSchema,
    actor_role: z.string().min(1).max(32),
    country_code: countryCodeSchema,
    request_id: requestIdSchema,
    idempotency_key: idempotencyKeySchema,
    correlation_id: correlationIdSchema,
    causation_id: z.string().min(1).max(64).nullable(),
    milestone: milestoneSchema,
    event_reference: z.string().min(1).max(128),
    previous_event_reference: z.string().min(1).max(128).nullable(),
    order_index: z.number().int().positive(),
    occurred_at: isoTimestampSchema,
    created_at: isoTimestampSchema,
  })
  .strict();

export const traceabilityTimelineReadSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    consignment_id: z.string().min(1),
    channel: channelSchema,
    items: z.array(traceabilityEventSchema),
  })
  .strict();

export const consignmentCreateInputContract = defineContract({
  id: "traceability.consignment_create_input",
  name: "ConsignmentCreateInput",
  kind: "dto",
  domain: "traceability",
  schemaVersion,
  schema: consignmentCreateInputSchema,
  description: "Command payload for creating a new consignment aggregate.",
  traceability: ["CJ-007", "DI-006"],
  sourceArtifacts,
});

export const traceabilityEventAppendInputContract = defineContract({
  id: "traceability.traceability_event_append_input",
  name: "TraceabilityEventAppendInput",
  kind: "dto",
  domain: "traceability",
  schemaVersion,
  schema: traceabilityEventAppendInputSchema,
  description: "Append-only traceability event payload with continuity references.",
  traceability: ["CJ-007", "DI-006"],
  sourceArtifacts,
});

export const consignmentContract = defineContract({
  id: "traceability.consignment",
  name: "Consignment",
  kind: "dto",
  domain: "traceability",
  schemaVersion,
  schema: consignmentSchema,
  description: "Consignment aggregate read model for shipment proof surfaces.",
  traceability: ["CJ-007", "DI-006"],
  sourceArtifacts,
});

export const traceabilityEventContract = defineContract({
  id: "traceability.traceability_event",
  name: "TraceabilityEvent",
  kind: "dto",
  domain: "traceability",
  schemaVersion,
  schema: traceabilityEventSchema,
  description: "Immutable traceability event in the ordered append-only chain.",
  traceability: ["CJ-007", "DI-006"],
  sourceArtifacts,
});

export const traceabilityTimelineReadContract = defineContract({
  id: "traceability.traceability_timeline_read",
  name: "TraceabilityTimelineRead",
  kind: "dto",
  domain: "traceability",
  schemaVersion,
  schema: traceabilityTimelineReadSchema,
  description: "Ordered timeline projection for consignment event-chain reads.",
  traceability: ["CJ-007", "DI-006"],
  sourceArtifacts,
});

export type ConsignmentCreateInput = z.infer<typeof consignmentCreateInputSchema>;
export type TraceabilityEventAppendInput = z.infer<typeof traceabilityEventAppendInputSchema>;
export type Consignment = z.infer<typeof consignmentSchema>;
export type TraceabilityEvent = z.infer<typeof traceabilityEventSchema>;
