"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight, ShieldCheck, Sprout, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { InsurancePolicyRecord } from "@/lib/api/insurance";

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function riskVariant(riskLevel: InsurancePolicyRecord["field"]["risk_level"]) {
  if (riskLevel === "elevated") {
    return "warning" as const;
  }
  if (riskLevel === "guarded") {
    return "neutral" as const;
  }
  return "success" as const;
}

type PolicyCardProps = {
  policy: InsurancePolicyRecord;
  claimHref?: string | null;
};

export function PolicyCard({ policy, claimHref }: PolicyCardProps) {
  return (
    <article className="insurance-policy-card">
      <div className="insurance-policy-head">
        <div>
          <p className="insurance-policy-kicker">{policy.provider_name}</p>
          <h3>{policy.field.farm_name}</h3>
          <p className="insurance-policy-copy">
            {policy.field.crop_type} · {policy.field.hectares} ha · {policy.field.district}
          </p>
        </div>
        <Badge variant={riskVariant(policy.field.risk_level)}>{policy.field.risk_level} risk</Badge>
      </div>

      <div className="insurance-policy-grid">
        <article>
          <ShieldCheck size={16} />
          <span>Coverage</span>
          <strong>{formatMoney(policy.coverage_amount, policy.currency)}</strong>
          <p>{policy.coverage_window_label}</p>
        </article>
        <article>
          <Wallet size={16} />
          <span>Premium</span>
          <strong>{formatMoney(policy.premium_amount, policy.currency)}</strong>
          <p>{policy.payment_reference}</p>
        </article>
        <article>
          <Sprout size={16} />
          <span>Claims</span>
          <strong>{policy.active_claim_count}</strong>
          <p>{policy.weather_link_label}</p>
        </article>
      </div>

      <div className="insurance-policy-footer">
        <span className="insurance-policy-status">{policy.status}</span>
        {claimHref ? (
          <Link className="wallet-link-inline" href={claimHref}>
            Review latest claim
            <ArrowRight size={14} />
          </Link>
        ) : (
          <span className="insurance-policy-muted">No active claim linked to this policy.</span>
        )}
      </div>
    </article>
  );
}
