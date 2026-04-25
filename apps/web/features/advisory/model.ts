import { advisoryResponseSchema } from "@agrodomain/contracts";
import { z } from "zod";

export type AdvisoryViewModel = z.infer<typeof advisoryResponseSchema>;

const SUPPORTED_LOCALES = ["en-GH", "fr-CI", "sw-KE"] as const;

export function resolveAdvisoryLocale(preferredLocale: string | null | undefined): {
  resolvedLocale: string;
  usedFallback: boolean;
} {
  if (!preferredLocale) {
    return { resolvedLocale: "en-GH", usedFallback: true };
  }

  if (SUPPORTED_LOCALES.includes(preferredLocale as (typeof SUPPORTED_LOCALES)[number])) {
    return { resolvedLocale: preferredLocale, usedFallback: false };
  }

  const language = preferredLocale.split("-")[0];
  const languageMatch = SUPPORTED_LOCALES.find((locale) => locale.startsWith(`${language}-`));
  return {
    resolvedLocale: languageMatch ?? "en-GH",
    usedFallback: true,
  };
}

export function advisoryStatusTone(status: AdvisoryViewModel["status"]): "online" | "degraded" | "offline" | "neutral" {
  switch (status) {
    case "delivered":
    case "ready":
      return "online";
    case "hitl_required":
    case "revised":
      return "degraded";
    case "blocked":
      return "offline";
    default:
      return "neutral";
  }
}

export function confidenceTone(confidence: AdvisoryViewModel["confidence_band"]): "online" | "degraded" | "offline" {
  switch (confidence) {
    case "high":
      return "online";
    case "medium":
      return "degraded";
    case "low":
      return "offline";
  }
}

export function reviewerHeadline(item: AdvisoryViewModel): string {
  switch (item.reviewer_decision.outcome) {
    case "approve":
      return "Reviewer approved delivery";
    case "revise":
      return "Reviewer requested revision";
    case "block":
      return "Reviewer blocked delivery";
    case "hitl_required":
      return "Human review required before delivery";
  }
}

export function reviewerBody(item: AdvisoryViewModel): string {
  if (item.reviewer_decision.note) {
    return item.reviewer_decision.note;
  }

  switch (item.reviewer_decision.outcome) {
    case "approve":
      return "The response passed the configured evidence and policy threshold.";
    case "revise":
      return "The response needs additional edits before it can be shown as advice.";
    case "block":
      return "The response cannot be shown because the evidence or policy threshold was not met.";
    case "hitl_required":
      return "The response remains held until a human reviewer confirms the next step.";
  }
}

export function sortAdvisoryItems(items: AdvisoryViewModel[]): AdvisoryViewModel[] {
  return [...items].sort((left, right) => right.created_at.localeCompare(left.created_at));
}
