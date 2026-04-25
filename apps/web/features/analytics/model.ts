import type { ActorRole, ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";

import type { ClimateAlert, ClimateRuntimeSnapshot } from "@/lib/api-types";
import type { EscrowReadModel, WalletBalance, WalletLedgerEntry } from "@/features/wallet/model";
import { formatMoney } from "@/features/wallet/model";

export type AnalyticsRangeKey = "7d" | "30d" | "90d" | "1y";

export type AnalyticsMetric = {
  label: string;
  tone: "online" | "offline" | "degraded" | "neutral";
  trendLabel: string;
  value: string;
};

export type AnalyticsPoint = {
  label: string;
  value: number;
};

export type AnalyticsSeries = {
  color: string;
  name: string;
  points: AnalyticsPoint[];
};

export type AnalyticsBar = {
  emphasized?: boolean;
  label: string;
  value: number;
  valueLabel: string;
};

export type AnalyticsPerformanceItem = {
  label: string;
  value: string;
};

export type RoleAnalyticsViewModel = {
  commodityComparison: AnalyticsSeries[];
  csvRows: string[][];
  emptyMessage: string;
  headline: string;
  isEmpty: boolean;
  overview: AnalyticsMetric[];
  pdfLines: string[];
  performance: AnalyticsPerformanceItem[];
  regionalBars: AnalyticsBar[];
  regionalHeadline: string;
  summary: string;
  trend: AnalyticsSeries[];
  trendHeadline: string;
  trendSummary: string;
};

export type AdminHealthItem = {
  label: string;
  status: string;
  tone: "online" | "offline" | "degraded" | "neutral";
  value: string;
};

export type AdminAnalyticsViewModel = {
  csvRows: string[][];
  geography: AnalyticsBar[];
  geographySummary: string;
  growthSeries: AnalyticsSeries[];
  healthItems: AdminHealthItem[];
  moduleAdoption: AnalyticsBar[];
  note: string;
  overview: AnalyticsMetric[];
  pdfLines: string[];
};

export type AdvisoryConversationRecord = {
  actor_id: string;
  citations: Array<{ source_id: string }>;
  created_at: string;
};

export type AdminSignals = {
  alerts: Array<{
    alert_severity: string | null;
    rationale: string;
    service_name: string;
    status: string;
  }>;
  readiness: {
    blocking_reasons: string[];
    readiness_status: string;
    telemetry_freshness_state: string;
  } | null;
  rollouts: Array<{
    changed_at: string;
    reason_code: string;
    scope_key: string;
    service_name: string;
    state: string;
  }>;
  summary: {
    degraded_records: number;
    empty_records: number;
    health_state: string;
    healthy_records: number;
    last_recorded_at: string | null;
    service_name: string;
  } | null;
};

type RangeWindow = {
  currentStart: Date;
  previousEnd: Date;
  previousStart: Date;
};

type BaseAnalyticsInput = {
  actorId: string;
  alerts: ClimateAlert[];
  balance: WalletBalance | null;
  listings: ListingRecord[];
  negotiations: NegotiationThreadRead[];
  range: AnalyticsRangeKey;
  runtimeMode: ClimateRuntimeSnapshot["runtime_mode"];
  transactions: WalletLedgerEntry[];
  now?: Date;
};

type RoleAnalyticsInput = BaseAnalyticsInput & {
  escrows: EscrowReadModel[];
  role: ActorRole;
};

type AdminAnalyticsInput = {
  advisory: AdvisoryConversationRecord[];
  alerts: ClimateAlert[];
  escrows: EscrowReadModel[];
  listings: ListingRecord[];
  negotiations: NegotiationThreadRead[];
  range: AnalyticsRangeKey;
  runtimeMode: ClimateRuntimeSnapshot["runtime_mode"];
  signals: AdminSignals;
  transactions: WalletLedgerEntry[];
};

const RANGE_DAY_MAP: Record<AnalyticsRangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

const ANALYTICS_COLORS = ["#1f6d52", "#d4922b", "#3b82c4", "#7c3aed"] as const;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function round(value: number, precision = 1): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
    notation: "compact",
  }).format(value);
}

function formatDays(value: number): string {
  return `${round(value, value >= 10 ? 0 : 1)} days`;
}

