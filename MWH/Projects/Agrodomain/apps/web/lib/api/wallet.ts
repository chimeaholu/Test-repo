/**
 * RB-002 — Wallet & Escrow domain service.
 *
 * Wallet balance queries, transaction history, escrow lifecycle (fund,
 * release, reverse, dispute).
 */

import type { ResponseEnvelope } from "@agrodomain/contracts";
import {
  escrowCollectionSchema,
  escrowDisputeOpenInputSchema,
  escrowFundInputSchema,
  escrowInitiateInputSchema,
  escrowReadSchema,
  escrowReleaseInputSchema,
  escrowReverseInputSchema,
  settlementNotificationPayloadSchema,
  walletBalanceReadSchema,
  walletFundingInputSchema,
  walletTransactionCollectionSchema,
} from "@agrodomain/contracts";
import { z } from "zod";

import {
  requestJson,
  responseEnvelope,
  sendCommand,
} from "../api-client";

// ---------------------------------------------------------------------------
// Types derived from contract schemas
// ---------------------------------------------------------------------------

type WalletSummary = z.infer<typeof walletBalanceReadSchema>;
type WalletTransactions = z.infer<
  typeof walletTransactionCollectionSchema
>;
type WalletFundingInput = z.infer<typeof walletFundingInputSchema>;
type EscrowCollection = z.infer<typeof escrowCollectionSchema>;
type EscrowRead = z.infer<typeof escrowReadSchema>;
type EscrowInitiateInput = z.infer<typeof escrowInitiateInputSchema>;
type EscrowFundInput = z.infer<typeof escrowFundInputSchema>;
type EscrowReleaseInput = z.infer<typeof escrowReleaseInputSchema>;
type EscrowReverseInput = z.infer<typeof escrowReverseInputSchema>;
type EscrowDisputeOpenInput = z.infer<
  typeof escrowDisputeOpenInputSchema
>;

// ---------------------------------------------------------------------------
// Wallet escrow command result (runtime-validated)
// ---------------------------------------------------------------------------

const ledgerEntryReceiptSchema = z
  .object({
    entry_id: z.string().min(1),
    wallet_id: z.string().min(1),
    entry_sequence: z.number().int().positive(),
    balance_version: z.number().int().positive(),
    counter_entry_id: z.string().min(1).optional(),
  })
  .strict();

const escrowTransitionReceiptSchema = z
  .object({
    escrow_id: z.string().min(1),
    thread_id: z.string().min(1),
    transition: z.string().min(1),
    state: z.string().min(1),
    notification_count: z.number().int().nonnegative(),
  })
  .strict();

const walletEscrowCommandResultSchema = z
  .object({
    escrow: escrowReadSchema,
    wallet: walletBalanceReadSchema.optional(),
    ledger_entry: ledgerEntryReceiptSchema.optional(),
    escrow_transition: escrowTransitionReceiptSchema,
    settlement_notifications: z
      .array(settlementNotificationPayloadSchema)
      .optional(),
    schema_version: z.string().min(1),
  })
  .strict();

type WalletEscrowCommandResult = z.infer<
  typeof walletEscrowCommandResultSchema
>;

const walletFundingCommandResultSchema = z
  .object({
    wallet: walletBalanceReadSchema,
    ledger_entry: ledgerEntryReceiptSchema,
    schema_version: z.string().min(1),
  })
  .strict();

const walletTransferResultSchema = z
  .object({
    schema_version: z.string().min(1),
    request_id: z.string().min(1),
    idempotency_key: z.string().min(1),
    wallet: walletBalanceReadSchema,
    transfer: z
      .object({
        sender_actor_id: z.string().min(1),
        recipient_actor_id: z.string().min(1),
        amount: z.number().positive(),
        currency: z.string().min(3),
        note: z.string().nullable().optional(),
        reference: z.string().min(1),
        sender_entry_id: z.string().min(1),
        recipient_entry_id: z.string().min(1),
        created_at: z.string().min(1),
      })
      .strict(),
  })
  .strict();

type WalletFundingCommandResult = z.infer<typeof walletFundingCommandResultSchema>;
type WalletTransferResult = z.infer<typeof walletTransferResultSchema>;

// ---------------------------------------------------------------------------
// Internal: send an escrow command through the workflow endpoint
// ---------------------------------------------------------------------------

async function sendWalletEscrowCommand(params: {
  actorId: string;
  aggregateRef: string;
  commandName:
    | "wallets.escrows.initiate"
    | "wallets.escrows.fund"
    | "wallets.escrows.release"
    | "wallets.escrows.reverse"
    | "wallets.escrows.dispute_open";
  countryCode: string;
  idempotencyKey?: string;
  input:
    | EscrowInitiateInput
    | EscrowFundInput
    | EscrowReleaseInput
    | EscrowReverseInput
    | EscrowDisputeOpenInput;
  traceId: string;
}): Promise<
  ResponseEnvelope<
    WalletEscrowCommandResult & {
      request_id: string;
      idempotency_key: string;
      replayed: boolean;
    }
  >
