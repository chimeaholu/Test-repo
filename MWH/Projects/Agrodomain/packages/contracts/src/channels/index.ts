import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  channelSchema,
  correlationIdSchema,
  countryCodeSchema,
  idempotencyKeySchema,
  isoTimestampSchema,
  localeSchema,
  reasonCodeSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

export const ussdSessionStateSchema = z.enum(["active", "timed_out", "recovered", "closed"]);

export const ussdSessionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    session_id: z.string().min(1),
    workflow_id: z.string().min(1),
    phone_number: z.string().min(1),
    country_code: countryCodeSchema,
    current_menu_id: z.string().min(1),
    revision: z.number().int().min(0),
    status: ussdSessionStateSchema,
    started_at_epoch_ms: z.number().int().nonnegative(),
    last_seen_epoch_ms: z.number().int().nonnegative(),
    expires_at_epoch_ms: z.number().int().nonnegative(),
    resume_menu_id: z.string().min(1).nullable().optional(),
    locale: localeSchema,
  })
  .strict();

export const whatsappIntentSchema = z.enum([
  "help",
  "create_listing",
  "negotiation_reply",
  "settlement_status",
  "unknown",
]);

export const whatsappCommandSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    message_id: z.string().min(1),
    contact_id: z.string().min(1),
    message_type: z.enum(["text", "interactive", "template", "unknown"]),
    locale: localeSchema,
    intent: whatsappIntentSchema,
    command_name: z.string().min(1),
    arguments: z.record(z.string(), z.string()),
    confidence_score: z.number().min(0).max(1),
    fallback_channel: z.enum(["none", "sms", "ussd"]),
  })
  .strict();

export const offlineConflictSchema = z
  .object({
    state: z.enum(["none", "stale_version", "duplicate_operation", "remote_override"]),
    reason_code: reasonCodeSchema.nullable().optional(),
    conflict_ref: z.string().min(1).nullable().optional(),
  })
  .strict();

export const offlineQueueCommandSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    item_id: z.string().min(1),
    workflow_id: z.string().min(1),
    intent: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
    idempotency_key: idempotencyKeySchema,
    channel: z.literal("pwa"),
    created_at: isoTimestampSchema,
    attempt_count: z.number().int().min(0),
    state: z.enum([
      "queued",
      "replaying",
      "acked",
      "failed_retryable",
      "failed_terminal",
      "cancelled",
    ]),
    available_at_epoch_ms: z.number().int().nonnegative(),
    correlation_id: correlationIdSchema,
    conflict: offlineConflictSchema,
  })
  .strict();

export const offlineQueueResultSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    item_id: z.string().min(1),
    disposition: z.enum(["applied", "duplicate", "retry", "terminal_failure"]),
    result_ref: z.string().min(1).nullable().optional(),
    error_code: reasonCodeSchema.nullable().optional(),
    retry_after_ms: z.number().int().positive().nullable().optional(),
    conflict: offlineConflictSchema,
  })
  .strict();

export const translatorCommandSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    channel: channelSchema,
    transport_command: z.string().min(1),
    aggregate_ref: z.string().min(1),
    mutation_semantics_exposed: z.literal(false),
  })
  .strict();

export const ussdSessionContract = defineContract({
  id: "channels.ussd_session",
  name: "UssdSession",
  kind: "dto",
  domain: "channels",
  schemaVersion,
  schema: ussdSessionSchema,
  description: "Compact USSD session serialization and timeout recovery state.",
  traceability: ["EP-002", "DI-001"],
  sourceArtifacts: [
    "execution/contracts/b004_ussd_adapter_contract.json",
    "legacy/staging-runtime/src/agro_v2/ussd_adapter.py",
  ],
});

export const whatsappCommandContract = defineContract({
  id: "channels.whatsapp_command",
  name: "WhatsAppCommand",
  kind: "dto",
  domain: "channels",
  schemaVersion,
  schema: whatsappCommandSchema,
  description: "Normalized WhatsApp inbound command with parser intent and fallback metadata.",
  traceability: ["EP-003", "DI-002"],
  sourceArtifacts: [
    "execution/contracts/b005_whatsapp_adapter_contract.json",
    "legacy/staging-runtime/src/agro_v2/whatsapp_adapter.py",
  ],
});

export const offlineQueueCommandContract = defineContract({
  id: "channels.offline_queue_command",
  name: "OfflineQueueCommand",
  kind: "dto",
  domain: "channels",
  schemaVersion,
  schema: offlineQueueCommandSchema,
  description: "PWA offline queue item with idempotency and replay conflict metadata.",
  traceability: ["EP-002", "RJ-001", "RJ-002", "DI-001", "DI-002"],
  sourceArtifacts: [
    "execution/contracts/b006_pwa_offline_queue_contract.json",
    "legacy/staging-runtime/src/agro_v2/offline_queue.py",
    "legacy/staging-runtime/src/agro_v2/offline_action_queue.py",
  ],
});

export const offlineQueueResultContract = defineContract({
  id: "channels.offline_queue_result",
  name: "OfflineQueueResult",
  kind: "dto",
  domain: "channels",
  schemaVersion,
  schema: offlineQueueResultSchema,
  description: "Replay result contract with retry budget and reconciliation conflict data.",
  traceability: ["EP-002", "RJ-001", "RJ-002", "DI-001", "DI-002"],
  sourceArtifacts: [
    "execution/contracts/b006_pwa_offline_queue_contract.json",
    "legacy/staging-runtime/src/agro_v2/offline_queue.py",
    "legacy/staging-runtime/src/agro_v2/offline_action_queue.py",
  ],
});

export const translatorCommandContract = defineContract({
  id: "channels.translator_command",
  name: "TranslatorCommand",
  kind: "dto",
  domain: "channels",
  schemaVersion,
  schema: translatorCommandSchema,
  description: "Translator-only channel command surface that cannot express direct aggregate mutation semantics.",
  traceability: ["EP-002", "EP-003"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});
