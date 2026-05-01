import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  countryCodeSchema,
  isoTimestampSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

const currencySchema = z.string().regex(/^[A-Z]{3}$/u);
const threadStatusSchema = z.enum(["open", "pending_confirmation", "accepted", "rejected"]);
const noteSchema = z.string().min(3).max(300);

export const negotiationCreateInputSchema = z
  .object({
    listing_id: z.string().min(1),
    offer_amount: z.number().positive(),
    offer_currency: currencySchema,
    note: noteSchema.optional(),
  })
  .strict();

export const negotiationCounterInputSchema = z
  .object({
    thread_id: z.string().min(1),
    offer_amount: z.number().positive(),
    offer_currency: currencySchema,
    note: noteSchema.optional(),
  })
  .strict();

export const negotiationConfirmationRequestInputSchema = z
  .object({
    thread_id: z.string().min(1),
    required_confirmer_actor_id: actorIdSchema,
    note: noteSchema.optional(),
  })
  .strict();

export const negotiationConfirmationApproveInputSchema = z
  .object({
    thread_id: z.string().min(1),
    note: noteSchema.optional(),
  })
  .strict();

export const negotiationConfirmationRejectInputSchema =
  negotiationConfirmationApproveInputSchema;

export const negotiationConfirmationCheckpointSchema = z
  .object({
    requested_by_actor_id: actorIdSchema,
    required_confirmer_actor_id: actorIdSchema,
    requested_at: isoTimestampSchema,
    note: z.string().max(300).nullable(),
  })
  .strict();

export const negotiationMessageSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    actor_id: actorIdSchema,
    action: z.enum([
      "offer_created",
      "offer_countered",
      "confirmation_requested",
      "confirmation_approved",
      "confirmation_rejected",
    ]),
    amount: z.number().positive().nullable(),
    currency: currencySchema.nullable(),
    note: z.string().max(300).nullable(),
    created_at: isoTimestampSchema,
  })
  .strict();

export const negotiationThreadReadSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    thread_id: z.string().min(1),
    listing_id: z.string().min(1),
    seller_actor_id: actorIdSchema,
    buyer_actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    status: threadStatusSchema,
    current_offer_amount: z.number().positive(),
    current_offer_currency: currencySchema,
    last_action_at: isoTimestampSchema,
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
    confirmation_checkpoint: negotiationConfirmationCheckpointSchema.nullable(),
    messages: z.array(negotiationMessageSchema),
  })
  .strict();

export const negotiationThreadCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    items: z.array(negotiationThreadReadSchema),
  })
  .strict();

export const negotiationCreateInputContract = defineContract({
  id: "negotiation.negotiation_create_input",
  name: "NegotiationCreateInput",
  kind: "dto",
  domain: "negotiation",
  schemaVersion,
  schema: negotiationCreateInputSchema,
  description: "Canonical buyer offer payload for opening a negotiation thread on a published listing.",
  traceability: ["CJ-003", "DI-002"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const negotiationCounterInputContract = defineContract({
  id: "negotiation.negotiation_counter_input",
  name: "NegotiationCounterInput",
  kind: "dto",
  domain: "negotiation",
  schemaVersion,
  schema: negotiationCounterInputSchema,
  description: "Canonical seller counter-offer payload for an active negotiation thread.",
  traceability: ["CJ-003", "DI-002"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const negotiationConfirmationRequestInputContract = defineContract({
  id: "negotiation.negotiation_confirmation_request_input",
  name: "NegotiationConfirmationRequestInput",
  kind: "dto",
  domain: "negotiation",
  schemaVersion,
  schema: negotiationConfirmationRequestInputSchema,
  description:
    "Canonical checkpoint request payload for moving an open negotiation thread into pending confirmation.",
  traceability: ["CJ-003", "DI-002"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const negotiationConfirmationApproveInputContract = defineContract({
  id: "negotiation.negotiation_confirmation_approve_input",
  name: "NegotiationConfirmationApproveInput",
  kind: "dto",
  domain: "negotiation",
  schemaVersion,
  schema: negotiationConfirmationApproveInputSchema,
  description:
    "Canonical authorized confirmer approval payload for closing a negotiation thread as accepted.",
  traceability: ["CJ-003", "DI-002"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const negotiationConfirmationRejectInputContract = defineContract({
  id: "negotiation.negotiation_confirmation_reject_input",
  name: "NegotiationConfirmationRejectInput",
  kind: "dto",
  domain: "negotiation",
  schemaVersion,
  schema: negotiationConfirmationRejectInputSchema,
  description:
    "Canonical authorized confirmer rejection payload for closing a negotiation thread as rejected.",
  traceability: ["CJ-003", "DI-002"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const negotiationThreadReadContract = defineContract({
  id: "negotiation.negotiation_thread_read",
  name: "NegotiationThreadRead",
  kind: "dto",
  domain: "negotiation",
  schemaVersion,
  schema: negotiationThreadReadSchema,
  description: "Cross-role thread read DTO shared by buyer and seller refresh flows.",
  traceability: ["CJ-003", "DI-002"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const negotiationThreadCollectionContract = defineContract({
  id: "negotiation.negotiation_thread_collection",
  name: "NegotiationThreadCollection",
  kind: "dto",
  domain: "negotiation",
  schemaVersion,
  schema: negotiationThreadCollectionSchema,
  description: "Thread collection payload for negotiation inbox and API list reads.",
  traceability: ["CJ-003", "DI-002"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export type NegotiationCreateInput = z.infer<typeof negotiationCreateInputSchema>;
export type NegotiationCounterInput = z.infer<typeof negotiationCounterInputSchema>;
export type NegotiationConfirmationRequestInput = z.infer<
  typeof negotiationConfirmationRequestInputSchema
>;
export type NegotiationConfirmationApproveInput = z.infer<
  typeof negotiationConfirmationApproveInputSchema
>;
export type NegotiationConfirmationRejectInput = z.infer<
  typeof negotiationConfirmationRejectInputSchema
>;
export type NegotiationConfirmationCheckpoint = z.infer<
  typeof negotiationConfirmationCheckpointSchema
>;
export type NegotiationMessage = z.infer<typeof negotiationMessageSchema>;
export type NegotiationThreadRead = z.infer<typeof negotiationThreadReadSchema>;
export type NegotiationThreadCollection = z.infer<typeof negotiationThreadCollectionSchema>;
