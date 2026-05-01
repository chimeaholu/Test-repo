import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  countryCodeSchema,
  isoTimestampSchema,
  reasonCodeSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

export const partnerDeliveryModeSchema = z.enum(["api_pull", "webhook", "reporting"]);
export const boundaryAuthSchema = z.enum(["bearer_token"]);
export const dataClassificationSchema = z.enum([
  "identity",
  "marketplace",
  "transport",
  "climate",
  "finance",
  "operational",
]);

export const consentRequirementSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    required: z.boolean(),
    scope_ids: z.array(z.string().min(1)).default([]),
    rationale: z.string().min(3).max(240),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.required && value.scope_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "required consent must enumerate at least one scope",
        path: ["scope_ids"],
      });
    }
  });

export const adapterBoundarySchema = z
  .object({
    schema_version: schemaVersionLiteral,
    adapter_key: z.string().min(3).max(80),
    delivery_mode: partnerDeliveryModeSchema,
    authentication: boundaryAuthSchema,
    ownership: z.string().min(3).max(120),
    supports_replay: z.boolean(),
    max_batch_size: z.number().int().positive().nullable().optional(),
    status: z.enum(["active", "pilot"]),
    consent: consentRequirementSchema,
  })
  .strict();

export const eventCatalogItemSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    event_family: z.string().min(3).max(120),
    version: z.string().min(1).max(32),
    owning_domain: z.string().min(2).max(64),
    ownership: z.string().min(3).max(120),
    description: z.string().min(12).max(400),
    data_classification: dataClassificationSchema,
    contains_personal_data: z.boolean(),
    adapter_boundaries: z.array(adapterBoundarySchema).min(1),
  })
  .strict();

export const eventSchemaCatalogSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    catalog_version: z.string().min(1).max(32),
    generated_at: isoTimestampSchema,
    items: z.array(eventCatalogItemSchema).min(1),
  })
  .strict();

export const outboundEventSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    event_id: z.string().min(1).max(80),
    event_family: z.string().min(3).max(120),
    partner_slug: z.string().min(2).max(80),
    aggregate_id: z.string().min(1).max(80),
    aggregate_type: z.string().min(1).max(80),
    event_type: z.string().min(1).max(120),
    status: z.enum(["accepted", "replayed", "queued", "published", "rejected"]),
    country_code: countryCodeSchema.nullable(),
    occurred_at: isoTimestampSchema,
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export const outboundEventCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    partner_slug: z.string().min(2).max(80),
    cursor: z.string().nullable(),
    items: z.array(outboundEventSchema),
  })
  .strict();

export const webhookDeliveryRequestSchema = z
  .object({
    event_family: z.string().min(3).max(120),
    aggregate_id: z.string().min(1).max(80),
    delivery_target: z.string().url().max(240),
    reason: z.string().min(3).max(240),
  })
  .strict();

export const webhookDeliveryRecordSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    delivery_id: z.string().min(1).max(80),
    partner_slug: z.string().min(2).max(80),
    event_family: z.string().min(3).max(120),
    aggregate_id: z.string().min(1).max(80),
    delivery_mode: z.literal("webhook"),
    delivery_target: z.string().url().max(240),
    status: z.enum(["queued", "published"]),
    queued_at: isoTimestampSchema,
  })
  .strict();

export const provenanceEnvelopeSchema = z
  .object({
    source_id: z.string().min(1).max(120),
    collected_at: isoTimestampSchema,
    collection_method: z.string().min(2).max(80),
    legal_basis: z.string().min(2).max(80),
    checksum: z.string().min(3).max(128).nullable().optional(),
  })
  .strict();

export const partnerConsentArtifactSchema = z
  .object({
    policy_version: z.string().min(1).max(32),
    country_code: countryCodeSchema,
    status: z.enum(["granted", "revoked"]),
    scope_ids: z.array(z.string().min(1)).min(1),
    subject_ref: z.string().min(1).max(120),
    captured_at: isoTimestampSchema,
    revoked_at: isoTimestampSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "revoked" && !value.revoked_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "revoked consent artifacts require revoked_at",
        path: ["revoked_at"],
      });
    }
  });

