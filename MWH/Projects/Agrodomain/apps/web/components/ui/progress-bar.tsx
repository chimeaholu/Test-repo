import React from "react";
import { clsx } from "clsx";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-neutral-600)" }}>
            {label}
          </span>
          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-neutral-800)" }}>
            {Math.round(percent)}%
          </span>
        </div>
      )}
      <div className="ds-progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className="ds-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
