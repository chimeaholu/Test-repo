import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  isoTimestampSchema,
  localeSchema,
  reasonCodeSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

const notificationScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const notificationCategorySchema = z.enum([
  "trade",
  "finance",
  "weather",
  "advisory",
  "system",
  "copilot",
  "transport",
]);

export const notificationModuleSchema = z.enum([
  "marketplace",
  "wallet",
  "climate",
  "advisory",
  "identity",
  "system",
  "transport",
  "copilot",
]);

export const notificationUrgencySchema = z.enum([
  "routine",
  "attention",
  "urgent",
  "critical",
]);

export const notificationLifecycleStateSchema = z.enum([
  "info",
  "pending",
  "blocked",
  "resolved",
]);

export const notificationChannelSchema = z.enum([
  "in_app",
  "email",
  "push",
  "whatsapp",
  "sms",
]);

export const notificationQueueStateSchema = z.enum([
  "queued",
  "scheduled",
  "dispatched",
  "suppressed",
  "failed",
]);

export const deliveryChannelSchema = z.enum(["whatsapp", "sms", "push", "email"]);
export const deliveryStateSchema = z.enum([
  "queued",
  "sent",
  "fallback_sent",
  "action_required",
  "failed",
]);

export const fallbackReasonSchema = z.enum([
  "delivery_failed",
  "session_window_expired",
  "network_degraded",
  "manual_escalation",
]);

export const notificationRecipientSchema = z
  .object({
    contact_id: z.string().min(1),
    locale: localeSchema,
    phone_number: z.string().min(1).nullable().optional(),
    device_token: z.string().min(1).nullable().optional(),
  })
  .strict();

export const notificationActionSchema = z
  .object({
    label: z.string().min(1),
    href: z.string().min(1),
  })
  .strict();

export const notificationDispatchPlanSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    notification_id: z.string().min(1),
    template_key: z.string().min(1),
    dedupe_key: z.string().min(1),
    queue_state: notificationQueueStateSchema,
    preferred_channels: z.array(notificationChannelSchema).min(1),
    fallback_channels: z.array(notificationChannelSchema),
    expires_at: isoTimestampSchema.nullable(),
    escalate_after: isoTimestampSchema.nullable(),
    payload: z.record(z.string(), notificationScalarSchema),
  })
  .strict();

export const notificationFeedItemSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    notification_id: z.string().min(1),
    module: notificationModuleSchema,
    category: notificationCategorySchema,
    lifecycle_state: notificationLifecycleStateSchema,
    urgency: notificationUrgencySchema,
    title: z.string().min(1),
    body: z.string().min(1),
    created_at: isoTimestampSchema,
    read: z.boolean(),
    read_at: isoTimestampSchema.nullable(),
    expires_at: isoTimestampSchema.nullable(),
    next_action_copy: z.string().min(1).nullable(),
    listing_id: z.string().min(1).nullable(),
    thread_id: z.string().min(1).nullable(),
    escrow_id: z.string().min(1).nullable(),
    action: notificationActionSchema.nullable(),
    dispatch_plan: notificationDispatchPlanSchema,
  })
  .strict();

export const notificationFeedCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    items: z.array(notificationFeedItemSchema),
  })
  .strict();

export const notificationAttemptSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    notification_id: z.string().min(1),
    intent_type: z.enum(["settlement_update", "listing_alert", "system_alert"]),
    recipient: notificationRecipientSchema,
    attempted_channels: z.array(deliveryChannelSchema).min(1),
    final_channel: deliveryChannelSchema.nullable(),
    final_state: deliveryStateSchema,
    fallback_triggered: z.boolean(),
    fallback_reason: fallbackReasonSchema.nullable().optional(),
    parity_key: z.string().min(1),
    attempted_at: isoTimestampSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.fallback_triggered && !value.fallback_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fallback_reason is required when fallback_triggered=true",
        path: ["fallback_reason"],
      });
    }
  });

export const notificationResultSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    notification_id: z.string().min(1),
    delivery_state: deliveryStateSchema,
    retryable: z.boolean(),
    error_code: reasonCodeSchema.nullable().optional(),
    fallback_channel: deliveryChannelSchema.nullable().optional(),
    fallback_reason: fallbackReasonSchema.nullable().optional(),
  })
  .strict();

export type NotificationCategory = z.infer<typeof notificationCategorySchema>;
export type NotificationModule = z.infer<typeof notificationModuleSchema>;
export type NotificationUrgency = z.infer<typeof notificationUrgencySchema>;
export type NotificationLifecycleState = z.infer<
  typeof notificationLifecycleStateSchema
>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationQueueState = z.infer<typeof notificationQueueStateSchema>;
export type NotificationAction = z.infer<typeof notificationActionSchema>;
export type NotificationDispatchPlan = z.infer<
  typeof notificationDispatchPlanSchema
>;
export type NotificationFeedItem = z.infer<typeof notificationFeedItemSchema>;
export type NotificationFeedCollection = z.infer<
  typeof notificationFeedCollectionSchema
>;

export const notificationDispatchPlanContract = defineContract({
  id: "notifications.dispatch_plan",
  name: "NotificationDispatchPlan",
  kind: "dto",
  domain: "notifications",
  schemaVersion,
  schema: notificationDispatchPlanSchema,
  description:
    "Channel-agnostic dispatch plan with template, queue, expiry, and fallback semantics for EH3-plus notification workflows.",
  traceability: ["EP-003", "RJ-001", "RJ-002"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const notificationFeedItemContract = defineContract({
  id: "notifications.feed_item",
  name: "NotificationFeedItem",
  kind: "dto",
  domain: "notifications",
  schemaVersion,
  schema: notificationFeedItemSchema,
  description:
    "Canonical in-app notification item for marketplace, wallet, advisory, system, and future copilot or transport surfaces.",
  traceability: ["CJ-003", "RJ-002", "EP-003"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const notificationFeedCollectionContract = defineContract({
  id: "notifications.feed_collection",
  name: "NotificationFeedCollection",
  kind: "dto",
  domain: "notifications",
  schemaVersion,
  schema: notificationFeedCollectionSchema,
  description:
    "Ordered collection of shared notification feed items with queue metadata preserved for cross-surface reuse.",
  traceability: ["CJ-003", "RJ-002", "EP-003"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const notificationAttemptContract = defineContract({
  id: "notifications.attempt",
  name: "NotificationAttempt",
  kind: "dto",
  domain: "notifications",
  schemaVersion,
  schema: notificationAttemptSchema,
  description: "Delivery attempt contract with fallback status, parity key, and cross-channel metadata.",
  traceability: ["EP-003", "RJ-001", "RJ-002", "DI-001", "DI-002"],
  sourceArtifacts: [
    "execution/contracts/b013_settlement_notification_contract.json",
    "legacy/staging-runtime/src/agro_v2/notification_broker.py",
    "legacy/staging-runtime/src/agro_v2/settlement_notifications.py",
  ],
});

export const notificationResultContract = defineContract({
  id: "notifications.result",
  name: "NotificationResult",
  kind: "dto",
  domain: "notifications",
  schemaVersion,
  schema: notificationResultSchema,
  description: "Delivery result contract that captures retryability and fallback outcome state.",
  traceability: ["EP-003", "DI-001", "DI-002"],
  sourceArtifacts: [
    "execution/contracts/b013_settlement_notification_contract.json",
    "legacy/staging-runtime/src/agro_v2/notification_broker.py",
    "legacy/staging-runtime/src/agro_v2/settlement_notifications.py",
  ],
});
