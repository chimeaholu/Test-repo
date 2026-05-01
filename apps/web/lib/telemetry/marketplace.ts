"use client";

import {
  marketplaceConversionMetricSchema,
  schemaVersion,
  type MarketplaceConversionMetric,
  type MarketplaceConversionOutcome,
  type MarketplaceConversionStage,
  type MarketplaceConversionSurface,
  type NotificationUrgency,
} from "@agrodomain/contracts";

import { recordTelemetry } from "@/lib/telemetry/client";

type MarketplaceConversionParams = {
  actorId: string;
  actorRole: MarketplaceConversionMetric["actor_role"];
  blockerCode?: string | null;
  countryCode: string;
  durationMs?: number | null;
  escrowId?: string | null;
  listingId?: string | null;
  notificationCount?: number | null;
  outcome: MarketplaceConversionOutcome;
  queueDepth?: number | null;
  replayed?: boolean | null;
  sourceSurface: MarketplaceConversionSurface;
  stage: MarketplaceConversionStage;
  threadId?: string | null;
  traceId: string;
  urgency?: NotificationUrgency | null;
};

function toNullableString(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? value : null;
}

function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : null;
}

export function recordMarketplaceConversion(
  params: MarketplaceConversionParams,
): void {
  const metric = marketplaceConversionMetricSchema.parse({
    schema_version: schemaVersion,
    occurred_at: new Date().toISOString(),
    actor_id: params.actorId,
    actor_role: params.actorRole,
    blocker_code: toNullableString(params.blockerCode),
    country_code: params.countryCode,
    duration_ms: toNullableNumber(params.durationMs),
    escrow_id: toNullableString(params.escrowId),
    listing_id: toNullableString(params.listingId),
    notification_count: toNullableNumber(params.notificationCount),
    outcome: params.outcome,
    queue_depth: toNullableNumber(params.queueDepth),
    replayed: params.replayed ?? null,
    source_surface: params.sourceSurface,
    stage: params.stage,
    thread_id: toNullableString(params.threadId),
    urgency: params.urgency ?? null,
  });

  recordTelemetry({
    event: "marketplace_conversion",
    trace_id: params.traceId,
    timestamp: metric.occurred_at,
    detail: {
      actor_role: metric.actor_role,
      blocker_code: metric.blocker_code,
      country_code: metric.country_code,
      duration_ms: metric.duration_ms,
      escrow_id: metric.escrow_id,
      listing_id: metric.listing_id,
      notification_count: metric.notification_count,
      outcome: metric.outcome,
      queue_depth: metric.queue_depth,
      replayed: metric.replayed,
      source_surface: metric.source_surface,
      stage: metric.stage,
      thread_id: metric.thread_id,
      urgency: metric.urgency,
    },
  });
}
