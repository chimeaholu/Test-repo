"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight, Clock3, MapPin, Sprout, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";

export type FundOpportunity = {
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

function statusVariant(status: FundOpportunity["status"]) {
  if (status === "funded") {
    return "success" as const;
  }
  if (status === "closed") {
    return "neutral" as const;
  }
  return "brand" as const;
}

export function OpportunityCard({ opportunity }: { opportunity: FundOpportunity }) {
  return (
    <article className="fund-opportunity-card">
      <div className="fund-card-media">
        <Badge variant={statusVariant(opportunity.status)}>{opportunity.status}</Badge>
        <div>
          <p>{opportunity.region}</p>
          <h3>{opportunity.name}</h3>
        </div>
      </div>

      <div className="fund-card-meta">
        <div>
          <MapPin size={16} />
          <span>{opportunity.location}</span>
        </div>
        <div>
          <Sprout size={16} />
          <span>{opportunity.cropType}</span>
        </div>
      </div>

      <p className="fund-card-summary">{opportunity.summary}</p>

      <div className="fund-card-financials">
        <article>
          <span>Funding goal</span>
          <strong>{opportunity.fundingGoalLabel}</strong>
        </article>
        <article>
          <span>Committed</span>
          <strong>{opportunity.committedAmountLabel}</strong>
        </article>
      </div>

      <ProgressBar
        className="fund-card-progress"
        label="Funding completion"
        max={100}
        value={opportunity.progressPercent}
      />

      <div className="fund-card-stats">
        <div>
          <TrendingUp size={16} />
          <span>{opportunity.targetReturnLabel} return</span>
        </div>
        <div>
          <Clock3 size={16} />
          <span>{opportunity.timelineLabel}</span>
        </div>
        <div>
          <Users size={16} />
          <span>{opportunity.investorCount} investors</span>
        </div>
      </div>

      <div className="fund-card-footer">
        <div>
          <span>Minimum investment</span>
          <strong>{opportunity.minimumInvestmentLabel}</strong>
        </div>
        <Link className="wallet-link-inline" href={`/app/fund/${opportunity.id}`}>
          View opportunity
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
