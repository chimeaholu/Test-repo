import React, { type ReactNode } from "react";
import { clsx } from "clsx";
import { StatCard } from "./stat-card";

interface MetricItem {
  label: string;
  value: string | number;
  trend?: { direction: "up" | "down"; text: string };
  icon?: ReactNode;
}

interface MetricGridProps {
  metrics: MetricItem[];
  className?: string;
}

export function MetricGrid({ metrics, className }: MetricGridProps) {
  return (
    <div className={clsx("ds-metric-grid", className)} role="list" aria-label="Key metrics">
      {metrics.map((m) => (
        <StatCard key={m.label} {...m} />
      ))}
    </div>
  );
}
