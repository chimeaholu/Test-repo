import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  countryCodeSchema,
  isoTimestampSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

export const agroIntelligenceEntityTypeSchema = z.enum([
  "person_actor",
  "organization",
  "farm_unit",
  "field_plot",
  "facility",
  "vehicle_or_fleet_actor",
  "commodity_profile",
  "route_or_corridor",
  "market_location",
  "financial_actor",
  "insurance_actor",
]);

export const agroIntelligenceBoundarySubjectTypeSchema = z.enum([
  "organization_profile",
  "person_profile",
  "farm_signal",
  "market_signal",
]);

export const agroIntelligenceTrustTierSchema = z.enum(["bronze", "silver", "gold"]);
export const agroIntelligenceSourceTierSchema = z.enum(["A", "B", "C"]);

export const agroIntelligenceLifecycleStateSchema = z.enum([
  "ingested",
  "normalized",
  "matched_or_unmatched",
  "scored",
  "pending_verification",
  "verified",
  "rejected",
  "stale",
]);

export const agroIntelligenceRelationshipTypeSchema = z.enum([
  "belongs_to",
  "operates",
  "manages",
  "contains",
  "trades",
  "serves",
  "stores_or_processes",
  "asserts",
  "confirms_or_rejects",
]);

export const agroIntelligenceFreshnessStatusSchema = z.enum([
  "fresh",
  "watch",
  "stale",
  "expired",
]);

export const agroIntelligenceConsentArtifactSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    consent_artifact_id: z.string().min(1).max(80),
    boundary_ingest_id: z.string().min(1).max(80).nullable().optional(),
    partner_slug: z.string().min(2).max(80).nullable().optional(),
    subject_ref: z.string().min(1).max(120),
    country_code: countryCodeSchema,
    status: z.enum(["granted", "revoked"]),
    scope_ids: z.array(z.string().min(1)).min(1),
    policy_version: z.string().min(1).max(32),
    captured_at: isoTimestampSchema,
    revoked_at: isoTimestampSchema.nullable().optional(),
    legal_basis: z.string().min(2).max(80),
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

export const agroIntelligenceProvenanceSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    source_id: z.string().min(1).max(120),
    source_tier: agroIntelligenceSourceTierSchema,
    collected_at: isoTimestampSchema,
    collection_method: z.string().min(2).max(80),
    legal_basis: z.string().min(2).max(80),
    boundary_ingest_id: z.string().min(1).max(80).nullable().optional(),
    partner_slug: z.string().min(2).max(80).nullable().optional(),
    adapter_key: z.string().min(3).max(80).nullable().optional(),
    data_product: z.string().min(3).max(120).nullable().optional(),
    checksum: z.string().min(3).max(128).nullable().optional(),
    confidence_weight: z.number().int().min(0).max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.boundary_ingest_id && (!value.adapter_key || !value.data_product)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "boundary-linked provenance requires adapter_key and data_product",
        path: ["adapter_key"],
      });
    }
  });

export const agroIntelligenceSourceDocumentSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    document_id: z.string().min(1).max(80),
    source_id: z.string().min(1).max(120),
    source_tier: agroIntelligenceSourceTierSchema,
    country_code: countryCodeSchema,
    title: z.string().min(3).max(200),
    document_kind: z.enum([
      "registry_record",
      "survey_extract",
      "partner_upload",
      "field_enumeration",
      "market_feed",
      "weather_feed",
      "geospatial_layer",
      "transactional_exhaust",
    ]),
    entity_refs: z.array(z.string().min(1).max(80)).default([]),
    boundary_ingest_id: z.string().min(1).max(80).nullable().optional(),
    partner_slug: z.string().min(2).max(80).nullable().optional(),
    adapter_key: z.string().min(3).max(80).nullable().optional(),
    collected_at: isoTimestampSchema,
    legal_basis: z.string().min(2).max(80),
    checksum: z.string().min(3).max(128).nullable().optional(),
  })
  .strict();

