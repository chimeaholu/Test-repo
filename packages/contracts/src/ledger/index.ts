import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  countryCodeSchema,
  correlationIdSchema,
  idempotencyKeySchema,
  isoTimestampSchema,
  requestIdSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

const currencySchema = z.string().regex(/^[A-Z]{3}$/u);
const amountSchema = z.number().positive();

export const walletMutationReasonSchema = z.enum([
  "wallet_funded",
  "escrow_funded",
  "escrow_released",
  "escrow_reversed",
  "fund_invested",
  "fund_withdrawn",
  "wallet_reconciled",
  "wallet_transfer_sent",
  "wallet_transfer_received",
]);

export const walletEntryDirectionSchema = z.enum(["debit", "credit", "adjustment"]);

export const walletFundingInputSchema = z
  .object({
    wallet_actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    currency: currencySchema,
    amount: amountSchema,
    reference_type: z.enum(["deposit", "manual_seed", "settlement_reversal"]),
    reference_id: z.string().min(1),
    note: z.string().min(3).max(300).optional(),
    reconciliation_marker: z.string().min(1).max(128).nullable().optional(),
  })
  .strict();

export const walletReleaseInputSchema = z
  .object({
    escrow_id: z.string().min(1),
    note: z.string().min(3).max(300).optional(),
  })
  .strict();

export const walletReverseInputSchema = z
  .object({
    escrow_id: z.string().min(1),
    reversal_reason: z.enum(["buyer_cancelled", "partner_failed", "admin_override", "dispute_resolution"]),
    note: z.string().min(3).max(300).optional(),
  })
  .strict();

export const walletReconciliationInputSchema = z
  .object({
    wallet_actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    currency: currencySchema,
    reconciliation_marker: z.string().min(1).max(128),
    expected_available_balance: z.number(),
    expected_held_balance: z.number(),
    note: z.string().min(3).max(300).optional(),
  })
  .strict();

export const walletLedgerEntrySchema = z
  .object({
    schema_version: schemaVersionLiteral,
    entry_id: z.string().min(1),
    wallet_id: z.string().min(1),
    wallet_actor_id: actorIdSchema,
    counterparty_actor_id: actorIdSchema.nullable(),
    country_code: countryCodeSchema,
    currency: currencySchema,
    direction: walletEntryDirectionSchema,
    reason: walletMutationReasonSchema,
    amount: amountSchema,
    available_delta: z.number(),
    held_delta: z.number(),
    resulting_available_balance: z.number(),
    resulting_held_balance: z.number(),
    balance_version: z.number().int().positive(),
    entry_sequence: z.number().int().positive(),
    escrow_id: z.string().min(1).nullable(),
    request_id: requestIdSchema,
    idempotency_key: idempotencyKeySchema,
    correlation_id: correlationIdSchema,
    reconciliation_marker: z.string().min(1).max(128).nullable(),
    created_at: isoTimestampSchema,
  })
  .strict();

export const walletBalanceReadSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    wallet_id: z.string().min(1),
    wallet_actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    currency: currencySchema,
    available_balance: z.number(),
    held_balance: z.number(),
    total_balance: z.number(),
    balance_version: z.number().int().nonnegative(),
    last_entry_sequence: z.number().int().nonnegative(),
    last_reconciliation_marker: z.string().min(1).max(128).nullable(),
    updated_at: isoTimestampSchema.nullable(),
  })
  .strict();

export const walletTransactionCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    wallet: walletBalanceReadSchema,
    items: z.array(walletLedgerEntrySchema),
  })
  .strict();

export const walletFundingInputContract = defineContract({
  id: "ledger.wallet_funding_input",
  name: "WalletFundingInput",
  kind: "dto",
  domain: "ledger",
  schemaVersion,
  schema: walletFundingInputSchema,
  description: "Funding payload for appending wallet credit entries before escrow participation.",
  traceability: ["CJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const walletReleaseInputContract = defineContract({
  id: "ledger.wallet_release_input",
  name: "WalletReleaseInput",
  kind: "dto",
  domain: "ledger",
  schemaVersion,
  schema: walletReleaseInputSchema,
  description: "Release payload bound to a funded escrow for settlement completion.",
  traceability: ["CJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const walletReverseInputContract = defineContract({
  id: "ledger.wallet_reverse_input",
  name: "WalletReverseInput",
  kind: "dto",
  domain: "ledger",
  schemaVersion,
  schema: walletReverseInputSchema,
  description: "Compensating reversal payload for unwinding a funded escrow without mutating prior ledger rows.",
  traceability: ["CJ-004", "EP-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const walletReconciliationInputContract = defineContract({
  id: "ledger.wallet_reconciliation_input",
  name: "WalletReconciliationInput",
  kind: "dto",
  domain: "ledger",
  schemaVersion,
  schema: walletReconciliationInputSchema,
  description: "Reconciliation payload for recording balance checks and markers against the append-only ledger.",
  traceability: ["DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const walletLedgerEntryContract = defineContract({
  id: "ledger.wallet_ledger_entry",
  name: "WalletLedgerEntry",
  kind: "dto",
  domain: "ledger",
  schemaVersion,
  schema: walletLedgerEntrySchema,
  description: "Immutable ledger row with balance projection outputs and escrow correlation metadata.",
  traceability: ["CJ-004", "DI-003", "IDI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const walletBalanceReadContract = defineContract({
  id: "ledger.wallet_balance_read",
  name: "WalletBalanceRead",
  kind: "dto",
  domain: "ledger",
  schemaVersion,
  schema: walletBalanceReadSchema,
  description: "Wallet balance projection derived from append-only ledger entries.",
  traceability: ["CJ-004", "RJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export const walletTransactionCollectionContract = defineContract({
  id: "ledger.wallet_transaction_collection",
  name: "WalletTransactionCollection",
  kind: "dto",
  domain: "ledger",
  schemaVersion,
  schema: walletTransactionCollectionSchema,
  description: "Wallet history payload for timeline and audit read surfaces.",
  traceability: ["CJ-004", "RJ-004", "DI-003"],
  sourceArtifacts: ["execution/specs/2026-04-18-n3-wave3-wallet-escrow-settlement-tranche.md"],
});

export type WalletMutationReason = z.infer<typeof walletMutationReasonSchema>;
export type WalletEntryDirection = z.infer<typeof walletEntryDirectionSchema>;
export type WalletFundingInput = z.infer<typeof walletFundingInputSchema>;
export type WalletReleaseInput = z.infer<typeof walletReleaseInputSchema>;
export type WalletReverseInput = z.infer<typeof walletReverseInputSchema>;
export type WalletReconciliationInput = z.infer<typeof walletReconciliationInputSchema>;
export type WalletLedgerEntry = z.infer<typeof walletLedgerEntrySchema>;
export type WalletBalanceRead = z.infer<typeof walletBalanceReadSchema>;
export type WalletTransactionCollection = z.infer<typeof walletTransactionCollectionSchema>;
