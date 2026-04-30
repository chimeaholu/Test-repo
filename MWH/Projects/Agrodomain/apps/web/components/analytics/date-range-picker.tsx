"use client";

import React from "react";
import type { AnalyticsRangeKey } from "@/features/analytics/model";

const RANGE_OPTIONS: Array<{ label: string; value: AnalyticsRangeKey }> = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "1y", value: "1y" },
];

export function DateRangePicker(props: {
  label?: string;
  onChange: (value: AnalyticsRangeKey) => void;
  value: AnalyticsRangeKey;
}) {
  return (
    <div className="analytics-range-picker" data-testid="analytics-date-range-picker">
      <span className="metric-label">{props.label ?? "Range"}</span>
      <div className="analytics-range-actions" role="tablist" aria-label={props.label ?? "Date range"}>
        {RANGE_OPTIONS.map((option) => (
          <button
            aria-pressed={props.value === option.value}
            className={`analytics-range-button${props.value === option.value ? " is-active" : ""}`}
            data-testid={`analytics-range-${option.value}`}
            key={option.value}
            onClick={() => props.onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