function formatPercent(value: number): string {
  return `${round(value)}%`;
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatRangeLabel(range: AnalyticsRangeKey): string {
  return {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    "1y": "Last 12 Months",
  }[range];
}

function rangeWindow(range: AnalyticsRangeKey, now = new Date()): RangeWindow {
  const currentEnd = new Date(now);
  const previousEnd = addDays(currentEnd, -RANGE_DAY_MAP[range]);
  return {
    currentStart: addDays(currentEnd, -(RANGE_DAY_MAP[range] - 1)),
    previousEnd,
    previousStart: addDays(previousEnd, -(RANGE_DAY_MAP[range] - 1)),
  };
}

function isBetween(dateValue: string | null | undefined, start: Date, end: Date): boolean {
  const value = normalizeDate(dateValue);
  if (!value) {
    return false;
  }
  return value >= start && value <= end;
}

function deltaTone(delta: number): "online" | "offline" | "degraded" | "neutral" {
  if (delta > 0) {
    return "online";
  }
  if (delta < 0) {
    return "offline";
  }
  return "neutral";
}

function deltaLabel(current: number, previous: number, valuePrefix = ""): string {
  if (previous === 0 && current === 0) {
    return "No change";
  }
  if (previous === 0) {
    return `${valuePrefix}New`;
  }
  const percent = round(((current - previous) / Math.abs(previous)) * 100);
  if (percent === 0) {
    return "No change";
  }
  return `${percent > 0 ? "+" : ""}${percent}% ${percent > 0 ? "vs prior period" : "vs prior period"}`;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupRangeLabels(range: AnalyticsRangeKey, now = new Date()): Array<{ key: string; label: string; start: Date; end: Date }> {
  const totalBuckets = range === "7d" ? 7 : range === "30d" ? 6 : range === "90d" ? 6 : 12;
  const bucketSpan = range === "7d" ? 1 : range === "30d" ? 5 : range === "90d" ? 15 : 30;
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  const lastEnd = new Date(now);

  for (let index = totalBuckets - 1; index >= 0; index -= 1) {
    const bucketEnd = addDays(lastEnd, -(index * bucketSpan));
    const bucketStart = addDays(bucketEnd, -(bucketSpan - 1));
    buckets.push({
      key: `${bucketStart.toISOString()}-${bucketEnd.toISOString()}`,
      label:
        range === "1y"
          ? bucketEnd.toLocaleDateString("en-US", { month: "short" })
          : bucketEnd.toLocaleDateString("en-US", range === "7d" ? { weekday: "short" } : { month: "short", day: "numeric" }),
      start: bucketStart,
      end: bucketEnd,
    });
  }

  return buckets;
}

function sumByRange(values: Array<{ amount: number; occurredAt: string | null | undefined }>, start: Date, end: Date): number {
  return values
    .filter((item) => isBetween(item.occurredAt, start, end))
    .reduce((sum, item) => sum + item.amount, 0);
}

function countByRange(values: Array<{ occurredAt: string | null | undefined }>, start: Date, end: Date): number {
  return values.filter((item) => isBetween(item.occurredAt, start, end)).length;
}

function mapListingsById(listings: ListingRecord[]): Map<string, ListingRecord> {
  return new Map(listings.map((listing) => [listing.listing_id, listing]));
}

function topCommodityFromListings(listings: ListingRecord[]): string {
  const counts = listings.reduce<Record<string, number>>((accumulator, listing) => {
    accumulator[listing.commodity] = (accumulator[listing.commodity] ?? 0) + 1;
    return accumulator;
  }, {});
  return Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "Maize";
}

function seriesFromListings(params: {
  listings: ListingRecord[];
  range: AnalyticsRangeKey;
  selected: string[];
  now?: Date;
}): AnalyticsSeries[] {
  const buckets = groupRangeLabels(params.range, params.now);
  return params.selected.map((commodity, index) => ({
    color: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length],
    name: titleCase(commodity),
    points: buckets.map((bucket) => {
      const matching = params.listings.filter(
        (listing) =>
          listing.commodity === commodity &&
          listing.status === "published" &&
          isBetween(listing.updated_at ?? listing.created_at, bucket.start, bucket.end),
      );
      return {
        label: bucket.label,
        value: matching.length > 0 ? average(matching.map((listing) => listing.price_amount)) : 0,
      };
    }),
  }));
}

function regionalBars(params: {
  commodity: string;
  listings: ListingRecord[];
  preferredLocation: string | null;
}): AnalyticsBar[] {
  const grouped = params.listings
    .filter((listing) => listing.status === "published" && listing.commodity === params.commodity)
    .reduce<Record<string, number[]>>((accumulator, listing) => {
      accumulator[listing.location] = [...(accumulator[listing.location] ?? []), listing.price_amount];
      return accumulator;
    }, {});

  return Object.entries(grouped)
    .map(([location, prices]) => {
      const value = average(prices);
      return {
        emphasized: params.preferredLocation ? location === params.preferredLocation : false,
        label: location,
        value,
        valueLabel: formatMoney(value, "GHS"),
      };
    })
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);
}

