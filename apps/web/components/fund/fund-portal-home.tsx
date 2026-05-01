"use client";

import type { ListingRecord } from "@agrodomain/contracts";
import React from "react";
import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { FundHero } from "@/components/fund/fund-hero";
import { HowItWorks } from "@/components/fund/how-it-works";
import { OpportunityCard } from "@/components/fund/opportunity-card";
import {
  OpportunityFilters,
  type OpportunitySort,
  type OpportunityStatus,
} from "@/components/fund/opportunity-filters";
import { EmptyState, InsightCallout, SectionHeading, SurfaceCard } from "@/components/ui-primitives";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import { formatMoney, type EscrowReadModel } from "@/features/wallet/model";

type FundPortalOpportunity = {
  committedAmountLabel: string;
  cropType: string;
  fundingGoalLabel: string;
  id: string;
  investorCount: number;
  location: string;
  minimumInvestmentLabel: string;
  name: string;
  progressPercent: number;
  region: string;
  sortTimestamp: number;
  status: "open" | "funded" | "closed";
  summary: string;
  targetReturnLabel: string;
  timelineLabel: string;
};

const REGION_FALLBACK = "Regional cluster";

const CROP_RETURN_MAP: Record<string, number> = {
  cassava: 14,
  cocoa: 18,
  corn: 12,
  maize: 13,
  rice: 15,
  soybeans: 16,
};

const SEED_OPPORTUNITIES: FundPortalOpportunity[] = [
  {
    committedAmountLabel: "GHS 45,000",
    cropType: "Cocoa",
    fundingGoalLabel: "GHS 80,000",
    id: "seed-cocoa-forest",
    investorCount: 12,
    location: "Forest Belt, Ghana",
    minimumInvestmentLabel: "GHS 1,000",
    name: "Forest Belt Cocoa Recovery",
    progressPercent: 56,
    region: "Ghana",
    sortTimestamp: Date.parse("2026-04-18T00:00:00.000Z"),
    status: "open",
    summary: "Working capital for pruning, fertilizer, and post-harvest handling before export collection.",
    targetReturnLabel: "17%",
    timelineLabel: "8 months",
  },
  {
    committedAmountLabel: "USD 18,400",
    cropType: "Rice",
    fundingGoalLabel: "USD 24,000",
    id: "seed-rice-delta",
    investorCount: 8,
    location: "River Delta, Nigeria",
    minimumInvestmentLabel: "USD 500",
    name: "Delta Rice Dry-Season Cycle",
    progressPercent: 77,
    region: "Nigeria",
    sortTimestamp: Date.parse("2026-04-20T00:00:00.000Z"),
    status: "funded",
    summary: "Input financing and irrigation support for an accelerated dry-season rice cycle.",
    targetReturnLabel: "15%",
    timelineLabel: "6 months",
  },
];

function parseRegion(location: string): string {
  const parts = location
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.at(-1) ?? REGION_FALLBACK;
}

function estimatedReturn(commodity: string, quantityTons: number): number {
  const base = CROP_RETURN_MAP[commodity.toLowerCase()] ?? 13;
  return Math.min(22, base + Math.round(quantityTons / 20));
}

function timelineLabel(quantityTons: number): string {
  const months = Math.max(4, Math.min(12, Math.round(quantityTons / 8) + 4));
  return `${months} months`;
}

function opportunityStatus(listing: ListingRecord, progressPercent: number): FundPortalOpportunity["status"] {
  if (listing.status === "closed") {
    return "closed";
  }
  if (progressPercent >= 100) {
    return "funded";
  }
  return "open";
}

