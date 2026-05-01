"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";

import { InvestmentCard } from "@/components/fund/investment-card";
import { PortfolioSummary } from "@/components/fund/portfolio-summary";
import { useAppState } from "@/components/app-provider";
import { EmptyState, SectionHeading, SurfaceCard } from "@/components/ui-primitives";
import { fundApi } from "@/lib/api/fund";
import { marketplaceApi } from "@/lib/api/marketplace";
import {
  buildFundOpportunity,
  portfolioSummary,
  toFundInvestmentRecord,
  type FundOpportunity,
  type FundInvestmentRecord,
} from "@/lib/fund";

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GH: "GHS",
  JM: "JMD",
  NG: "NGN",
};

export default function MyInvestmentsPage() {
  const { session, traceId } = useAppState();
  const [investments, setInvestments] = useState<FundInvestmentRecord[]>([]);
  const [opportunitiesById, setOpportunitiesById] = useState<Record<string, FundOpportunity>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;

    void Promise.all([fundApi.listInvestments(traceId), marketplaceApi.listListings(traceId)])
      .then(([investmentsResponse, listingsResponse]) => {
        if (cancelled) {
          return;
        }
        const nextInvestments = investmentsResponse.data.items.map((item) => toFundInvestmentRecord(item));
        const canonicalByListingId = Object.fromEntries(
          investmentsResponse.data.items
            .filter((item) => item.opportunity)
            .map((item) => [item.opportunity!.farm_id, item.opportunity!]),
        );
        const nextOpportunities = Object.fromEntries(
          listingsResponse.data.items.map((item, index) => [
            item.listing_id,
            buildFundOpportunity(item, index, canonicalByListingId[item.listing_id]),
          ]),
        );

        setInvestments(nextInvestments);
        setOpportunitiesById(nextOpportunities);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load your AgroFund portfolio.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const summary = useMemo(() => portfolioSummary(investments), [investments]);

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

      <SurfaceCard>
        <SectionHeading
          eyebrow="My investments"
          title="See your active commitments and expected returns"
          body="Track every farm you have backed and stay close to payout progress from one place."
        />
        <PortfolioSummary
          activeInvestments={summary.activeInvestments}
          currency={currency}
          expectedReturns={summary.expectedReturns}
          totalInvested={summary.totalInvested}
        />
      </SurfaceCard>

      {investments.length === 0 ? (
        <EmptyState title="No investments yet" body="Explore a farm opportunity to start building your portfolio." />
      ) : (
        <section className="fund-investment-grid" aria-label="Portfolio investments">
          {investments.map((investment) => (
            <InvestmentCard
              currency={currency}
              investment={investment}
              key={investment.id}
              opportunity={opportunitiesById[investment.listing_id]}
            />
          ))}
        </section>
      )}
    </div>
  );
}