> {
  const response = await sendCommand<WalletEscrowCommandResult>(
    {
      actorId: params.actorId,
      aggregateRef: params.aggregateRef,
      commandName: params.commandName,
      countryCode: params.countryCode,
      idempotencyKey: params.idempotencyKey,
      input: params.input as unknown as Record<string, unknown>,
      mutationScope: "wallet.escrow",
      journeyIds: ["CJ-004", "RJ-004"],
      dataCheckIds: ["DI-003"],
      traceId: params.traceId,
    },
    params.traceId,
  );

  const result = walletEscrowCommandResultSchema.parse(
    response.data.result,
  );
  return responseEnvelope(
    {
      ...result,
      request_id: response.data.request_id,
      idempotency_key: response.data.idempotency_key,
      replayed: response.data.replayed,
    },
    params.traceId,
  );
}

// ---------------------------------------------------------------------------
// Wallet API
// ---------------------------------------------------------------------------

export const walletApi = {
  // -- Queries -------------------------------------------------------------

  async getWalletSummary(
    traceId: string,
    currency = "GHS",
  ): Promise<ResponseEnvelope<WalletSummary>> {
    const params = new URLSearchParams({
      currency: currency.toUpperCase(),
    });
    const response = await requestJson<unknown>(
      `/api/v1/wallet/summary?${params.toString()}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(
      walletBalanceReadSchema.parse(response.data),
      traceId,
    );
  },

  async listWalletTransactions(
    traceId: string,
    currency = "GHS",
  ): Promise<ResponseEnvelope<WalletTransactions>> {
    const params = new URLSearchParams({
      currency: currency.toUpperCase(),
    });
    const response = await requestJson<unknown>(
      `/api/v1/wallet/transactions?${params.toString()}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(
      walletTransactionCollectionSchema.parse(response.data),
      traceId,
    );
  },

  async listEscrows(
    traceId: string,
  ): Promise<ResponseEnvelope<EscrowCollection>> {
    const response = await requestJson<unknown>(
      "/api/v1/wallet/escrows",
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(
      escrowCollectionSchema.parse(response.data),
      traceId,
    );
  },

  async getEscrow(
    escrowId: string,
    traceId: string,
  ): Promise<ResponseEnvelope<EscrowRead>> {
    const response = await requestJson<unknown>(
      `/api/v1/wallet/escrows/${escrowId}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(
      escrowReadSchema.parse(response.data),
      traceId,
    );
  },

  async fundWallet(
    input: WalletFundingInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ): Promise<
    ResponseEnvelope<
      WalletFundingCommandResult & {
        request_id: string;
        idempotency_key: string;
        replayed: boolean;
      }
    >
  > {
    walletFundingInputSchema.parse(input);
    const response = await sendCommand<WalletFundingCommandResult>(
      {
        actorId,
        aggregateRef: "wallet",
        commandName: "wallets.fund",
        countryCode,
        idempotencyKey,
        input: input as unknown as Record<string, unknown>,
        mutationScope: "wallet.ledger",
        journeyIds: ["CJ-004"],
        dataCheckIds: ["DI-003"],
        traceId,
      },
      traceId,
    );

    const result = walletFundingCommandResultSchema.parse(response.data.result);
    return responseEnvelope(
      {
        ...result,
        request_id: response.data.request_id,
        idempotency_key: response.data.idempotency_key,
        replayed: response.data.replayed,
      },
      traceId,
    );
  },

  async transferMoney(
    input: {
      amount: number;
      currency: string;
      note?: string;
      recipient_actor_id: string;
      reference?: string;
    },
    traceId: string,
    idempotencyKey?: string,
  ): Promise<ResponseEnvelope<WalletTransferResult>> {
    const response = await requestJson<unknown>(
      "/api/v1/wallet/transfers",
      {
        method: "POST",
        headers: idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : undefined,
        body: JSON.stringify(input),
      },
      traceId,
      true,
    );
    return responseEnvelope(walletTransferResultSchema.parse(response.data), traceId);
  },

  // -- Escrow mutations ----------------------------------------------------

  async initiateEscrow(
    input: EscrowInitiateInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ) {
    escrowInitiateInputSchema.parse(input);
    return sendWalletEscrowCommand({
      actorId,
      aggregateRef: input.thread_id,
      commandName: "wallets.escrows.initiate",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  async fundEscrow(
    input: EscrowFundInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ) {
    escrowFundInputSchema.parse(input);
    return sendWalletEscrowCommand({
      actorId,
      aggregateRef: input.escrow_id,
      commandName: "wallets.escrows.fund",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  async releaseEscrow(
    input: EscrowReleaseInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ) {
    escrowReleaseInputSchema.parse(input);
    return sendWalletEscrowCommand({
      actorId,
      aggregateRef: input.escrow_id,
      commandName: "wallets.escrows.release",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  async reverseEscrow(
    input: EscrowReverseInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ) {
    escrowReverseInputSchema.parse(input);
    return sendWalletEscrowCommand({
      actorId,
      aggregateRef: input.escrow_id,
      commandName: "wallets.escrows.reverse",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  async disputeEscrow(
    input: EscrowDisputeOpenInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ) {
    escrowDisputeOpenInputSchema.parse(input);
    return sendWalletEscrowCommand({
      actorId,
      aggregateRef: input.escrow_id,
      commandName: "wallets.escrows.dispute_open",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },
};
