/**
 * RB-002 — Marketplace domain service.
 *
 * Listing CRUD and negotiation lifecycle, all routed through the
 * workflow command endpoint for mutations and direct query endpoints for reads.
 */

import type {
  CreateListingResult,
  ListingCollection,
  ListingCreateInput,
  ListingPublishInput,
  ListingRecord,
  ListingRevisionSummary,
  ListingUnpublishInput,
  ListingUpdateInput,
  NegotiationConfirmationApproveInput,
  NegotiationConfirmationRejectInput,
  NegotiationConfirmationRequestInput,
  NegotiationCounterInput,
  NegotiationCreateInput,
  NegotiationThreadCollection,
  NegotiationThreadRead,
  ResponseEnvelope,
  UpdateListingResult,
} from "@agrodomain/contracts";
import { schemaVersion } from "@agrodomain/contracts";

import {
  requestJson,
  responseEnvelope,
  sendCommand,
} from "../api-client";
import type { ListingRevisionCollection } from "../api-types";

// ---------------------------------------------------------------------------
// Response type aliases
// ---------------------------------------------------------------------------

type ListingCommandResponse = ResponseEnvelope<
  (CreateListingResult | UpdateListingResult) & {
    request_id: string;
    idempotency_key: string;
  }
>;

type ListingPublishCommandResponse = ResponseEnvelope<{
  schema_version: string;
  listing: ListingRecord;
  revision_summary: ListingRevisionSummary;
  request_id: string;
  idempotency_key: string;
  replayed: boolean;
}>;

type NegotiationCommandResponse = ResponseEnvelope<{
  thread: NegotiationThreadRead;
  request_id: string;
  idempotency_key: string;
  replayed: boolean;
}>;

// ---------------------------------------------------------------------------
// Internal command helpers
// ---------------------------------------------------------------------------

async function sendListingCommand(params: {
  actorId: string;
  aggregateRef: string;
  countryCode: string;
  idempotencyKey?: string;
  input: ListingCreateInput | ListingUpdateInput;
  name: "market.listings.create" | "market.listings.update";
  traceId: string;
}): Promise<ListingCommandResponse> {
  const response = await sendCommand<{
    schema_version: string;
    listing: ListingRecord;
  }>(
    {
      actorId: params.actorId,
      aggregateRef: params.aggregateRef,
      commandName: params.name,
      countryCode: params.countryCode,
      idempotencyKey: params.idempotencyKey,
      input: params.input as unknown as Record<string, unknown>,
      mutationScope: "marketplace.listings",
      journeyIds: [
        params.name === "market.listings.create" ? "CJ-002" : "RJ-002",
      ],
      dataCheckIds: ["DI-001"],
      traceId: params.traceId,
    },
    params.traceId,
  );

  return responseEnvelope(
    {
      schema_version: schemaVersion as typeof schemaVersion,
      listing: response.data.result.listing,
      audit_event_id: response.data.audit_event_id,
      replayed: response.data.replayed,
      request_id: response.data.request_id,
      idempotency_key: response.data.idempotency_key,
    },
    params.traceId,
  );
}

async function sendListingPublishCommand(params: {
  actorId: string;
  aggregateRef: string;
  commandName: "market.listings.publish" | "market.listings.unpublish";
  countryCode: string;
  idempotencyKey?: string;
  input: ListingPublishInput | ListingUnpublishInput;
  traceId: string;
}): Promise<ListingPublishCommandResponse> {
  const response = await sendCommand<{
    schema_version: string;
    listing: ListingRecord;
    revision_summary: ListingRevisionSummary;
  }>(
    {
      actorId: params.actorId,
      aggregateRef: params.aggregateRef,
      commandName: params.commandName,
      countryCode: params.countryCode,
      idempotencyKey: params.idempotencyKey,
      input: params.input as unknown as Record<string, unknown>,
      mutationScope: "marketplace.listings",
      journeyIds: ["CJ-002", "CJ-003"],
      dataCheckIds: ["DI-001"],
      traceId: params.traceId,
    },
    params.traceId,
  );

  return responseEnvelope(
    {
      schema_version: schemaVersion as typeof schemaVersion,
      listing: response.data.result.listing,
      revision_summary: response.data.result.revision_summary,
      request_id: response.data.request_id,
      idempotency_key: response.data.idempotency_key,
      replayed: response.data.replayed,
    },
    params.traceId,
  );
}

