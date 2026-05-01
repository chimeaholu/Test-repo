import { schemaVersion } from "@agrodomain/contracts";
import type { IdentitySession, ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";

import { identityApi } from "@/lib/api/identity";
import { marketplaceApi } from "@/lib/api/marketplace";
import {
  transportApi,
  type TransportLoadRead,
  type TransportShipmentRead,
} from "@/lib/api/transport";
import type { EscrowRead } from "@/lib/api-types";
import { walletApi } from "@/lib/api/wallet";
import { readJson, writeJson } from "@/lib/api-client";
import {
  buildDriverProfile,
  buildLoadCard,
  buildShipmentCard,
  buildShipmentTimeline,
  computeRateEstimate,
  defaultPickupWindow,
  deriveShipmentSlaState,
  deriveShipmentStage,
  humanizeShipmentSlaState,
  humanizeAvailability,
  humanizeStage,
  mergeTransportMetadata,
  type ShipmentTrackingSnapshot,
  type ShipmentIssue,
  type ShipmentStage,
  type TransportDriverProfile,
  type TransportListingMetadata,
  type TransportLoadCard,
  type TransportMetadataInput,
  type TransportShipmentCard,
  type TruckerTimelineEntry,
  type TruckerAvailability,
  type TruckerMarketplaceRole,
} from "@/features/trucker/model";
import { recordTransportTelemetry } from "@/lib/telemetry/trucker";

const TRUCKER_STORE_KEY = "agrodomain.trucker.workspace.v1";

type TruckerStore = {
  actors: Record<
    string,
    {
      availability?: TruckerAvailability;
      preferredRole?: TruckerMarketplaceRole;
      vehicleLabel?: string;
    }
  >;
  loads: Record<string, Partial<TransportListingMetadata>>;
};

type ActorSearchRecord = {
  actor_id: string;
  country_code: string;
  display_name: string;
  email: string;
  organization_name: string;
  role: string;
};

type MarketplaceSnapshot = {
  availableDrivers: TransportDriverProfile[];
  availableLoads: TransportLoadCard[];
  driverAvailability: TruckerAvailability;
  driverShipments: TransportShipmentCard[];
  rolePreference: TruckerMarketplaceRole;
  shipperShipments: TransportShipmentCard[];
};

type ShipmentRecord = {
  escrow: EscrowRead | null;
  listing: ListingRecord;
  metadata: TransportListingMetadata;
  negotiations: NegotiationThreadRead[];
  stage: ShipmentStage;
};

function readStore(): TruckerStore {
  return (
    readJson<TruckerStore>(TRUCKER_STORE_KEY) ?? {
      actors: {},
      loads: {},
    }
  );
}

function writeStore(store: TruckerStore): void {
  writeJson(TRUCKER_STORE_KEY, store);
}

function actorDefaults(session: IdentitySession) {
  return {
    availability: session.actor.role === "transporter" ? ("available" as const) : ("offline" as const),
    preferredRole: session.actor.role === "transporter" ? ("driver" as const) : ("shipper" as const),
  };
}

function actorState(session: IdentitySession) {
  const store = readStore();
  const existing = store.actors[session.actor.actor_id] ?? {};

  return {
    availability: existing.availability ?? actorDefaults(session).availability,
    preferredRole: existing.preferredRole ?? actorDefaults(session).preferredRole,
    store,
  };
}

function writeActorState(
  session: IdentitySession,
  patch: Partial<{ availability: TruckerAvailability; preferredRole: TruckerMarketplaceRole }>,
): void {
  const store = readStore();
  const current = store.actors[session.actor.actor_id] ?? {};
  store.actors[session.actor.actor_id] = {
    ...current,
    ...patch,
  };
  writeStore(store);
}

function listingById(listings: ListingRecord[]): Map<string, ListingRecord> {
  return new Map(listings.map((listing) => [listing.listing_id, listing]));
}

function actorDisplayName(actorId: string): string {
  const parts = actorId.replace(/^actor-/, "").split("-").filter(Boolean);
  if (parts.length <= 2) {
    return "Verified operator";
  }
  return parts
    .slice(2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dedupeActors(items: ActorSearchRecord[]): ActorSearchRecord[] {
  const seen = new Map<string, ActorSearchRecord>();
  items.forEach((item) => {
    if (!seen.has(item.actor_id)) {
      seen.set(item.actor_id, item);
    }
  });
  return Array.from(seen.values());
}

async function loadRuntime(session: IdentitySession, traceId: string) {
  const [listingsResult, negotiationsResult, escrowsResult, transporterActorsResult, driverActorsResult] =
    await Promise.allSettled([
      marketplaceApi.listListings(traceId),
      marketplaceApi.listNegotiations(traceId),
      walletApi.listEscrows(traceId),
      identityApi.searchActors("trans", traceId, 12),
      identityApi.searchActors("driver", traceId, 12),
    ]);

  const listings = listingsResult.status === "fulfilled" ? listingsResult.value.data.items : [];
  const negotiations = negotiationsResult.status === "fulfilled" ? negotiationsResult.value.data.items : [];
  const escrows = escrowsResult.status === "fulfilled" ? escrowsResult.value.data.items : [];
  const actors = dedupeActors(
    [transporterActorsResult, driverActorsResult]
      .flatMap((result) => (result.status === "fulfilled" ? result.value.data.items : []))
      .filter((item): item is ActorSearchRecord => item.role === "transporter"),
  );

  return {
    actors,
    escrows,
    listings,
    negotiations,
  };
}

function buildShipmentRecords(params: {
  escrows: EscrowRead[];
  listings: ListingRecord[];
  negotiations: NegotiationThreadRead[];
}): ShipmentRecord[] {
  const store = readStore();
  const publishedListings = params.listings.filter((listing) => listing.status === "published");
  const records = publishedListings.map((listing) => {
    const metadata = mergeTransportMetadata(listing, store.loads[listing.listing_id]);
    const linkedNegotiations = params.negotiations.filter((thread) => thread.listing_id === listing.listing_id);
    const escrow = params.escrows.find((item) => item.listing_id === listing.listing_id) ?? null;
    const stage = deriveShipmentStage({
      escrow,
      metadata,
      negotiations: linkedNegotiations,
    });

    return {
      escrow,
      listing,
      metadata: {
        ...metadata,
        stage,
      },
      negotiations: linkedNegotiations,
      stage,
    };
  });

  return records.sort((left, right) =>
    (right.listing.published_at ?? right.listing.updated_at).localeCompare(left.listing.published_at ?? left.listing.updated_at),
  );
}

export const truckerApi = {
  async getMarketplaceSnapshot(session: IdentitySession, traceId: string): Promise<MarketplaceSnapshot> {
    const runtime = await loadRuntime(session, traceId);
    const shipments = buildShipmentRecords(runtime);
    const { availability, preferredRole } = actorState(session);

    const shipperListings = shipments.filter((record) => record.listing.actor_id === session.actor.actor_id);
    const driverListings = shipments.filter((record) => record.metadata.acceptedDriverId === session.actor.actor_id);

    const shipperShipments = shipperListings
      .filter((record) => record.stage !== "posted")
      .map((record) =>
        buildShipmentCard({
          listing: record.listing,
          metadata: record.metadata,
          priceAmount: record.metadata.budget,
          priceCurrency: record.listing.price_currency,
          stage: record.stage,
        }),
      );

    const driverShipments = driverListings.map((record) =>
      buildShipmentCard({
        listing: record.listing,
        metadata: record.metadata,
        priceAmount: record.metadata.budget,
        priceCurrency: record.listing.price_currency,
        stage: record.stage,
      }),
    );

    const availableLoads = shipments
      .filter((record) => record.listing.actor_id !== session.actor.actor_id)
      .filter((record) => !record.metadata.acceptedDriverId || record.metadata.acceptedDriverId === session.actor.actor_id)
      .slice(0, 8)
      .map((record) =>
        buildLoadCard({
          listing: record.listing,
          metadata: record.metadata,
          posterName: actorDisplayName(record.listing.actor_id),
        }),
      );

    const referenceLoad = shipperListings[0]?.metadata ?? shipments[0]?.metadata;
    const availableDrivers = referenceLoad
      ? runtime.actors
          .map((actor) =>
            buildDriverProfile({
              actorId: actor.actor_id,
              availability: readStore().actors[actor.actor_id]?.availability ?? "available",
              displayName: actor.display_name,
              email: actor.email,
              metadata: referenceLoad,
            }),
          )
          .sort((left, right) => left.estimatedQuote - right.estimatedQuote)
          .slice(0, 6)
      : [];

    return {
      availableDrivers,
      availableLoads,
      driverAvailability: availability,
      driverShipments,
      rolePreference: preferredRole,
      shipperShipments,
    };
  },

  async getShipmentSnapshot(
    listingId: string,
    session: IdentitySession,
    traceId: string,
  ): Promise<ShipmentTrackingSnapshot | null> {
    const runtime = await loadRuntime(session, traceId);
    const shipments = buildShipmentRecords(runtime);
    const shipment = shipments.find((record) => record.listing.listing_id === listingId);

    if (!shipment) {
      return null;
    }

    const driverActor = shipment.metadata.acceptedDriverId
      ? runtime.actors.find((actor) => actor.actor_id === shipment.metadata.acceptedDriverId) ?? null
      : null;
    const slaState = deriveShipmentSlaState({ metadata: shipment.metadata, stage: shipment.stage });

    return {
      budgetLabel: `${formatBudgetLabel(shipment.metadata.budget, shipment.listing.price_currency)} corridor budget`,
      commodity: shipment.listing.commodity,
      currentCheckpoint: shipment.metadata.currentCheckpoint,
      currentLocationLabel: shipment.metadata.currentLocationLabel,
      deliveryDeadline: shipment.metadata.deliveryDeadline,
      destination: shipment.metadata.destination,
      distanceKm: estimateDistance(shipment.metadata.routeLabel),
      driver: driverActor
        ? buildDriverProfile({
            actorId: driverActor.actor_id,
            availability: readStore().actors[driverActor.actor_id]?.availability ?? "available",
            displayName: driverActor.display_name,
            email: driverActor.email,
            metadata: shipment.metadata,
          })
        : shipment.metadata.acceptedDriverId
          ? buildDriverProfile({
              actorId: shipment.metadata.acceptedDriverId,
              availability: "busy",
              displayName: actorDisplayName(shipment.metadata.acceptedDriverId),
              email: `${shipment.metadata.acceptedDriverId}@agrodomain.local`,
              metadata: shipment.metadata,
            })
          : null,
      exceptionCount: shipment.metadata.issues.length,
      etaLabel: shipment.stage === "delivered" ? "Delivered" : humanizeStage(shipment.stage),
      issueCount: shipment.metadata.issueCount,
      issues: shipment.metadata.issues,
      lastUpdatedAt: latestShipmentUpdateAt(shipment.metadata),
      listing: shipment.listing,
      podStatusLabel: shipment.metadata.proofOfDelivery ? "Proof captured" : shipment.stage === "in_transit" ? "Awaiting handoff proof" : "Not started",
      pickupLocation: shipment.metadata.pickupLocation,
      proofOfDelivery: shipment.metadata.proofOfDelivery,
      rateEstimate: shipment.metadata.rateEstimate,
      routeLabel: shipment.metadata.routeLabel,
      slaLabel: humanizeShipmentSlaState(slaState),
      slaState,
      stage: shipment.stage,
      timeline: buildShipmentTimeline({
        escrow: shipment.escrow,
        listing: shipment.listing,
        metadata: shipment.metadata,
        negotiations: shipment.negotiations,
      }),
      weightLabel: `${shipment.metadata.weightTons} tonnes (${shipment.metadata.itemCount} items)`,
    };
  },

  async postLoad(input: TransportMetadataInput, session: IdentitySession, traceId: string): Promise<{ listingId: string }> {
    const rateEstimate = computeRateEstimate({
      countryCode: session.actor.country_code,
      destination: input.destination,
      pickupLocation: input.pickupLocation,
      weightTons: input.weightTons,
    });
    const summary = [
      `Transport request from ${input.pickupLocation} to ${input.destination}.`,
      `${input.commodity} · ${input.weightTons} tonnes · ${input.itemCount} items.`,
      `Pickup ${input.pickupDate} during ${input.pickupWindow}.`,
      `Delivery target ${input.deliveryDeadline}.`,
      `Budget ${input.budget} ${currencyForCountry(session.actor.country_code)}.`,
      input.instructions.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    const createResponse = await marketplaceApi.createListing(
      {
        commodity: input.commodity,
        location: input.pickupLocation,
        price_amount: input.budget,
        price_currency: currencyForCountry(session.actor.country_code),
        quantity_tons: input.weightTons,
        summary,
        title: `Transport load: ${input.pickupLocation} to ${input.destination}`,
      },
      traceId,
      session.actor.actor_id,
      session.actor.country_code,
    );

    await marketplaceApi.publishListing(
      { listing_id: createResponse.data.listing.listing_id },
      traceId,
      session.actor.actor_id,
      session.actor.country_code,
    );

    const store = readStore();
    store.loads[createResponse.data.listing.listing_id] = {
      acceptedDriverId: null,
      budget: input.budget,
      commodity: input.commodity,
      createdAt: new Date().toISOString(),
      currentCheckpoint: "Load posted",
      currentLocationLabel: input.pickupLocation,
      deliveryDeadline: input.deliveryDeadline,
      destination: input.destination,
      driverRequestIds: [],
      issues: [],
      instructions: input.instructions,
      issueCount: 0,
      itemCount: input.itemCount,
      listingId: createResponse.data.listing.listing_id,
      pickupDate: input.pickupDate,
      pickupLocation: input.pickupLocation,
      pickupWindow: input.pickupWindow,
      proofOfDelivery: null,
      rateEstimate,
      routeLabel: `${input.pickupLocation} -> ${input.destination}`,
      stage: "posted",
      updates: [
        {
          checkpoint: "Load posted",
          createdAt: new Date().toISOString(),
          id: `${createResponse.data.listing.listing_id}-created`,
          note: "Verified transport request published to the logistics marketplace.",
          tone: "info",
        },
      ],
      weightTons: input.weightTons,
    };
    writeStore(store);
    recordTransportTelemetry({
      event: "transport_load_posted",
      listingId: createResponse.data.listing.listing_id,
      session,
      slaState: "scheduled",
      sourceSurface: "load_wizard",
      stage: "posted",
      traceId,
    });

    return { listingId: createResponse.data.listing.listing_id };
  },

  async getMarketplaceSnapshotLive(session: IdentitySession, traceId: string): Promise<MarketplaceSnapshot> {
    const { availability, preferredRole } = actorState(session);
    const shouldLoadDriverData = session.actor.role === "transporter";
    const shouldLoadShipperData = session.actor.role !== "transporter";

    const [shipmentsResult, loadsResult, driversResult] = await Promise.allSettled([
      transportApi.listShipments(traceId),
      shouldLoadDriverData ? transportApi.listLoads(traceId) : Promise.resolve({ data: { items: [] } }),
      shouldLoadShipperData ? identityApi.searchActors("trans", traceId, 12) : Promise.resolve({ data: { items: [] } }),
    ]);

    const shipments = shipmentsResult.status === "fulfilled" ? shipmentsResult.value.data.items : [];
    const loads = loadsResult.status === "fulfilled" ? loadsResult.value.data.items : [];
    const driverActors = driversResult.status === "fulfilled" ? driversResult.value.data.items : [];
    const referenceLoad = shipments[0]?.load ?? loads[0] ?? null;

    return {
      availableDrivers:
        shouldLoadShipperData && referenceLoad
          ? driverActors
              .filter((actor) => actor.role === "transporter")
              .map((actor) => buildLiveDriverProfile(actor, referenceLoad))
              .sort((left, right) => left.estimatedQuote - right.estimatedQuote)
              .slice(0, 6)
          : [],
      availableLoads: loads.slice(0, 8).map((load) => buildLiveLoadCard(load)),
      driverAvailability: availability,
      driverShipments: shouldLoadDriverData ? shipments.map((shipment) => buildLiveShipmentCard(shipment)) : [],
      rolePreference: preferredRole,
      shipperShipments: shouldLoadShipperData ? shipments.map((shipment) => buildLiveShipmentCard(shipment)) : [],
    };
  },

  async getShipmentSnapshotLive(
    resourceId: string,
    session: IdentitySession,
    traceId: string,
  ): Promise<ShipmentTrackingSnapshot | null> {
    const resolved = await resolveLiveShipmentResource(resourceId, traceId);
    if (!resolved) {
      return null;
    }
    return buildLiveShipmentSnapshot(resolved, session);
  },

  async postLoadLive(
    input: TransportMetadataInput,
    session: IdentitySession,
    traceId: string,
  ): Promise<{ loadId: string }> {
    const response = await transportApi.createLoad(
      {
        commodity: input.commodity,
        deliveryDeadline: input.deliveryDeadline,
        destinationLocation: input.destination,
        originLocation: input.pickupLocation,
        pickupDate: input.pickupDate,
        priceCurrency: currencyForCountry(session.actor.country_code),
        priceOffer: input.budget,
        vehicleTypeRequired: defaultVehicleType(input.weightTons),
        weightTons: input.weightTons,
      },
      traceId,
    );

    recordTransportTelemetry({
      event: "transport_load_posted",
      listingId: response.data.load_id,
      session,
      slaState: "scheduled",
      sourceSurface: "load_wizard",
      stage: "posted",
      traceId,
    });

    return { loadId: response.data.load_id };
  },

  async acceptLoadLive(loadId: string, session: IdentitySession, traceId: string): Promise<TransportShipmentRead> {
    const response = await transportApi.assignLoad(
      {
        loadId,
        notes: `${session.actor.display_name} accepted the load and is preparing pickup.`,
        vehicleInfo: defaultVehicleInfo(session.actor.actor_id),
      },
      traceId,
    );
    writeActorState(session, { availability: "busy" });
    return response.data;
  },

  async updateShipmentStageLive(
    resourceId: string,
    stage: Exclude<ShipmentStage, "posted" | "accepted" | "delivered">,
    params: { note?: string; traceId: string },
  ): Promise<TransportShipmentRead> {
    const resolved = await resolveLiveShipmentResource(resourceId, params.traceId);
    if (!resolved?.shipment) {
      throw new Error("transport_shipment_not_found");
    }
    const response = await transportApi.createShipmentEvent(
      {
        eventType: stage === "picked_up" ? "picked_up" : "in_transit",
        notes: params.note?.trim() || `${humanizeStage(stage)} recorded from the transport workspace.`,
        shipmentId: resolved.shipment.shipment_id,
      },
      params.traceId,
    );
    return response.data;
  },

  async reportIssueLive(
    resourceId: string,
    issue: {
      blocked: boolean;
      delayMinutes: number | null;
      description: string;
      severity: "low" | "medium" | "high";
      type: string;
    },
    traceId: string,
  ): Promise<ShipmentIssue> {
    const resolved = await resolveLiveShipmentResource(resourceId, traceId);
    if (!resolved?.shipment) {
      throw new Error("transport_shipment_not_found");
    }
    const response = await transportApi.createShipmentEvent(
      {
        checkpointLabel: "Exception checkpoint",
        delayMinutes: issue.delayMinutes,
        eventType: "checkpoint",
        exceptionCode: issue.type,
        notes: encodeLiveIssue(issue),
        severity: issue.severity,
        shipmentId: resolved.shipment.shipment_id,
      },
      traceId,
    );
    const parsedIssues = parseLiveIssues(response.data.events);
    const parsed = parsedIssues[parsedIssues.length - 1];
    return (
      parsed ?? {
        blocked: issue.blocked,
        delayMinutes: issue.delayMinutes,
        description: issue.description,
        id: `${resolved.shipment.shipment_id}-issue-${Date.now()}`,
        reportedAt: new Date().toISOString(),
        severity: issue.severity,
        type: issue.type,
      }
    );
  },

  async completeDeliveryLive(
    resourceId: string,
    input: { photoName: string | null; recipientName: string; signaturePoints: Array<{ x: number; y: number }> },
    traceId: string,
  ): Promise<NonNullable<TransportListingMetadata["proofOfDelivery"]>> {
    const resolved = await resolveLiveShipmentResource(resourceId, traceId);
    if (!resolved?.shipment) {
      throw new Error("transport_shipment_not_found");
    }
    const proof = {
      deliveredAt: new Date().toISOString(),
      photoName: input.photoName,
      recipientName: input.recipientName.trim(),
      signaturePoints: input.signaturePoints.map((point) => ({ ...point })),
    };
    const response = await transportApi.deliverShipment(
      {
        notes: encodeLiveProof(proof),
        proofOfDeliveryUrl: proof.photoName
          ? `https://proof.agrodomain.invalid/${encodeURIComponent(proof.photoName)}`
          : "https://proof.agrodomain.invalid/delivery-proof",
        recipientName: proof.recipientName,
        shipmentId: resolved.shipment.shipment_id,
      },
      traceId,
    );
    return parseLiveProof(response.data) ?? proof;
  },

  readRolePreference(session: IdentitySession): TruckerMarketplaceRole {
    return actorState(session).preferredRole;
  },

  writeRolePreference(session: IdentitySession, role: TruckerMarketplaceRole): void {
    writeActorState(session, { preferredRole: role });
  },

  readAvailability(session: IdentitySession): TruckerAvailability {
    return actorState(session).availability;
  },

  writeAvailability(session: IdentitySession, availability: TruckerAvailability): void {
    writeActorState(session, { availability });
  },

  requestDriver(listingId: string, driverId: string): void {
    const store = readStore();
    const existing = store.loads[listingId] ?? {};
    const requestIds = new Set(existing.driverRequestIds ?? []);
    requestIds.add(driverId);
    store.loads[listingId] = {
      ...existing,
      currentCheckpoint: "Driver requested",
      driverRequestIds: Array.from(requestIds),
      updates: [
        ...(existing.updates ?? []),
        {
          checkpoint: "Driver requested",
          createdAt: new Date().toISOString(),
          id: `${listingId}-request-${driverId}`,
          note: `Carrier request sent to ${actorDisplayName(driverId)}.`,
          tone: "info",
        },
      ],
    };
    writeStore(store);
  },

  acceptLoad(listingId: string, session: IdentitySession, traceId?: string): void {
    const store = readStore();
    const existing = store.loads[listingId] ?? {};
    store.loads[listingId] = {
      ...existing,
      acceptedDriverId: session.actor.actor_id,
      currentCheckpoint: "Driver accepted",
      currentLocationLabel: existing.pickupLocation ?? existing.currentLocationLabel ?? "Pickup location",
      stage: "accepted",
      updates: [
        ...(existing.updates ?? []),
        {
          checkpoint: "Driver accepted",
          createdAt: new Date().toISOString(),
          id: `${listingId}-accepted-${session.actor.actor_id}`,
          note: `${session.actor.display_name} accepted the load and is preparing pickup.`,
          tone: "success",
        },
      ],
    };
    writeStore(store);
    writeActorState(session, { availability: "busy" });
    if (traceId) {
      const metadata = hydrateTransportMetadata(listingId, session, store.loads[listingId] ?? {});
      recordTransportTelemetry({
        event: "transport_shipment_assigned",
        listingId,
        session,
        slaState: deriveShipmentSlaState({ metadata, stage: "accepted" }),
        sourceSurface: "transport_workspace",
        stage: "accepted",
        traceId,
      });
    }
  },

  updateShipmentStage(
    listingId: string,
    stage: Exclude<ShipmentStage, "posted">,
    params?: { note?: string; session?: IdentitySession; traceId?: string },
  ): void {
    const store = readStore();
    const existing = store.loads[listingId] ?? {};
    const checkpoint = stage === "picked_up" ? "Loaded and picked up" : stage === "in_transit" ? "In transit" : "Delivered";
    store.loads[listingId] = {
      ...existing,
      currentCheckpoint: checkpoint,
      currentLocationLabel:
        stage === "in_transit"
          ? "Mid-route corridor"
          : stage === "delivered"
            ? existing.destination ?? existing.currentLocationLabel ?? "Delivery point"
            : existing.pickupLocation ?? existing.currentLocationLabel ?? "Pickup point",
      stage,
      updates: [
        ...(existing.updates ?? []),
        {
          checkpoint,
          createdAt: new Date().toISOString(),
          id: `${listingId}-${stage}-${Date.now()}`,
          note: params?.note?.trim() || `${humanizeStage(stage)} recorded from the transport workspace.`,
          tone: stage === "delivered" ? "success" : "info",
        },
      ],
    };
    writeStore(store);
    if (params?.session && params.traceId) {
      const metadata = hydrateTransportMetadata(listingId, params.session, store.loads[listingId] ?? {});
      recordTransportTelemetry({
        event: "transport_milestone_recorded",
        listingId,
        session: params.session,
        slaState: deriveShipmentSlaState({ metadata, stage }),
        sourceSurface: "shipment_tracking",
        stage,
        traceId: params.traceId,
      });
    }
  },

  reportIssue(
    listingId: string,
    issue: {
      blocked: boolean;
      delayMinutes: number | null;
      description: string;
      severity: "low" | "medium" | "high";
      type: string;
    },
    session?: IdentitySession,
    traceId?: string,
  ): ShipmentIssue {
    const store = readStore();
    const existing = store.loads[listingId] ?? {};
    const issueRecord: ShipmentIssue = {
      blocked: issue.blocked,
      delayMinutes: issue.delayMinutes,
      description: issue.description,
      id: `${listingId}-issue-${Date.now()}`,
      reportedAt: new Date().toISOString(),
      severity: issue.severity,
      type: issue.type,
    };
    store.loads[listingId] = {
      ...existing,
      issues: [...(existing.issues ?? []), issueRecord],
      issueCount: (existing.issueCount ?? 0) + 1,
      updates: [
        ...(existing.updates ?? []),
        {
          checkpoint: issue.type,
          createdAt: issueRecord.reportedAt,
          id: issueRecord.id,
          note: issue.delayMinutes
            ? `${issue.description} Delay logged: ${issue.delayMinutes} minutes.`
            : issue.description,
          tone: "warning",
        },
      ],
    };
    writeStore(store);
    if (session && traceId) {
      const metadata = hydrateTransportMetadata(listingId, session, store.loads[listingId] ?? {});
      recordTransportTelemetry({
        blocked: issue.blocked,
        delayMinutes: issue.delayMinutes,
        event: "transport_exception_reported",
        exceptionCode: issue.type,
        listingId,
        session,
        severity: issue.severity,
        slaState: deriveShipmentSlaState({ metadata, stage: metadata.stage }),
        sourceSurface: "shipment_tracking",
        stage: metadata.stage,
        traceId,
      });
    }
    return issueRecord;
  },

  completeDelivery(
    listingId: string,
    input: { photoName: string | null; recipientName: string; signaturePoints: Array<{ x: number; y: number }> },
    session?: IdentitySession,
    traceId?: string,
  ): NonNullable<TransportListingMetadata["proofOfDelivery"]> {
    const store = readStore();
    const existing = store.loads[listingId] ?? {};
    const proofOfDelivery = {
      deliveredAt: new Date().toISOString(),
      photoName: input.photoName,
      recipientName: input.recipientName.trim(),
      signaturePoints: input.signaturePoints.map((point) => ({ ...point })),
    };
    store.loads[listingId] = {
      ...existing,
      currentCheckpoint: "Delivery confirmed",
      currentLocationLabel: existing.destination ?? "Delivered",
      proofOfDelivery,
      stage: "delivered",
      updates: [
        ...(existing.updates ?? []),
        {
          checkpoint: "Proof of delivery",
          createdAt: new Date().toISOString(),
          id: `${listingId}-pod-${Date.now()}`,
          note: `Delivery confirmed by ${proofOfDelivery.recipientName}.`,
          tone: "success",
        },
      ],
    };
    writeStore(store);
    if (session && traceId) {
      const metadata = hydrateTransportMetadata(listingId, session, store.loads[listingId] ?? {});
      recordTransportTelemetry({
        event: "transport_pod_completed",
        listingId,
        session,
        slaState: deriveShipmentSlaState({ metadata, stage: "delivered" }),
        sourceSurface: "shipment_tracking",
        stage: "delivered",
        traceId,
      });
    }
    return proofOfDelivery;
  },
};

const LIVE_ISSUE_PREFIX = "EH6_ISSUE|";
const LIVE_PROOF_PREFIX = "EH6_POD|";

function defaultVehicleType(weightTons: number): string {
  return weightTons >= 5 ? "flatbed" : "pickup";
}

function defaultVehicleInfo(actorId: string): Record<string, unknown> {
  const suffix = actorId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "AGD001";
  return {
    plate_number: `AGD-${suffix}`,
    vehicle_label: "Kia Rhino 5t",
    vehicle_type: "flatbed",
  };
}

function buildLiveDriverProfile(
  actor: ActorSearchRecord,
  referenceLoad: TransportLoadRead,
): TransportDriverProfile {
  const routeLabel = `${referenceLoad.origin_location} -> ${referenceLoad.destination_location}`;
  const rateEstimate = computeRateEstimate({
    countryCode: referenceLoad.country_code,
    destination: referenceLoad.destination_location,
    pickupLocation: referenceLoad.origin_location,
    weightTons: referenceLoad.weight_tons,
  });
  const distanceSeed = Math.abs(hashDriverSeed(`${routeLabel}:${actor.actor_id}`));

  return {
    actorId: actor.actor_id,
    availability: "available",
    displayName: actor.display_name,
    email: actor.email,
    estimatedDistanceKm: 3 + (distanceSeed % 37),
    estimatedQuote: rateEstimate.min + (distanceSeed % 180),
    rating: Number((4.2 + (distanceSeed % 7) * 0.1).toFixed(1)),
    routeLabel,
    vehicleLabel: "Kia Rhino 5t",
  };
}

function buildLiveLoadCard(load: TransportLoadRead): TransportLoadCard {
  return {
    commodity: load.commodity,
    distanceLabel: `${Math.max(1, Math.round(load.route.distance_km))} km from you`,
    id: load.load_id,
    pickupLabel: `${load.pickup_date} · ${defaultPickupWindow()}`,
    posterName: actorDisplayName(load.poster_actor_id),
    priceLabel: formatBudgetLabel(load.price_offer, load.price_currency),
    routeLabel: `${load.origin_location} -> ${load.destination_location}`,
    title: `${load.origin_location} to ${load.destination_location}`,
    weightLabel: `${load.weight_tons} tonnes`,
  };
}

function buildLiveShipmentCard(shipment: TransportShipmentRead): TransportShipmentCard {
  const stage = liveShipmentStage(shipment);
  return {
    commodity: shipment.load.commodity,
    currentCheckpoint: liveCurrentCheckpoint(shipment, stage),
    currentLocationLabel: liveCurrentLocationLabel(shipment, stage),
    etaLabel: stage === "delivered" ? "Delivered" : humanizeStage(stage),
    id: shipment.shipment_id,
    payLabel: formatBudgetLabel(shipment.load.price_offer, shipment.load.price_currency),
    stage,
    stageLabel: humanizeStage(stage),
    subtitle: `${shipment.load.origin_location} to ${shipment.load.destination_location}`,
    title: `${shipment.load.origin_location} -> ${shipment.load.destination_location}`,
    trackHref: `/app/trucker/shipments/${shipment.shipment_id}`,
    weightLabel: `${shipment.load.weight_tons} tonnes`,
  };
}

function hashDriverSeed(input: string): number {
  return Array.from(input).reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) | 0, 0);
}

function liveShipmentStage(shipment: TransportShipmentRead): ShipmentStage {
  if (shipment.status === "delivered") {
    return "delivered";
  }
  const latestOperationalEvent = [...shipment.events]
    .reverse()
    .find((event) => ["checkpoint", "in_transit", "picked_up"].includes(event.event_type));
  if (latestOperationalEvent?.event_type === "checkpoint" || latestOperationalEvent?.event_type === "in_transit") {
    return "in_transit";
  }
  if (latestOperationalEvent?.event_type === "picked_up") {
    return "picked_up";
  }
  return "accepted";
}

function liveCurrentCheckpoint(shipment: TransportShipmentRead, stage: ShipmentStage): string {
  const latestEvent = [...shipment.events].reverse()[0];
  if (latestEvent?.event_type === "delivered") {
    return "Delivery confirmed";
  }
  if (latestEvent?.event_type === "checkpoint") {
    return "Corridor checkpoint";
  }
  if (latestEvent?.event_type === "in_transit") {
    return "In transit";
  }
  if (latestEvent?.event_type === "picked_up") {
    return "Loaded and picked up";
  }
  if (latestEvent?.event_type === "assigned") {
    return "Driver accepted";
  }
  return stage === "posted" ? "Load posted" : "Driver accepted";
}

function liveCurrentLocationLabel(shipment: TransportShipmentRead, stage: ShipmentStage): string {
  if (stage === "delivered") {
    return shipment.load.destination_location;
  }
  if (stage === "in_transit") {
    return shipment.route.corridor_code ? `${shipment.route.corridor_code} corridor` : "Mid-route corridor";
  }
  return shipment.load.origin_location;
}

function encodeLiveIssue(issue: {
  blocked: boolean;
  delayMinutes: number | null;
  description: string;
  severity: "low" | "medium" | "high";
  type: string;
}): string {
  return `${LIVE_ISSUE_PREFIX}${JSON.stringify(issue)}`;
}

function encodeLiveProof(proof: NonNullable<TransportListingMetadata["proofOfDelivery"]>): string {
  return `${LIVE_PROOF_PREFIX}${JSON.stringify(proof)}`;
}

function parseLiveIssue(event: TransportShipmentRead["events"][number]): ShipmentIssue | null {
  if (!event.notes?.startsWith(LIVE_ISSUE_PREFIX)) {
    return null;
  }
  try {
    const payload = JSON.parse(event.notes.slice(LIVE_ISSUE_PREFIX.length)) as {
      blocked: boolean;
      delayMinutes: number | null;
      description: string;
      severity: "low" | "medium" | "high";
      type: string;
    };
    return {
      blocked: payload.blocked,
      delayMinutes: payload.delayMinutes,
      description: payload.description,
      id: event.event_id,
      reportedAt: event.timestamp ?? new Date().toISOString(),
      severity: payload.severity,
      type: payload.type,
    };
  } catch {
    return null;
  }
}

function parseLiveIssues(events: TransportShipmentRead["events"]): ShipmentIssue[] {
  return events.map((event) => parseLiveIssue(event)).filter((issue): issue is ShipmentIssue => issue !== null);
}

function parseLiveProof(
  shipment: TransportShipmentRead,
): NonNullable<TransportListingMetadata["proofOfDelivery"]> | null {
  const deliveredEvent = [...shipment.events].reverse().find((event) => event.event_type === "delivered");
  if (deliveredEvent) {
    const parsed = parseLiveProofNote(deliveredEvent.notes);
    if (parsed) {
      return parsed;
    }
  }
  if (!shipment.proof_of_delivery_url) {
    return null;
  }
  return {
    deliveredAt: deliveredEvent?.timestamp ?? new Date().toISOString(),
    photoName: shipment.proof_of_delivery_url.split("/").pop() ?? "delivery-proof",
    recipientName: "Verified recipient",
    signaturePoints: [],
  };
}

function parseLiveProofNote(
  note: string | null,
): NonNullable<TransportListingMetadata["proofOfDelivery"]> | null {
  if (!note?.startsWith(LIVE_PROOF_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(note.slice(LIVE_PROOF_PREFIX.length)) as NonNullable<
      TransportListingMetadata["proofOfDelivery"]
    >;
  } catch {
    return null;
  }
}

function liveTimelineFromShipment(
  shipment: TransportShipmentRead,
): TruckerTimelineEntry[] {
  return [...shipment.events]
    .sort((left, right) => (right.timestamp ?? "").localeCompare(left.timestamp ?? ""))
    .map((event) => ({
      checkpoint:
        event.event_type === "assigned"
          ? "Driver accepted"
          : event.event_type === "picked_up"
            ? "Loaded and picked up"
            : event.event_type === "in_transit"
              ? "In transit"
              : event.event_type === "checkpoint"
                ? "Corridor checkpoint"
                : event.event_type === "delivered"
                  ? "Proof of delivery"
                  : event.event_type.replaceAll("_", " "),
      createdAt: event.timestamp ?? new Date().toISOString(),
      id: event.event_id,
      note: liveTimelineNote(event),
      tone:
        event.event_type === "delivered"
          ? "success"
          : event.notes?.startsWith(LIVE_ISSUE_PREFIX)
            ? "warning"
            : "info",
    }));
}

function liveTimelineNote(event: TransportShipmentRead["events"][number]): string {
  const issue = parseLiveIssue(event);
  if (issue) {
    return issue.delayMinutes
      ? `${issue.description} Delay logged: ${issue.delayMinutes} minutes.`
      : issue.description;
  }
  if (event.notes?.startsWith(LIVE_PROOF_PREFIX)) {
    const proof = parseLiveProofNote(event.notes);
    return proof ? `Delivery confirmed by ${proof.recipientName}.` : "Delivery proof captured.";
  }
  return event.notes ?? `${event.event_type.replaceAll("_", " ")} recorded from the transport workspace.`;
}

function liveSlaState(
  load: TransportLoadRead,
  stage: ShipmentStage,
  issues: ShipmentIssue[],
  proofOfDelivery: NonNullable<TransportListingMetadata["proofOfDelivery"]> | null,
): ShipmentTrackingSnapshot["slaState"] {
  const deadline = new Date(`${load.delivery_deadline}T23:59:59.999Z`).getTime();
  const deliveredAt = proofOfDelivery ? new Date(proofOfDelivery.deliveredAt).getTime() : null;
  const hasHighSeverityBlocker = issues.some((issue) => issue.blocked && issue.severity === "high");
  const maxDelayMinutes = issues.reduce((largest, issue) => Math.max(largest, issue.delayMinutes ?? 0), 0);

  if (stage === "delivered") {
    return deliveredAt !== null && deliveredAt <= deadline ? "met" : "missed";
  }
  if (stage === "posted" || stage === "accepted") {
    return "scheduled";
  }
  if (hasHighSeverityBlocker || Date.now() > deadline) {
    return "breached";
  }
  if (maxDelayMinutes >= 90 || (deadline - Date.now()) / (1000 * 60 * 60) <= 6) {
    return "at_risk";
  }
  return "on_track";
}

async function resolveLiveShipmentResource(
  resourceId: string,
  traceId: string,
): Promise<{ load: TransportLoadRead; shipment: TransportShipmentRead | null } | null> {
  if (resourceId.startsWith("shipment-")) {
    const shipment = (await transportApi.getShipment(resourceId, traceId)).data;
    return { load: shipment.load, shipment };
  }

  const load = (await transportApi.getLoad(resourceId, traceId)).data;
  if (!load.shipment_id) {
    return { load, shipment: null };
  }
  const shipment = (await transportApi.getShipment(load.shipment_id, traceId)).data;
  return { load, shipment };
}

function buildLiveShipmentSnapshot(
  resolved: { load: TransportLoadRead; shipment: TransportShipmentRead | null },
  session: IdentitySession,
): ShipmentTrackingSnapshot {
  const routeLabel = `${resolved.load.origin_location} -> ${resolved.load.destination_location}`;
  const rateEstimate = computeRateEstimate({
    countryCode: resolved.load.country_code,
    destination: resolved.load.destination_location,
    pickupLocation: resolved.load.origin_location,
    weightTons: resolved.load.weight_tons,
  });

  if (!resolved.shipment) {
    return {
      budgetLabel: `${formatBudgetLabel(resolved.load.price_offer, resolved.load.price_currency)} corridor budget`,
      commodity: resolved.load.commodity,
      currentCheckpoint: "Load posted",
      currentLocationLabel: resolved.load.origin_location,
      deliveryDeadline: resolved.load.delivery_deadline,
      destination: resolved.load.destination_location,
      distanceKm: Math.max(1, Math.round(resolved.load.route.distance_km)),
      driver: null,
      etaLabel: humanizeStage("posted"),
      exceptionCount: 0,
      issueCount: 0,
      issues: [],
      lastUpdatedAt: resolved.load.updated_at ?? resolved.load.created_at ?? new Date().toISOString(),
      listing: null,
      podStatusLabel: "Not started",
      pickupLocation: resolved.load.origin_location,
      proofOfDelivery: null,
      rateEstimate,
      routeLabel,
      slaLabel: humanizeShipmentSlaState("scheduled"),
      slaState: "scheduled",
      stage: "posted",
      timeline: [
        {
          checkpoint: "Load posted",
          createdAt: resolved.load.created_at ?? new Date().toISOString(),
          id: `${resolved.load.load_id}-created`,
          note: "Verified transport request published to the logistics workspace.",
          tone: "info",
        },
      ],
      weightLabel: `${resolved.load.weight_tons} tonnes`,
    };
  }

  const shipment = resolved.shipment;
  const stage = liveShipmentStage(shipment);
  const issues = parseLiveIssues(shipment.events);
  const proofOfDelivery = parseLiveProof(shipment);
  const slaState = liveSlaState(resolved.load, stage, issues, proofOfDelivery);

  return {
    budgetLabel: `${formatBudgetLabel(resolved.load.price_offer, resolved.load.price_currency)} corridor budget`,
    commodity: resolved.load.commodity,
    currentCheckpoint: liveCurrentCheckpoint(shipment, stage),
    currentLocationLabel: liveCurrentLocationLabel(shipment, stage),
    deliveryDeadline: resolved.load.delivery_deadline,
    destination: resolved.load.destination_location,
    distanceKm: Math.max(1, Math.round(resolved.load.route.distance_km)),
    driver: {
      actorId: shipment.transporter_actor_id,
      availability: shipment.transporter_actor_id === session.actor.actor_id ? "busy" : "available",
      displayName:
        shipment.transporter_actor_id === session.actor.actor_id
          ? session.actor.display_name
          : actorDisplayName(shipment.transporter_actor_id),
      email:
        shipment.transporter_actor_id === session.actor.actor_id
          ? session.actor.email
          : `${shipment.transporter_actor_id}@agrodomain.local`,
      estimatedDistanceKm: 0,
      estimatedQuote: resolved.load.price_offer,
      rating: 4.6,
      routeLabel,
      vehicleLabel: String(shipment.vehicle_info.vehicle_label ?? shipment.vehicle_info.vehicle_type ?? "Verified carrier"),
    },
    etaLabel: stage === "delivered" ? "Delivered" : humanizeStage(stage),
    exceptionCount: issues.length,
    issueCount: issues.length,
    issues,
    lastUpdatedAt:
      [...shipment.events]
        .sort((left, right) => (right.timestamp ?? "").localeCompare(left.timestamp ?? ""))[0]?.timestamp ??
      resolved.load.updated_at ??
      resolved.load.created_at ??
      new Date().toISOString(),
    listing: null,
    podStatusLabel: proofOfDelivery ? "Proof captured" : stage === "in_transit" ? "Awaiting handoff proof" : "Not started",
    pickupLocation: resolved.load.origin_location,
    proofOfDelivery,
    rateEstimate,
    routeLabel,
    slaLabel: humanizeShipmentSlaState(slaState),
    slaState,
    stage,
    timeline: liveTimelineFromShipment(shipment),
    weightLabel: `${resolved.load.weight_tons} tonnes`,
  };
}

function currencyForCountry(countryCode: string): string {
  return countryCode === "NG" ? "NGN" : countryCode === "JM" ? "JMD" : "GHS";
}

function formatBudgetLabel(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
    style: "currency",
  }).format(amount);
}

function estimateDistance(routeLabel: string): number {
  return 80 + (Math.abs(routeLabel.split("").reduce((total, char) => total + char.charCodeAt(0), 0)) % 540);
}

function latestShipmentUpdateAt(metadata: TransportListingMetadata): string {
  const latestTimeline = metadata.updates.reduce(
    (latest, entry) => (entry.createdAt > latest ? entry.createdAt : latest),
    metadata.createdAt,
  );
  const proofTimestamp = metadata.proofOfDelivery?.deliveredAt ?? null;
  return proofTimestamp && proofTimestamp > latestTimeline ? proofTimestamp : latestTimeline;
}

function hydrateTransportMetadata(
  listingId: string,
  session: IdentitySession,
  stored: Partial<TransportListingMetadata>,
): TransportListingMetadata {
  return mergeTransportMetadata(
    {
      schema_version: schemaVersion,
      actor_id: session.actor.actor_id,
      commodity: stored.commodity ?? "Shipment",
      country_code: session.actor.country_code,
      created_at: stored.createdAt ?? new Date().toISOString(),
      has_unpublished_changes: false,
      listing_id: listingId,
      location: stored.pickupLocation ?? stored.currentLocationLabel ?? "Pickup location",
      price_amount: stored.budget ?? 0,
      price_currency: currencyForCountry(session.actor.country_code),
      published_at: stored.createdAt ?? new Date().toISOString(),
      published_revision_number: 1,
      quantity_tons: stored.weightTons ?? 0,
      revision_count: 1,
      revision_number: 1,
      status: "published",
      summary: stored.instructions?.trim() || "Transport shipment placeholder summary for the live route workspace.",
      title: stored.routeLabel ?? listingId,
      updated_at: new Date().toISOString(),
      view_scope: "owner",
    },
    stored,
  );
}

export { defaultPickupWindow, humanizeAvailability };
