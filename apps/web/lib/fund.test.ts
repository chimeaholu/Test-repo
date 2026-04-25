import { beforeEach, describe, expect, it } from "vitest";

import { buildFundOpportunity, portfolioSummary, readFundPortfolio, recordFundInvestment } from "@/lib/fund";

function buildListing() {
  return {
    schema_version: "2026-04-18.wave1",
    listing_id: "listing-fund-1",
    actor_id: "actor-farmer-gh-ama",
    country_code: "GH",
    title: "Cassava expansion cycle",
    commodity: "Cassava",
    quantity_tons: 6,
    price_amount: 320,
    price_currency: "GHS",
    location: "Tamale, GH",
    summary: "Cassava farm raising working capital for improved seed and storage.",
    status: "published",
    revision_number: 1,
    published_revision_number: 1,
    revision_count: 1,
    has_unpublished_changes: false,
    view_scope: "buyer_safe",
    published_at: "2026-04-24T00:00:00.000Z",
    created_at: "2026-04-24T00:00:00.000Z",
    updated_at: "2026-04-24T00:00:00.000Z",
  } as const;
}

describe("fund utilities", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("derives a deterministic opportunity from a live listing", () => {
    const opportunity = buildFundOpportunity(buildListing());

    expect(opportunity.listing.listing_id).toBe("listing-fund-1");
    expect(opportunity.fundingGoal).toBeGreaterThan(opportunity.minInvestment);
    expect(opportunity.progressPct).toBeGreaterThan(0);
    expect(opportunity.riskFactors).toHaveLength(3);
  });

  it("records and summarizes portfolio investments by actor", () => {
    recordFundInvestment({
      id: "investment-1",
      actor_id: "actor-investor-gh-kojo",
      listing_id: "listing-fund-1",
      amount: 450,
      currency: "GHS",
      expected_return_amount: 63,
      expected_return_pct: 14,
      opportunity_id: "fundopp-123",
      timeline_months: 9,
      payout_schedule: "9-month harvest cycle",
      status: "active",
      note: "Portfolio test",
      reference: "fund-123",
      created_at: "2026-04-24T01:00:00.000Z",
    });

    const records = readFundPortfolio("actor-investor-gh-kojo");
    expect(records).toHaveLength(1);

    expect(portfolioSummary(records)).toEqual({
      activeInvestments: 1,
      totalInvested: 450,
      expectedReturns: 63,
    });
  });
});
