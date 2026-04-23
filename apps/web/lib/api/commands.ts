/**
 * Command bus domain service — generic command dispatcher that posts to the
 * workflow command endpoint.
 *
 * All write operations in the Agrodomain platform go through a single
 * command bus: `POST /api/v1/workflow/commands`.
 *
 * This module provides a typed `dispatchCommand()` function with
 * command-type-specific overloads for the most common command families.
 */

import type {
  ListingCreateInput,
  ListingUpdateInput,
  NegotiationCreateInput,
  NegotiationCounterInput,
  NegotiationConfirmationRequestInput,
  NegotiationConfirmationApproveInput,
  NegotiationConfirmationRejectInput,
  FinancePartnerRequestInput,
  FinanceDecisionInput,
  InsuranceTriggerEvaluationInput,
} from "@agrodomain/contracts";
import { schemaVersion } from "@agrodomain/contracts";

import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CallOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  noAuth?: boolean;
  params?: Record<string, string>;
};

export type CommandMetadata = {
  actor_id: string;
  country_code: string;
  channel?: string;
  idempotency_key?: string;
  correlation_id?: string;
  traceability?: {
    journey_ids: string[];
    data_check_ids: string[];
  };
};

export type CommandEnvelope = {
  metadata: {
    request_id: string;
    idempotency_key: string;
    actor_id: string;
    country_code: string;
    channel: string;
    schema_version: string;
    correlation_id: string;
    occurred_at: string;
    traceability: {
      journey_ids: string[];
      data_check_ids: string[];
    };
  };
  command: {
    name: string;
    aggregate_ref: string;
    mutation_scope: string;
    payload: Record<string, unknown>;
  };
};

export type CommandResult<TResult = Record<string, unknown>> = {
  status: string;
  request_id: string;
  idempotency_key: string;
  result: TResult;
  audit_event_id: number;
  replayed: boolean;
};

// ---------------------------------------------------------------------------
// Envelope builder
// ---------------------------------------------------------------------------

function buildEnvelope(
  commandName: string,
  aggregateRef: string,
  mutationScope: string,
  payload: Record<string, unknown>,
  meta: CommandMetadata,
): CommandEnvelope {
  const requestId = crypto.randomUUID();
  const idempotencyKey = meta.idempotency_key ?? crypto.randomUUID();
  return {
    metadata: {
      request_id: requestId,
      idempotency_key: idempotencyKey,
      actor_id: meta.actor_id,
      country_code: meta.country_code,
      channel: meta.channel ?? "pwa",
      schema_version: schemaVersion,
      correlation_id: meta.correlation_id ?? requestId,
      occurred_at: new Date().toISOString(),
      traceability: meta.traceability ?? { journey_ids: [], data_check_ids: [] },
    },
    command: {
      name: commandName,
      aggregate_ref: aggregateRef,
      mutation_scope: mutationScope,
      payload,
    },
  };
}

// ---------------------------------------------------------------------------
// Generic dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatch a command to the workflow command bus.
 *
 * Backend: POST /api/v1/workflow/commands
 */
export async function dispatchCommand<TResult = Record<string, unknown>>(
  commandName: string,
  aggregateRef: string,
  mutationScope: string,
  payload: Record<string, unknown>,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult<TResult>> {
  const envelope = buildEnvelope(commandName, aggregateRef, mutationScope, payload, meta);
  return api.post<CommandResult<TResult>>(
    "/api/v1/workflow/commands",
    envelope,
    options,
  );
}

// ---------------------------------------------------------------------------
// Marketplace listing commands
// ---------------------------------------------------------------------------

export async function createListing(
  input: ListingCreateInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "market.listings.create",
    "listing",
    "marketplace.listings",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-002"], data_check_ids: ["DI-001"] } },
    options,
  );
}

export async function updateListing(
  input: ListingUpdateInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "market.listings.update",
    input.listing_id,
    "marketplace.listings",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["RJ-002"], data_check_ids: ["DI-001"] } },
    options,
  );
}

// ---------------------------------------------------------------------------
// Negotiation commands
// ---------------------------------------------------------------------------

export async function createNegotiation(
  input: NegotiationCreateInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "market.negotiations.create",
    input.listing_id,
    "marketplace.negotiations",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-003", "RJ-002"], data_check_ids: ["DI-002"] } },
    options,
  );
}

export async function counterNegotiation(
  input: NegotiationCounterInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "market.negotiations.counter",
    input.thread_id,
    "marketplace.negotiations",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-003", "RJ-002"], data_check_ids: ["DI-002"] } },
    options,
  );
}

export async function requestNegotiationConfirmation(
  input: NegotiationConfirmationRequestInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "market.negotiations.confirm.request",
    input.thread_id,
    "marketplace.negotiations",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-003", "RJ-002"], data_check_ids: ["DI-002"] } },
    options,
  );
}

export async function approveNegotiationConfirmation(
  input: NegotiationConfirmationApproveInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "market.negotiations.confirm.approve",
    input.thread_id,
    "marketplace.negotiations",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-003", "RJ-002"], data_check_ids: ["DI-002"] } },
    options,
  );
}

export async function rejectNegotiationConfirmation(
  input: NegotiationConfirmationRejectInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "market.negotiations.confirm.reject",
    input.thread_id,
    "marketplace.negotiations",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-003", "RJ-002"], data_check_ids: ["DI-002"] } },
    options,
  );
}

// ---------------------------------------------------------------------------
// Finance commands
// ---------------------------------------------------------------------------

export async function submitFinancePartnerRequest(
  input: FinancePartnerRequestInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "finance.partner_requests.submit",
    "finance_request",
    "regulated.finance",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-004"], data_check_ids: ["DI-003"] } },
    options,
  );
}

export async function recordFinancePartnerDecision(
  input: FinanceDecisionInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "finance.partner_decisions.record",
    "finance_request",
    "regulated.finance",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-008"], data_check_ids: ["DI-003"] } },
    options,
  );
}

export async function evaluateInsuranceTrigger(
  input: InsuranceTriggerEvaluationInput,
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "insurance.triggers.evaluate",
    "insurance_trigger",
    "regulated.insurance",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["EP-008"], data_check_ids: ["DI-006"] } },
    options,
  );
}

// ---------------------------------------------------------------------------
// Escrow commands
// ---------------------------------------------------------------------------

export async function fundEscrow(
  input: { escrow_id: string; partner_outcome: string; note?: string },
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "settlement.escrow.fund",
    input.escrow_id,
    "settlement.escrow",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-004"], data_check_ids: ["DI-003"] } },
    options,
  );
}

export async function releaseEscrow(
  input: { escrow_id: string; note?: string },
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "settlement.escrow.release",
    input.escrow_id,
    "settlement.escrow",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-004"], data_check_ids: ["DI-003"] } },
    options,
  );
}

export async function reverseEscrow(
  input: { escrow_id: string; reversal_reason: string; note?: string },
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "settlement.escrow.reverse",
    input.escrow_id,
    "settlement.escrow",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-004"], data_check_ids: ["DI-003"] } },
    options,
  );
}

export async function disputeEscrow(
  input: { escrow_id: string; note: string },
  meta: CommandMetadata,
  options?: CallOptions,
): Promise<CommandResult> {
  return dispatchCommand(
    "settlement.escrow.dispute_open",
    input.escrow_id,
    "settlement.escrow",
    input as unknown as Record<string, unknown>,
    { ...meta, traceability: meta.traceability ?? { journey_ids: ["CJ-004"], data_check_ids: ["DI-003"] } },
    options,
  );
}