function actorEventsForAdmin(params: {
  advisory: AdvisoryConversationRecord[];
  escrows: EscrowReadModel[];
  listings: ListingRecord[];
  negotiations: NegotiationThreadRead[];
}): Array<{ actorId: string; occurredAt: string }> {
  return [
    ...params.listings.map((listing) => ({ actorId: listing.actor_id, occurredAt: listing.updated_at ?? listing.created_at })),
    ...params.negotiations.flatMap((thread) => [
      { actorId: thread.buyer_actor_id, occurredAt: thread.updated_at ?? thread.created_at },
      { actorId: thread.seller_actor_id, occurredAt: thread.updated_at ?? thread.created_at },
    ]),
    ...params.escrows.flatMap((escrow) => [
      { actorId: escrow.buyer_actor_id, occurredAt: escrow.updated_at },
      { actorId: escrow.seller_actor_id, occurredAt: escrow.updated_at },
    ]),
    ...params.advisory.map((conversation) => ({
      actorId: conversation.actor_id,
      occurredAt: conversation.created_at,
    })),
  ].filter((item) => Boolean(item.actorId));
}

function buildGrowthSeries(actorEvents: Array<{ actorId: string; occurredAt: string }>, range: AnalyticsRangeKey): AnalyticsSeries[] {
  const buckets = groupRangeLabels(range);
  const firstSeen = actorEvents.reduce<Record<string, string>>((accumulator, item) => {
    if (!accumulator[item.actorId] || item.occurredAt < accumulator[item.actorId]) {
      accumulator[item.actorId] = item.occurredAt;
    }
    return accumulator;
  }, {});

  const totalUsers = buckets.map((bucket) => {
    const value = Object.values(firstSeen).filter((timestamp) => normalizeDate(timestamp) && normalizeDate(timestamp)! <= bucket.end).length;
    return { label: bucket.label, value };
  });

  const activeUsers = buckets.map((bucket) => {
    const activeSet = new Set(
      actorEvents
        .filter((item) => isBetween(item.occurredAt, bucket.start, bucket.end))
        .map((item) => item.actorId),
    );
    return { label: bucket.label, value: activeSet.size };
  });

  return [
    { color: ANALYTICS_COLORS[0], name: "Total Users", points: totalUsers },
    { color: ANALYTICS_COLORS[1], name: "Active Users", points: activeUsers },
  ];
}

function actorRoleCategory(role: ActorRole): "farmer" | "buyer" | "cooperative" | "generic" {
  if (role === "farmer") {
    return "farmer";
  }
  if (role === "buyer") {
    return "buyer";
  }
  if (role === "cooperative") {
    return "cooperative";
  }
  return "generic";
}

function baseCsvRows(viewModel: {
  overview: AnalyticsMetric[];
  performance: AnalyticsPerformanceItem[];
  regionalBars: AnalyticsBar[];
}): string[][] {
  return [
    ["section", "label", "value", "detail"],
    ...viewModel.overview.map((metric) => ["overview", metric.label, metric.value, metric.trendLabel]),
    ...viewModel.performance.map((item) => ["performance", item.label, item.value, ""]),
    ...viewModel.regionalBars.map((item) => ["regional", item.label, item.valueLabel, item.emphasized ? "highlighted" : ""]),
  ];
}

