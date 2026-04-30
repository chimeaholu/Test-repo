"use client";

import React from "react";
import type { AnalyticsMetric } from "@/features/analytics/model";

export function MetricDashboard(props: {
  items: AnalyticsMetric[];
  testId?: string;
}) {
  return (
    <div className="metrics-grid analytics-metric-grid" data-testid={props.testId}>
      {props.items.map((item) => (
        <article
          aria-label={`${item.label}: ${item.value}. ${item.trendLabel}`}
          className="metric-card analytics-metric-card"
          key={item.label}
          role="region"
        >
          <span className="metric-label">{item.label}</span>
          <strong className="metric-value">{item.value}</strong>
          <span className={`analytics-trend analytics-trend-${item.tone}`}>{item.trendLabel}</span>
        </article>
      ))}
    </div>
  );
}
