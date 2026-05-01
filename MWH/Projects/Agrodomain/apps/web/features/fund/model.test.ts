import { describe, expect, it } from "vitest";
import type { ListingRecord } from "@agrodomain/contracts";

import { buildFundInvestments, buildFundOpportunities, buildFundPortfolioSummary } from "@/features/fund/model";
import type { EscrowReadModel, WalletBalance, WalletLedgerEntry } from "@/features/wallet/model";

const listing: ListingRecord = {
  actor_id: "actor-farmer",
  commodity: "Cassava",
  country_code: "GH",
  created_at: "2026-04-24T08:00:00.000Z",
  has_unpublished_changes: false,
  listing_id: "listing-1",
  location: "Tamale, GH",
  price_amount: 420,
  price_currency: "GHS",
  published_at: "2026-04-24T08:00:00.000Z",
  published_revision_number: 1,
  quantity_tons: 8,
  revision_count: 1,
  revision_number: 1,
  schema_version: "2026-04-18.wave1" as const,
  status: "published" as const,
  summary: "Strong cassava lot ready for funding and settlement-backed trade.",
  title: "Tamale cassava lot",
  updated_at: "2026-04-24T08:30:00.000Z",
  view_scope: "buyer_safe" as const,
};

const escrow: EscrowReadModel = {
  amount: 540,
  buyer_actor_id: "actor-investor",
  country_code: "GH",
  created_at: "2026-04-24T09:00:00.000Z",
  currency: "GHS",
  disputed_at: null,
  escrow_id: "escrow-1",
  funded_at: "2026-04-24T09:10:00.000Z",
  listing_id: "listing-1",
  partner_reason_code: null,
  partner_reference: null,
  released_at: null,
  reversed_at: null,
  schema_version: "2026-04-18.wave1" as const,
  seller_actor_id: "actor-farmer",
  state: "funded" as const,
  thread_id: "thread-1",
  timeline: [],
  updated_at: "2026-04-24T10:00:00.000Z",
};

const balance: WalletBalance = {
  balance_version: 3,
  country_code: "GH",
  currency: "GHS",
  last_entry_sequence: 10,
  last_reconciliation_marker: null,
  available_balance: 1200,
  held_balance: 540,
  schema_version: "2026-04-18.wave1" as const,
  total_balance: 1740,
  updated_at: "2026-04-24T10:00:00.000Z",
  wallet_actor_id: "actor-investor",
  wallet_id: "wallet-1",
};

const transactions: WalletLedgerEntry[] = [
  {
    amount: 120,
    balance_version: 4,
    correlation_id: "trace-1",
    counterparty_actor_id: null,
    country_code: "GH",
    created_at: "2026-04-24T11:00:00.000Z",
    currency: "GHS",
    direction: "credit" as const,
    entry_id: "entry-1",
    entry_sequence: 11,
    escrow_id: "escrow-1",
    held_delta: -120,
    idempotency_key: "idem-1",
    reconciliation_marker: null,
    reason: "escrow_released" as const,
    request_id: "req-1",
    resulting_available_balance: 1320,
    resulting_held_balance: 420,
    schema_version: "2026-04-18.wave1" as const,
    available_delta: 120,
    wallet_actor_id: "actor-investor",
    wallet_id: "wallet-1",
  },
];

describe("fund model helpers", () => {
  it("builds marketplace-backed fund opportunities", () => {
    const opportunities = buildFundOpportunities([listing]);

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.href).toBe("/app/market/listings/listing-1");
    expect(opportunities[0]?.projectedRaise).toContain("GHS");
  });

  it("builds wallet-linked investment cards", () => {
    const investments = buildFundInvestments([escrow], transactions);

    expect(investments).toHaveLength(1);
    expect(investments[0]?.href).toBe("/app/payments/wallet?escrow=escrow-1");
    expect(investments[0]?.returnsLabel).toContain("realized");
  });

  it("summarizes fund portfolio values from wallet runtime", () => {
    const summary = buildFundPortfolioSummary(balance, [escrow], transactions);

    expect(summary.activeCount).toBe(1);
    expect(summary.availableCashLabel).toContain("GHS");
    expect(summary.totalReturnsLabel).toContain("GHS");
  });
});