function toOpportunity(listing: ListingRecord, escrows: EscrowReadModel[]): FundPortalOpportunity {
  const listingEscrows = escrows.filter((item) => item.listing_id === listing.listing_id && item.state !== "reversed");
  const committedAmount = listingEscrows.reduce((sum, item) => sum + item.amount, 0);
  const fundingGoal = Math.max(250, Math.round(listing.price_amount * listing.quantity_tons * 1.15));
  const progressPercent = Math.min(100, Math.round((committedAmount / fundingGoal) * 100));
  const returnRate = estimatedReturn(listing.commodity, listing.quantity_tons);
  const region = parseRegion(listing.location);
  const investorCount = new Set(listingEscrows.map((item) => item.buyer_actor_id)).size;
  const currency = listing.price_currency;
  const minimumInvestment = Math.max(100, Math.round((fundingGoal * 0.05) / 10) * 10);

  return {
    committedAmountLabel: formatMoney(committedAmount, currency),
    cropType: listing.commodity,
    fundingGoalLabel: formatMoney(fundingGoal, currency),
    id: listing.listing_id,
    investorCount,
    location: listing.location,
    minimumInvestmentLabel: formatMoney(minimumInvestment, currency),
    name: listing.title,
    progressPercent,
    region,
    sortTimestamp: Date.parse(listing.published_at ?? listing.created_at),
    status: opportunityStatus(listing, progressPercent),
    summary: listing.summary,
    targetReturnLabel: `${returnRate}%`,
    timelineLabel: timelineLabel(listing.quantity_tons),
  };
}

function parseInvestmentRange(value: string): { min: number | null; max: number | null } {
  const [rawMin, rawMax] = value.split("-").map((item) => item.trim());
  const min = rawMin ? Number(rawMin) : null;
  const max = rawMax ? Number(rawMax) : null;

  return {
    max: Number.isFinite(max) ? max : null,
    min: Number.isFinite(min) ? min : null,
  };
}

