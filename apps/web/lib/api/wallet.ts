/**
 * Wallet domain service — typed functions for the wallet workspace, escrow
 * initiation, and partner-pending transitions.
 */

import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

type CallOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  noAuth?: boolean;
  params?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Response shapes (match backend projection)
// ---------------------------------------------------------------------------

export type WalletWorkspaceResponse = {
  generated_at: string;
  actor_id: string;
  country_code: string;
  wallet: {
    currency: string;
    balance: {
      wallet_id: string;
      available_balance: number;
      held_balance: number;
      total_balance: number;
      balance_version: number;
      last_entry_sequence: number;
      updated_at: string | null;
    };
    entries: Array<{
      entry_id: string;
      direction: string;
      reason: string;
      amount: number;
      available_delta: number;
      held_delta: number;
      escrow_id: string | null;
      created_at: string | null;
    }>;
  };
  escrow: {
    escrows: Array<{
      escrow_id: string;
      thread_id: string;
      listing_id: string;
      buyer_actor_id: string;
      seller_actor_id: string;
      currency: string;
      amount: number;
      state: string;
      partner_reason_code: string | null;
      created_at: string | null;
      updated_at: string | null;
      funded_at: string | null;
      released_at: string | null;
      reversed_at: string | null;
      disputed_at: string | null;
      timeline: Array<{
        escrow_id: string;
        actor_id: string;
        transition: string;
        state: string;
        note: string | null;
        request_id: string;
        notification?: Record<string, unknown> | null;
        created_at: string | null;
      }>;
    }>;
    candidates: Array<{
      thread_id: string;
      listing_id: string;
      current_offer_amount: number;
      current_offer_currency: string;
      counterparty_actor_id: string;
      last_action_at: string | null;
    }>;
  };
};

export type InitiateEscrowResponse = {
  escrow_id: string;
  state: string;
  thread_id: string;
};

export type MarkPartnerPendingResponse = {
  escrow_id: string;
  state: string;
  partner_reason_code: string | null;
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch the full wallet workspace (balance + entries + escrows + candidates).
 *
 * Backend: GET /api/v1/wallet/workspace
 */
export async function getWalletWorkspace(
  options?: CallOptions,
): Promise<WalletWorkspaceResponse> {
  return api.get<WalletWorkspaceResponse>(
    "/api/v1/wallet/workspace",
    options,
  );
}

/**
 * Initiate a new escrow for an accepted negotiation thread.
 *
 * Backend: POST /api/v1/wallet/escrows/initiate
 */
export async function initiateEscrow(
  threadId: string,
  note?: string,
  options?: CallOptions,
): Promise<InitiateEscrowResponse> {
  return api.post<InitiateEscrowResponse>(
    "/api/v1/wallet/escrows/initiate",
    { thread_id: threadId, note: note ?? null },
    options,
  );
}

/**
 * Transition an escrow into partner-pending state.
 *
 * Backend: POST /api/v1/wallet/escrows/:escrowId/partner-pending
 */
export async function markPartnerPending(
  escrowId: string,
  pendingReasonCode: string,
  note?: string,
  options?: CallOptions,
): Promise<MarkPartnerPendingResponse> {
  return api.post<MarkPartnerPendingResponse>(
    `/api/v1/wallet/escrows/${escrowId}/partner-pending`,
    { note: note ?? null, pending_reason_code: pendingReasonCode },
    options,
  );
}
