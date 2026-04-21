import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  countryCodeSchema,
  isoTimestampSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

export const listingStatusSchema = z.enum(["draft", "published", "closed"]);

const listingDraftFieldsSchema = z
  .object({
    title: z.string().min(3).max(120),
    commodity: z.string().min(2).max(64),
    quantity_tons: z.number().positive(),
    price_amount: z.number().positive(),
    price_currency: z.string().regex(/^[A-Z]{3}$/u),
    location: z.string().min(2).max(120),
    summary: z.string().min(12).max(600),
  })
  .strict();

export const listingCreateInputSchema = listingDraftFieldsSchema;

export const listingUpdateInputSchema = listingDraftFieldsSchema
  .extend({
    listing_id: z.string().min(1),
    status: listingStatusSchema.default("draft"),
  })
  .strict();

export const listingRecordSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    listing_id: z.string().min(1),
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    title: z.string().min(3).max(120),
    commodity: z.string().min(2).max(64),
    quantity_tons: z.number().positive(),
    price_amount: z.number().positive(),
    price_currency: z.string().regex(/^[A-Z]{3}$/u),
    location: z.string().min(2).max(120),
    summary: z.string().min(12).max(600),
    status: listingStatusSchema,
    revision_number: z.number().int().positive(),
    published_revision_number: z.number().int().positive().nullable(),
    revision_count: z.number().int().positive(),
    has_unpublished_changes: z.boolean(),
    view_scope: z.enum(["owner", "buyer_safe"]),
    published_at: isoTimestampSchema.nullable(),
    created_at: isoTimestampSchema,
    updated_at: isoTimestampSchema,
  })
  .strict();

export const listingPublishInputSchema = z
  .object({
    listing_id: z.string().min(1),
  })
  .strict();

export const listingUnpublishInputSchema = listingPublishInputSchema;

export const listingRevisionSummarySchema = z
  .object({
    schema_version: schemaVersionLiteral,
    listing_id: z.string().min(1),
    revision_number: z.number().int().positive(),
    change_type: z.enum(["created", "draft_updated", "published", "unpublished"]),
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    status: listingStatusSchema,
    title: z.string().min(3).max(120),
    commodity: z.string().min(2).max(64),
    quantity_tons: z.number().positive(),
    price_amount: z.number().positive(),
    price_currency: z.string().regex(/^[A-Z]{3}$/u),
    location: z.string().min(2).max(120),
    summary: z.string().min(12).max(600),
    changed_at: isoTimestampSchema,
  })
  .strict();

export const listingCollectionSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    items: z.array(listingRecordSchema),
  })
  .strict();

export const createListingResultSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    listing: listingRecordSchema,
    audit_event_id: z.number().int().positive(),
    replayed: z.boolean(),
  })
  .strict();

export const updateListingResultSchema = createListingResultSchema;

export const publishListingResultSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    listing: listingRecordSchema,
    revision_summary: listingRevisionSummarySchema,
  })
  .strict();

export const unpublishListingResultSchema = publishListingResultSchema;

export const listingCreateInputContract = defineContract({
  id: "marketplace.listing_create_input",
  name: "ListingCreateInput",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: listingCreateInputSchema,
  description: "Canonical create-listing payload. New listings always open as owner-only drafts until an explicit publish command succeeds.",
  traceability: ["CJ-002", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "legacy/staging-runtime/src/agro_v2/listings.py",
    "legacy/staging-runtime/src/agro_v2/frontend_listing_wizard.py",
  ],
});

export const listingUpdateInputContract = defineContract({
  id: "marketplace.listing_update_input",
  name: "ListingUpdateInput",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: listingUpdateInputSchema,
  description: "Canonical owner edit payload for appending a new draft revision. Publish state is excluded and must move through explicit publish or unpublish commands.",
  traceability: ["CJ-002", "RJ-002", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const listingRecordContract = defineContract({
  id: "marketplace.listing_record",
  name: "ListingRecord",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: listingRecordSchema,
  description: "Persisted listing aggregate snapshot for read and detail views.",
  traceability: ["CJ-002", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "legacy/staging-runtime/src/agro_v2/listings.py",
  ],
});

export const listingPublishInputContract = defineContract({
  id: "marketplace.listing_publish_input",
  name: "ListingPublishInput",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: listingPublishInputSchema,
  description: "Canonical publish-listing payload for moving a seller draft into buyer-visible discovery.",
  traceability: ["CJ-002", "CJ-003", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const listingUnpublishInputContract = defineContract({
  id: "marketplace.listing_unpublish_input",
  name: "ListingUnpublishInput",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: listingUnpublishInputSchema,
  description: "Canonical unpublish-listing payload for removing a record from buyer discovery without deleting history.",
  traceability: ["CJ-002", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const listingRevisionSummaryContract = defineContract({
  id: "marketplace.listing_revision_summary",
  name: "ListingRevisionSummary",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: listingRevisionSummarySchema,
  description: "Revision ledger snapshot for listing publish, unpublish, and edit transitions.",
  traceability: ["CJ-002", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const listingCollectionContract = defineContract({
  id: "marketplace.listing_collection",
  name: "ListingCollection",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: listingCollectionSchema,
  description: "List query response payload for authenticated marketplace listing reads.",
  traceability: ["CJ-002", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const createListingResultContract = defineContract({
  id: "marketplace.create_listing_result",
  name: "CreateListingResult",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: createListingResultSchema,
  description: "Command result payload for create-listing mutations with audit linkage.",
  traceability: ["CJ-002", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const updateListingResultContract = defineContract({
  id: "marketplace.update_listing_result",
  name: "UpdateListingResult",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: updateListingResultSchema,
  description: "Command result payload for edit-listing mutations with audit linkage.",
  traceability: ["RJ-002", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const publishListingResultContract = defineContract({
  id: "marketplace.publish_listing_result",
  name: "PublishListingResult",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: publishListingResultSchema,
  description: "Command result payload for listing publish mutations including the appended revision summary.",
  traceability: ["CJ-002", "CJ-003", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export const unpublishListingResultContract = defineContract({
  id: "marketplace.unpublish_listing_result",
  name: "UnpublishListingResult",
  kind: "dto",
  domain: "marketplace",
  schemaVersion,
  schema: unpublishListingResultSchema,
  description: "Command result payload for listing unpublish mutations including the appended revision summary.",
  traceability: ["CJ-002", "DI-001"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-n2-wave2-marketplace-negotiation-tranche.md",
  ],
});

export type ListingCreateInput = z.infer<typeof listingCreateInputSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateInputSchema>;
export type ListingRecord = z.infer<typeof listingRecordSchema>;
export type ListingPublishInput = z.infer<typeof listingPublishInputSchema>;
export type ListingUnpublishInput = z.infer<typeof listingUnpublishInputSchema>;
export type ListingRevisionSummary = z.infer<typeof listingRevisionSummarySchema>;
export type ListingCollection = z.infer<typeof listingCollectionSchema>;
export type CreateListingResult = z.infer<typeof createListingResultSchema>;
export type UpdateListingResult = z.infer<typeof updateListingResultSchema>;
export type PublishListingResult = z.infer<typeof publishListingResultSchema>;
export type UnpublishListingResult = z.infer<typeof unpublishListingResultSchema>;
