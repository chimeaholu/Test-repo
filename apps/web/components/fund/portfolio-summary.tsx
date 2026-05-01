"use client";

import React from "react";

import { formatMoney } from "@/features/wallet/model";

export function PortfolioSummary(props: {
  activeInvestments: number;
  currency: string;
  expectedReturns: number;
  totalInvested: number;
}) {
  return (
    <section className="fund-portfolio-summary">
      <article>
        <span>Total invested</span>
        <strong>{formatMoney(props.totalInvested, props.currency)}</strong>
      </article>
      <article>
        <span>Expected returns</span>
        <strong>{formatMoney(props.expectedReturns, props.currency)}</strong>
      </article>
      <article>
        <span>Active farms</span>
        <strong>{props.activeInvestments}</strong>
      </article>
    </section>
  );
}
