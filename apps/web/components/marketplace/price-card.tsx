import type { ReactNode } from "react";
import React from "react";

import { StatusPill } from "@/components/ui-primitives";

type PriceCardProps = {
  hasUnpublishedChanges?: boolean;
  priceAmount: number;
  priceCurrency: string;
  primaryAction: ReactNode;
  quantityTons: number;
  secondaryAction?: ReactNode;
  status: "draft" | "published" | "closed";
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount) + ` ${currency}`;
}

function priceTone(status: PriceCardProps["status"]): "online" | "degraded" | "neutral" {
  if (status === "published") {
    return "online";
  }
  if (status === "draft") {
    return "degraded";
  }
  return "neutral";
}

export function PriceCard(props: PriceCardProps) {
  const estimatedUnitPrice = props.quantityTons > 0 ? props.priceAmount / props.quantityTons : props.priceAmount;

  return (
    <aside className="surface-card market-price-card">
      <div className="pill-row">
        <StatusPill tone={priceTone(props.status)}>{props.status}</StatusPill>
        {props.hasUnpublishedChanges ? <StatusPill tone="degraded">Draft changes pending</StatusPill> : null}
      </div>

      <div className="market-price-stack">
        <span className="metric-label">Current asking price</span>
        <strong className="market-price-amount">{formatMoney(props.priceAmount, props.priceCurrency)}</strong>
        <p className="muted">Current schema does not declare unit semantics, so the per-ton view is an estimate.</p>
      </div>

      <dl className="market-price-meta">
        <div>
          <dt>Quantity</dt>
          <dd>{props.quantityTons} tons</dd>
        </div>
        <div>
          <dt>Est. per ton</dt>
          <dd>{formatMoney(estimatedUnitPrice, props.priceCurrency)}</dd>
        </div>
        <div>
          <dt>Currency</dt>
          <dd>{props.priceCurrency}</dd>
        </div>
      </dl>

      <div className="content-stack">
        {props.primaryAction}
        {props.secondaryAction}
      </div>
    </aside>
  );
}