export const inboundIngestionRequestSchema = z
  .object({
    partner_record_id: z.string().min(1).max(120),
    adapter_key: z.string().min(3).max(80),
    data_product: z.string().min(3).max(120),
    subject_type: z.enum(["organization_profile", "person_profile", "farm_signal", "market_signal"]),
    subject_ref: z.string().min(1).max(120),
    country_code: countryCodeSchema,
    scope_ids: z.array(z.string().min(1)).min(1),
    contains_personal_data: z.boolean(),
    occurred_at: isoTimestampSchema,
    provenance: provenanceEnvelopeSchema,
    consent_artifact: partnerConsentArtifactSchema.nullable().optional(),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((value, ctx) => {
    const consentScopes = value.consent_artifact?.scope_ids ?? [];
    if (value.contains_personal_data && !value.consent_artifact) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "person-level ingestion requires consent_artifact",
        path: ["consent_artifact"],
      });
    }
    if (value.consent_artifact && value.consent_artifact.status !== "granted") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "consent_artifact must be granted for accepted ingestion",
        path: ["consent_artifact", "status"],
      });
    }
    if (value.consent_artifact && value.consent_artifact.country_code !== value.country_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "consent_artifact country_code must match ingestion country_code",
        path: ["consent_artifact", "country_code"],
      });
    }
    if (value.consent_artifact && !value.scope_ids.every((scopeId) => consentScopes.includes(scopeId))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ingestion scope_ids must be contained within consent_artifact.scope_ids",
        path: ["scope_ids"],
      });
    }
  });

export const inboundIngestionResultSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    ingest_id: z.string().min(1).max(80),
    partner_slug: z.string().min(2).max(80),
    status: z.enum(["accepted", "rejected"]),
    reason_code: reasonCodeSchema.nullable(),
    consent_status: z.enum(["not_required", "verified", "missing", "revoked"]),
    provenance_status: z.enum(["verified", "missing"]),
  })
  .strict();

export const reportingSummarySchema = z
  .object({
    schema_version: schemaVersionLiteral,
    partner_slug: z.string().min(2).max(80),
    generated_at: isoTimestampSchema,
    outbound_events: z.array(
      z
        .object({
          event_family: z.string().min(3).max(120),
          event_count: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    inbound_ingestion: z.object({
      accepted: z.number().int().nonnegative(),
      rejected: z.number().int().nonnegative(),
    }),
    webhook_queue: z.object({
      queued: z.number().int().nonnegative(),
      published: z.number().int().nonnegative(),
    }),
  })
  .strict();

export const eventSchemaCatalogContract = defineContract({
  id: "platform_boundary.event_schema_catalog",
  name: "PlatformBoundaryEventSchemaCatalog",
  kind: "catalog",
  domain: "platform_boundary",
  schemaVersion,
  schema: eventSchemaCatalogSchema,
  description: "Canonical EH5 event-family catalog with ownership, classification, and partner adapter boundaries.",
  traceability: ["DI-004", "DI-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const outboundEventCollectionContract = defineContract({
  id: "platform_boundary.outbound_event_collection",
  name: "PlatformBoundaryOutboundEventCollection",
  kind: "response",
  domain: "platform_boundary",
  schemaVersion,
  schema: outboundEventCollectionSchema,
  description: "Bounded partner pull surface for canonical outbound event families.",
  traceability: ["DI-004", "DI-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const webhookDeliveryRequestContract = defineContract({
  id: "platform_boundary.webhook_delivery_request",
  name: "PlatformBoundaryWebhookDeliveryRequest",
  kind: "request",
  domain: "platform_boundary",
  schemaVersion,
  schema: webhookDeliveryRequestSchema,
  description: "Authenticated queue request for a bounded partner webhook notification.",
  traceability: ["DI-004"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
  ],
});

export const webhookDeliveryRecordContract = defineContract({
  id: "platform_boundary.webhook_delivery_record",
  name: "PlatformBoundaryWebhookDeliveryRecord",
  kind: "response",
  domain: "platform_boundary",
  schemaVersion,
  schema: webhookDeliveryRecordSchema,
  description: "Webhook queue receipt with partner, delivery target, and queue status.",
  traceability: ["DI-004"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
  ],
});

export const inboundIngestionRequestContract = defineContract({
  id: "platform_boundary.inbound_ingestion_request",
  name: "PlatformBoundaryInboundIngestionRequest",
  kind: "request",
  domain: "platform_boundary",
  schemaVersion,
  schema: inboundIngestionRequestSchema,
  description: "Consent-aware inbound ingestion envelope preserving partner provenance and scope boundaries.",
  traceability: ["DI-004", "DI-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const inboundIngestionResultContract = defineContract({
  id: "platform_boundary.inbound_ingestion_result",
  name: "PlatformBoundaryInboundIngestionResult",
  kind: "response",
  domain: "platform_boundary",
  schemaVersion,
  schema: inboundIngestionResultSchema,
  description: "Accepted or rejected ingestion receipt with provenance and consent evaluation outcome.",
  traceability: ["DI-004", "DI-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});

export const reportingSummaryContract = defineContract({
  id: "platform_boundary.reporting_summary",
  name: "PlatformBoundaryReportingSummary",
  kind: "response",
  domain: "platform_boundary",
  schemaVersion,
  schema: reportingSummarySchema,
  description: "Partner-facing reporting summary for outbound event volume, ingestion decisions, and webhook queue state.",
  traceability: ["DI-004", "DI-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-ENHANCEMENT-TEST-PLAN.md",
  ],
});
