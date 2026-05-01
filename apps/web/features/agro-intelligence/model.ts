import type {
  ActorRole,
  AgroIntelligenceEntityDetail,
  AgroIntelligenceEntitySummary,
  AgroIntelligenceQueueCollection,
  ConnectivityState,
  IdentitySession,
} from "@agrodomain/contracts";

export type BuyerDirectoryFilters = {
  buyerType: string;
  commodity: string;
  freshness: string;
  location: string;
  query: string;
  trustTier: string;
};

export type BuyerDirectoryView = "cards" | "compare" | "coverage";

export type AgroBadge = {
  label: string;
  tone: "online" | "offline" | "degraded" | "neutral";
};

export type AgroQuickAction = {
  href: string;
  label: string;
  tone: "primary" | "secondary" | "ghost";
};

export type AgroLandingContent = {
  body: string;
  primaryAction: AgroQuickAction;
  secondaryAction: AgroQuickAction;
  title: string;
};

export type CoverageBucket = {
  buyerCount: number;
  commoditySpread: string[];
  entityIds: string[];
  label: string;
  topBuyerName: string;
};

export type CompareField = {
  label: string;
  value: string;
};

export type QueueBucket = {
  id: "all" | "duplicates" | "stale" | "partner_imports" | "manual_review" | "new_records";
  items: AgroIntelligenceQueueCollection["items"];
  label: string;
};

const OPERATOR_ROLES = new Set<ActorRole>(["admin", "advisor", "finance", "cooperative"]);
const MULTI_SOURCE_MINIMUM = 2;

const LANDING_COPY: Record<ActorRole, AgroLandingContent> = {
  admin: {
    body: "Review the records that still need operator judgment, then keep the customer-facing buyer and partner views clear and credible.",
    primaryAction: { href: "/app/agro-intelligence/workspace", label: "Review records", tone: "primary" },
    secondaryAction: { href: "/app/agro-intelligence/buyers", label: "Open buyer directory", tone: "secondary" },
    title: "Keep partner intelligence fit for customer search",
  },
  advisor: {
    body: "Use buyer and processor records to ground advice, steer growers toward credible demand, and flag thin coverage before it misleads anyone.",
    primaryAction: { href: "/app/agro-intelligence/buyers", label: "Find buyers", tone: "primary" },
    secondaryAction: { href: "/app/agro-intelligence/workspace", label: "Review records", tone: "secondary" },
    title: "Find stronger demand-side matches before you advise",
  },
  buyer: {
    body: "Search trusted buyer, processor, and sourcing-network records by commodity and region, then move straight into outreach once the fit is clear.",
    primaryAction: { href: "/app/agro-intelligence/buyers", label: "Open buyer directory", tone: "primary" },
    secondaryAction: { href: "/app/market/listings", label: "Post demand", tone: "secondary" },
    title: "Filter credible sourcing targets first",
  },
  cooperative: {
    body: "Build shortlists of credible buyers, compare fit across commodities and regions, then move into outreach or internal review from one workspace.",
    primaryAction: { href: "/app/agro-intelligence/buyers", label: "Build shortlist", tone: "primary" },
    secondaryAction: { href: "/app/agro-intelligence/workspace", label: "Open review workspace", tone: "secondary" },
    title: "Turn partner records into a buyer shortlist",
  },
  extension_agent: {
    body: "Use the buyer directory to recommend credible offtakers and processors without pushing farmers toward weak or outdated records.",
    primaryAction: { href: "/app/agro-intelligence/buyers", label: "See buyers near me", tone: "primary" },
    secondaryAction: { href: "/app/advisory/new", label: "Ask AgroGuide", tone: "secondary" },
    title: "Guide farmers toward credible demand-side matches",
  },
  farmer: {
    body: "See nearby buyers and processors, understand what they handle, and decide whether to list publicly or pursue a direct match with more confidence.",
    primaryAction: { href: "/app/agro-intelligence/buyers", label: "See buyers near me", tone: "primary" },
    secondaryAction: { href: "/app/market/listings/create", label: "List my crop", tone: "secondary" },
    title: "Find stronger commercial matches nearby",
  },
  finance: {
    body: "Review which counterparties look recent, well-sourced, and commercially credible before finance or settlement workflows lean on them.",
    primaryAction: { href: "/app/agro-intelligence/workspace", label: "Review records", tone: "primary" },
    secondaryAction: { href: "/app/agro-intelligence/buyers", label: "Inspect buyers", tone: "secondary" },
    title: "Check commercial trust before money moves",
  },
  investor: {
    body: "Inspect active operators, coverage depth, and partner connections before you treat a region or counterparty cluster as commercially healthy.",
    primaryAction: { href: "/app/agro-intelligence/buyers", label: "Review verified entities", tone: "primary" },
    secondaryAction: { href: "/app/agro-intelligence/graph", label: "Explore network", tone: "secondary" },
    title: "See who is active, connected, and worth watching",
  },
  transporter: {
    body: "Use buyer and facility records to understand which demand points already have enough trust and relationship depth to justify route planning.",
    primaryAction: { href: "/app/agro-intelligence/buyers", label: "See route-linked buyers", tone: "primary" },
    secondaryAction: { href: "/app/trucker", label: "Open AgroTrucker", tone: "secondary" },
    title: "Start from the demand points with the clearest signals",
  },
};

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function includesNormalized(haystack: string, needle: string): boolean {
  return normalized(haystack).includes(normalized(needle));
}

