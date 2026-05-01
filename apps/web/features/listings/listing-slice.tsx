"use client";

import type { ListingCreateInput, ListingRecord, ListingUpdateInput } from "@agrodomain/contracts";
import Link from "next/link";
import * as React from "react";

import { useAppState } from "@/components/app-provider";
import { CategoryNav } from "@/components/marketplace/category-nav";
import { ListingCard } from "@/components/marketplace/listing-card";
import { MarketplaceSidebar } from "@/components/marketplace/marketplace-sidebar";
import { SearchFilters } from "@/components/marketplace/search-filters";
import { InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { listingFormSchema, listingRecordToFormValues, type ListingFormValues } from "@/features/listings/schema";
import { auditApi } from "@/lib/api/audit";
import { marketplaceApi } from "@/lib/api/marketplace";
import { recordTelemetry } from "@/lib/telemetry/client";

const { useDeferredValue, useEffect, useState } = React;

type MutationEvidence = {
  actionLabel: string;
  listingId: string;
  requestId: string;
  idempotencyKey: string;
  auditEventCount: number;
  replayed: boolean;
} | null;

type ListingWorkspaceMode = "buyer-feed" | "owner-workspace";

const BUYER_PAGE_SIZE = 20;
const allCategoryLabel = "All";
const categoryLabels = [
  allCategoryLabel,
  "Grains",
  "Tubers",
  "Cash Crops",
  "Vegetables",
  "Fruits",
  "Livestock",
  "Other",
] as const;

const commodityCategoryMatchers: Array<{ category: (typeof categoryLabels)[number]; matcher: RegExp }> = [
  { category: "Grains", matcher: /(maize|corn|rice|wheat|barley|millet|sorghum|oat)/iu },
  { category: "Tubers", matcher: /(cassava|yam|potato|cocoyam|taro)/iu },
  { category: "Cash Crops", matcher: /(cocoa|coffee|cotton|sesame|cashew|shea|rubber|sugarcane)/iu },
  { category: "Vegetables", matcher: /(tomato|pepper|okra|onion|cabbage|lettuce|carrot|eggplant)/iu },
  { category: "Fruits", matcher: /(mango|banana|plantain|pineapple|orange|papaya|avocado|melon)/iu },
  { category: "Livestock", matcher: /(cattle|cow|goat|sheep|poultry|chicken|turkey|pig|egg)/iu },
];

function getListingWorkspaceMode(role: string): ListingWorkspaceMode {
  return role === "buyer" ? "buyer-feed" : "owner-workspace";
}

function isBuyerSafePublished(item: ListingRecord): boolean {
  return item.status === "published" && item.view_scope === "buyer_safe";
}

function recordListingViewTelemetry(
  traceId: string,
  detail: Record<string, string | number | boolean>,
): void {
  recordTelemetry({
    event: "listing_view",
    trace_id: traceId,
    timestamp: new Date().toISOString(),
    detail,
  });
}

function recordInquiryStartTelemetry(traceId: string, listingId: string, surface: "buyer_detail" | "buyer_feed"): void {
  recordTelemetry({
    event: "inquiry_start",
    trace_id: traceId,
    timestamp: new Date().toISOString(),
    detail: {
      listing_id: listingId,
      surface,
      interaction_mode: "static_navigation_only",
      negotiation_runtime_ready: false,
    },
  });
}

function listingPrimaryTimestamp(listing: ListingRecord): string {
  return listing.published_at ?? listing.updated_at ?? listing.created_at;
}

function relativePostedLabel(input: string): string {
  const date = new Date(input);
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffDays) >= 1) {
    return formatter.format(diffDays, "day");
  }

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) >= 1) {
    return formatter.format(diffHours, "hour");
  }

  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (Math.abs(diffMinutes) >= 1) {
    return formatter.format(diffMinutes, "minute");
  }

  return "just now";
}

function formatAbsoluteDate(input: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
}

function categorizeCommodity(commodity: string): (typeof categoryLabels)[number] {
  const match = commodityCategoryMatchers.find((entry) => entry.matcher.test(commodity));
  return match?.category ?? "Other";
}

