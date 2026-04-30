"use client";

import type {
  FundingOpportunityRead,
  InvestmentRead,
  ListingRecord,
} from "@agrodomain/contracts";

import { readJson, writeJson } from "./api-client";

export type FundOpportunity = {
  expectedReturnPct: number;
  farmerActorId: string;
  farmerName: string;
  fundingGoal: number;
  investorCount: number;
  listing: ListingRecord;
  opportunityId: string | null;
  maxInvestment: number;
  minInvestment: number;
  payoutSchedule: string;
  progressPct: number;
  raisedAmount: number;
  riskFactors: string[];
  sizeHectares: number;
  soilType: string;
  status: "open" | "funded" | "closing_soon";
  timelineMonths: number;
};

export type FundInvestmentRecord = {
  actor_id: string;
  amount: number;
  created_at: string;
  currency: string;
  expected_return_amount: number;
  expected_return_pct: number;
  id: string;
  listing_id: string;
  note: string | null;
  opportunity_id: string;
  payout_schedule: string;
  reference: string;
  status: "active" | "matured" | "withdrawn";
  timeline_months: number;
};

const FUND_PORTFOLIO_KEY = "agrodomain.fund-portfolio.v1";
export const FUND_PORTFOLIO_EVENT = "agrodomain:fund-portfolio-changed";

function slugValue(source: string): number {
  return source.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function soilTypeForCommodity(commodity: string): string {
  const lower = commodity.toLowerCase();
  if (lower.includes("cassava") || lower.includes("yam")) {
    return "Well-drained sandy loam";
  }
  if (lower.includes("maize") || lower.includes("rice")) {
    return "Fertile loam with moderate water retention";
  }
  if (lower.includes("cocoa") || lower.includes("coffee")) {
    return "Deep organic forest soil";
  }
  return "Mixed loam suited to seasonal crop rotation";
}

function riskFactorsForListing(listing: ListingRecord): string[] {
  return [
    `Weather sensitivity remains highest near ${listing.location.split(",")[0] ?? listing.location}.`,
    `${listing.commodity} pricing can tighten if harvest timing shifts by more than two weeks.`,
    "Returns depend on post-harvest handling and aggregation staying on schedule.",
  ];
}

function farmerNameFromActorId(actorId: string): string {
  return actorId
    .replace(/^actor-/, "")
    .split("-")
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapOpportunityStatus(
  status: FundingOpportunityRead["status"] | undefined,
  progressPct: number,
): FundOpportunity["status"] {
  if (status === "funded" || status === "closed" || status === "completed") {
    return "funded";
  }
  if (progressPct >= 90) {
    return "closing_soon";
  }
  return "open";
}

export function buildFundOpportunity(
  listing: ListingRecord,
  index = 0,
  canonical?: FundingOpportunityRead,
): FundOpportunity {
  const seed = slugValue(`${listing.listing_id}-${listing.title}`);
  const fundingGoal = canonical?.funding_goal ?? Math.max(1800, Math.round(listing.quantity_tons * listing.price_amount * 2.4));
  const raisedAmount =
    canonical?.current_amount ??
    Math.min(
      fundingGoal,
      Math.round(fundingGoal * (0.32 + ((seed + index) % 41) / 100)),
    );
  const progressPct =
    canonical?.percent_funded ?? Math.max(8, Math.min(100, Math.round((raisedAmount / fundingGoal) * 100)));
  const expectedReturnPct = canonical?.expected_return_pct ?? 12 + (seed % 7);
  const timelineMonths = canonical?.timeline_months ?? 6 + (seed % 4) * 3;
  const sizeHectares = Number((listing.quantity_tons * 1.7 + (seed % 5)).toFixed(1));
  const minInvestment = canonical?.min_investment ?? Math.max(100, Math.round(fundingGoal * 0.05));
  const maxInvestment = canonical?.max_investment ?? Math.max(minInvestment, Math.round(fundingGoal * 0.35));
  const status = mapOpportunityStatus(canonical?.status, progressPct);

  return {
    listing,
    farmerActorId: listing.actor_id,
    farmerName: farmerNameFromActorId(listing.actor_id) || "Verified farmer",
    fundingGoal,
    raisedAmount,
    progressPct,
    expectedReturnPct,
    timelineMonths,
    investorCount: 6 + (seed % 18),
    opportunityId: canonical?.opportunity_id ?? null,
    minInvestment,
    maxInvestment,
    payoutSchedule: `${timelineMonths}-month harvest cycle with quarterly farm updates`,
    soilType: soilTypeForCommodity(listing.commodity),
    sizeHectares,
    riskFactors: riskFactorsForListing(listing),
    status,
  };
}

export function readFundPortfolio(actorId: string): FundInvestmentRecord[] {
  const store = readJson<Record<string, FundInvestmentRecord[]>>(FUND_PORTFOLIO_KEY) ?? {};
  return store[actorId] ?? [];
}

export function recordFundInvestment(record: FundInvestmentRecord): FundInvestmentRecord[] {
  const store = readJson<Record<string, FundInvestmentRecord[]>>(FUND_PORTFOLIO_KEY) ?? {};
  const current = store[record.actor_id] ?? [];
  const next = [record, ...current].sort((left, right) => right.created_at.localeCompare(left.created_at));
  writeJson(FUND_PORTFOLIO_KEY, {
    ...store,
    [record.actor_id]: next,
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FUND_PORTFOLIO_EVENT, { detail: { actorId: record.actor_id } }));
  }
  return next;
}

export function portfolioSummary(records: FundInvestmentRecord[]) {
  const totalInvested = records.reduce((sum, record) => sum + record.amount, 0);
  const expectedReturns = records.reduce((sum, record) => sum + record.expected_return_amount, 0);
  const activeInvestments = records.filter((record) => record.status === "active").length;

  return {
    activeInvestments,
    totalInvested,
    expectedReturns,
  };
}

export function toFundInvestmentRecord(investment: InvestmentRead): FundInvestmentRecord {
  const timelineMonths = investment.opportunity?.timeline_months ?? 0;
  return {
    actor_id: investment.investor_actor_id,
    amount: investment.amount,
    created_at: investment.invested_at,
    currency: investment.currency,
    expected_return_amount: investment.expected_return_amount ?? investment.amount,
    expected_return_pct: investment.opportunity?.expected_return_pct ?? 0,
    id: investment.investment_id,
    listing_id: investment.opportunity?.farm_id ?? investment.opportunity_id,
    note: null,
    opportunity_id: investment.opportunity_id,
    payout_schedule:
      timelineMonths > 0
        ? `${timelineMonths}-month harvest cycle with quarterly farm updates`
        : "AgroFund payout schedule pending",
    reference: investment.investment_id,
    status: investment.status,
    timeline_months: timelineMonths,
  };
}