export function FundPortalHome() {
  const { session, traceId } = useAppState();
  const [opportunities, setOpportunities] = useState<FundPortalOpportunity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSeedData, setIsSeedData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<OpportunityStatus>("all");
  const [selectedSort, setSelectedSort] = useState<OpportunitySort>("newest");
  const [investmentRange, setInvestmentRange] = useState("");
  const [capitalCommittedLabel, setCapitalCommittedLabel] = useState("USD 0");
  const [settledPayoutsLabel, setSettledPayoutsLabel] = useState("USD 0");
  const [activeInvestors, setActiveInvestors] = useState(0);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    void Promise.all([
      marketplaceApi.listListings(traceId),
      walletApi.listEscrows(traceId),
      walletApi.listWalletTransactions(traceId),
      walletApi.getWalletSummary(traceId),
    ])
      .then(([listingsResponse, escrowsResponse, transactionsResponse, walletResponse]) => {
        if (cancelled) {
          return;
        }

        const publishedListings = listingsResponse.data.items.filter((item) => item.status === "published");
        const derivedOpportunities = publishedListings.map((item) => toOpportunity(item, escrowsResponse.data.items));
        const walletCurrency = walletResponse.data.currency;
        const capitalCommitted = derivedOpportunities.reduce((sum, item) => {
          const numeric = Number(item.committedAmountLabel.replace(/[^\d.-]/g, ""));
          return sum + (Number.isFinite(numeric) ? numeric : 0);
        }, 0);
        const settledPayouts = transactionsResponse.data.items
          .filter((item) => item.reason === "escrow_released" && item.direction === "credit")
          .reduce((sum, item) => sum + item.amount, 0);
        const investorCount = new Set(escrowsResponse.data.items.map((item) => item.buyer_actor_id)).size;

        setCapitalCommittedLabel(formatMoney(capitalCommitted, walletCurrency));
        setSettledPayoutsLabel(formatMoney(settledPayouts, walletCurrency));
        setActiveInvestors(investorCount);

        if (derivedOpportunities.length === 0) {
          setOpportunities(SEED_OPPORTUNITIES);
          setIsSeedData(true);
        } else {
          setOpportunities(derivedOpportunities);
          setIsSeedData(false);
        }

        setError(null);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load fund opportunities.");
        setOpportunities(SEED_OPPORTUNITIES);
        setIsSeedData(true);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const cropOptions = useMemo(
    () => Array.from(new Set(opportunities.map((item) => item.cropType))).sort((left, right) => left.localeCompare(right)),
    [opportunities],
  );
  const regionOptions = useMemo(
    () => Array.from(new Set(opportunities.map((item) => item.region))).sort((left, right) => left.localeCompare(right)),
    [opportunities],
  );

  const filteredOpportunities = useMemo(() => {
    const range = parseInvestmentRange(investmentRange);

    const filtered = opportunities.filter((item) => {
      const minimumInvestment = Number(item.minimumInvestmentLabel.replace(/[^\d.-]/g, ""));
      if (selectedCrop !== "all" && item.cropType !== selectedCrop) {
        return false;
      }
      if (selectedRegion !== "all" && item.region !== selectedRegion) {
        return false;
      }
      if (selectedStatus !== "all" && item.status !== selectedStatus) {
        return false;
      }
      if (range.min !== null && minimumInvestment < range.min) {
        return false;
      }
      if (range.max !== null && minimumInvestment > range.max) {
        return false;
      }
      return true;
    });

    return filtered.sort((left, right) => {
      if (selectedSort === "return") {
        return Number(right.targetReturnLabel.replace(/[^\d.-]/g, "")) - Number(left.targetReturnLabel.replace(/[^\d.-]/g, ""));
      }
      if (selectedSort === "progress") {
        return right.progressPercent - left.progressPercent;
      }
      return right.sortTimestamp - left.sortTimestamp;
    });
  }, [investmentRange, opportunities, selectedCrop, selectedRegion, selectedSort, selectedStatus]);

  if (!session) {
    return null;
  }

  return (
    <div className="fund-page-stack">
      <FundHero
        activeInvestors={activeInvestors}
        capitalCommitted={capitalCommittedLabel}
        liveOpportunities={opportunities.length}
        settledPayouts={settledPayoutsLabel}
      />

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      {isSeedData ? (
        <SurfaceCard>
          <InsightCallout
            title="Showing seed opportunities"
            body="Live marketplace records are empty or still loading, so AgroFund is keeping the portal warm with curated example opportunities."
            tone="accent"
          />
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeading
          eyebrow="Farm opportunities"
          title="Compare goal size, progress, and expected return"
          body="Filters are tuned for mobile use first, then scale into a richer comparison grid on larger screens."
        />
        <OpportunityFilters
          cropOptions={cropOptions}
          investmentRange={investmentRange}
          onCropChange={setSelectedCrop}
          onInvestmentRangeChange={setInvestmentRange}
          onRegionChange={setSelectedRegion}
          onReset={() => {
            setSelectedCrop("all");
            setSelectedRegion("all");
            setSelectedStatus("all");
            setSelectedSort("newest");
            setInvestmentRange("");
          }}
          onSortChange={setSelectedSort}
          onStatusChange={setSelectedStatus}
          regionOptions={regionOptions}
          selectedCrop={selectedCrop}
          selectedRegion={selectedRegion}
          selectedSort={selectedSort}
          selectedStatus={selectedStatus}
        />

        <div className="fund-list-meta" id="fund-opportunities">
          <p>
            {filteredOpportunities.length} opportunit{filteredOpportunities.length === 1 ? "y" : "ies"} available
          </p>
          <span>{isLoading ? "Refreshing live data..." : "Live platform data loaded"}</span>
        </div>

        {filteredOpportunities.length === 0 ? (
          <EmptyState
            title="No opportunities match this filter"
            body="Widen the crop, region, or investment range to review more farm opportunities."
          />
        ) : (
          <div className="fund-opportunity-grid">
            {filteredOpportunities.map((item) => (
              <OpportunityCard key={item.id} opportunity={item} />
            ))}
          </div>
        )}
      </SurfaceCard>

      <HowItWorks />
    </div>
  );
}
