import type { ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";

import type { EscrowRead } from "@/lib/api-types";

export type TruckerMarketplaceRole = "shipper" | "driver";
export type TruckerAvailability = "available" | "busy" | "offline";
export type ShipmentStage = "posted" | "accepted" | "picked_up" | "in_transit" | "delivered";
export type ShipmentIssueSeverity = "low" | "medium" | "high";
export type ShipmentSlaState = "scheduled" | "on_track" | "at_risk" | "breached" | "met" | "missed";

export interface TransportRateEstimate {
  max: number;
  min: number;
}

export interface TransportMetadataInput {
  budget: number;
  commodity: string;
  deliveryDeadline: string;
  destination: string;
  instructions: string;
  itemCount: number;
  pickupDate: string;
  pickupLocation: string;
  pickupWindow: string;
  weightTons: number;
}

export interface TransportListingMetadata extends TransportMetadataInput {
  acceptedDriverId: string | null;
  createdAt: string;
  currentCheckpoint: string;
  currentLocationLabel: string;
  driverRequestIds: string[];
  issues: ShipmentIssue[];
  issueCount: number;
  listingId: string;
  proofOfDelivery: {
    deliveredAt: string;
    photoName: string | null;
    recipientName: string;
    signaturePoints: Array<{ x: number; y: number }>;
  } | null;
  rateEstimate: TransportRateEstimate;
  routeLabel: string;
  stage: ShipmentStage;
  updates: TruckerTimelineEntry[];
}

export interface TransportDriverProfile {
  actorId: string;
  availability: TruckerAvailability;
  displayName: string;
  email: string;
  estimatedDistanceKm: number;
  estimatedQuote: number;
  rating: number;
  routeLabel: string;
  vehicleLabel: string;
}

export interface TransportShipmentCard {
  commodity: string;
  currentCheckpoint: string;
  currentLocationLabel: string;
  etaLabel: string;
  id: string;
  payLabel: string;
  stage: ShipmentStage;
  stageLabel: string;
  subtitle: string;
  title: string;
  trackHref: string;
  weightLabel: string;
}

export interface TransportLoadCard {
  commodity: string;
  distanceLabel: string;
  id: string;
  pickupLabel: string;
  posterName: string;
  priceLabel: string;
  routeLabel: string;
  title: string;
  weightLabel: string;
}

export interface TruckerTimelineEntry {
  checkpoint: string;
  createdAt: string;
  id: string;
  note: string;
  tone: "info" | "warning" | "success";
}

export interface ShipmentIssue {
  blocked: boolean;
  delayMinutes: number | null;
  description: string;
  id: string;
  reportedAt: string;
  severity: ShipmentIssueSeverity;
  type: string;
}

export interface ShipmentTrackingSnapshot {
  budgetLabel: string;
  commodity: string;
  currentCheckpoint: string;
  currentLocationLabel: string;
  deliveryDeadline: string;
  destination: string;
  distanceKm: number;
  driver: TransportDriverProfile | null;
  etaLabel: string;
  exceptionCount: number;
  issueCount: number;
  issues: ShipmentIssue[];
  lastUpdatedAt: string;
  listing: ListingRecord | null;
  podStatusLabel: string;
  pickupLocation: string;
  proofOfDelivery: TransportListingMetadata["proofOfDelivery"];
  rateEstimate: TransportRateEstimate;
  routeLabel: string;
  slaLabel: string;
  slaState: ShipmentSlaState;
  stage: ShipmentStage;
  timeline: TruckerTimelineEntry[];
  weightLabel: string;
}

const corridorByCountry: Record<string, string[]> = {
  GH: ["Accra", "Tema", "Kumasi", "Techiman", "Tamale", "Bolgatanga"],
  JM: ["Kingston", "Montego Bay", "Mandeville", "May Pen"],
  NG: ["Lagos", "Ibadan", "Abuja", "Kano", "Kaduna", "Port Harcourt"],
};

const pickupWindows = [
  "Morning (6am-12pm)",
  "Afternoon (12pm-6pm)",
  "Evening (6pm-10pm)",
  "Any Time",
] as const;

const vehicleOptions = [
  "Kia Rhino 5t",
  "Hyundai HD72 3.5t",
  "Toyota Dyna 2.5t",
  "Mitsubishi Fuso 7t",
] as const;

const checkpointTemplates = [
  "Loading bay confirmed",
  "Northbound corridor checkpoint",
  "Mid-route weighbridge",
  "Final urban handoff",
  "Delivery bay",
] as const;

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount)}`;
}

export function formatRelativeEta(stage: ShipmentStage, updatedAt: string): string {
  if (stage === "delivered") {
    return "Delivered";
  }

  const ageHours = Math.max(1, Math.round((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60)));
  if (stage === "accepted") {
    return `ETA: ${Math.max(2, 6 - Math.min(ageHours, 3))} hours`;
  }
  if (stage === "picked_up") {
    return `ETA: ${Math.max(2, 5 - Math.min(ageHours, 2))} hours`;
  }
  if (stage === "in_transit") {
    return `ETA: ${Math.max(1, 4 - Math.min(ageHours, 3))} hours`;
  }
  return "ETA: route not confirmed";
}

export function humanizeStage(stage: ShipmentStage): string {
  return {
    posted: "Posted",
    accepted: "Driver matched",
    picked_up: "Picked up",
    in_transit: "In transit",
    delivered: "Delivered",
  }[stage];
}

export function humanizeAvailability(status: TruckerAvailability): string {
  return {
    available: "Available",
    busy: "Busy",
    offline: "Offline",
  }[status];
}

export function humanizeShipmentSlaState(state: ShipmentSlaState): string {
  return {
    scheduled: "Scheduled",
    on_track: "On track",
    at_risk: "At risk",
    breached: "Breached",
    met: "Met SLA",
    missed: "Missed SLA",
  }[state];
}

export function defaultPickupWindow(): (typeof pickupWindows)[number] {
  return pickupWindows[0];
}

export function hashNumber(input: string): number {
  return Array.from(input).reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) | 0, 0);
}

export function normalizeRoute(input: { countryCode: string; destination?: string | null; pickupLocation: string }): string {
  const hubs = corridorByCountry[input.countryCode] ?? corridorByCountry.GH;
  const pickup = input.pickupLocation.trim() || hubs[0];
  if (input.destination?.trim()) {
    return `${pickup} -> ${input.destination.trim()}`;
  }
  const nextHub = hubs[Math.abs(hashNumber(pickup)) % hubs.length] ?? hubs[0];
  const destination = nextHub === pickup ? hubs[(Math.abs(hashNumber(pickup)) + 1) % hubs.length] : nextHub;
  return `${pickup} -> ${destination}`;
}

export function computeRateEstimate(params: {
  countryCode: string;
  destination: string;
  pickupLocation: string;
  weightTons: number;
}): TransportRateEstimate {
  const route = normalizeRoute({
    countryCode: params.countryCode,
    destination: params.destination,
    pickupLocation: params.pickupLocation,
  });
  const corridorDistance = 120 + (Math.abs(hashNumber(route)) % 520);
  const base = corridorDistance * 1.55 + Math.max(1, params.weightTons) * 120;
  const rounded = Math.round(base / 10) * 10;
  return {
    min: Math.max(200, rounded - 120),
    max: rounded + 220,
  };
}

export function estimateDistanceKm(routeLabel: string, actorId: string): number {
  return 3 + (Math.abs(hashNumber(`${routeLabel}:${actorId}`)) % 37);
}

export function estimateRating(actorId: string): number {
  return Number((4.2 + (Math.abs(hashNumber(actorId)) % 7) * 0.1).toFixed(1));
}

export function estimateVehicle(actorId: string): string {
  return vehicleOptions[Math.abs(hashNumber(actorId)) % vehicleOptions.length] ?? vehicleOptions[0];
}

export function defaultTransportMetadata(listing: ListingRecord): TransportListingMetadata {
  const routeLabel = normalizeRoute({
    countryCode: listing.country_code,
    pickupLocation: listing.location,
    destination: null,
  });
  const [pickupLocation, destination] = routeLabel.split(" -> ");
  const rateEstimate = computeRateEstimate({
    countryCode: listing.country_code,
    destination,
    pickupLocation,
    weightTons: listing.quantity_tons,
  });

  return {
    acceptedDriverId: null,
    budget: listing.price_amount,
    commodity: listing.commodity,
    createdAt: listing.published_at ?? listing.updated_at ?? listing.created_at,
    currentCheckpoint: checkpointTemplates[0],
    currentLocationLabel: pickupLocation,
    deliveryDeadline: new Date(new Date(listing.created_at).getTime() + 36 * 60 * 60 * 1000).toISOString().slice(0, 10),
    destination,
    driverRequestIds: [],
    issues: [],
    instructions: listing.summary,
    issueCount: 0,
    itemCount: Math.max(10, Math.round(listing.quantity_tons * 10)),
    listingId: listing.listing_id,
    pickupDate: listing.published_at?.slice(0, 10) ?? listing.created_at.slice(0, 10),
    pickupLocation,
    pickupWindow: defaultPickupWindow(),
    proofOfDelivery: null,
    rateEstimate,
    routeLabel,
    stage: "posted",
    updates: [
      {
        checkpoint: checkpointTemplates[0],
        createdAt: listing.published_at ?? listing.created_at,
        id: `${listing.listing_id}-posted`,
        note: "Load posted to the logistics network and ready for verified carrier matching.",
        tone: "info",
      },
    ],
    weightTons: listing.quantity_tons,
  };
}

export function mergeTransportMetadata(
  listing: ListingRecord,
  stored: Partial<TransportListingMetadata> | null | undefined,
): TransportListingMetadata {
  const base = defaultTransportMetadata(listing);
  if (!stored) {
    return base;
  }

  return {
    ...base,
    ...stored,
    acceptedDriverId: stored.acceptedDriverId ?? base.acceptedDriverId,
    currentCheckpoint: stored.currentCheckpoint ?? base.currentCheckpoint,
    currentLocationLabel: stored.currentLocationLabel ?? base.currentLocationLabel,
    deliveryDeadline: stored.deliveryDeadline ?? base.deliveryDeadline,
    destination: stored.destination?.trim() || base.destination,
    driverRequestIds: stored.driverRequestIds ?? base.driverRequestIds,
    issues: stored.issues ?? base.issues,
    issueCount: stored.issueCount ?? base.issueCount,
    proofOfDelivery: stored.proofOfDelivery ?? base.proofOfDelivery,
    rateEstimate: stored.rateEstimate ?? base.rateEstimate,
    routeLabel: stored.routeLabel?.trim() || base.routeLabel,
    updates: stored.updates?.length ? stored.updates : base.updates,
  };
}

export function deriveShipmentStage(params: {
  escrow?: EscrowRead | null;
  metadata: TransportListingMetadata;
  negotiations: NegotiationThreadRead[];
}): ShipmentStage {
  if (params.metadata.proofOfDelivery) {
    return "delivered";
  }
  if (params.escrow?.released_at || params.escrow?.state === "released") {
    return "delivered";
  }
  if (params.metadata.stage === "in_transit" || params.metadata.stage === "picked_up") {
    return params.metadata.stage;
  }
  if (params.escrow?.funded_at || params.escrow?.state === "funded" || params.metadata.stage === "accepted") {
    return "accepted";
  }
  if (params.negotiations.some((thread) => thread.status === "accepted")) {
    return "accepted";
  }
  return params.metadata.stage;
}

export function deriveShipmentSlaState(params: {
  metadata: TransportListingMetadata;
  stage: ShipmentStage;
  now?: number;
}): ShipmentSlaState {
  const now = params.now ?? Date.now();
  const deadline = new Date(`${params.metadata.deliveryDeadline}T23:59:59.999Z`).getTime();
  const deliveredAt = params.metadata.proofOfDelivery
    ? new Date(params.metadata.proofOfDelivery.deliveredAt).getTime()
    : null;
  const maxDelayMinutes = params.metadata.issues.reduce((largest, issue) => Math.max(largest, issue.delayMinutes ?? 0), 0);
  const hasHighSeverityBlocker = params.metadata.issues.some((issue) => issue.blocked && issue.severity === "high");

  if (params.stage === "delivered") {
    if (deliveredAt !== null && Number.isFinite(deadline) && deliveredAt <= deadline) {
      return "met";
    }
    return "missed";
  }

  if (params.stage === "posted" || params.stage === "accepted") {
    return "scheduled";
  }

  if (!Number.isFinite(deadline)) {
    return hasHighSeverityBlocker ? "breached" : "on_track";
  }

  if (hasHighSeverityBlocker || now > deadline) {
    return "breached";
  }

  const hoursToDeadline = (deadline - now) / (1000 * 60 * 60);
  if (maxDelayMinutes >= 90 || hoursToDeadline <= 6) {
    return "at_risk";
  }

  return maxDelayMinutes > 0 ? "at_risk" : "on_track";
}

export function buildShipmentTimeline(params: {
  escrow?: EscrowRead | null;
  listing: ListingRecord;
  metadata: TransportListingMetadata;
  negotiations: NegotiationThreadRead[];
}): TruckerTimelineEntry[] {
  const liveEntries = (params.escrow?.timeline ?? []).map((entry) => ({
    checkpoint: entry.transition.replaceAll("_", " "),
    createdAt: entry.created_at,
    id: entry.idempotency_key,
    note: entry.note ?? `Settlement moved to ${entry.state.replaceAll("_", " ")}.`,
    tone: entry.state === "released" ? ("success" as const) : ("info" as const),
  }));

  const negotiationEntries = params.negotiations.map((thread) => ({
    checkpoint: thread.status.replaceAll("_", " "),
    createdAt: thread.last_action_at,
    id: thread.thread_id,
    note: `Negotiation settled at ${formatMoney(thread.current_offer_amount, thread.current_offer_currency)}.`,
    tone: thread.status === "accepted" ? ("success" as const) : ("warning" as const),
  }));

  return [...params.metadata.updates, ...negotiationEntries, ...liveEntries].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function buildDriverProfile(params: {
  actorId: string;
  availability: TruckerAvailability;
  displayName: string;
  email: string;
  metadata: TransportListingMetadata;
}): TransportDriverProfile {
  const routeLabel = params.metadata.routeLabel;
  const quoteBase = params.metadata.rateEstimate.min + (Math.abs(hashNumber(params.actorId)) % 180);

  return {
    actorId: params.actorId,
    availability: params.availability,
    displayName: params.displayName,
    email: params.email,
    estimatedDistanceKm: estimateDistanceKm(routeLabel, params.actorId),
    estimatedQuote: quoteBase,
    rating: estimateRating(params.actorId),
    routeLabel,
    vehicleLabel: estimateVehicle(params.actorId),
  };
}

export function buildShipmentCard(params: {
  listing: ListingRecord;
  metadata: TransportListingMetadata;
  stage: ShipmentStage;
  priceAmount: number;
  priceCurrency: string;
}): TransportShipmentCard {
  return {
    commodity: params.listing.commodity,
    currentCheckpoint: params.metadata.currentCheckpoint,
    currentLocationLabel: params.metadata.currentLocationLabel,
    etaLabel: formatRelativeEta(params.stage, params.listing.updated_at),
    id: params.listing.listing_id,
    payLabel: formatMoney(params.priceAmount, params.priceCurrency),
    stage: params.stage,
    stageLabel: humanizeStage(params.stage),
    subtitle: `${params.metadata.pickupLocation} to ${params.metadata.destination}`,
    title: params.metadata.routeLabel,
    trackHref: `/app/trucker/shipments/${params.listing.listing_id}`,
    weightLabel: `${params.metadata.weightTons} tonnes`,
  };
}

export function buildLoadCard(params: {
  listing: ListingRecord;
  metadata: TransportListingMetadata;
  posterName: string;
}): TransportLoadCard {
  return {
    commodity: params.listing.commodity,
    distanceLabel: `${estimateDistanceKm(params.metadata.routeLabel, params.listing.listing_id)} km from you`,
    id: params.listing.listing_id,
    pickupLabel: `${params.metadata.pickupDate} · ${params.metadata.pickupWindow}`,
    posterName: params.posterName,
    priceLabel: formatMoney(params.metadata.budget, params.listing.price_currency),
    routeLabel: params.metadata.routeLabel,
    title: `${params.metadata.pickupLocation} to ${params.metadata.destination}`,
    weightLabel: `${params.metadata.weightTons} tonnes`,
  };
}

export function listingStatusTone(stage: ShipmentStage): "online" | "degraded" | "neutral" {
  if (stage === "delivered") {
    return "online";
  }
  if (stage === "accepted" || stage === "picked_up" || stage === "in_transit") {
    return "degraded";
  }
  return "neutral";
}
