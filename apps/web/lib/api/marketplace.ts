/**
 * Marketplace domain service — typed functions for listings, listing
 * revisions, and negotiation threads.
 *
 * Read operations hit the REST endpoints; write operations go through the
 * command bus (see commands.ts).
 */

import type {
  ListingCollection,
  ListingRecord,
  NegotiationThreadCollection,
  NegotiationThreadRead,
} from "@agrodomain/contracts";
import {
  listingCollectionSchema,
  listingRecordSchema,
  negotiationThreadCollectionSchema,
  negotiationThreadReadSchema,
} from "@agrodomain/contracts";

import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

type CallOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  noAuth?: boolean;
  params?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

/**
 * List all listings visible to the authenticated actor.
 *
 * Backend: GET /api/v1/marketplace/listings
 */
export async function getListings(
  options?: CallOptions,
): Promise<ListingCollection> {
  return api.get<ListingCollection>("/api/v1/marketplace/listings", {
    ...options,
    schema: listingCollectionSchema,
  });
}

/**
 * Fetch a single listing by ID.
 *
 * Backend: GET /api/v1/marketplace/listings/:listingId
 */
export async function getListing(
  listingId: string,
  options?: CallOptions,
): Promise<ListingRecord> {
  return api.get<ListingRecord>(
    `/api/v1/marketplace/listings/${listingId}`,
    { ...options, schema: listingRecordSchema },
  );
}

/**
 * Fetch the revision history for a listing.
 *
 * Backend: GET /api/v1/marketplace/listings/:listingId/revisions
 */
export async function getListingRevisions(
  listingId: string,
  options?: CallOptions,
): Promise<{ schema_version: string; items: unknown[] }> {
  return api.get<{ schema_version: string; items: unknown[] }>(
    `/api/v1/marketplace/listings/${listingId}/revisions`,
    options,
  );
}

// ---------------------------------------------------------------------------
// Negotiations
// ---------------------------------------------------------------------------

/**
 * List all negotiation threads for the authenticated actor.
 *
 * Backend: GET /api/v1/marketplace/negotiations
 */
export async function getNegotiations(
  options?: CallOptions,
): Promise<NegotiationThreadCollection> {
  return api.get<NegotiationThreadCollection>(
    "/api/v1/marketplace/negotiations",
    { ...options, schema: negotiationThreadCollectionSchema },
  );
}

/**
 * Fetch a single negotiation thread by thread ID.
 *
 * Backend: GET /api/v1/marketplace/negotiations/:threadId
 */
export async function getNegotiation(
  threadId: string,
  options?: CallOptions,
): Promise<NegotiationThreadRead> {
  return api.get<NegotiationThreadRead>(
    `/api/v1/marketplace/negotiations/${threadId}`,
    { ...options, schema: negotiationThreadReadSchema },
  );
}
