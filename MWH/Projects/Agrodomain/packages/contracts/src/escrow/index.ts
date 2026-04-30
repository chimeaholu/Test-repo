import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  channelSchema,
  countryCodeSchema,
  isoTimestampSchema,
  reasonCodeSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";
import { deliveryChannelSchema, deliveryStateSchema, fallbackReasonSchema } from "../notifications/index.js";

const currencySchema = z.string().regex(/^[A-Z]{3}$/u);
const amountSchema = z.number().positive();

export const escrowStateSchema = z.enum([
  "initiated",
  "pending_funds",
  "funded",
  "released",
  "reversed",
  "disputed",
  "partner_pending",
]);

export const settlementTransitionSchema = z.enum([
  "initiated",
  "funding_requested",
  "partner_pending",
  "funded",
  "released",
  "reversed",
  "dispute_opened",
]);

export const escrowInitiateInputSchema = z
  .object({
    thread_id: z.string().min(1),
    note: z.string().min(3).max(300).optional(),
  })
  .strict();

export const escrowFundInputSchema = z
  .object({
    escrow_id: z.string().min(1),
    note: z.string().min(3).max(300).optional(),
    partner_outcome: z.enum(["funded", "timeout"]).default("funded"),
  })
  .strict();

export const escrowMarkPartnerPendingInputSchema = z
  .object({
    escrow_id: z.string().min(1),
    pending_reason_code: reasonCodeSchema,
    note: z.string().min(3).max(300).optional(),
  })
  .strict();

export const escrowReleaseInputSchema = z
  .object({
    escrow_id: z.string().min(1),
    note: z.string().min(3).max(300).optional(),
  })
  .strict();

export const escrowReverseInputSchema = z
  .object({
    escrow_id: z.string().min(1),
    reversal_reason: z.enum(["buyer_cancelled", "partner_failed", "admin_override", "dispute_resolution"]),
    note: z.string().min(3).max(300).optional(),
  })
  .strict();

export const escrowDisputeOpenInputSchema = z
  .object({
    escrow_id: z.string().min(1),
    note: z.string().min(3).max(300),
  })
  .strict();

export const settlementNotificationPayloadSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    escrow_id: z.string().min(1),
    settlement_state: escrowStateSchema,
    recipient_actor_id: actorIdSchema,
    channel: deliveryChannelSchema,
    channel_origin: channelSchema,
    delivery_state: deliveryStateSchema,
    fallback_channel: deliveryChannelSchema.nullable(),
    fallback_reason: fallbackReasonSchema.nullable(),
    message_key: z.string().min(1),
    correlation_id: z.string().min(1),
    created_at: isoTimestampSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.delivery_state === "fallback_sent") {
      if (!value.fallback_channel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fallback_channel is required when delivery_state=fallback_sent",
          path: ["fallback_channel"],
        });
      }
      if (!value.fallback_reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "fallback_reason is required when delivery_state=fallback_sent",
          path: ["fallback_reason"],
        });
      }
    }
  });

export const settlementTimelineEntrySchema = z
  .object({
    schema_version: schemaVersionLiteral,
    escrow_id: z.string().min(1),
    transition: settlementTransitionSchema,
    state: escrowStateSchema,
    actor_id: actorIdSchema,
    note: z.string().max(300).nullable(),
    request_id: z.string().min(1),
    idempotency_key: z.string().min(1),
    correlation_id: z.string().min(1),
    created_at: isoTimestampSchema,
    notification: settlementNotificationPayloadSchema.nullable(),
  })
  .strict();

export const escrowReadSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    escrow_id: z.string().min(1),
    thread_id: z.string().min(1),
    listing_id: z.string().min(1),
    buyer_actor_id: actorIdSchema,
    seller_actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    currency: currencySchema,
    amount: amountSchema,
    state: escrowStateSchema,
    partner_reference: z.string().min(1).nullable(),
    partner_reason_code: reasonCodeSchema.nullable(),
    funded_at: isoTimestampSchema.nullable(),
    released_at: isoTimestampSchema.nullable(),
    reversed_at: isoTimestampSchema.nullable(),
    disputed_at: isoTimestampSchema.nullable(),
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
    timeline: z.array(settlementTimelineEntrySchema),
  })
  .strict();