function sellerLabelFromActorId(actorId: string): string {
  const actorParts = actorId.split(/[-_]/u).filter(Boolean);
  const printable = actorParts.slice(1).join(" ") || actorId;

  if (/^[0-9a-f]{8,}$/iu.test(printable.replace(/\s+/gu, ""))) {
    return "Verified seller";
  }

  return printable
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function commodityVisualTone(commodity: string): string {
  const category = categorizeCommodity(commodity);

  if (category === "Grains") return "grain";
  if (category === "Tubers") return "tuber";
  if (category === "Cash Crops") return "cash";
  if (category === "Vegetables") return "vegetable";
  if (category === "Fruits") return "fruit";
  if (category === "Livestock") return "livestock";
  return "other";
}

function priceLabel(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount)}`;
}

function matchesAgeWindow(listing: ListingRecord, ageWindow: string): boolean {
  if (ageWindow === "all") {
    return true;
  }

  const ageMs = Date.now() - new Date(listingPrimaryTimestamp(listing)).getTime();
  const days = ageMs / (1000 * 60 * 60 * 24);

  if (ageWindow === "1d") {
    return days <= 1;
  }
  if (ageWindow === "7d") {
    return days <= 7;
  }
  if (ageWindow === "30d") {
    return days <= 30;
  }
  return true;
}

function sortBuyerListings(items: ListingRecord[], sortOrder: string): ListingRecord[] {
  const nextItems = [...items];

  nextItems.sort((left, right) => {
    if (sortOrder === "price-asc") {
      return left.price_amount - right.price_amount;
    }
    if (sortOrder === "price-desc") {
      return right.price_amount - left.price_amount;
    }
    if (sortOrder === "quantity-desc") {
      return right.quantity_tons - left.quantity_tons;
    }
    return new Date(listingPrimaryTimestamp(right)).getTime() - new Date(listingPrimaryTimestamp(left)).getTime();
  });

  return nextItems;
}

function buildOwnerPublishCue(listing: ListingRecord): { tone: "online" | "degraded" | "neutral"; title: string; body: string } {
  if (listing.status === "published" && !listing.has_unpublished_changes) {
    return {
      tone: "online",
      title: "Live in the marketplace",
      body: `Revision ${listing.published_revision_number ?? listing.revision_number} is the version buyers are viewing now.`,
    };
  }
  if (listing.status === "published" && listing.has_unpublished_changes) {
    return {
      tone: "degraded",
      title: "Live with draft updates waiting",
      body: "Buyers still see the last published version until you publish your latest edits.",
    };
  }
  if (listing.status === "draft") {
    return {
      tone: "degraded",
      title: "Draft only",
      body: "This listing is still private and will not appear in the marketplace until you publish it.",
    };
  }
  return {
    tone: "neutral",
    title: "Closed to new interest",
    body: "This listing stays in your history, but new buyers can no longer discover it.",
  };
}

function formValuesToCreateInput(values: ListingFormValues): ListingCreateInput {
  return {
    title: values.title.trim(),
    commodity: values.commodity.trim(),
    quantity_tons: Number(values.quantityTons),
    price_amount: Number(values.priceAmount),
    price_currency: values.priceCurrency.trim().toUpperCase(),
    location: values.location.trim(),
    summary: values.summary.trim(),
  };
}

function formValuesToUpdateInput(listingId: string, values: ListingFormValues): ListingUpdateInput {
  return {
    listing_id: listingId,
    ...formValuesToCreateInput(values),
    status: values.status,
  };
}

function listingDraftFieldsChanged(listing: ListingRecord, values: ListingFormValues): boolean {
  const next = formValuesToCreateInput(values);
  return (
    listing.title !== next.title ||
    listing.commodity !== next.commodity ||
    listing.quantity_tons !== next.quantity_tons ||
    listing.price_amount !== next.price_amount ||
    listing.price_currency !== next.price_currency ||
    listing.location !== next.location ||
    listing.summary !== next.summary
  );
}

async function loadAuditEvidence(requestId: string, idempotencyKey: string, traceId: string): Promise<number> {
  const audit = await auditApi.getEvents(requestId, idempotencyKey, traceId);
  return audit.data.items.length;
}

function BuyerFeed(props: { items: ListingRecord[]; traceId: string }) {
  const [query, setQuery] = useState("");
  const [commodity, setCommodity] = useState("all");
  const [location, setLocation] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [ageWindow, setAgeWindow] = useState("all");
  const [sortOrder, setSortOrder] = useState("freshest");
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryLabels)[number]>(allCategoryLabel);
  const [visibleCount, setVisibleCount] = useState(BUYER_PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);

  const commodityOptions = Array.from(new Set(props.items.map((item) => item.commodity))).sort((left, right) =>
    left.localeCompare(right),
  );
  const locationOptions = Array.from(new Set(props.items.map((item) => item.location))).sort((left, right) =>
    left.localeCompare(right),
  );
  const searchSuggestions = Array.from(new Set([...commodityOptions, ...locationOptions])).slice(0, 12);

  const filteredItems = sortBuyerListings(
    props.items.filter((item) => {
      const normalizedQuery = deferredQuery.trim().toLowerCase();
      const category = categorizeCommodity(item.commodity);
      const searchable = [item.title, item.commodity, item.location, sellerLabelFromActorId(item.actor_id)]
        .join(" ")
        .toLowerCase();
      const minPrice = priceMin.trim() ? Number(priceMin) : null;
      const maxPrice = priceMax.trim() ? Number(priceMax) : null;

      if (normalizedQuery && !searchable.includes(normalizedQuery)) {
        return false;
      }
      if (selectedCategory !== allCategoryLabel && category !== selectedCategory) {
        return false;
      }
      if (commodity !== "all" && item.commodity !== commodity) {
        return false;
      }
      if (location !== "all" && item.location !== location) {
        return false;
      }
      if (minPrice !== null && item.price_amount < minPrice) {
        return false;
      }
      if (maxPrice !== null && item.price_amount > maxPrice) {
        return false;
      }
      if (!matchesAgeWindow(item, ageWindow)) {
        return false;
      }
      return true;
    }),
    sortOrder,
  );

  useEffect(() => {
    setVisibleCount(BUYER_PAGE_SIZE);
  }, [ageWindow, commodity, deferredQuery, location, priceMax, priceMin, selectedCategory, sortOrder]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const liveLocations = new Set(props.items.map((item) => item.location)).size;
  const liveCategories = new Set(props.items.map((item) => categorizeCommodity(item.commodity))).size;
  const categoryCounts = categoryLabels.map((label) => ({
    count:
      label === allCategoryLabel
        ? props.items.length
        : props.items.filter((item) => categorizeCommodity(item.commodity) === label).length,
    label,
  }));
  const popularCategories = categoryCounts
    .filter((entry) => entry.label !== allCategoryLabel && entry.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);
  const priceTrendLabels = popularCategories.length > 0 ? popularCategories : categoryCounts.slice(1, 4);
  const priceTrends = priceTrendLabels.map((entry) => {
    const points = props.items
      .filter((item) => categorizeCommodity(item.commodity) === entry.label)
      .sort((left, right) => new Date(listingPrimaryTimestamp(left)).getTime() - new Date(listingPrimaryTimestamp(right)).getTime())
      .slice(-5)
      .map((item) => item.price_amount);
    const direction: "down" | "flat" | "up" =
      points.length < 2
        ? "up"
        : points[points.length - 1] === points[0]
          ? "flat"
          : points[points.length - 1] > points[0]
            ? "up"
            : "down";

    return {
      direction,
      label: entry.label,
      points,
      priceLabel:
        points.length > 0
          ? `${props.items.find((item) => categorizeCommodity(item.commodity) === entry.label)?.price_currency ?? "GHS"} ${Math.round(
              points.reduce((sum, value) => sum + value, 0) / points.length,
            )}`
          : "No trend",
    };
  });
  const featuredListings = sortBuyerListings(props.items, "freshest")
    .slice(0, 3)
    .map((item) => ({
      href: `/app/market/listings/${item.listing_id}`,
      location: item.location,
      priceLabel: priceLabel(item.price_amount, item.price_currency),
      title: item.title,
    }));

  return (
    <div className="content-stack">
      <SurfaceCard className="market-hero-card">
        <div className="market-hero-copy">
          <div className="market-hero-badge">Marketplace home</div>
          <SectionHeading
            eyebrow="Buyer discovery"
            title="Discover trusted agricultural supply in one place"
            body="Filter live listings by commodity, location, price band, and freshness so you can move from discovery to negotiation without guesswork."
          />
          <div className="market-hero-metrics" role="list" aria-label="Marketplace discovery metrics">
            <article className="market-metric-card" role="listitem">
              <span>Live lots</span>
              <strong>{props.items.length}</strong>
              <p>Only buyer-safe published inventory appears here.</p>
            </article>
            <article className="market-metric-card" role="listitem">
              <span>Locations</span>
              <strong>{liveLocations}</strong>
              <p>Compare active supply footprints across regions.</p>
            </article>
            <article className="market-metric-card" role="listitem">
              <span>Categories</span>
              <strong>{liveCategories}</strong>
              <p>Move quickly between staples, perishables, and specialty lots.</p>
            </article>
          </div>
        </div>

        <SearchFilters
          ageWindow={ageWindow}
          commodity={commodity}
          commodityOptions={commodityOptions}
          location={location}
          locationOptions={locationOptions}
          onAgeWindowChange={setAgeWindow}
          onCommodityChange={setCommodity}
          onLocationChange={setLocation}
          onPriceMaxChange={setPriceMax}
          onPriceMinChange={setPriceMin}
          onQueryChange={setQuery}
          onSortChange={setSortOrder}
          priceMax={priceMax}
          priceMin={priceMin}
          query={query}
          resultCount={filteredItems.length}
          searchSuggestions={searchSuggestions}
          sort={sortOrder}
        />
      </SurfaceCard>

      <CategoryNav
        categories={categoryCounts}
        onSelectCategory={(category) => setSelectedCategory(category as (typeof categoryLabels)[number])}
        selectedCategory={selectedCategory}
      />

      <InsightCallout
        title="Live inventory only"
        body="Only live buyer-safe listings appear in this feed, so draft revisions and owner-only records never leak into discovery."
        tone="accent"
      />

      {props.items.length === 0 ? (
        <SurfaceCard>
          <p className="muted">No listings are available right now. Check back soon for new supply.</p>
        </SurfaceCard>
      ) : (
        <div className="market-discovery-layout">
          <div className="market-discovery-main">
            <div className="market-results-head">
              <div>
                <h3>Discovery feed</h3>
                <p className="muted">
                  Showing {visibleItems.length} of {filteredItems.length} matching lots.
                </p>
              </div>
              <StatusPill tone="online">Buyer-safe inventory</StatusPill>
            </div>

            {filteredItems.length === 0 ? (
              <SurfaceCard className="market-empty-state">
                <SectionHeading
                  eyebrow="No matches"
                  title="No live lots match these filters yet"
                  body="Try widening your price range, choosing a broader category, or clearing the location filter to see more supply."
                />
              </SurfaceCard>
            ) : (
              <>
                <div className="market-listing-grid" role="list" aria-label="Published listings">
                  {visibleItems.map((item) => {
                    const postedAt = listingPrimaryTimestamp(item);
                    return (
                      <div key={item.listing_id} role="listitem">
                        <ListingCard
                          categoryLabel={categorizeCommodity(item.commodity)}
                          commodityVisual={commodityVisualTone(item.commodity)}
                          listing={item}
                          onOpenNegotiation={(listingId) =>
                            recordInquiryStartTelemetry(props.traceId, listingId, "buyer_feed")
                          }
                          postedLabel={relativePostedLabel(postedAt)}
                          postedTitle={formatAbsoluteDate(postedAt)}
                          sellerLabel={sellerLabelFromActorId(item.actor_id)}
                        />
                      </div>
                    );
                  })}
                </div>

                {filteredItems.length > visibleItems.length ? (
                  <div className="market-load-more">
                    <button
                      className="button-secondary"
                      onClick={() => setVisibleCount((current) => current + BUYER_PAGE_SIZE)}
                      type="button"
                    >
                      Load more lots
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <MarketplaceSidebar
            featuredListings={featuredListings}
            popularCategories={popularCategories}
            priceTrends={priceTrends}
          />
        </div>
      )}
    </div>
  );
}

export function ListingSliceClient() {
  const { session, traceId } = useAppState();
  const [items, setItems] = useState<ListingRecord[]>([]);
  const [buyerItems, setBuyerItems] = useState<ListingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    void refreshListings();
  }, [session, traceId]);

  useEffect(() => {
    if (!session || isLoading) {
      return;
    }
    const mode = getListingWorkspaceMode(session.actor.role);
    recordListingViewTelemetry(traceId, {
      actor_role: session.actor.role,
      surface: mode,
      listing_count: mode === "buyer-feed" ? buyerItems.length : items.length,
    });
  }, [buyerItems.length, isLoading, items.length, session, traceId]);

  async function refreshListings() {
    setIsLoading(true);
    try {
      const response = await marketplaceApi.listListings(traceId);
      setItems(response.data.items);
      setBuyerItems(response.data.items.filter(isBuyerSafePublished));
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load listings.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!session) {
    return null;
  }

  if (getListingWorkspaceMode(session.actor.role) === "buyer-feed") {
    return (
      <div className="content-stack">
        {isLoading ? (
          <SurfaceCard>
            <p className="muted">Loading published listings...</p>
          </SurfaceCard>
        ) : null}
        {!isLoading ? <BuyerFeed items={buyerItems} traceId={traceId} /> : null}
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Seller dashboard"
          title="Manage your marketplace listings"
          body="Create drafts, publish when ready, and keep track of what buyers can currently see."
        />
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Your listings</span>
            <strong>{items.length}</strong>
            <span className="muted">See every draft, live listing, and closed lot in one place.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Live to buyers</span>
            <strong>{buyerItems.length}</strong>
            <span className="muted">These listings are currently visible in the marketplace.</span>
          </article>
        </div>
      </SurfaceCard>

      <div className="queue-grid">
        <article className="queue-card">
          <SectionHeading
            eyebrow="Create listing"
            title="Launch the 4-step wizard"
            body="Create richer listings with guided validation, local draft persistence, and the same backend commands already wired into the marketplace."
          />
          <div className="content-stack">
            <InsightCallout
              title="Guided seller flow"
              body="Capture category, availability, delivery, and media preview details without changing the create and publish mutations."
              tone="brand"
            />
            <ul className="summary-list">
              <li>
                <span>Step 1</span>
                <strong>Basic information</strong>
              </li>
              <li>
                <span>Step 2</span>
                <strong>Pricing and quantity</strong>
              </li>
              <li>
                <span>Step 3</span>
                <strong>Media and location</strong>
              </li>
              <li>
                <span>Step 4</span>
                <strong>Review and publish</strong>
              </li>
            </ul>
            <div className="actions-row">
              <Link className="button-primary" href="/app/market/listings/create">
                Open listing wizard
              </Link>
            </div>
          </div>
        </article>

        <article className="queue-card">
          <SectionHeading
            eyebrow="Recent activity"
            title="What stays on this page"
            body="Inventory management remains here, while brand new listings move into the dedicated create route."
          />
          <InsightCallout
            title="Seller workspace preserved"
            body="The listing detail route still handles edits, publish state, revisions, and buyer-safe visibility. This page stays focused on inventory overview."
            tone="accent"
          />
          <p className="muted">Use the action below any listing to open the existing detail editor and publish controls.</p>
        </article>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Your inventory"
          title="Current listings"
          body="Review every listing, open the details, and decide what should stay live for buyers."
        />
        {isLoading ? <p className="muted">Loading listings...</p> : null}
        {!isLoading && items.length === 0 ? <p className="muted">No listings persisted yet.</p> : null}
        <div className="queue-list" role="list" aria-label="Owner listing collection">
          {items.map((item) => (
            <article className="queue-item" key={item.listing_id} role="listitem">
              <div className="queue-item-head">
                <div className="pill-row">
                  <StatusPill tone={item.status === "published" ? "online" : item.status === "draft" ? "degraded" : "neutral"}>
                    {item.status}
                  </StatusPill>
                  <StatusPill tone="neutral">{item.view_scope === "buyer_safe" ? "Buyer-safe view" : "Owner-only view"}</StatusPill>
                </div>
                <h3>{item.title}</h3>
              </div>
              <p>{item.summary}</p>
              <p className="muted">
                {item.commodity} · {item.quantity_tons} tons · {item.price_amount} {item.price_currency} · {item.location}
              </p>
              <div className="actions-row">
                <Link className="button-ghost" href={`/app/market/listings/${item.listing_id}`}>
                  View and edit
                </Link>
              </div>
            </article>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

function BuyerListingDetail(props: { listing: ListingRecord; traceId: string }) {
  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Listing details"
          title={props.listing.title}
          body="Review the quantity, price, and location, then start a conversation with the seller when you are ready."
        />
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Listing history</span>
            <strong>{props.listing.revision_count}</strong>
            <span className="muted">You are viewing the live version currently available to buyers.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Next step</span>
            <strong>Start a conversation</strong>
            <span className="muted">When this lot fits your needs, open a negotiation and send your offer.</span>
          </article>
        </div>
      </SurfaceCard>
      <div className="queue-grid">
        <article className="queue-card">
          <div className="pill-row">
            <StatusPill tone="online">Published</StatusPill>
            <StatusPill tone="neutral">{props.listing.revision_count} revisions</StatusPill>
          </div>
          <p>{props.listing.summary}</p>
          <p className="muted">Commodity: {props.listing.commodity}</p>
          <p className="muted">Quantity: {props.listing.quantity_tons} tons</p>
          <p className="muted">
            Price: {props.listing.price_amount} {props.listing.price_currency}
          </p>
          <p className="muted">Location: {props.listing.location}</p>
          <div className="actions-row">
            <Link
              className="button-primary"
              href={`/app/market/negotiations?listingId=${props.listing.listing_id}`}
              onClick={() => recordInquiryStartTelemetry(props.traceId, props.listing.listing_id, "buyer_detail")}
            >
              Open negotiation inbox
            </Link>
            <Link className="button-ghost" href="/app/market/listings">
              Back to feed
            </Link>
          </div>
        </article>
        <article className="queue-card">
          <InsightCallout
            title="Built for buyers"
            body="Seller editing tools stay on the seller dashboard, while this page stays focused on the information you need to make a decision."
            tone="brand"
          />
        </article>
      </div>
    </div>
  );
}

export function ListingDetailClient({ listingId }: { listingId: string }) {
  const { session, traceId } = useAppState();
  const [listing, setListing] = useState<ListingRecord | null>(null);
  const [formValues, setFormValues] = useState<ListingFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [optimisticState, setOptimisticState] = useState<"idle" | "pending" | "reconciled">("idle");
  const [evidence, setEvidence] = useState<MutationEvidence>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    void marketplaceApi
      .getListing(listingId, traceId)
      .then((response) => {
        if (getListingWorkspaceMode(session.actor.role) === "buyer-feed" && !isBuyerSafePublished(response.data)) {
          setListing(null);
          setFormValues(null);
          setError("listing_not_published");
          return;
        }
        setListing(response.data);
        setFormValues(listingRecordToFormValues(response.data));
        setError(null);
        recordListingViewTelemetry(traceId, {
          actor_role: session.actor.role,
          surface: getListingWorkspaceMode(session.actor.role) === "buyer-feed" ? "buyer_detail" : "owner_detail",
          listing_id: response.data.listing_id,
          revision_count: response.data.revision_count,
          published: response.data.status === "published",
        });
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Unable to load listing.");
      });
  }, [listingId, session, traceId]);

  if (!session) {
    return null;
  }

  if (getListingWorkspaceMode(session.actor.role) === "buyer-feed") {
    if (error) {
      return (
        <SurfaceCard>
          <p className="field-error">{error}</p>
        </SurfaceCard>
      );
    }
    return listing ? <BuyerListingDetail listing={listing} traceId={traceId} /> : null;
  }

  async function saveEdit() {
    if (!listing || !formValues || !session) {
      return;
    }

    const parsed = listingFormSchema.safeParse(formValues);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the listing fields and try again.");
      return;
    }

    const fieldsChanged = listingDraftFieldsChanged(listing, parsed.data);
    const wantsPublished = parsed.data.status === "published";
    const needsPublish = wantsPublished && (listing.status !== "published" || listing.has_unpublished_changes || fieldsChanged);
    const needsUnpublish = !wantsPublished && listing.status === "published";

    const optimisticListing: ListingRecord = {
      ...listing,
      ...formValuesToUpdateInput(listing.listing_id, parsed.data),
      schema_version: listing.schema_version,
      actor_id: listing.actor_id,
      country_code: listing.country_code,
      created_at: listing.created_at,
      updated_at: new Date().toISOString(),
      revision_count: listing.revision_count,
      revision_number: listing.revision_number,
      published_revision_number: listing.published_revision_number,
      has_unpublished_changes: true,
      view_scope: listing.view_scope,
      published_at: listing.published_at,
    };

    const previousListing = listing;
    setError(null);
    setIsSaving(true);
    setOptimisticState("pending");
    setListing(optimisticListing);

    try {
      let nextListing = listing;
      let requestId = "";
      let idempotencyKey = "";
      let replayed = false;
      let actionLabel = "Listing updated";

      if (fieldsChanged) {
        const update = await marketplaceApi.updateListing(
          formValuesToUpdateInput(listing.listing_id, parsed.data),
          traceId,
          session.actor.actor_id,
          session.actor.country_code,
        );
        nextListing = update.data.listing;
        requestId = update.data.request_id;
        idempotencyKey = update.data.idempotency_key;
        replayed = update.data.replayed;
      }

      if (needsPublish) {
        const publish = await marketplaceApi.publishListing(
          { listing_id: listing.listing_id },
          traceId,
          session.actor.actor_id,
          session.actor.country_code,
        );
        nextListing = publish.data.listing;
        requestId = publish.data.request_id;
        idempotencyKey = publish.data.idempotency_key;
        replayed = publish.data.replayed;
        actionLabel = fieldsChanged ? "Listing updated and published" : "Listing published";
      } else if (needsUnpublish) {
        const unpublish = await marketplaceApi.unpublishListing(
          { listing_id: listing.listing_id },
          traceId,
          session.actor.actor_id,
          session.actor.country_code,
        );
        nextListing = unpublish.data.listing;
        requestId = unpublish.data.request_id;
        idempotencyKey = unpublish.data.idempotency_key;
        replayed = unpublish.data.replayed;
        actionLabel = fieldsChanged ? "Listing updated and closed" : "Listing closed";
      }

      if (!requestId || !idempotencyKey) {
        setListing(listing);
        setFormValues(listingRecordToFormValues(listing));
        setOptimisticState("reconciled");
        setEvidence(null);
        return;
      }

      const auditEventCount = await loadAuditEvidence(requestId, idempotencyKey, traceId);
      setListing(nextListing);
      setFormValues(listingRecordToFormValues(nextListing));
      setOptimisticState("reconciled");
      setEvidence({
        actionLabel,
        listingId: nextListing.listing_id,
        requestId,
        idempotencyKey,
        auditEventCount,
        replayed,
      });
    } catch (nextError) {
      setListing(previousListing);
      setOptimisticState("idle");
      setError(nextError instanceof Error ? nextError.message : "Unable to save listing changes.");
    } finally {
      setIsSaving(false);
    }
  }

  const cue = listing ? buildOwnerPublishCue(listing) : null;

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Listing detail"
          title={listing?.title ?? "Loading listing"}
          body="Update pricing, quantity, and status from one place, then decide when the listing should go live."
        />
        {listing ? (
          <div className="stat-strip">
            <article className="stat-chip">
              <span className="metric-label">Current state</span>
              <strong>{listing.status}</strong>
              <span className="muted">This status controls whether buyers can discover the listing.</span>
            </article>
            <article className="stat-chip">
              <span className="metric-label">Revision</span>
              <strong>{listing.revision_number}</strong>
              <span className="muted">Published revision {listing.published_revision_number ?? "pending"}.</span>
            </article>
          </div>
        ) : null}
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error">{error}</p>
        </SurfaceCard>
      ) : null}

      {listing && formValues ? (
        <div className="queue-grid">
          <article className="queue-card">
            <SectionHeading
              eyebrow="Edit listing"
              title="Update listing details"
              body="Keep your title, quantity, price, and summary current so buyers see the right information."
            />
            <form
              className="form-stack"
              onSubmit={async (event) => {
                event.preventDefault();
                await saveEdit();
              }}
            >
              <div className="field">
                <label htmlFor="edit-title">Listing title</label>
                <input
                  id="edit-title"
                  onChange={(event) => setFormValues((current) => (current ? { ...current, title: event.target.value } : current))}
                  value={formValues.title}
                />
              </div>
              <div className="field">
                <label htmlFor="edit-commodity">Commodity</label>
                <input
                  id="edit-commodity"
                  onChange={(event) =>
                    setFormValues((current) => (current ? { ...current, commodity: event.target.value } : current))
                  }
                  value={formValues.commodity}
                />
              </div>
              <div className="grid-two">
                <div className="field">
                  <label htmlFor="edit-quantity">Quantity (tons)</label>
                  <input
                    id="edit-quantity"
                    onChange={(event) =>
                      setFormValues((current) => (current ? { ...current, quantityTons: event.target.value } : current))
                    }
                    step="0.1"
                    type="number"
                    value={formValues.quantityTons}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-price">Price amount</label>
                  <input
                    id="edit-price"
                    onChange={(event) =>
                      setFormValues((current) => (current ? { ...current, priceAmount: event.target.value } : current))
                    }
                    step="0.01"
                    type="number"
                    value={formValues.priceAmount}
                  />
                </div>
              </div>
              <div className="grid-two">
                <div className="field">
                  <label htmlFor="edit-currency">Currency</label>
                  <input
                    id="edit-currency"
                    onChange={(event) =>
                      setFormValues((current) =>
                        current ? { ...current, priceCurrency: event.target.value.toUpperCase() } : current,
                      )
                    }
                    value={formValues.priceCurrency}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-location">Location</label>
                  <input
                    id="edit-location"
                    onChange={(event) =>
                      setFormValues((current) => (current ? { ...current, location: event.target.value } : current))
                    }
                    value={formValues.location}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  onChange={(event) =>
                    setFormValues((current) =>
                      current
                        ? { ...current, status: event.target.value as ListingFormValues["status"] }
                        : current,
                    )
                  }
                  value={formValues.status}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="edit-summary">Summary</label>
                <textarea
                  id="edit-summary"
                  onChange={(event) =>
                    setFormValues((current) => (current ? { ...current, summary: event.target.value } : current))
                  }
                  rows={5}
                  value={formValues.summary}
                />
              </div>
              <div className="actions-row">
                <button className="button-primary" disabled={isSaving} type="submit">
                  {isSaving ? "Saving changes..." : "Save listing edits"}
                </button>
                <Link className="button-ghost" href="/app/market/listings">
                  Back to listings
                </Link>
              </div>
            </form>
          </article>

          <article className="queue-card">
            <SectionHeading eyebrow="Listing status" title={listing.commodity} />
            <div className="detail-stack">
              {cue ? (
                <InsightCallout
                  title={cue.title}
                  body={cue.body}
                  tone={cue.tone === "online" ? "brand" : cue.tone === "degraded" ? "accent" : "neutral"}
                />
              ) : null}
              <div className="pill-row">
                <StatusPill tone={optimisticState === "pending" ? "degraded" : "online"}>{listing.status}</StatusPill>
                <StatusPill tone="neutral">Revision {listing.revision_number}</StatusPill>
                <StatusPill tone="neutral">{listing.revision_count} total revisions</StatusPill>
                {optimisticState !== "idle" ? (
                  <StatusPill tone={optimisticState === "pending" ? "degraded" : "online"}>
                    {optimisticState === "pending" ? "Saving update" : "Update saved"}
                  </StatusPill>
                ) : null}
              </div>
              <p className="muted">Visible to buyers: {listing.view_scope === "buyer_safe" ? "Yes" : "No"}</p>
              <p className="muted">Draft changes waiting to publish: {listing.has_unpublished_changes ? "Yes" : "No"}</p>
              <p className="muted">Quantity: {listing.quantity_tons} tons</p>
              <p className="muted">
                Price: {listing.price_amount} {listing.price_currency}
              </p>
              <p className="muted">Location: {listing.location}</p>
              <p className="muted">Created at: {listing.created_at}</p>
              <p className="muted">Updated at: {listing.updated_at}</p>
            </div>
            {evidence ? (
              <InsightCallout
                title={`${evidence.actionLabel} confirmed`}
                body={`Update reference ${evidence.requestId} generated ${evidence.auditEventCount} timeline updates. Support code: ${evidence.idempotencyKey}.`}
                tone="brand"
              />
            ) : (
              <InsightCallout
                title="No recent changes yet"
                body="Save an edit to update the listing and confirm what buyers will see next."
                tone="accent"
              />
            )}
          </article>
        </div>
      ) : null}
    </div>
  );
}
