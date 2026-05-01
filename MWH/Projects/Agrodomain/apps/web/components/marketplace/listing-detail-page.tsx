"use client";

import type { ListingRecord, MarketplaceListingIntelligenceRead } from "@agrodomain/contracts";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Clipboard, MapPin, Package, ShieldCheck, Waves, Wheat } from "lucide-react";
import React from "react";
import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { PhotoCarousel, type PhotoCarouselSlide } from "@/components/marketplace/photo-carousel";
import { PriceCard } from "@/components/marketplace/price-card";
import { SellerCard } from "@/components/marketplace/seller-card";
import { CounterpartyTrustCard } from "@/components/marketplace/counterparty-trust-card";
import { InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import {
  buildListingMatchGuidance,
  buildListingTrustSummary,
  mergeListingTrustSummaryWithIntelligence,
} from "@/features/marketplace/trust";
import { marketplaceApi } from "@/lib/api/marketplace";
import { recordTelemetry } from "@/lib/telemetry/client";
import { recordMarketplaceConversion } from "@/lib/telemetry/marketplace";
import { readUserPreferences } from "@/lib/user-preferences";

type ListingRevisionItem = {
  actor_id: string;
  change_type: string;
  changed_at: string;
  commodity: string;
  country_code: string;
  listing_id: string;
  location: string;
  price_amount: number;
  price_currency: string;
  quantity_tons: number;
  revision_number: number;
  schema_version: string;
  status: "draft" | "published" | "closed";
  summary: string;
  title: string;
};

type ListingDetailPageClientProps = {
  listingId: string;
};

function isBuyerRole(role: string): boolean {
  return role === "buyer";
}

function formatMonthYear(value: string | null | undefined): string {
  if (!value) {
    return "Recent member";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toRevisionItems(items: Array<Record<string, unknown>>): ListingRevisionItem[] {
  return items
    .map((item) => ({
      actor_id: String(item.actor_id ?? ""),
      change_type: String(item.change_type ?? "updated"),
      changed_at: String(item.changed_at ?? ""),
      commodity: String(item.commodity ?? ""),
      country_code: String(item.country_code ?? ""),
      listing_id: String(item.listing_id ?? ""),
      location: String(item.location ?? ""),
      price_amount: Number(item.price_amount ?? 0),
      price_currency: String(item.price_currency ?? ""),
      quantity_tons: Number(item.quantity_tons ?? 0),
      revision_number: Number(item.revision_number ?? 0),
      schema_version: String(item.schema_version ?? ""),
      status: (item.status === "draft" || item.status === "published" || item.status === "closed"
        ? item.status
        : "draft") as ListingRevisionItem["status"],
      summary: String(item.summary ?? ""),
      title: String(item.title ?? ""),
    }))
    .filter((item) => item.listing_id && item.revision_number > 0);
}

function buildCarouselSlides(listing: ListingRecord): PhotoCarouselSlide[] {
  return [
    {
      id: "overview",
      eyebrow: "Listing overview",
      title: listing.title,
      body: listing.summary,
      accentClassName: "market-carousel-earth",
    },
    {
      id: "handling",
      eyebrow: "Handling snapshot",
      title: `${listing.quantity_tons} tons ready in ${listing.location}`,
      body: "Use this snapshot to confirm quantity, location, and readiness before you open a negotiation.",
      accentClassName: "market-carousel-harvest",
    },
    {
      id: "pricing",
      eyebrow: "Pricing signal",
      title: `${listing.price_amount} ${listing.price_currency} asking price`,
      body: listing.status === "published"
        ? "This lot is visible in the marketplace now."
        : "This lot stays in seller review until it is published.",
      accentClassName: "market-carousel-sky",
    },
  ];
}

function buildQualityDetails(listing: ListingRecord) {
  const packaging = /bag|sack|crate|bulk/i.test(listing.summary) ? "Referenced in listing summary" : "Confirm in negotiation";

  return [
    {
      icon: Package,
      label: "Packaging",
      value: packaging,
      note: "Use the summary and the next conversation to confirm final packaging details.",
    },
    {
      icon: Waves,
      label: "Moisture",
      value: "Awaiting quality upload",
      note: "Confirm moisture details directly with the seller when they matter for this lot.",
    },
    {
      icon: ShieldCheck,
      label: "Grade",
      value: `${listing.commodity} standard`,
      note: "This detail is based on the live lot summary and should be confirmed before payment.",
    },
  ];
}

function buildListingActionCopy(listing: ListingRecord, isBuyer: boolean) {
  if (isBuyer) {
    return {
      body:
        listing.status === "published"
          ? "If the quantity, location, and trust signals fit, move straight into negotiation from this detail page."
          : "Buyer action opens up once the lot is live in the marketplace.",
      title: listing.status === "published" ? "Next best action: open a negotiation" : "Listing is not open for buyer action",
      tone: listing.status === "published" ? "brand" : "neutral",
    } as const;
  }

  if (listing.status === "published" && listing.has_unpublished_changes) {
    return {
      body: "Buyers still see the last published version. Publish the latest edits before pushing new negotiations forward.",
      title: "Next best action: publish the latest revision",
      tone: "accent",
    } as const;
  }

  if (listing.status === "draft") {
    return {
      body: "This lot is still private. Finish the listing or publish it before expecting live buyer interest.",
      title: "Next best action: publish this lot",
      tone: "accent",
    } as const;
  }

  return {
    body: "Use this page to review revisions, respond to negotiations, and keep the listing aligned with the live trade lane.",
    title: "Next best action: review active conversations",
    tone: "brand",
  } as const;
}

export function ListingDetailPageClient(props: ListingDetailPageClientProps) {
  const { session, traceId } = useAppState();
  const [listing, setListing] = useState<ListingRecord | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [listingIntelligence, setListingIntelligence] = useState<MarketplaceListingIntelligenceRead | null>(null);
  const [revisions, setRevisions] = useState<ListingRevisionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareState, setShareState] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const load = async () => {
      try {
        const [listingResponse, intelligenceResponse] = await Promise.all([
          marketplaceApi.getListing(props.listingId, traceId),
          marketplaceApi.getListingIntelligence(props.listingId, traceId).catch(() => null),
        ]);
        if (!isMounted) {
          return;
        }

        setListing(listingResponse.data);
        setListingIntelligence(intelligenceResponse?.data ?? null);
        setError(null);

        if (!isBuyerRole(session.actor.role)) {
          const [revisionResponse, listingsResponse] = await Promise.all([
            marketplaceApi.listListingRevisions(props.listingId, traceId),
            marketplaceApi.listListings(traceId),
          ]);

          if (!isMounted) {
            return;
          }

          setRevisions(toRevisionItems(revisionResponse.data.items));
          setListingCount(
            listingsResponse.data.items.filter((item) => item.actor_id === listingResponse.data.actor_id).length,
          );
        } else {
          setRevisions([]);
          setListingCount(null);
        }
      } catch (nextError) {
        if (!isMounted) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load listing.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [props.listingId, session, traceId]);

  const isBuyer = isBuyerRole(session?.actor.role ?? "");
  const carouselSlides = useMemo(() => (listing ? buildCarouselSlides(listing) : []), [listing]);
  const qualityDetails = useMemo(() => (listing ? buildQualityDetails(listing) : []), [listing]);
  const trustSummary = useMemo(
    () =>
      listing
        ? mergeListingTrustSummaryWithIntelligence(
            buildListingTrustSummary({
              listing,
              viewerRole: session?.actor.role ?? "buyer",
              visibleListingCount: listingCount,
            }),
            listingIntelligence,
          )
        : null,
    [listing, listingCount, listingIntelligence, session?.actor.role],
  );
  const actionCopy = useMemo(() => (listing ? buildListingActionCopy(listing, isBuyer) : null), [isBuyer, listing]);
  const matchGuidance = useMemo(
    () => (listing && listingIntelligence ? buildListingMatchGuidance({ intelligence: listingIntelligence, listing }) : null),
    [listing, listingIntelligence],
  );

  useEffect(() => {
    if (!session || !listing) {
      return;
    }
    recordMarketplaceConversion({
      actorId: session.actor.actor_id,
      actorRole: session.actor.role,
      countryCode: session.actor.country_code,
      listingId: listing.listing_id,
      outcome: "completed",
      sourceSurface: "listing_detail",
      stage: "listing_viewed",
      traceId,
      urgency:
        listing.status === "draft" || listing.has_unpublished_changes
          ? "attention"
          : "routine",
    });
    recordTelemetry({
      event: "marketplace_conversion_step",
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      detail: {
        actor_role: session.actor.role,
        flow: "listing_detail",
        listing_status: listing.status,
        view_scope: listing.view_scope,
      },
    });
  }, [listing, session, traceId]);

  if (!session) {
    return null;
  }

  async function handleShare() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareState("Link copied");
    } catch {
      setShareState("Copy unavailable in this browser");
    }
  }

  const profilePrefs = readUserPreferences(session).profile;
  const sellerName = !listing
    ? "Marketplace seller"
    : session.actor.actor_id === listing.actor_id
      ? session.actor.display_name
      : "Marketplace seller";
  const sellerRoleLabel =
    !listing || session.actor.actor_id !== listing.actor_id
      ? "Verified seller"
      : session.actor.role.replaceAll("_", " ");
  const sellerMemberSince =
    listing && session.actor.actor_id === listing.actor_id ? profilePrefs.memberSince ?? session.consent.captured_at : listing?.created_at;
  const sellerProfileHref = listing && session.actor.actor_id === listing.actor_id ? "/app/profile" : null;

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Listing detail"
          title={listing?.title ?? "Loading listing"}
          body="Review the lot, confirm fit, and take the next step with confidence."
          actions={
            !isBuyer ? (
              <Link className="button-ghost" href="/app/market/my-listings">
                My Listings
              </Link>
            ) : undefined
          }
        />
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error">{error}</p>
        </SurfaceCard>
      ) : null}

      {isLoading ? (
        <SurfaceCard>
          <p className="muted">Loading listing detail...</p>
        </SurfaceCard>
      ) : null}

      {listing ? (
        <div className="market-detail-layout">
          <div className="market-main-column">
            <PhotoCarousel commodity={listing.commodity} location={listing.location} slides={carouselSlides} />

            <SurfaceCard>
              <div className="market-title-block">
                <div className="pill-row">
                  <StatusPill tone={listing.status === "published" ? "online" : listing.status === "draft" ? "degraded" : "neutral"}>
                    {listing.status}
                  </StatusPill>
                  <StatusPill tone="neutral">
                    <Wheat size={14} />
                    {listing.commodity}
                  </StatusPill>
                  <StatusPill tone="neutral">
                    <MapPin size={14} />
                    {listing.location}
                  </StatusPill>
                </div>
                <h1>{listing.title}</h1>
                <p className="measure">{listing.summary}</p>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow="Lot snapshot"
                title="Why this lot is easy to review"
                body="This section keeps the essentials in one place so buyers and sellers can align on quantity, quality cues, and readiness before money moves."
              />
              <div className="market-spec-grid">
                {qualityDetails.map((detail) => (
                  <article className="market-spec-card" key={detail.label}>
                    <detail.icon className="market-spec-icon" size={18} />
                    <strong>{detail.label}</strong>
                    <span>{detail.value}</span>
                    <p className="muted">{detail.note}</p>
                  </article>
                ))}
              </div>
            </SurfaceCard>

            {!isBuyer ? (
              <SurfaceCard>
                <SectionHeading
                  eyebrow="Revision history"
                  title="Recent updates"
                  body="Keep seller-side changes visible here so you can review what shifted before you publish again."
                />
                <details className="market-revision-accordion" open>
                  <summary>Show {revisions.length} recorded revisions</summary>
                  <div className="market-revision-list">
                    {revisions.map((revision) => (
                      <article className="market-revision-item" key={`${revision.listing_id}-${revision.revision_number}`}>
                        <div className="market-revision-head">
                          <strong>Revision {revision.revision_number}</strong>
                          <StatusPill tone={revision.status === "published" ? "online" : revision.status === "draft" ? "degraded" : "neutral"}>
                            {revision.change_type.replaceAll("_", " ")}
                          </StatusPill>
                        </div>
                        <p className="muted">
                          {formatFullDate(revision.changed_at)} · {revision.price_amount} {revision.price_currency} · {revision.quantity_tons} tons
                        </p>
                        <p>{revision.summary}</p>
                      </article>
                    ))}
                    {revisions.length === 0 ? (
                      <p className="muted">No revision records are available for this listing yet.</p>
                    ) : null}
                  </div>
                </details>
              </SurfaceCard>
            ) : (
              <InsightCallout
                body="Buyer view stays focused on the live lot, seller trust, and the next commercial step."
                title="Buyer review view"
                tone="accent"
              />
            )}
          </div>

          <div className="market-side-column">
            <PriceCard
              hasUnpublishedChanges={listing.has_unpublished_changes}
              priceAmount={listing.price_amount}
              priceCurrency={listing.price_currency}
              primaryAction={
                <Link
                  className="button-primary"
                  href={`/app/market/negotiations?listingId=${listing.listing_id}`}
                >
                  {isBuyer ? "Make offer" : "Review negotiations"}
                  <ArrowUpRight size={16} />
                </Link>
              }
              quantityTons={listing.quantity_tons}
              secondaryAction={
                <button className="button-ghost" onClick={() => void handleShare()} type="button">
                  <Clipboard size={16} />
                  Share listing
                </button>
              }
              status={listing.status}
            />

            {actionCopy ? (
              <SurfaceCard>
                <InsightCallout body={actionCopy.body} title={actionCopy.title} tone={actionCopy.tone} />
              </SurfaceCard>
            ) : null}

            {shareState ? (
              <SurfaceCard>
                <p className="muted">{shareState}</p>
              </SurfaceCard>
            ) : null}

            {listingIntelligence ? (
              <SurfaceCard>
                <SectionHeading
                  eyebrow={isBuyer ? "Matching buyers and market fit" : "How this listing is performing"}
                  title={matchGuidance?.title ?? "Market fit guidance"}
                  body={matchGuidance?.body ?? "Market-fit guidance is loading for this lot."}
                />
                <div className="stack-md">
                  <div className="pill-row">
                    <StatusPill tone={listingIntelligence.matched_buyer_count > 0 ? "online" : "neutral"}>
                      {listingIntelligence.matched_buyer_count} matched buyer{listingIntelligence.matched_buyer_count === 1 ? "" : "s"}
                    </StatusPill>
                    {listingIntelligence.seller_entity_match ? (
                      <StatusPill tone="neutral">
                        Seller profile match · {listingIntelligence.seller_entity_match.trust_tier}
                      </StatusPill>
                    ) : null}
                  </div>

                  {listingIntelligence.buyer_matches.length > 0 ? (
                    <div className="stack-sm">
                      {listingIntelligence.buyer_matches.map((match) => {
                        const buyerProfileHref = match.operator_tags.some((tag) => ["buyer", "processor", "offtaker"].includes(tag.toLowerCase()))
                          ? `/app/agro-intelligence/buyers/${match.entity_id}`
                          : `/app/agro-intelligence/graph/${match.entity_id}`;
                        return (
                          <article className="stat-chip" key={match.entity_id}>
                            <div className="queue-head">
                              <strong>{match.canonical_name}</strong>
                              <StatusPill tone={match.trust_tier === "gold" ? "online" : match.trust_tier === "silver" ? "neutral" : "degraded"}>
                                {match.trust_tier}
                              </StatusPill>
                            </div>
                            <p className="muted">
                              {match.location_signature || "Location pending"} · {match.commodity_tags.join(", ") || "Commodities pending"}
                            </p>
                            <Link className="button-ghost" href={buyerProfileHref}>
                              Review buyer profile
                            </Link>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="muted">
                      No strong buyer match is visible for this lane yet.
                    </p>
                  )}
                </div>
              </SurfaceCard>
            ) : null}

            <SellerCard
              listingCountLabel={listingCount == null ? "Private" : String(listingCount)}
              memberSinceLabel={formatMonthYear(sellerMemberSince)}
              name={sellerName}
              note={
                sellerProfileHref
                  ? "Use this card to review your seller identity as buyers see it beside the lot."
                  : "Seller identity stays verified here even while the public profile remains limited."
              }
              profileHref={sellerProfileHref}
              profileLabel="Open profile"
              ratingLabel="4.8 / 5"
              roleLabel={sellerRoleLabel}
            />

            {trustSummary ? <CounterpartyTrustCard eyebrow="Trust and fit" summary={trustSummary} /> : null}

            <SurfaceCard>
              <div className="stack-sm">
                <div className="pill-row">
                  <StatusPill tone="neutral">Support</StatusPill>
                </div>
                <h3>Need support on this listing?</h3>
                <p className="muted">Raise an issue if the listing looks inaccurate, incomplete, or unsafe to trade against.</p>
                <Link className="button-ghost" href={`/contact?topic=listing-report&listingId=${listing.listing_id}`}>
                  <AlertTriangle size={16} />
                  Report listing
                </Link>
              </div>
            </SurfaceCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
