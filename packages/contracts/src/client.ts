import { z } from "zod";

import { schemaVersion } from "./common/contract.js";
import {
  causationIdSchema,
  correlationIdSchema,
  countryCodeSchema,
  idempotencyKeySchema,
  isoTimestampSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "./common/primitives.js";
import {
  errorDetailSchema,
  requestCommandSchema,
  requestEnvelopeSchema,
  responseEnvelopeSchema,
  responseMetadataSchema,
} from "./envelope/index.js";

export const actorRoleSchema = z.enum([
  "farmer",
  "buyer",
  "cooperative",
  "advisor",
  "finance",
  "admin",
]);

export const clientChannelSchema = z.enum(["pwa", "whatsapp", "ussd", "sms"]);

export const connectivityStateSchema = z.enum(["online", "offline", "degraded"]);

export const identityStateSchema = z.enum([
  "anonymous",
  "identified",
  "consent_pending",
  "consent_granted",
  "consent_revoked",
]);

export const conflictCodeSchema = z.enum([
  "version_mismatch",
  "duplicate_commit",
  "session_refresh_required",
  "session_revoked",
  "device_binding_changed",
  "policy_challenge",
]);

export const membershipSummarySchema = z
  .object({
    organization_id: z.string().min(1),
    organization_name: z.string().min(1),
    role: actorRoleSchema,
  })
  .strict();

export const clientConsentRecordSchema = z
  .object({
    actor_id: z.string().min(1),
    country_code: countryCodeSchema,
    state: identityStateSchema,
    policy_version: z.string().min(1).nullable(),
    scope_ids: z.array(z.string().min(1)),
    channel: clientChannelSchema.nullable(),
    captured_at: isoTimestampSchema.nullable(),
    revoked_at: isoTimestampSchema.nullable(),
  })
  .strict();

export const sessionActorSchema = z
  .object({
    actor_id: z.string().min(1),
    display_name: z.string().min(1),
    email: z.string().email(),
    role: actorRoleSchema,
    country_code: countryCodeSchema,
    locale: z.string().min(1),
    membership: membershipSummarySchema,
  })
  .strict();

export const identitySessionSchema = z
  .object({
    actor: sessionActorSchema,
    consent: clientConsentRecordSchema,
    available_roles: z.array(actorRoleSchema),
  })
  .strict();

export const signInPayloadSchema = z
  .object({
    display_name: z.string().min(1),
    email: z.string().email(),
    role: actorRoleSchema,
    country_code: countryCodeSchema,
  })
  .strict();

export const consentCapturePayloadSchema = z
  .object({
    policy_version: z.string().min(1),
    scope_ids: z.array(z.string().min(1)),
    captured_at: isoTimestampSchema,
  })
  .strict();

export const protectedActionStatusSchema = z
  .object({
    allowed: z.boolean(),
    reason_code: z.enum(["consent_required", "session_missing", "ok"]),
  })
  .strict();

export const offlineMutationPayloadSchema = z
  .object({
    workflow_id: z.string().min(1),
    intent: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export const requestEnvelopeMetadataSchema = requestEnvelopeSchema.shape.metadata;
export const responseEnvelopeMetadataSchema = responseMetadataSchema;

export const telemetryEventSchema = z
  .object({
    event: z.string().min(1),
    trace_id: z.string().min(1),
    timestamp: isoTimestampSchema,
    detail: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })
  .strict();

export type ActorRole = z.infer<typeof actorRoleSchema>;
export type Channel = z.infer<typeof clientChannelSchema>;
export type ConnectivityState = z.infer<typeof connectivityStateSchema>;
export type IdentityState = z.infer<typeof identityStateSchema>;
export type ConflictCode = z.infer<typeof conflictCodeSchema>;
export type MembershipSummary = z.infer<typeof membershipSummarySchema>;
export type ConsentRecord = z.infer<typeof clientConsentRecordSchema>;
export type SessionActor = z.infer<typeof sessionActorSchema>;
export type IdentitySession = z.infer<typeof identitySessionSchema>;
export type SignInPayload = z.infer<typeof signInPayloadSchema>;
export type ConsentCapturePayload = z.infer<typeof consentCapturePayloadSchema>;
export type ProtectedActionStatus = z.infer<typeof protectedActionStatusSchema>;
export type OfflineMutationPayload = z.infer<typeof offlineMutationPayloadSchema>;
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type RequestEnvelopeMetadata = z.infer<typeof requestEnvelopeMetadataSchema>;
export type RequestCommand<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  Omit<z.infer<typeof requestCommandSchema>, "payload"> & {
    payload: TPayload;
  };
export type ResponseEnvelopeMetadata = z.infer<typeof responseEnvelopeMetadataSchema>;
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export type RequestEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  Omit<z.infer<typeof requestEnvelopeSchema>, "command"> & {
    command: RequestCommand<TPayload>;
  };

export type ResponseEnvelope<TData = Record<string, unknown>> = {
  metadata: ResponseEnvelopeMetadata;
  status: "accepted" | "completed" | "rejected";
  data: TData;
  error?: ErrorDetail;
};

export const offlineQueueItemSchema = z
  .object({
    item_id: z.string().min(1),
    workflow_id: z.string().min(1),
    intent: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
    idempotency_key: idempotencyKeySchema,
    created_at: isoTimestampSchema,
    attempt_count: z.number().int().min(0),
    state: z.enum([
      "queued",
      "replaying",
      "acked",
      "failed_retryable",
      "failed_terminal",
      "cancelled",
      "conflicted",
    ]),
    last_error_code: z.string().min(1).nullable(),
    conflict_code: conflictCodeSchema.nullable(),
    result_ref: z.string().min(1).nullable(),
    envelope: requestEnvelopeSchema.extend({
      metadata: requestEnvelopeMetadataSchema.extend({
        correlation_id: correlationIdSchema,
        causation_id: causationIdSchema.optional(),
      }),
      command: requestCommandSchema.extend({
        payload: offlineMutationPayloadSchema,
      }),
    }),
  })
  .strict();

export const offlineQueueSnapshotSchema = z
  .object({
    connectivity_state: connectivityStateSchema,
    handoff_channel: z.enum(["whatsapp", "ussd", "sms"]).nullable(),
    items: z.array(offlineQueueItemSchema),
  })
  .strict();

export type QueueItemState = z.infer<typeof offlineQueueItemSchema>["state"];
export type OfflineQueueItem = z.infer<typeof offlineQueueItemSchema>;
export type OfflineQueueSnapshot = z.infer<typeof offlineQueueSnapshotSchema>;

export {
  requestEnvelopeSchema,
  responseEnvelopeSchema,
  schemaVersion,
  schemaVersionLiteral,
  requestIdSchema,
};
