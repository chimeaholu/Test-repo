"use client";

import React from "react";
import { use, useEffect, useState } from "react";
import { type FundingOpportunityRead, schemaVersion, type ListingRecord } from "@agrodomain/contracts";

import { FarmDetail } from "@/components/fund/farm-detail";
import { InvestFlow } from "@/components/fund/invest-flow";
import { useAppState } from "@/components/app-provider";
import { SurfaceCard } from "@/components/ui-primitives";
import { fundApi } from "@/lib/api/fund";
import { walletApi } from "@/lib/api/wallet";
import { marketplaceApi } from "@/lib/api/marketplace";
import { buildFundOpportunity, type FundInvestmentRecord, type FundOpportunity } from "@/lib/fund";

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GH: "GHS",
  JM: "JMD",
  NG: "NGN",
};

const SEED_LISTING_FALLBACKS: Record<
  string,
  Pick<
    ListingRecord,
    "actor_id" | "commodity" | "country_code" | "location" | "price_amount" | "price_currency" | "quantity_tons" | "summary" | "title"
  >
> = {
  "seed-cocoa-forest": {
    actor_id: "actor-seed-cocoa-forest",
    commodity: "Cocoa",
    country_code: "GH",
    location: "Forest Belt, Ghana",
    price_amount: 80000,
    price_currency: "GHS",
    quantity_tons: 1,
    summary: "Working capital for pruning, fertilizer, and post-harvest handling before export collection.",
    title: "Forest Belt Cocoa Recovery",
  },
  "seed-rice-delta": {
    actor_id: "actor-seed-rice-delta",
    commodity: "Rice",
    country_code: "NG",
    location: "River Delta, Nigeria",
    price_amount: 24000,
    price_currency: "USD",
    quantity_tons: 1,
    summary: "Input financing and irrigation support for an accelerated dry-season rice cycle.",
    title: "Delta Rice Dry-Season Cycle",
  },
};

function buildListingFallbackFromOpportunity(
  opportunity: FundingOpportunityRead,
  listingId: string,
): ListingRecord {
  const countryLabel = opportunity.country_code === "GH" ? "Ghana" : opportunity.country_code;

  return {
    schema_version: schemaVersion,
    listing_id: listingId,
    actor_id: opportunity.actor_id,
    country_code: opportunity.country_code,
    title: opportunity.title,
    commodity: "Farm opportunity",
    quantity_tons: 1,
    price_amount: opportunity.funding_goal,
    price_currency: opportunity.currency,
    location: countryLabel,
    summary: opportunity.description,
    status: "published",
    revision_number: 1,
    published_revision_number: 1,
    revision_count: 1,
    has_unpublished_changes: false,
    view_scope: "buyer_safe",
    published_at: opportunity.updated_at,
    created_at: opportunity.created_at,
    updated_at: opportunity.updated_at,
  };
}

function buildSeedListingFallback(listingId: string): ListingRecord | null {
  const seedListing = SEED_LISTING_FALLBACKS[listingId];
  if (!seedListing) {
    return null;
  }

  const timestamp = new Date("2026-04-20T00:00:00.000Z").toISOString();

  return {
    schema_version: schemaVersion,
    listing_id: listingId,
    actor_id: seedListing.actor_id,
    country_code: seedListing.country_code,
    title: seedListing.title,
    commodity: seedListing.commodity,
    quantity_tons: seedListing.quantity_tons,
    price_amount: seedListing.price_amount,
    price_currency: seedListing.price_currency,
    location: seedListing.location,
    summary: seedListing.summary,
    status: "published",
    revision_number: 1,
    published_revision_number: 1,
    revision_count: 1,
    has_unpublished_changes: false,
    view_scope: "buyer_safe",
    published_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export default function FundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { session, traceId } = useAppState();
  const [opportunity, setOpportunity] = useState<FundOpportunity | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    const currency = COUNTRY_CURRENCY_MAP[session.actor.country_code] ?? "USD";

    void Promise.all([
      fundApi.listOpportunities(traceId, { q: id }),
      walletApi.getWalletSummary(traceId, currency),
      marketplaceApi.getListing(id, traceId).catch(() => null),
    ])
      .then(([opportunityResponse, walletResponse, listingResponse]) => {
        if (cancelled) {
          return;
        }
        const canonicalOpportunity =
          opportunityResponse.data.items.find((item) => item.farm_id === id || item.opportunity_id === id) ??
          opportunityResponse.data.items[0] ??
          null;
        const listing =
          listingResponse?.data ??
          (canonicalOpportunity
            ? buildListingFallbackFromOpportunity(canonicalOpportunity, id)
            : buildSeedListingFallback(id));

        if (!listing) {
          throw new Error("Unable to load this farm opportunity.");
        }

        setOpportunity(buildFundOpportunity(listing, 0, canonicalOpportunity ?? undefined));
        setAvailableBalance(walletResponse.data.available_balance);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load this farm opportunity.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, session, traceId]);

  if (!session) {
    return null;
  }

  const currency = COUNTRY_CURRENCY_MAP[session.actor.country_code] ?? "USD";

  return (
    <div className="content-stack">
      {error ? (
        <SurfaceCard>
          <p className="field-error">{error}</p>
        </SurfaceCard>
      ) : null}

      {opportunity ? (
        <>
          <FarmDetail currency={currency} opportunity={opportunity} />
          <InvestFlow
            actorId={session.actor.actor_id}
            availableBalance={availableBalance}
            currency={currency}
            onCompleted={async (record: FundInvestmentRecord) => {
              const [walletResponse, opportunityResponse] = await Promise.all([
                walletApi.getWalletSummary(traceId, currency),
                fundApi.getOpportunity(record.opportunity_id, traceId),
              ]);
              setAvailableBalance(walletResponse.data.available_balance);
              setOpportunity((current) =>
                current
                  ? buildFundOpportunity(current.listing, 0, opportunityResponse.data)
                  : current,
              );
            }}
            opportunity={opportunity}
            traceId={traceId}
          />
        </>
      ) : (
        <SurfaceCard>
          <p className="muted">Loading farm opportunity...</p>
        </SurfaceCard>
      )}
    </div>
  );
}