export const agroIntelligenceEntitySchema = z
  .object({
    schema_version: schemaVersionLiteral,
    entity_id: z.string().min(1).max(80),
    entity_type: agroIntelligenceEntityTypeSchema,
    canonical_name: z.string().min(2).max(160),
    country_code: countryCodeSchema,
    trust_tier: agroIntelligenceTrustTierSchema,
    lifecycle_state: agroIntelligenceLifecycleStateSchema,
    source_tier: agroIntelligenceSourceTierSchema,
    confidence_score: z.number().int().min(0).max(100),
    boundary_subject_type: agroIntelligenceBoundarySubjectTypeSchema.nullable().optional(),
    consent_artifact: agroIntelligenceConsentArtifactSchema.nullable().optional(),
    provenance: z.array(agroIntelligenceProvenanceSchema).min(1),
    source_document_ids: z.array(z.string().min(1).max(80)).default([]),
    attribute_payload: z.record(z.string(), z.unknown()),
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.entity_type === "person_actor" && !value.consent_artifact) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "person_actor entities require consent_artifact",
        path: ["consent_artifact"],
      });
    }
    if (
      value.entity_type === "person_actor" &&
      value.consent_artifact &&
      value.consent_artifact.status !== "granted"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "person_actor consent_artifact must be granted",
        path: ["consent_artifact", "status"],
      });
    }
    if (
      value.entity_type === "person_actor" &&
      value.consent_artifact &&
      value.consent_artifact.country_code !== value.country_code
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "person_actor consent_artifact country_code must match entity country_code",
        path: ["consent_artifact", "country_code"],
      });
    }
    if (
      value.boundary_subject_type === "person_profile" &&
      value.entity_type !== "person_actor"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "person_profile boundary subject_type must materialize as person_actor",
        path: ["entity_type"],
      });
    }
    if (
      value.boundary_subject_type === "organization_profile" &&
      !["organization", "facility", "financial_actor", "insurance_actor"].includes(value.entity_type)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "organization_profile boundary subject_type must map to an organization-grade entity",
        path: ["entity_type"],
      });
    }
  });

export const agroIntelligenceRelationshipSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    relationship_id: z.string().min(1).max(80),
    source_entity_id: z.string().min(1).max(80),
    target_entity_id: z.string().min(1).max(80),
    relationship_type: agroIntelligenceRelationshipTypeSchema,
    trust_tier: agroIntelligenceTrustTierSchema,
    lifecycle_state: agroIntelligenceLifecycleStateSchema,
    provenance: z.array(agroIntelligenceProvenanceSchema).min(1),
    attribute_payload: z.record(z.string(), z.unknown()),
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
  })
  .strict();

export const agroIntelligenceVerificationClaimSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    claim_id: z.string().min(1).max(80),
    entity_id: z.string().min(1).max(80),
    source_document_id: z.string().min(1).max(80).nullable().optional(),
    claim_target: z.string().min(3).max(160),
    claim_state: z.enum(["confirmed", "rejected", "pending"]),
    verifier_type: z.enum([
      "rule_engine",
      "ai_reviewer",
      "human_operator",
      "partner_attestor",
      "end_user_self_claim",
    ]),
    trust_tier: agroIntelligenceTrustTierSchema,
    evidence_refs: z.array(z.string().min(1).max(120)).default([]),
    provenance: z.array(agroIntelligenceProvenanceSchema).min(1),
    occurred_at: isoTimestampSchema,
    created_at: isoTimestampSchema,
  })
  .strict();

export const agroIntelligenceFreshnessSignalSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    signal_id: z.string().min(1).max(80),
    entity_id: z.string().min(1).max(80),
    freshness_status: agroIntelligenceFreshnessStatusSchema,
    source_count: z.number().int().nonnegative(),
    stale_after_days: z.number().int().positive(),
    observed_at: isoTimestampSchema,
    expires_at: isoTimestampSchema,
    provenance: z.array(agroIntelligenceProvenanceSchema).min(1),
    created_at: isoTimestampSchema,
  })
  .strict();

export const agroIntelligenceEntitySummarySchema = z
  .object({
    entity_id: z.string().min(1).max(80),
    canonical_name: z.string().min(2).max(160),
    entity_type: agroIntelligenceEntityTypeSchema,
    country_code: countryCodeSchema,
    trust_tier: agroIntelligenceTrustTierSchema,
    lifecycle_state: agroIntelligenceLifecycleStateSchema,
    source_tier: agroIntelligenceSourceTierSchema,
    confidence_score: z.number().int().min(0).max(100),
    freshness_status: agroIntelligenceFreshnessStatusSchema,
    operator_tags: z.array(z.string().min(1)).default([]),
    commodity_tags: z.array(z.string().min(1)).default([]),
    location_signature: z.string(),
    source_document_count: z.number().int().nonnegative(),
    pending_claim_count: z.number().int().nonnegative(),
    updated_at: isoTimestampSchema,
  })
  .strict();

