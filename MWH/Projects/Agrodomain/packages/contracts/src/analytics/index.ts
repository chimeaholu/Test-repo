import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  countryCodeSchema,
  isoTimestampSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";
import { actorRoleSchema } from "../client.js";
import { notificationUrgencySchema } from "../notifications/index.js";

export const marketplaceConversionStageSchema = z.enum([
  "listing_viewed",
  "listing_draft_saved",
  "listing_published",
  "negotiation_opened",
  "offer_created",
  "offer_countered",
  "confirmation_requested",
  "confirmation_approved",
  "confirmation_rejected",
  "escrow_initiated",
  "escrow_funded",
  "escrow_released",
  "escrow_reversed",
  "escrow_disputed",
  "notification_impression",
  "notification_action",
]);

export const marketplaceConversionOutcomeSchema = z.enum([
  "started",
  "completed",
  "blocked",
]);

export const marketplaceConversionSurfaceSchema = z.enum([
  "listing_grid",
  "listing_wizard",
  "listing_detail",
  "negotiation_inbox",
  "notifications_center",
  "wallet_dashboard",
]);

export const marketplaceConversionMetricSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    occurred_at: isoTimestampSchema,
    actor_id: actorIdSchema,
    actor_role: actorRoleSchema,
    country_code: countryCodeSchema,
    stage: marketplaceConversionStageSchema,
    outcome: marketplaceConversionOutcomeSchema,
    source_surface: marketplaceConversionSurfaceSchema,
    listing_id: z.string().min(1).nullable(),
    thread_id: z.string().min(1).nullable(),
    escrow_id: z.string().min(1).nullable(),
    urgency: notificationUrgencySchema.nullable(),
    blocker_code: z.string().min(1).nullable(),
    duration_ms: z.number().int().nonnegative().nullable(),
    notification_count: z.number().int().nonnegative().nullable(),
    queue_depth: z.number().int().nonnegative().nullable(),
    replayed: z.boolean().nullable(),
  })
  .strict();

export type MarketplaceConversionStage = z.infer<
  typeof marketplaceConversionStageSchema
>;
export type MarketplaceConversionOutcome = z.infer<
  typeof marketplaceConversionOutcomeSchema
>;
export type MarketplaceConversionSurface = z.infer<
  typeof marketplaceConversionSurfaceSchema
>;
export type MarketplaceConversionMetric = z.infer<
  typeof marketplaceConversionMetricSchema
>;

export const marketplaceConversionMetricContract = defineContract({
  id: "analytics.marketplace_conversion_metric",
  name: "MarketplaceConversionMetric",
  kind: "event",
  domain: "analytics",
  schemaVersion,
  schema: marketplaceConversionMetricSchema,
  description:
    "Stepwise marketplace conversion metric covering listing, negotiation, settlement, and notification touches for EH3 proof.",
  traceability: ["CJ-002", "CJ-003", "RJ-002", "EP-003"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});
