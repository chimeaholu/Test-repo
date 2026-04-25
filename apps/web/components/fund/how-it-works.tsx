"use client";

import React from "react";

const steps = [
  {
    id: "browse",
    title: "Browse",
    body: "Explore live farm opportunities derived from current marketplace supply and funding posture.",
  },
  {
    id: "invest",
    title: "Invest",
    body: "Commit capital from your AgroWallet after reviewing the amount, return range, and timeline.",
  },
  {
    id: "track",
    title: "Track",
    body: "Watch your portfolio and each farm’s progress from one protected workspace.",
  },
  {
    id: "earn",
    title: "Earn",
    body: "Follow expected return dates and payout schedules as seasons progress.",
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