function buyerTypeFromTags(tags: string[]): string {
  const lowered = tags.map((tag) => normalized(tag));
  if (lowered.includes("processor")) {
    return "processor";
  }
  if (lowered.includes("offtaker")) {
    return "offtaker";
  }
  if (lowered.includes("trader")) {
    return "trader";
  }
  return "buyer";
}

function locationLabel(entity: AgroIntelligenceEntitySummary): string {
  return entity.location_signature || "Location pending";
}

function scoreEntityForRole(entity: AgroIntelligenceEntitySummary, role: ActorRole): number {
  let score = entity.confidence_score;
  if (entity.trust_tier === "gold") {
    score += 18;
  } else if (entity.trust_tier === "silver") {
    score += 10;
  }
  if (entity.freshness_status === "fresh") {
    score += 12;
  } else if (entity.freshness_status === "watch") {
    score += 5;
  } else if (entity.freshness_status === "stale") {
    score -= 8;
  } else {
    score -= 16;
  }
  if (entity.source_document_count >= MULTI_SOURCE_MINIMUM) {
    score += 8;
  }
  if (role === "farmer" && entity.commodity_tags.length > 0) {
    score += 4;
  }
  if (role === "cooperative" && entity.source_document_count >= MULTI_SOURCE_MINIMUM) {
    score += 6;
  }
  if (isOperatorRole(role) && entity.pending_claim_count > 0) {
    score -= 4;
  }
  return score;
}

export function isOperatorRole(role: ActorRole): boolean {
  return OPERATOR_ROLES.has(role);
}

export function getAgroIntelligenceLanding(session: IdentitySession): AgroLandingContent {
  return LANDING_COPY[session.actor.role];
}

export function getCountryLabel(countryCode: string): string {
  return countryCode === "GH" ? "Ghana" : countryCode === "NG" ? "Nigeria" : countryCode;
}

export function getConnectivityLabel(state: ConnectivityState): string {
  if (state === "offline") {
    return "Needs signal to refresh";
  }
  if (state === "degraded") {
    return "Saved on this device";
  }
  return "Synced recently";
}

export function getFreshnessTone(status: AgroIntelligenceEntitySummary["freshness_status"]): AgroBadge["tone"] {
  if (status === "fresh") {
    return "online";
  }
  if (status === "watch") {
    return "neutral";
  }
  if (status === "stale") {
    return "degraded";
  }
  return "offline";
}

export function getTrustTone(trustTier: AgroIntelligenceEntitySummary["trust_tier"]): AgroBadge["tone"] {
  if (trustTier === "gold") {
    return "online";
  }
  if (trustTier === "silver") {
    return "neutral";
  }
  return "degraded";
}

export function getTrustLabel(entity: AgroIntelligenceEntitySummary): string {
  if (entity.trust_tier === "gold") {
    return "Trusted";
  }
  if (entity.trust_tier === "silver") {
    return "Verified";
  }
  return "Limited verification";
}

