import React, { type ReactNode } from "react";
import { clsx } from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: { direction: "up" | "down"; text: string };
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, trend, icon, className }: StatCardProps) {
  return (
    <div className={clsx("ds-stat-card", className)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="ds-stat-label">{label}</span>
        {icon}
      </div>
      <span className="ds-stat-value">{value}</span>
      {trend && (
        <span className={clsx("ds-stat-trend", trend.direction === "up" ? "ds-stat-trend-up" : "ds-stat-trend-down")}>
          {trend.direction === "up" ? "↑" : "↓"} {trend.text}
        </span>
      )}
    </div>
  );
}
