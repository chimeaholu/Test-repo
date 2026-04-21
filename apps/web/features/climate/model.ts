import {
  climateAlertSchema,
  climateDegradedModeSchema,
  mrvEvidenceRecordSchema,
} from "@agrodomain/contracts";
import { z } from "zod";

export type ClimateAlertViewModel = z.infer<typeof climateAlertSchema>;
export type ClimateDegradedModeViewModel = z.infer<typeof climateDegradedModeSchema>;
export type MrvEvidenceViewModel = z.infer<typeof mrvEvidenceRecordSchema>;

export function climateSeverityTone(
  severity: ClimateAlertViewModel["severity"],
): "online" | "degraded" | "offline" {
  switch (severity) {
    case "info":
      return "online";
    case "warning":
      return "degraded";
    case "critical":
      return "offline";
  }
}

export function climateSourceConfidence(alert: ClimateAlertViewModel): string {
  return alert.degraded_mode ? "Reduced while source windows recover" : "Verified from current source window";
}

export function mrvCompletenessTone(
  completeness: MrvEvidenceViewModel["source_completeness"],
): "online" | "degraded" | "offline" {
  switch (completeness) {
    case "complete":
      return "online";
    case "partial":
      return "degraded";
    case "degraded":
      return "offline";
  }
}

export function sortAlerts(items: ClimateAlertViewModel[]): ClimateAlertViewModel[] {
  const order: Record<ClimateAlertViewModel["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return [...items].sort((left, right) => {
    const severityDiff = order[left.severity] - order[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return right.created_at.localeCompare(left.created_at);
  });
}
