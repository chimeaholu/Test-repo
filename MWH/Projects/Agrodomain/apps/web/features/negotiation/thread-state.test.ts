import type { NegotiationThreadRead } from "@agrodomain/contracts";
import { describe, expect, it } from "vitest";

import { deriveNegotiationThreadUiState, getOtherParticipantActorId } from "@/features/negotiation/thread-state";

function buildThread(overrides: Partial<NegotiationThreadRead> = {}): NegotiationThreadRead {
  return {
    schema_version: "2026-04-18.wave1",
    thread_id: "thread-1",
    listing_id: "listing-1",
    seller_actor_id: "actor-seller",
    buyer_actor_id: "actor-buyer",
    country_code: "GH",
    status: "open",
    current_offer_amount: 510,
    current_offer_currency: "GHS",
    last_action_at: "2026-04-18T01:00:00.000Z",
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T01:00:00.000Z",
    confirmation_checkpoint: null,
    messages: [],
    ...overrides,
  };
}

describe("negotiation thread ui state", () => {
  it("allows seller countering while thread remains open", () => {
    const thread = buildThread();
    const state = deriveNegotiationThreadUiState(thread, "actor-seller");

    expect(state.canCounter).toBe(true);
    expect(state.canRequestConfirmation).toBe(true);
    expect(state.deadlineAt).not.toBeNull();
    expect(state.isTerminal).toBe(false);
    expect(state.nextActionLabel).toBe("Respond to the buyer offer");
    expect(state.statusLabel).toBe("Open");
    expect(getOtherParticipantActorId(thread, "actor-seller")).toBe("actor-buyer");
  });

  it("gates approval and rejection to the required confirmer in pending confirmation", () => {
    const thread = buildThread({
      status: "pending_confirmation",
      confirmation_checkpoint: {
        requested_by_actor_id: "actor-seller",
        required_confirmer_actor_id: "actor-buyer",
        requested_at: "2026-04-18T01:10:00.000Z",
        note: "Need final buyer confirmation",
      },
    });

    const buyerState = deriveNegotiationThreadUiState(thread, "actor-buyer");
    const sellerState = deriveNegotiationThreadUiState(thread, "actor-seller");

    expect(buyerState.canApprove).toBe(true);
    expect(buyerState.canReject).toBe(true);
    expect(buyerState.deadlineAt).not.toBeNull();
    expect(buyerState.nextActionLabel).toBe("Approve or reject the current terms");
    expect(buyerState.statusLabel).toBe("Pending confirmation");
    expect(sellerState.canApprove).toBe(false);
    expect(sellerState.canReject).toBe(false);
    expect(sellerState.nextActionLabel).toBe("Wait for the confirmer to decide");
  });

  it("locks all mutation affordances after a terminal decision", () => {
    const thread = buildThread({
      status: "accepted",
      confirmation_checkpoint: null,
    });

    const state = deriveNegotiationThreadUiState(thread, "actor-seller");

    expect(state.isTerminal).toBe(true);
    expect(state.canCounter).toBe(false);
    expect(state.canRequestConfirmation).toBe(false);
    expect(state.canApprove).toBe(false);
    expect(state.nextActionLabel).toBe("Open escrow and move settlement forward");
    expect(state.statusTone).toBe("online");
  });
});
