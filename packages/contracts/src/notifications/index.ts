import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  isoTimestampSchema,
  localeSchema,
  reasonCodeSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

export const deliveryChannelSchema = z.enum(["whatsapp", "sms", "push"]);
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