export function buildEntityBadges(
  entity: AgroIntelligenceEntitySummary,
  options?: { isDemo?: boolean },
): AgroBadge[] {
  const badges: AgroBadge[] = [
    {
      label: getTrustLabel(entity),
      tone: getTrustTone(entity.trust_tier),
    },
    {
      label:
        entity.freshness_status === "fresh"
          ? "Fresh"
          : entity.freshness_status === "watch"
            ? "Review soon"
            : entity.freshness_status === "stale"
              ? "Needs refresh"
              : "Expired",
      tone: getFreshnessTone(entity.freshness_status),
    },
  ];
  if (entity.source_document_count >= MULTI_SOURCE_MINIMUM) {
    badges.push({ label: "Multi-source", tone: "neutral" });
  }
  if (entity.source_tier === "A") {
    badges.push({ label: "Source checked", tone: "online" });
  }
  if (options?.isDemo) {
    badges.push({ label: "Demo data", tone: "degraded" });
  }
  return badges;
}

export function buildEntityReason(
  entity: AgroIntelligenceEntitySummary,
  role: ActorRole,
): string {
  const commodities = entity.commodity_tags.slice(0, 2).join(" and ");
  const location = locationLabel(entity);
  const buyerType = buyerTypeFromTags(entity.operator_tags);
  if (role === "farmer") {
    return `A useful match if you need a ${buyerType} in ${location}${commodities ? ` that handles ${commodities}` : ""}.`;
  }
  if (role === "cooperative") {
    return `A strong shortlist candidate in ${location}${commodities ? ` with ${commodities} demand` : ""} and enough supporting checks to compare confidently.`;
  }
  if (isOperatorRole(role)) {
    return `Use this record to decide whether ${entity.canonical_name} should stay visible in customer-facing search.`;
  }
  return `${entity.canonical_name} stands out for ${location}${commodities ? ` and current ${commodities} demand` : ""}.`;
}

export function filterBuyerEntities(
  entities: AgroIntelligenceEntitySummary[],
  filters: BuyerDirectoryFilters,
  role: ActorRole,
): AgroIntelligenceEntitySummary[] {
  const query = normalized(filters.query);
  const commodity = normalized(filters.commodity);
  const location = normalized(filters.location);
  const trustTier = normalized(filters.trustTier);
  const freshness = normalized(filters.freshness);
  const buyerType = normalized(filters.buyerType);

  return [...entities]
    .filter((entity) => {
      if (query) {
        const searchable = [
          entity.canonical_name,
          entity.location_signature,
          entity.commodity_tags.join(" "),
          entity.operator_tags.join(" "),
        ].join(" ");
        if (!includesNormalized(searchable, query)) {
          return false;
        }
      }
      if (commodity && !entity.commodity_tags.some((tag) => includesNormalized(tag, commodity))) {
        return false;
      }
      if (location && !includesNormalized(entity.location_signature, location)) {
        return false;
      }
      if (trustTier && entity.trust_tier !== trustTier) {
        return false;
      }
      if (freshness && entity.freshness_status !== freshness) {
        return false;
      }
      if (buyerType && buyerTypeFromTags(entity.operator_tags) !== buyerType) {
        return false;
      }
      return true;
    })
    .sort((left, right) => scoreEntityForRole(right, role) - scoreEntityForRole(left, role));
}

export function collectBuyerFilterOptions(entities: AgroIntelligenceEntitySummary[]): {
  buyerTypes: string[];
  commodities: string[];
  locations: string[];
} {
  const buyerTypes = new Set<string>();
  const commodities = new Set<string>();
  const locations = new Set<string>();

  entities.forEach((entity) => {
    buyerTypes.add(buyerTypeFromTags(entity.operator_tags));
    entity.commodity_tags.forEach((commodity) => commodities.add(commodity));
    if (entity.location_signature) {
      locations.add(entity.location_signature);
    }
  });

  return {
    buyerTypes: [...buyerTypes].sort(),
    commodities: [...commodities].sort(),
    locations: [...locations].sort(),
  };
}

