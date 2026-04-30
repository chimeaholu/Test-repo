"use client";

import React from "react";

import { StatusPill } from "@/components/ui-primitives";
import type { CounterpartyTrustSummary } from "@/features/marketplace/trust";

type CounterpartyTrustCardProps = {
  eyebrow?: string;
  summary: CounterpartyTrustSummary;
};

export function CounterpartyTrustCard({
  eyebrow = "Trust view",
  summary,
}: CounterpartyTrustCardProps) {
  return (
    <section className="market-trust-card">
      <div className="stack-sm">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{summary.title}</h3>
        <p className="muted">{summary.summary}</p>
      </div>

      <div className="market-trust-signal-list" role="list" aria-label={summary.title}>
        {summary.signals.map((signal) => (
          <article className="market-trust-signal" key={signal.label} role="listitem">
            <div className="queue-head">
              <strong>{signal.label}</strong>
              <StatusPill tone={signal.tone}>{signal.value}</StatusPill>
            </div>
            <p className="muted">{signal.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