export const agroIntelligenceEntityCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    country_code: countryCodeSchema,
    count: z.number().int().nonnegative(),
    items: z.array(agroIntelligenceEntitySummarySchema),
  })
  .strict();

export const agroIntelligenceQueueItemSchema = z
  .object({
    entity_id: z.string().min(1).max(80),
    canonical_name: z.string().min(2).max(160),
    entity_type: agroIntelligenceEntityTypeSchema,
    country_code: countryCodeSchema,
    trust_tier: agroIntelligenceTrustTierSchema,
    confidence_score: z.number().int().min(0).max(100),
    lifecycle_state: agroIntelligenceLifecycleStateSchema,
    freshness_status: agroIntelligenceFreshnessStatusSchema,
    priority_score: z.number().int().min(0).max(100),
    reasons: z.array(z.string().min(1)).min(1),
    operator_tags: z.array(z.string().min(1)).default([]),
    updated_at: isoTimestampSchema,
  })
  .strict();

export const agroIntelligenceQueueCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    country_code: countryCodeSchema,
    count: z.number().int().nonnegative(),
    items: z.array(agroIntelligenceQueueItemSchema),
  })
  .strict();

export const agroIntelligenceResolutionRunSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    country_code: countryCodeSchema,
    scanned_records: z.number().int().nonnegative(),
    documents_created: z.number().int().nonnegative(),
    entities_created: z.number().int().nonnegative(),
    entities_merged: z.number().int().nonnegative(),
    entities_flagged: z.number().int().nonnegative(),
    relationships_created: z.number().int().nonnegative(),
    claims_created: z.number().int().nonnegative(),
  })
  .strict();

export const agroIntelligenceOverviewSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    country_code: countryCodeSchema,
    entity_count: z.number().int().nonnegative(),
    buyer_directory_count: z.number().int().nonnegative(),
    verification_queue_count: z.number().int().nonnegative(),
    trust_counts: z.record(z.string(), z.number().int().nonnegative()),
    freshness_counts: z.record(z.string(), z.number().int().nonnegative()),
    top_buyers: z.array(agroIntelligenceEntitySummarySchema),
    resolution_run: agroIntelligenceResolutionRunSchema.nullable(),
  })
  .strict();

export const agroIntelligenceRelationshipReadSchema = z
  .object({
    relationship_id: z.string().min(1).max(80),
    direction: z.enum(["incoming", "outgoing"]),
    relationship_type: agroIntelligenceRelationshipTypeSchema,
    other_entity_id: z.string().min(1).max(80),
    other_entity_name: z.string().min(1).max(160),
    trust_tier: agroIntelligenceTrustTierSchema,
    lifecycle_state: agroIntelligenceLifecycleStateSchema,
    attribute_payload: z.record(z.string(), z.unknown()),
    provenance: z.array(agroIntelligenceProvenanceSchema),
  })
  .strict();

export const agroIntelligenceEntityDetailSchema = agroIntelligenceEntitySummarySchema
  .extend({
    consent_artifact: z
      .object({
        consent_artifact_id: z.string().min(1).max(80),
        status: z.enum(["granted", "revoked"]),
        policy_version: z.string().min(1).max(32),
        scope_ids: z.array(z.string().min(1)).min(1),
        captured_at: isoTimestampSchema,
        revoked_at: isoTimestampSchema.nullable(),
      })
      .strict()
      .nullable(),
    attribute_payload: z.record(z.string(), z.unknown()),
    provenance: z.array(agroIntelligenceProvenanceSchema),
    freshness: agroIntelligenceFreshnessSignalSchema
      .omit({ schema_version: true, entity_id: true })
      .nullable(),
    source_documents: z.array(
      agroIntelligenceSourceDocumentSchema
        .omit({ schema_version: true, country_code: true })
        .extend({
        metadata_json: z.record(z.string(), z.unknown()),
        }),
    ),
    verification_claims: z.array(
      agroIntelligenceVerificationClaimSchema.omit({
        schema_version: true,
        entity_id: true,
        source_document_id: true,
        created_at: true,
      }),
    ),
    relationships: z.array(agroIntelligenceRelationshipReadSchema),
  })
  .strict();

export const agroIntelligenceVerificationDecisionResultSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    entity: agroIntelligenceEntityDetailSchema,
  })
  .strict();

export const agroIntelligenceBoundaryAlignmentSchema = z
  .object({
    subject_type: agroIntelligenceBoundarySubjectTypeSchema,
    allowed_entity_types: z.array(agroIntelligenceEntityTypeSchema).min(1),
    allowed_source_tiers: z.array(agroIntelligenceSourceTierSchema).min(1),
    requires_consent_artifact: z.boolean(),
    materialization_path: z.literal("partner_inbound_records -> agro_intelligence_entities"),
    provenance_contract: z.literal("platform_boundary.inbound_ingestion_request.provenance"),
  })
  .strict();

export const agroIntelligenceSchemaReadinessPacketSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    generated_at: isoTimestampSchema,
    trust_taxonomy: z
      .object({
        source_tiers: z.array(agroIntelligenceSourceTierSchema).min(3),
        trust_tiers: z.array(agroIntelligenceTrustTierSchema).min(3),
        lifecycle_states: z.array(agroIntelligenceLifecycleStateSchema).min(8),
      })
      .strict(),
    boundary_alignment: z.array(agroIntelligenceBoundaryAlignmentSchema).min(4),
    budget_gate: z
      .object({
        approval_required: z.literal(true),
        approval_received: z.boolean(),
        blocking_beads: z.array(z.string().min(1)).min(1),
        leading_budget_category: z.literal(
          "premium_data_licensing_and_commercial_directory_access",
        ),
        recommended_year_one_budget_band_usd: z
          .object({
            low: z.literal(60000),
            high: z.literal(60000),
          })
          .strict(),
      })
      .strict(),
    connector_lane: z
      .object({
        eb035_alignment_review_complete: z.boolean(),
        licensed_connector_work_permitted: z.boolean(),
        gated_until: z.array(z.string().min(1)).min(1),
      })
      .strict(),
  })
  .strict();

export const agroIntelligenceConsentArtifactContract = defineContract({
  id: "agro_intelligence.consent_artifact",
  name: "AgroIntelligenceConsentArtifact",
  kind: "dto",
  domain: "agro_intelligence",
  schemaVersion,
  schema: agroIntelligenceConsentArtifactSchema,
  description: "Person-level consent artifact aligned to the EH5 partner-boundary consent envelope.",
  traceability: ["DI-004", "DI-006"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-AGROINTELLIGENCE-RESEARCH-AND-MODULE-SPEC.md",
  ],
});

export const agroIntelligenceSourceDocumentContract = defineContract({
  id: "agro_intelligence.source_document",
  name: "AgroIntelligenceSourceDocument",
  kind: "dto",
  domain: "agro_intelligence",
  schemaVersion,
  schema: agroIntelligenceSourceDocumentSchema,
  description: "Source-document metadata preserving acquisition tier, legal basis, and boundary-ingest linkage.",
  traceability: ["DI-004", "AIJ-002"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-AGROINTELLIGENCE-RESEARCH-AND-MODULE-SPEC.md",
  ],
});

export const agroIntelligenceEntityContract = defineContract({
  id: "agro_intelligence.entity",
  name: "AgroIntelligenceEntity",
  kind: "dto",
  domain: "agro_intelligence",
  schemaVersion,
  schema: agroIntelligenceEntitySchema,
  description: "Canonical AgroIntelligence graph entity with trust, provenance, and person-level consent enforcement.",
  traceability: ["DI-004", "DI-006", "AIJ-002"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-AGROINTELLIGENCE-RESEARCH-AND-MODULE-SPEC.md",
    "output_to_user/AGRODOMAIN-AGROINTELLIGENCE-UX-SPEC.md",
  ],
});