export function buildCoverageBuckets(
  entities: AgroIntelligenceEntitySummary[],
): CoverageBucket[] {
  const byLocation = new Map<string, CoverageBucket>();
  entities.forEach((entity) => {
    const label = locationLabel(entity);
    const existing = byLocation.get(label);
    if (existing) {
      existing.buyerCount += 1;
      existing.entityIds.push(entity.entity_id);
      existing.commoditySpread = [...new Set([...existing.commoditySpread, ...entity.commodity_tags])].slice(0, 5);
      return;
    }
    byLocation.set(label, {
      buyerCount: 1,
      commoditySpread: entity.commodity_tags.slice(0, 5),
      entityIds: [entity.entity_id],
      label,
      topBuyerName: entity.canonical_name,
    });
  });
  return [...byLocation.values()].sort((left, right) => right.buyerCount - left.buyerCount);
}

export function buildCompareFields(entity: AgroIntelligenceEntitySummary): CompareField[] {
  return [
    { label: "Buyer type", value: buyerTypeFromTags(entity.operator_tags) },
    { label: "Location", value: locationLabel(entity) },
    { label: "Commodities", value: entity.commodity_tags.join(", ") || "Not tagged" },
    { label: "Trust level", value: getTrustLabel(entity) },
    { label: "Recent check", value: entity.freshness_status.replaceAll("_", " ") },
    {
      label: "Verification sources",
      value: `${entity.source_document_count} source record${entity.source_document_count === 1 ? "" : "s"}`,
    },
  ];
}

export function isDemoSession(session: IdentitySession | null): boolean {
  return Boolean(session?.workspace?.is_demo_tenant);
}

export function getWorkspaceBuckets(
  queue: AgroIntelligenceQueueCollection | null,
): QueueBucket[] {
  const items = queue?.items ?? [];
  return [
    { id: "all", label: "All records", items },
    {
      id: "new_records",
      label: "New records",
      items: items.filter((item) => item.reasons.includes("low_confidence_score")),
    },
    {
      id: "duplicates",
      label: "Duplicates",
      items: items.filter((item) => item.reasons.includes("ambiguous_duplicate_candidate")),
    },
    {
      id: "stale",
      label: "Stale records",
      items: items.filter((item) => item.reasons.some((reason) => reason.startsWith("freshness_"))),
    },
    {
      id: "partner_imports",
      label: "Partner imports",
      items: items.filter((item) => item.reasons.includes("pending_rule_claim")),
    },
    {
      id: "manual_review",
      label: "Manual review",
      items: items.filter(
        (item) =>
          item.reasons.includes("pending_rule_claim") ||
          item.reasons.includes("ambiguous_duplicate_candidate"),
      ),
    },
  ];
}

export function humanizeQueueReason(reason: string): string {
  if (reason === "ambiguous_duplicate_candidate") {
    return "Possible duplicate";
  }
  if (reason === "low_confidence_score") {
    return "Needs closer review";
  }
  if (reason === "pending_rule_claim") {
    return "Imported claim to review";
  }
  if (reason === "freshness_watch") {
    return "Review soon";
  }
  if (reason === "freshness_stale") {
    return "Stale record";
  }
  if (reason === "freshness_expired") {
    return "Verification expired";
  }
  return reason.replaceAll("_", " ");
}

export function shortlistStorageKey(countryCode: string): string {
  return `agrodomain.agro-intelligence.shortlist.${countryCode.toLowerCase()}`;
}

export function readShortlist(countryCode: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(shortlistStorageKey(countryCode));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writeShortlist(countryCode: string, entityIds: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(shortlistStorageKey(countryCode), JSON.stringify(entityIds));
}

export function toggleShortlistItem(current: string[], entityId: string): string[] {
  if (current.includes(entityId)) {
    return current.filter((item) => item !== entityId);
  }
  return [...current, entityId];
}

export function buildDetailActionHref(
  entity: AgroIntelligenceEntityDetail,
  action: "listing" | "guide",
): string {
  if (action === "listing") {
    const buyerHint = encodeURIComponent(entity.canonical_name);
    return `/app/market/listings/create?buyer=${buyerHint}`;
  }
  const prompt = encodeURIComponent(`Does ${entity.canonical_name} fit my supply right now?`);
  return `/app/advisory/new?prompt=${prompt}`;
}
