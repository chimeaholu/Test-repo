import type { IdentitySession, ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";

import { identityApi } from "@/lib/api/identity";
import { marketplaceApi } from "@/lib/api/marketplace";
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
  deriveShipmentStage,
  humanizeAvailability,
  humanizeStage,
  mergeTransportMetadata,
  type ShipmentTrackingSnapshot,
  type ShipmentStage,
  type TransportDriverProfile,
  type TransportListingMetadata,
  type TransportLoadCard,
  type TransportMetadataInput,
  type TransportShipmentCard,
  type TruckerAvailability,
  type TruckerMarketplaceRole,
} from "@/features/trucker/model";

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

    return {
      budgetLabel: `${formatBudgetLabel(shipment.metadata.budget, shipment.listing.price_currency)} corridor budget`,
      commodity: shipment.listing.commodity,
      currentCheckpoint: shipment.metadata.currentCheckpoint,
      currentLocationLabel: shipment.metadata.currentLocationLabel,
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
      etaLabel: shipment.stage === "delivered" ? "Delivered" : humanizeStage(shipment.stage),
      issueCount: shipment.metadata.issueCount,
      listing: shipment.listing,
      pickupLocation: shipment.metadata.pickupLocation,
      proofOfDelivery: shipment.metadata.proofOfDelivery,
      rateEstimate: shipment.metadata.rateEstimate,
      routeLabel: shipment.metadata.routeLabel,
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
      destination: input.destination,
      driverRequestIds: [],
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

    return { listingId: createResponse.data.listing.listing_id };
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

  acceptLoad(listingId: string, session: IdentitySession): void {
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
  },

  updateShipmentStage(listingId: string, stage: Exclude<ShipmentStage, "posted">, note?: string): void {
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
          note: note?.trim() || `${humanizeStage(stage)} recorded from the transport workspace.`,
          tone: stage === "delivered" ? "success" : "info",
        },
      ],
    };
    writeStore(store);
  },

  reportIssue(listingId: string, issue: { description: string; type: string }): void {
    const store = readStore();
    const existing = store.loads[listingId] ?? {};
    store.loads[listingId] = {
      ...existing,
      issueCount: (existing.issueCount ?? 0) + 1,
      updates: [
        ...(existing.updates ?? []),
        {
          checkpoint: issue.type,
          createdAt: new Date().toISOString(),
          id: `${listingId}-issue-${Date.now()}`,
          note: issue.description,
          tone: "warning",
        },
      ],
    };
    writeStore(store);
  },

  completeDelivery(
    listingId: string,
    input: { photoName: string | null; recipientName: string; signaturePoints: Array<{ x: number; y: number }> },
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
    return proofOfDelivery;
  },
};

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

export { defaultPickupWindow, humanizeAvailability };