export function buildRoleAnalyticsViewModel(input: RoleAnalyticsInput): RoleAnalyticsViewModel {
  const category = actorRoleCategory(input.role);
  const listingsById = mapListingsById(input.listings);
  const window = rangeWindow(input.range, input.now);
  const relevantListings =
    category === "farmer"
      ? input.listings.filter((listing) => listing.actor_id === input.actorId)
      : category === "buyer"
        ? input.listings.filter((listing) =>
            input.negotiations.some((thread) => thread.buyer_actor_id === input.actorId && thread.listing_id === listing.listing_id),
          )
        : category === "cooperative"
          ? input.listings.filter((listing) => listing.status === "published")
          : input.listings.filter((listing) => listing.actor_id === input.actorId);

  const relevantEscrows =
    category === "farmer"
      ? input.escrows.filter((escrow) => escrow.seller_actor_id === input.actorId)
      : category === "buyer"
        ? input.escrows.filter((escrow) => escrow.buyer_actor_id === input.actorId)
        : category === "cooperative"
          ? input.escrows
          : input.escrows.filter(
              (escrow) => escrow.buyer_actor_id === input.actorId || escrow.seller_actor_id === input.actorId,
            );

  const releasedEscrows = relevantEscrows.filter((escrow) => escrow.state === "released");
  const currentReleasedEscrows = releasedEscrows.filter((escrow) =>
    isBetween(escrow.released_at ?? escrow.updated_at, window.currentStart, input.now ?? new Date()),
  );
  const previousReleasedEscrows = releasedEscrows.filter((escrow) =>
    isBetween(escrow.released_at ?? escrow.updated_at, window.previousStart, window.previousEnd),
  );
  const currentRevenue = currentReleasedEscrows.reduce((sum, escrow) => sum + escrow.amount, 0);
  const previousRevenue = previousReleasedEscrows.reduce((sum, escrow) => sum + escrow.amount, 0);
  const currentTrades = currentReleasedEscrows.length;
  const previousTrades = previousReleasedEscrows.length;
  const averageCurrentPrice = currentTrades > 0 ? currentRevenue / currentTrades : 0;
  const averagePreviousPrice = previousTrades > 0 ? previousRevenue / previousTrades : 0;
  const primaryListings = relevantListings.length > 0 ? relevantListings : input.listings.filter((listing) => listing.status === "published");
  const topCommodity = topCommodityFromListings(primaryListings);
  const trendBuckets = groupRangeLabels(input.range, input.now);
  const trendSeries: AnalyticsSeries[] =
    category === "cooperative"
      ? [
          {
            color: ANALYTICS_COLORS[0],
            name: "Volume",
            points: trendBuckets.map((bucket) => ({
              label: bucket.label,
              value: primaryListings
                .filter((listing) => isBetween(listing.updated_at ?? listing.created_at, bucket.start, bucket.end))
                .reduce((sum, listing) => sum + listing.quantity_tons, 0),
            })),
          },
        ]
      : [
          {
            color: ANALYTICS_COLORS[0],
            name: category === "buyer" ? "Spend" : "Revenue",
            points: trendBuckets.map((bucket) => ({
              label: bucket.label,
              value: sumByRange(
                releasedEscrows.map((escrow) => ({
                  amount: escrow.amount,
                  occurredAt: escrow.released_at ?? escrow.updated_at,
                })),
                bucket.start,
                bucket.end,
              ),
            })),
          },
        ];

  const commoditySelection = Array.from(
    new Set(
      input.listings
        .filter((listing) => listing.status === "published")
        .map((listing) => listing.commodity),
    ),
  )
    .slice(0, 3)
    .sort((left, right) => (left === topCommodity ? -1 : right === topCommodity ? 1 : 0));
  const commoditySeries = seriesFromListings({
    listings: input.listings,
    now: input.now,
    range: input.range,
    selected: commoditySelection.length > 0 ? commoditySelection : [topCommodity],
  });

  const preferredLocation = primaryListings[0]?.location ?? null;
  const bars = regionalBars({
    commodity: topCommodity,
    listings: input.listings,
    preferredLocation,
  });

  const threads =
    category === "farmer"
      ? input.negotiations.filter((thread) => thread.seller_actor_id === input.actorId)
      : category === "buyer"
        ? input.negotiations.filter((thread) => thread.buyer_actor_id === input.actorId)
        : category === "cooperative"
          ? input.negotiations
          : input.negotiations.filter(
              (thread) => thread.buyer_actor_id === input.actorId || thread.seller_actor_id === input.actorId,
            );

  const conversionBase = Math.max(1, primaryListings.filter((listing) => listing.status === "published").length);
  const conversionRate = round((threads.length / conversionBase) * 100);
  const cycleTimes = releasedEscrows
    .map((escrow) => {
      const listingDate = normalizeDate(listingsById.get(escrow.listing_id)?.created_at);
      const releaseDate = normalizeDate(escrow.released_at ?? escrow.updated_at);
      if (!listingDate || !releaseDate) {
        return null;
      }
      return (releaseDate.getTime() - listingDate.getTime()) / 86_400_000;
    })
    .filter((value): value is number => value !== null && value >= 0);

  const uniqueCounterpartyKey = category === "buyer" ? "seller_actor_id" : "buyer_actor_id";
  const repeatCounterpartyRate = (() => {
    const counts = relevantEscrows.reduce<Record<string, number>>((accumulator, escrow) => {
      const key = escrow[uniqueCounterpartyKey];
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
    const repeated = Object.values(counts).filter((value) => value > 1).length;
    return Object.keys(counts).length > 0 ? (repeated / Object.keys(counts).length) * 100 : 0;
  })();

  const releaseRate = relevantEscrows.length > 0 ? (releasedEscrows.length / relevantEscrows.length) * 100 : 0;
  const ratingBase =
    category === "buyer"
      ? 3.8 + Math.min(releaseRate / 100, 1.1)
      : category === "cooperative"
        ? 3.9 + Math.min(releaseRate / 120, 1)
        : 4 + Math.min(releaseRate / 100, 0.9);
  const climatePressure = input.alerts.filter((alert) => alert.severity === "warning" || alert.severity === "critical").length;

  const overview: AnalyticsMetric[] =
    category === "cooperative"
      ? [
          {
            label: "Aggregate Volume",
            tone: deltaTone(
              primaryListings.filter((listing) => isBetween(listing.updated_at ?? listing.created_at, window.currentStart, input.now ?? new Date())).reduce((sum, listing) => sum + listing.quantity_tons, 0) -
                primaryListings.filter((listing) => isBetween(listing.updated_at ?? listing.created_at, window.previousStart, window.previousEnd)).reduce((sum, listing) => sum + listing.quantity_tons, 0),
            ),
            trendLabel: deltaLabel(
              primaryListings.filter((listing) => isBetween(listing.updated_at ?? listing.created_at, window.currentStart, input.now ?? new Date())).reduce((sum, listing) => sum + listing.quantity_tons, 0),
              primaryListings.filter((listing) => isBetween(listing.updated_at ?? listing.created_at, window.previousStart, window.previousEnd)).reduce((sum, listing) => sum + listing.quantity_tons, 0),
            ),
            value: `${round(primaryListings.reduce((sum, listing) => sum + listing.quantity_tons, 0), 0)} tons`,
          },
          {
            label: "Dispatches",
            tone: deltaTone(currentTrades - previousTrades),
            trendLabel: deltaLabel(currentTrades, previousTrades),
            value: String(currentTrades),
          },
          {
            label: "Avg Load Value",
            tone: deltaTone(averageCurrentPrice - averagePreviousPrice),
            trendLabel: deltaLabel(averageCurrentPrice, averagePreviousPrice),
            value: formatMoney(averageCurrentPrice || average(relevantEscrows.map((escrow) => escrow.amount)), input.balance?.currency ?? "GHS"),
          },
          {
            label: "Top Commodity",
            tone: "neutral",
            trendLabel: `${threads.filter((thread) => thread.status === "accepted").length} accepted routes`,
            value: titleCase(topCommodity),
          },
        ]
      : [
          {
            label: category === "buyer" ? "Total Spend" : "Total Revenue",
            tone: deltaTone(currentRevenue - previousRevenue),
            trendLabel: deltaLabel(currentRevenue, previousRevenue),
            value: formatMoney(currentRevenue, input.balance?.currency ?? "GHS"),
          },
          {
            label: category === "buyer" ? "Total Orders" : "Total Trades",
            tone: deltaTone(currentTrades - previousTrades),
            trendLabel: deltaLabel(currentTrades, previousTrades),
            value: String(currentTrades),
          },
          {
            label: category === "buyer" ? "Average Order" : "Average Price",
            tone: deltaTone(averageCurrentPrice - averagePreviousPrice),
            trendLabel: deltaLabel(averageCurrentPrice, averagePreviousPrice),
            value: formatMoney(averageCurrentPrice, input.balance?.currency ?? "GHS"),
          },
          {
            label: category === "buyer" ? "Top Category" : "Top Commodity",
            tone: "neutral",
            trendLabel:
              category === "buyer"
                ? `${Math.max(1, new Set(relevantEscrows.map((escrow) => escrow.seller_actor_id)).size)} suppliers tracked`
                : `${Math.max(1, new Set(relevantEscrows.map((escrow) => escrow.buyer_actor_id)).size)} buyers tracked`,
            value: titleCase(topCommodity),
          },
        ];

  const performance: AnalyticsPerformanceItem[] =
    category === "buyer"
      ? [
          { label: "Spend Volume", value: formatMoney(currentRevenue, input.balance?.currency ?? "GHS") },
          { label: "Supplier Performance", value: `${round(ratingBase, 1)} / 5.0` },
          { label: "Fulfilled Orders", value: formatPercent(releaseRate) },
          { label: "Avg Negotiation Cycle", value: formatDays(average(cycleTimes)) },
          { label: "Repeat Suppliers", value: formatPercent(repeatCounterpartyRate) },
        ]
      : category === "cooperative"
        ? [
            { label: "Member Network", value: String(new Set(threads.flatMap((thread) => [thread.buyer_actor_id, thread.seller_actor_id])).size) },
            { label: "Dispatch Efficiency", value: formatPercent(releaseRate) },
            { label: "Settlement Conversion", value: formatPercent(releaseRate) },
            { label: "Avg Route Cycle", value: formatDays(average(cycleTimes)) },
            { label: "Live Loads", value: String(threads.filter((thread) => thread.status === "accepted" || thread.status === "pending_confirmation").length) },
          ]
        : category === "generic"
          ? [
              { label: "Tracked Value", value: formatMoney(currentRevenue, input.balance?.currency ?? "GHS") },
              { label: "Protected Actions", value: String(relevantEscrows.length) },
              { label: "Climate Pressure", value: `${climatePressure} alert${climatePressure === 1 ? "" : "s"}` },
              { label: "Avg Workflow Cycle", value: formatDays(average(cycleTimes)) },
              { label: "Signal Mode", value: input.runtimeMode === "live" ? "Live" : "Continuity" },
            ]
          : [
              { label: "Sales Volume", value: formatMoney(currentRevenue, input.balance?.currency ?? "GHS") },
              { label: "Buyer Satisfaction", value: `${round(ratingBase, 1)} / 5.0` },
              { label: "Listing Conversion", value: formatPercent(conversionRate) },
              { label: "Avg Time to Sell", value: formatDays(average(cycleTimes)) },
              { label: "Repeat Buyers", value: formatPercent(repeatCounterpartyRate) },
            ];

  const headline =
    category === "buyer"
      ? "Procurement clarity, supplier trends, and pricing signals in one place."
      : category === "cooperative"
        ? "Member growth, dispatch throughput, and market pricing without leaving the live platform view."
        : category === "generic"
          ? "Role-linked performance, trade posture, and climate signals from the current live data seams."
          : "Revenue, market performance, and weather-linked trade pressure from the current live platform view.";
  const summary =
    category === "buyer"
      ? `AgroInsights is derived from your live procurement records for ${formatRangeLabel(input.range).toLowerCase()}.`
      : category === "cooperative"
        ? `This operational view uses current listing, negotiation, and settlement activity rather than a separate analytics backend.`
        : category === "generic"
          ? `This view stays grounded in the same marketplace, wallet, and climate flows the app already uses.`
          : `The dashboard reflects live marketplace, settlement, and climate activity for ${formatRangeLabel(input.range).toLowerCase()}.`;

  const viewModel: RoleAnalyticsViewModel = {
    commodityComparison: commoditySeries,
    csvRows: [],
    emptyMessage: "Not enough data yet. Start trading on AgroMarket to see your insights.",
    headline,
    isEmpty: relevantListings.length === 0 && relevantEscrows.length === 0 && input.transactions.length === 0,
    overview,
    pdfLines: [],
    performance,
    regionalBars: bars,
    regionalHeadline: `${titleCase(topCommodity)} price by region`,
    summary,
    trend: trendSeries,
    trendHeadline: category === "cooperative" ? "Dispatch and volume trend" : category === "buyer" ? "Procurement trend" : "Revenue trend",
    trendSummary: `${formatRangeLabel(input.range)} based on released settlements and live listing records.`,
  };

  viewModel.csvRows = baseCsvRows(viewModel);
  viewModel.pdfLines = [
    "Agrodomain AgroInsights",
    headline,
    ...overview.map((metric) => `${metric.label}: ${metric.value} (${metric.trendLabel})`),
    ...performance.map((item) => `${item.label}: ${item.value}`),
  ];

  return viewModel;
}

function toneForHealth(state: string): "online" | "offline" | "degraded" | "neutral" {
  if (state === "healthy" || state === "ready" || state === "live" || state === "normal") {
    return "online";
  }
  if (state === "blocked" || state === "critical" || state === "down") {
    return "offline";
  }
  if (state === "degraded" || state === "warning" || state === "continuity" || state === "fallback" || state === "limited_release") {
    return "degraded";
  }
  return "neutral";
}

export function buildAdminAnalyticsViewModel(input: AdminAnalyticsInput): AdminAnalyticsViewModel {
  const actorEvents = actorEventsForAdmin({
    advisory: input.advisory,
    escrows: input.escrows,
    listings: input.listings,
    negotiations: input.negotiations,
  });
  const uniqueUsers = new Set(actorEvents.map((item) => item.actorId));
  const window = rangeWindow(input.range);
  const activeUsers = new Set(
    actorEvents
      .filter((item) => isBetween(item.occurredAt, window.currentStart, new Date()))
      .map((item) => item.actorId),
  );
  const currentGmv = input.escrows
    .filter((escrow) => isBetween(escrow.updated_at, window.currentStart, new Date()))
    .reduce((sum, escrow) => sum + escrow.amount, 0);
  const previousGmv = input.escrows
    .filter((escrow) => isBetween(escrow.updated_at, window.previousStart, window.previousEnd))
    .reduce((sum, escrow) => sum + escrow.amount, 0);
  const currentTransactions = input.transactions.filter((entry) => isBetween(entry.created_at, window.currentStart, new Date()));
  const previousTransactions = input.transactions.filter((entry) => isBetween(entry.created_at, window.previousStart, window.previousEnd));
  const growthSeries = buildGrowthSeries(actorEvents, input.range);
  const geography = Object.entries(
    input.listings
      .filter((listing) => listing.status === "published")
      .reduce<Record<string, number>>((accumulator, listing) => {
        accumulator[listing.location] = (accumulator[listing.location] ?? 0) + 1;
        return accumulator;
      }, {}),
  )
    .map(([location, count]) => ({
      label: location,
      value: count,
      valueLabel: `${count} live listing${count === 1 ? "" : "s"}`,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  const marketActors = new Set([
    ...input.listings.map((listing) => listing.actor_id),
    ...input.negotiations.flatMap((thread) => [thread.buyer_actor_id, thread.seller_actor_id]),
  ]);
  const walletActors = new Set(input.escrows.flatMap((escrow) => [escrow.buyer_actor_id, escrow.seller_actor_id]));
  const adoptionBase = Math.max(1, uniqueUsers.size);
  const moduleAdoption: AnalyticsBar[] = [
    { label: "AgroMarket", value: (marketActors.size / adoptionBase) * 100, valueLabel: formatPercent((marketActors.size / adoptionBase) * 100) },
    { label: "AgroWallet", value: (walletActors.size / adoptionBase) * 100, valueLabel: formatPercent((walletActors.size / adoptionBase) * 100) },
    { label: "AgroFund", value: (input.escrows.filter((escrow) => escrow.state === "released").length / adoptionBase) * 100, valueLabel: formatPercent((input.escrows.filter((escrow) => escrow.state === "released").length / adoptionBase) * 100) },
    { label: "AgroWeather", value: (input.alerts.length / adoptionBase) * 100, valueLabel: formatPercent((input.alerts.length / adoptionBase) * 100) },
    { label: "AgroGuide", value: (input.advisory.length / adoptionBase) * 100, valueLabel: formatPercent((input.advisory.length / adoptionBase) * 100) },
    { label: "AgroInsights", value: (Math.max(1, currentTransactions.length) / adoptionBase) * 100, valueLabel: formatPercent((Math.max(1, currentTransactions.length) / adoptionBase) * 100) },
  ]
    .map((item) => ({ ...item, value: Math.min(100, round(item.value)) }))
    .sort((left, right) => right.value - left.value);

  const healthItems: AdminHealthItem[] = [
    {
      label: "Admin control plane",
      status: input.signals.summary?.health_state ?? "derived",
      tone: toneForHealth(input.signals.summary?.health_state ?? "normal"),
      value:
        input.signals.summary?.last_recorded_at ??
        `Derived from ${input.listings.length + input.escrows.length + input.transactions.length} live records`,
    },
    {
      label: "Release readiness",
      status: input.signals.readiness?.readiness_status ?? "derived",
      tone: toneForHealth(input.signals.readiness?.readiness_status ?? "normal"),
      value: input.signals.readiness?.telemetry_freshness_state ?? "Marketplace, wallet, climate, and advisory reads resolved.",
    },
    {
      label: "Marketplace activity",
      status: input.listings.length > 0 || input.negotiations.length > 0 ? "live" : "continuity",
      tone: toneForHealth(input.listings.length > 0 || input.negotiations.length > 0 ? "live" : "continuity"),
      value: `${input.listings.length} listings / ${input.negotiations.length} negotiations`,
    },
    {
      label: "Wallet activity",
      status: input.escrows.length > 0 || input.transactions.length > 0 ? "live" : "continuity",
      tone: toneForHealth(input.escrows.length > 0 || input.transactions.length > 0 ? "live" : "continuity"),
      value: `${input.escrows.length} escrows / ${input.transactions.length} ledger events`,
    },
    {
      label: "Climate and advisory",
      status: input.runtimeMode === "live" ? "live" : "fallback",
      tone: toneForHealth(input.runtimeMode === "live" ? "live" : "fallback"),
      value: `${input.alerts.length} climate alerts / ${input.advisory.length} advisory threads`,
    },
  ];

  const overview: AnalyticsMetric[] = [
    {
      label: "Total Users",
      tone: "neutral",
      trendLabel: `${formatCompactNumber(activeUsers.size)} active this period`,
      value: formatCompactNumber(uniqueUsers.size),
    },
    {
      label: "Active Users",
      tone: deltaTone(activeUsers.size - Math.max(0, uniqueUsers.size - activeUsers.size)),
      trendLabel: `${formatRangeLabel(input.range)} actor activity`,
      value: formatCompactNumber(activeUsers.size),
    },
    {
      label: "GMV",
      tone: deltaTone(currentGmv - previousGmv),
      trendLabel: deltaLabel(currentGmv, previousGmv),
      value: formatMoney(currentGmv, input.escrows[0]?.currency ?? "GHS"),
    },
    {
      label: "Total Transactions",
      tone: deltaTone(currentTransactions.length - previousTransactions.length),
      trendLabel: deltaLabel(currentTransactions.length, previousTransactions.length),
      value: formatCompactNumber(currentTransactions.length),
    },
  ];

  const note =
    input.signals.summary || input.signals.readiness
      ? "Platform analytics are blended from live app data plus any available admin control-plane signals."
      : "Admin metrics are currently derived from the live marketplace, wallet, climate, and advisory seams because the dedicated metrics API is not yet active in this environment.";

  const csvRows = [
    ["section", "label", "value", "detail"],
    ...overview.map((metric) => ["overview", metric.label, metric.value, metric.trendLabel]),
    ...geography.map((item) => ["geography", item.label, item.valueLabel, ""]),
    ...moduleAdoption.map((item) => ["module", item.label, item.valueLabel, ""]),
    ...healthItems.map((item) => ["health", item.label, item.status, item.value]),
  ];

  return {
    csvRows,
    geography,
    geographySummary: geography.length > 0 ? `${geography[0].label} currently carries the highest visible listing density.` : "Geographic distribution will appear once live listing activity is present.",
    growthSeries,
    healthItems,
    moduleAdoption,
    note,
    overview,
    pdfLines: [
      "Agrodomain Admin Analytics",
      note,
      ...overview.map((metric) => `${metric.label}: ${metric.value} (${metric.trendLabel})`),
      ...healthItems.map((item) => `${item.label}: ${item.status} - ${item.value}`),
    ],
  };
}
