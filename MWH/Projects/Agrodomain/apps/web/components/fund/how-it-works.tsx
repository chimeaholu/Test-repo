"use client";

import React from "react";

const steps = [
  {
    id: "browse",
    title: "Browse",
    body: "Compare farm opportunities, funding progress, and expected return before you commit.",
  },
  {
    id: "invest",
    title: "Invest",
    body: "Review the amount, return outlook, and timeline, then invest from your wallet.",
  },
  {
    id: "track",
    title: "Track",
    body: "Keep your portfolio, active commitments, and payout progress in one place.",
  },
  {
    id: "earn",
    title: "Earn",
    body: "Follow expected return timing and paid-out results as the farm cycle moves forward.",
  },
];

export function HowItWorks() {
  return (
    <section className="fund-how-grid" aria-label="How AgroFund works">
      {steps.map((step, index) => (
        <article className="fund-how-card" key={step.id}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{step.title}</strong>
          <p>{step.body}</p>
        </article>
      ))}
    </section>
  );
}
