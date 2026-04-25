"use client";

import Link from "next/link";
import React from "react";

import { InfoList, StatusPill } from "@/components/ui-primitives";
import { formatMoney } from "@/features/wallet/model";
import type { FundInvestmentRecord, FundOpportunity } from "@/lib/fund";

export function InvestmentCard(props: {
  currency: string;
  investment: FundInvestmentRecord;
  opportunity?: FundOpportunity;
}) {
  return (
    <article className="fund-investment-card">
      <div className="queue-head">
        <div>
          <strong>{props.opportunity?.listing.title ?? props.investment.listing_id}</strong>
          <p className="muted">
            {props.opportunity?.listing.location ?? "Farm portfolio item"} · {new Date(props.investment.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusPill tone={props.investment.status === "active" ? "online" : "neutral"}>{props.investment.status}</StatusPill>
      </div>
      <InfoList
        items={[
          { label: "Invested", value: formatMoney(props.investment.amount, props.currency) },
          { label: "Expected return", value: formatMoney(props.investment.expected_return_amount, props.currency) },
          { label: "Schedule", value: props.investment.payout_schedule },
          { label: "Reference", value: props.investment.reference },
        ]}
      />
      {props.opportunity ? (
        <Link className="button-ghost" href={`/app/fund/${props.opportunity.listing.listing_id}`}>
          View farm detail
        </Link>
      ) : null}
    </article>
  );
}
