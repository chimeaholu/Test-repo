import type { z } from "zod";
import { describe, expect, it } from "vitest";
import { escrowReadSchema } from "@agrodomain/contracts";

import {
  deriveWalletActions,
  notificationSummary,
  settlementLabel,
  settlementTone,
} from "@/features/wallet/model";

type EscrowReadModel = z.infer<typeof escrowReadSchema>;

function buildEscrow(overrides: Partial<EscrowReadModel> = {}): EscrowReadModel {
  return {
    schema_version: "2026-04-18.wave1",
    escrow_id: "escrow-1",
    thread_id: "thread-1",
    listing_id: "listing-1",
    buyer_actor_id: "actor-buyer",
    seller_actor_id: "actor-seller",
    country_code: "GH",
    currency: "GHS",
    amount: 400,
    state: "partner_pending",
    partner_reference: null,
    partner_reason_code: "delivery_failed",
    funded_at: null,
    released_at: null,
    reversed_at: null,
    disputed_at: null,
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T01:00:00.000Z",
    timeline: [
      {
        schema_version: "2026-04-18.wave1",
        escrow_id: "escrow-1",
        transition: "partner_pending",
        state: "partner_pending",
        actor_id: "actor-buyer",
        note: "Funding partner timeout",
        request_id: "req-timeout",
        idempotency_key: "idem-timeout",
        correlation_id: "trace-timeout",
        created_at: "2026-04-18T01:00:00.000Z",
        notification: {
          schema_version: "2026-04-18.wave1",
          escrow_id: "escrow-1",
          settlement_state: "partner_pending",
          recipient_actor_id: "actor-seller",
          channel: "push",
          channel_origin: "pwa",
          delivery_state: "fallback_sent",
          fallback_channel: "sms",
          fallback_reason: "delivery_failed",
          message_key: "escrow.partner_pending",
          correlation_id: "trace-timeout",
          created_at: "2026-04-18T01:00:00.000Z",
        },
      },
    ],
    ...overrides,
  };
}

describe("wallet settlement model", () => {
  it("maps partner-pending escrow to retry-safe buyer actions and degraded tone", () => {
    const escrow = buildEscrow();

    expect(settlementLabel(escrow.state)).toBe("Partner pending");
    expect(settlementTone(escrow.state)).toBe("degraded");

    const buyerActions = deriveWalletActions(escrow, "actor-buyer");
    expect(buyerActions.map((action) => action.action)).toEqual(["fund", "reverse"]);
    expect(buyerActions[0]?.label).toBe("Retry funding");
    expect(buyerActions[0]?.allowed).toBe(true);

    const sellerActions = deriveWalletActions(escrow, "actor-seller");
    expect(sellerActions[0]?.allowed).toBe(false);
    expect(sellerActions[0]?.disabledReason).toContain("Only the buyer");
  });

  it("summarizes fallback notification status without leaking extra metadata", () => {
    const escrow = buildEscrow();
    const summary = notificationSummary(escrow.timeline[0]?.notification ?? null);

    expect(summary.headline).toBe("Fallback sent via sms");
    expect(summary.detail).toContain("delivery_failed");
  });

  it("unlocks seller release and participant dispute on funded escrows only", () => {
    const escrow = buildEscrow({
      state: "funded",
      partner_reason_code: null,
      funded_at: "2026-04-18T00:30:00.000Z",
      timeline: [],
    });

    const sellerActions = deriveWalletActions(escrow, "actor-seller");
    expect(sellerActions.map((action) => action.action)).toEqual(["release", "dispute", "reverse"]);
    expect(sellerActions[0]?.allowed).toBe(true);
    expect(sellerActions[1]?.allowed).toBe(true);
    expect(sellerActions[2]?.allowed).toBe(false);

    const buyerActions = deriveWalletActions(escrow, "actor-buyer");
    expect(buyerActions[0]?.allowed).toBe(false);
    expect(buyerActions[1]?.allowed).toBe(true);
    expect(buyerActions[2]?.allowed).toBe(true);
  });
});