export const escrowCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    items: z.array(escrowReadSchema),
  })
  .strict();

export const escrowInitiateInputContract = defineContract({
  id: "escrow.escrow_initiate_input",
  name: "EscrowInitiateInput",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: escrowInitiateInputSchema,
  description: "Escrow initiation payload bound to an accepted negotiation thread.",
  traceability: ["CJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const escrowFundInputContract = defineContract({
  id: "escrow.escrow_fund_input",
  name: "EscrowFundInput",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: escrowFundInputSchema,
  description: "Escrow funding payload with deterministic timeout seam for partner-pending behavior.",
  traceability: ["CJ-004", "EP-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const escrowMarkPartnerPendingInputContract = defineContract({
  id: "escrow.escrow_mark_partner_pending_input",
  name: "EscrowMarkPartnerPendingInput",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: escrowMarkPartnerPendingInputSchema,
  description: "Explicit pending marker payload for timeout and partner-confirmation delays.",
  traceability: ["EP-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const escrowReleaseInputContract = defineContract({
  id: "escrow.escrow_release_input",
  name: "EscrowReleaseInput",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: escrowReleaseInputSchema,
  description: "Release payload for completing a funded escrow.",
  traceability: ["CJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const escrowReverseInputContract = defineContract({
  id: "escrow.escrow_reverse_input",
  name: "EscrowReverseInput",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: escrowReverseInputSchema,
  description: "Reversal payload for refunding held buyer funds through compensating ledger entries.",
  traceability: ["CJ-004", "EP-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const escrowDisputeOpenInputContract = defineContract({
  id: "escrow.escrow_dispute_open_input",
  name: "EscrowDisputeOpenInput",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: escrowDisputeOpenInputSchema,
  description: "Dispute-open payload for freezing a funded escrow into operator review state.",
  traceability: ["CJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const settlementNotificationPayloadContract = defineContract({
  id: "notifications.settlement_notification_payload",
  name: "SettlementNotificationPayload",
  kind: "dto",
  domain: "notifications",
  schemaVersion,
  schema: settlementNotificationPayloadSchema,
  description: "Participant settlement update payload with fallback and delivery status fields.",
  traceability: ["CJ-004", "EP-004", "RJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const settlementTimelineEntryContract = defineContract({
  id: "escrow.settlement_timeline_entry",
  name: "SettlementTimelineEntry",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: settlementTimelineEntrySchema,
  description: "Timeline entry for escrow transitions with attached notification state.",
  traceability: ["CJ-004", "EP-004", "RJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const escrowReadContract = defineContract({
  id: "escrow.escrow_read",
  name: "EscrowRead",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: escrowReadSchema,
  description: "Escrow aggregate read with immutable timeline and settlement notification evidence.",
  traceability: ["CJ-004", "RJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const escrowCollectionContract = defineContract({
  id: "escrow.escrow_collection",
  name: "EscrowCollection",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: escrowCollectionSchema,
  description: "Escrow collection payload for wallet timeline and participant inbox reads.",
  traceability: ["CJ-004", "RJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export type EscrowState = z.infer<typeof escrowStateSchema>;
export type SettlementTransition = z.infer<typeof settlementTransitionSchema>;
export type EscrowInitiateInput = z.infer<typeof escrowInitiateInputSchema>;
export type EscrowFundInput = z.infer<typeof escrowFundInputSchema>;
export type EscrowMarkPartnerPendingInput = z.infer<typeof escrowMarkPartnerPendingInputSchema>;
export type EscrowReleaseInput = z.infer<typeof escrowReleaseInputSchema>;
export type EscrowReverseInput = z.infer<typeof escrowReverseInputSchema>;
export type EscrowDisputeOpenInput = z.infer<typeof escrowDisputeOpenInputSchema>;
export type SettlementNotificationPayload = z.infer<typeof settlementNotificationPayloadSchema>;
export type SettlementTimelineEntry = z.infer<typeof settlementTimelineEntrySchema>;
export type EscrowRead = z.infer<typeof escrowReadSchema>;
export type EscrowCollection = z.infer<typeof escrowCollectionSchema>;