export const agroIntelligenceRelationshipContract = defineContract({
  id: "agro_intelligence.relationship",
  name: "AgroIntelligenceRelationship",
  kind: "dto",
  domain: "agro_intelligence",
  schemaVersion,
  schema: agroIntelligenceRelationshipSchema,
  description: "Typed AgroIntelligence graph edge with lifecycle and provenance state.",
  traceability: ["DI-004", "AIJ-002"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-AGROINTELLIGENCE-RESEARCH-AND-MODULE-SPEC.md",
  ],
});

export const agroIntelligenceVerificationClaimContract = defineContract({
  id: "agro_intelligence.verification_claim",
  name: "AgroIntelligenceVerificationClaim",
  kind: "dto",
  domain: "agro_intelligence",
  schemaVersion,
  schema: agroIntelligenceVerificationClaimSchema,
  description: "Verification claim for entity facts, preserving attestor type, evidence, and trust tier.",
  traceability: ["DI-006", "AIJ-002"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-AGROINTELLIGENCE-RESEARCH-AND-MODULE-SPEC.md",
  ],
});

export const agroIntelligenceFreshnessSignalContract = defineContract({
  id: "agro_intelligence.freshness_signal",
  name: "AgroIntelligenceFreshnessSignal",
  kind: "dto",
  domain: "agro_intelligence",
  schemaVersion,
  schema: agroIntelligenceFreshnessSignalSchema,
  description: "Freshness and expiry signal for a graph entity or relationship snapshot.",
  traceability: ["DI-006", "AIJ-002"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-AGROINTELLIGENCE-RESEARCH-AND-MODULE-SPEC.md",
  ],
});

export const agroIntelligenceSchemaReadinessPacketContract = defineContract({
  id: "agro_intelligence.schema_readiness_packet",
  name: "AgroIntelligenceSchemaReadinessPacket",
  kind: "catalog",
  domain: "agro_intelligence",
  schemaVersion,
  schema: agroIntelligenceSchemaReadinessPacketSchema,
  description: "EH5A-G0 packet declaring schema alignment completion and the remaining human budget gate before licensed connectors.",
  traceability: ["DI-004", "AIJ-002"],
  sourceArtifacts: [
    "output_to_user/AGRODOMAIN-ENHANCEMENT-BUILD-SPEC.md",
    "output_to_user/AGRODOMAIN-AGROINTELLIGENCE-RESEARCH-AND-MODULE-SPEC.md",
  ],
});

export type AgroIntelligenceConsentArtifact = z.infer<
  typeof agroIntelligenceConsentArtifactSchema
>;
export type AgroIntelligenceSourceDocument = z.infer<
  typeof agroIntelligenceSourceDocumentSchema
>;
export type AgroIntelligenceEntity = z.infer<typeof agroIntelligenceEntitySchema>;
export type AgroIntelligenceRelationship = z.infer<
  typeof agroIntelligenceRelationshipSchema
>;
export type AgroIntelligenceVerificationClaim = z.infer<
  typeof agroIntelligenceVerificationClaimSchema
>;
export type AgroIntelligenceFreshnessSignal = z.infer<
  typeof agroIntelligenceFreshnessSignalSchema
>;
export type AgroIntelligenceEntitySummary = z.infer<
  typeof agroIntelligenceEntitySummarySchema
>;
export type AgroIntelligenceEntityCollection = z.infer<
  typeof agroIntelligenceEntityCollectionSchema
>;
export type AgroIntelligenceQueueItem = z.infer<
  typeof agroIntelligenceQueueItemSchema
>;
export type AgroIntelligenceQueueCollection = z.infer<
  typeof agroIntelligenceQueueCollectionSchema
>;
export type AgroIntelligenceResolutionRun = z.infer<
  typeof agroIntelligenceResolutionRunSchema
>;
export type AgroIntelligenceOverview = z.infer<
  typeof agroIntelligenceOverviewSchema
>;
export type AgroIntelligenceEntityDetail = z.infer<
  typeof agroIntelligenceEntityDetailSchema
>;
export type AgroIntelligenceVerificationDecisionResult = z.infer<
  typeof agroIntelligenceVerificationDecisionResultSchema
>;
export type AgroIntelligenceSchemaReadinessPacket = z.infer<
  typeof agroIntelligenceSchemaReadinessPacketSchema
>;
