import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  correlationIdSchema,
  countryCodeSchema,
  idempotencyKeySchema,
  isoTimestampSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

const currencySchema = z.string().regex(/^[A-Z]{3}$/u);
const readModelSchemaVersion = z.string().min(1);

const escrowStateSchema = z.enum([
  "initiated",
  "pending_funds",
  "partner_pending",
  "funded",
  "released",
  "reversed",
  "disputed",
]);

const deliveryStateSchema = z.enum([
  "sent",
  "fallback_sent",
  "action_required",
  "failed",
]);

/* ---------- Notification payload ---------- */

export const settlementNotificationPayloadSchema = z.object({
  delivery_state: deliveryStateSchema,
  channel: z.string().min(1),
  message_key: z.string().min(1),
  recipient_actor_id: actorIdSchema,
  correlation_id: correlationIdSchema,
  fallback_channel: z.string().min(1).nullable().optional(),
  fallback_reason: z.string().min(1).nullable().optional(),
  notified_at: isoTimestampSchema,
});

/* ---------- Settlement timeline entry ---------- */

export const settlementTimelineEntrySchema = z.object({
  entry_id: z.string().min(1),
  request_id: requestIdSchema,
  idempotency_key: idempotencyKeySchema,
  actor_id: actorIdSchema,
  transition: z.string().min(1),
  state: escrowStateSchema,
  note: z.string().nullable().optional(),
  notification: settlementNotificationPayloadSchema.nullable().optional(),
  created_at: isoTimestampSchema,
});

/* ---------- Escrow read model ---------- */

export const escrowReadSchema = z.object({
  schema_version: readModelSchemaVersion,
  escrow_id: z.string().min(1),
  thread_id: z.string().min(1),
  listing_id: z.string().min(1),
  buyer_actor_id: actorIdSchema,
  seller_actor_id: actorIdSchema,
  country_code: countryCodeSchema,
  amount: z.number().nonnegative(),
  currency: currencySchema,
  state: escrowStateSchema,
  partner_reason_code: z.string().nullable().optional(),
  timeline: z.array(settlementTimelineEntrySchema),
  created_at: isoTimestampSchema,
  updated_at: isoTimestampSchema,
});

/* ---------- Wallet balance ---------- */

export const walletBalanceReadSchema = z.object({
  schema_version: readModelSchemaVersion,
  actor_id: actorIdSchema,
  country_code: countryCodeSchema,
  total_balance: z.number(),
  available_balance: z.number(),
  held_balance: z.number(),
  currency: currencySchema,
  balance_version: z.number().int().nonnegative(),
  updated_at: isoTimestampSchema,
});

/* ---------- Wallet ledger entry ---------- */

export const walletLedgerEntrySchema = z.object({
  schema_version: readModelSchemaVersion,
  entry_id: z.string().min(1),
  actor_id: actorIdSchema,
  escrow_id: z.string().min(1).nullable().optional(),
  direction: z.enum(["credit", "debit"]),
  amount: z.number(),
  currency: currencySchema,
  reason: z.string().min(1),
  entry_sequence: z.number().int().nonnegative(),
  balance_version: z.number().int().nonnegative(),
  resulting_available_balance: z.number(),
  resulting_held_balance: z.number(),
  created_at: isoTimestampSchema,
});

/* ---------- Escrow command inputs ---------- */

export const escrowFundInputSchema = z.object({
  escrow_id: z.string().min(1),
  partner_outcome: z.enum(["funded"]),
  note: z.string().optional(),
});

export const escrowReleaseInputSchema = z.object({
  escrow_id: z.string().min(1),
  note: z.string().optional(),
});

export const escrowReverseInputSchema = z.object({
  escrow_id: z.string().min(1),
  reversal_reason: z.string().min(1),
  note: z.string().optional(),
});

export const escrowDisputeOpenInputSchema = z.object({
  escrow_id: z.string().min(1),
  note: z.string().min(1),
});

/* ---------- Contracts ---------- */

const sourceArtifacts = [] as const;

export const escrowReadContract = defineContract({
  id: "escrow.escrow_read",
  name: "EscrowRead",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: escrowReadSchema,
  description: "Escrow read model with settlement timeline and state machine posture.",
  traceability: ["CJ-004"],
  sourceArtifacts,
});

export const walletBalanceReadContract = defineContract({
  id: "escrow.wallet_balance_read",
  name: "WalletBalanceRead",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: walletBalanceReadSchema,
  description: "Wallet balance read model showing available and held-in-escrow amounts.",
  traceability: ["CJ-004"],
  sourceArtifacts,
});

export const walletLedgerEntryContract = defineContract({
  id: "escrow.wallet_ledger_entry",
  name: "WalletLedgerEntry",
  kind: "dto",
  domain: "escrow",
  schemaVersion,
  schema: walletLedgerEntrySchema,
  description: "Append-only wallet ledger entry recording credit or debit movements.",
  traceability: ["CJ-004"],
  sourceArtifacts,
});

/* ---------- Types ---------- */

export type EscrowRead = z.infer<typeof escrowReadSchema>;
export type WalletBalanceRead = z.infer<typeof walletBalanceReadSchema>;
export type WalletLedgerEntry = z.infer<typeof walletLedgerEntrySchema>;
export type SettlementNotificationPayload = z.infer<typeof settlementNotificationPayloadSchema>;
export type SettlementTimelineEntry = z.infer<typeof settlementTimelineEntrySchema>;
export type EscrowFundInput = z.infer<typeof escrowFundInputSchema>;
export type EscrowReleaseInput = z.infer<typeof escrowReleaseInputSchema>;
export type EscrowReverseInput = z.infer<typeof escrowReverseInputSchema>;
export type EscrowDisputeOpenInput = z.infer<typeof escrowDisputeOpenInputSchema>;