async function sendNegotiationCommand(params: {
  actorId: string;
  aggregateRef: string;
  commandName:
    | "market.negotiations.create"
    | "market.negotiations.counter"
    | "market.negotiations.confirm.request"
    | "market.negotiations.confirm.approve"
    | "market.negotiations.confirm.reject";
  countryCode: string;
  idempotencyKey?: string;
  input:
    | NegotiationCreateInput
    | NegotiationCounterInput
    | NegotiationConfirmationRequestInput
    | NegotiationConfirmationApproveInput
    | NegotiationConfirmationRejectInput;
  traceId: string;
}): Promise<NegotiationCommandResponse> {
  const response = await sendCommand<{
    schema_version: string;
    thread: NegotiationThreadRead;
  }>(
    {
      actorId: params.actorId,
      aggregateRef: params.aggregateRef,
      commandName: params.commandName,
      countryCode: params.countryCode,
      idempotencyKey: params.idempotencyKey,
      input: params.input as unknown as Record<string, unknown>,
      mutationScope: "marketplace.negotiations",
      journeyIds: ["CJ-003", "RJ-002"],
      dataCheckIds: ["DI-002"],
      traceId: params.traceId,
    },
    params.traceId,
  );

  return responseEnvelope(
    {
      thread: response.data.result.thread,
      request_id: response.data.request_id,
      idempotency_key: response.data.idempotency_key,
      replayed: response.data.replayed,
    },
    params.traceId,
  );
}

// ---------------------------------------------------------------------------
// Marketplace API
// ---------------------------------------------------------------------------

export const marketplaceApi = {
  // -- Listing queries -----------------------------------------------------

  async listListings(
    traceId: string,
  ): Promise<ResponseEnvelope<ListingCollection>> {
    return requestJson<ListingCollection>(
      "/api/v1/marketplace/listings",
      { method: "GET" },
      traceId,
      true,
    );
  },

  async getListing(
    listingId: string,
    traceId: string,
  ): Promise<ResponseEnvelope<ListingRecord>> {
    return requestJson<ListingRecord>(
      `/api/v1/marketplace/listings/${listingId}`,
      { method: "GET" },
      traceId,
      true,
    );
  },

  async listListingRevisions(
    listingId: string,
    traceId: string,
  ): Promise<ResponseEnvelope<ListingRevisionCollection>> {
    return requestJson<ListingRevisionCollection>(
      `/api/v1/marketplace/listings/${listingId}/revisions`,
      { method: "GET" },
      traceId,
      true,
    );
  },

  // -- Listing mutations ---------------------------------------------------

  async createListing(
    input: ListingCreateInput,
    traceId: string,
    actorId: string,
    countryCode: string,
  ): Promise<ListingCommandResponse> {
    return sendListingCommand({
      actorId,
      aggregateRef: "listing",
      countryCode,
      input,
      name: "market.listings.create",
      traceId,
    });
  },

  async updateListing(
    input: ListingUpdateInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ): Promise<ListingCommandResponse> {
    return sendListingCommand({
      actorId,
      aggregateRef: input.listing_id,
      countryCode,
      idempotencyKey,
      input,
      name: "market.listings.update",
      traceId,
    });
  },

  async publishListing(
    input: ListingPublishInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ): Promise<ListingPublishCommandResponse> {
    return sendListingPublishCommand({
      actorId,
      aggregateRef: input.listing_id,
      commandName: "market.listings.publish",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  async unpublishListing(
    input: ListingUnpublishInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ): Promise<ListingPublishCommandResponse> {
    return sendListingPublishCommand({
      actorId,
      aggregateRef: input.listing_id,
      commandName: "market.listings.unpublish",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  // -- Negotiation queries -------------------------------------------------

  async listNegotiations(
    traceId: string,
  ): Promise<ResponseEnvelope<NegotiationThreadCollection>> {
    return requestJson<NegotiationThreadCollection>(
      "/api/v1/marketplace/negotiations",
      { method: "GET" },
      traceId,
      true,
    );
  },

  async getNegotiationThread(
    threadId: string,
    traceId: string,
  ): Promise<ResponseEnvelope<NegotiationThreadRead>> {
    return requestJson<NegotiationThreadRead>(
      `/api/v1/marketplace/negotiations/${threadId}`,
      { method: "GET" },
      traceId,
      true,
    );
  },

  // -- Negotiation mutations -----------------------------------------------

  async createNegotiation(
    input: NegotiationCreateInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ): Promise<NegotiationCommandResponse> {
    return sendNegotiationCommand({
      actorId,
      aggregateRef: input.listing_id,
      commandName: "market.negotiations.create",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  async counterNegotiation(
    input: NegotiationCounterInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ): Promise<NegotiationCommandResponse> {
    return sendNegotiationCommand({
      actorId,
      aggregateRef: input.thread_id,
      commandName: "market.negotiations.counter",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  async requestNegotiationConfirmation(
    input: NegotiationConfirmationRequestInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ): Promise<NegotiationCommandResponse> {
    return sendNegotiationCommand({
      actorId,
      aggregateRef: input.thread_id,
      commandName: "market.negotiations.confirm.request",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  async approveNegotiationConfirmation(
    input: NegotiationConfirmationApproveInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ): Promise<NegotiationCommandResponse> {
    return sendNegotiationCommand({
      actorId,
      aggregateRef: input.thread_id,
      commandName: "market.negotiations.confirm.approve",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },

  async rejectNegotiationConfirmation(
    input: NegotiationConfirmationRejectInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey?: string,
  ): Promise<NegotiationCommandResponse> {
    return sendNegotiationCommand({
      actorId,
      aggregateRef: input.thread_id,
      commandName: "market.negotiations.confirm.reject",
      countryCode,
      idempotencyKey,
      input,
      traceId,
    });
  },
};
