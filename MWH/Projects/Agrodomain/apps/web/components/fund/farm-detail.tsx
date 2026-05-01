"use client";

import React from "react";

import { PhotoCarousel, type PhotoCarouselSlide } from "@/components/marketplace/photo-carousel";
import { InfoList, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { formatMoney } from "@/features/wallet/model";
import type { FundOpportunity } from "@/lib/fund";

function slidesForOpportunity(opportunity: FundOpportunity): PhotoCarouselSlide[] {
  return [
    {
      id: "farm-overview",
      eyebrow: "Farm overview",
      title: opportunity.listing.title,
      body: opportunity.listing.summary,
      accentClassName: "market-carousel-earth",
    },
    {
      id: "funding",
      eyebrow: "Funding detail",
      title: `${opportunity.progressPct}% of the goal is already raised`,
      body: `${opportunity.investorCount} investors are currently backing this farm cycle.`,
      accentClassName: "market-carousel-harvest",
    },
    {
      id: "returns",
      eyebrow: "Return profile",
      title: `${opportunity.expectedReturnPct}% expected return over ${opportunity.timelineMonths} months`,
      body: opportunity.payoutSchedule,
      accentClassName: "market-carousel-sky",
    },
  ];
}

export function FarmDetail(props: {
  currency: string;
  opportunity: FundOpportunity;
}) {
  const { opportunity } = props;

  return (
    <div className="content-stack">
      <PhotoCarousel commodity={opportunity.listing.commodity} location={opportunity.listing.location} slides={slidesForOpportunity(opportunity)} />

      <SurfaceCard>
        <SectionHeading
          eyebrow="Farm opportunity"
          title={opportunity.listing.title}
          body="Review the farm story, funding need, return case, and protection signals before you invest."
        />
        <div className="pill-row">
          <StatusPill tone="neutral">{opportunity.listing.location}</StatusPill>
          <StatusPill tone="neutral">{opportunity.listing.commodity}</StatusPill>
          <StatusPill tone={opportunity.status === "open" ? "online" : opportunity.status === "closing_soon" ? "degraded" : "neutral"}>
            {opportunity.status.replaceAll("_", " ")}
          </StatusPill>
        </div>
      </SurfaceCard>

      <div className="fund-detail-grid">
        <SurfaceCard>
          <SectionHeading eyebrow="Why this opportunity matters" title="What this farm is raising for" />
          <InfoList
            items={[
              { label: "Farmer", value: opportunity.farmerName },
              { label: "Farm size", value: `${opportunity.sizeHectares} ha` },
              { label: "Soil type", value: opportunity.soilType },
              { label: "Funding goal", value: formatMoney(opportunity.fundingGoal, props.currency) },
              { label: "Current amount", value: formatMoney(opportunity.raisedAmount, props.currency) },
              { label: "Minimum investment", value: formatMoney(opportunity.minInvestment, props.currency) },
            ]}
          />
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading eyebrow="Return and risk" title="Expected returns and timeline" />
          <InfoList
            items={[
              { label: "Expected return", value: `${opportunity.expectedReturnPct}%` },
              { label: "Timeline", value: `${opportunity.timelineMonths} months` },
              { label: "Payout schedule", value: opportunity.payoutSchedule },
              { label: "Maximum ticket", value: formatMoney(opportunity.maxInvestment, props.currency) },
            ]}
          />
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading eyebrow="Return and risk" title="What to keep in view" />
        <div className="fund-risk-list">
          {opportunity.riskFactors.map((risk) => (
            <article className="fund-risk-card" key={risk}>
              <strong>Protection signal</strong>
              <p>{risk}</p>
            </article>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
