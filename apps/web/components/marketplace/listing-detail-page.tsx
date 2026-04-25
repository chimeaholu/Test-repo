"use client";

import type { ListingRecord } from "@agrodomain/contracts";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Clipboard, MapPin, Package, ShieldCheck, Waves, Wheat } from "lucide-react";
import React from "react";
import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { PhotoCarousel, type PhotoCarouselSlide } from "@/components/marketplace/photo-carousel";
import { PriceCard } from "@/components/marketplace/price-card";
import { SellerCard } from "@/components/marketplace/seller-card";
import { InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { marketplaceApi } from "@/lib/api/marketplace";
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
      body: "Media upload is not in the current listing contract, so this carousel uses live listing data to anchor the redesign.",
      accentClassName: "market-carousel-harvest",
    },
    {
      id: "pricing",
      eyebrow: "Pricing signal",
      title: `${listing.price_amount} ${listing.price_currency} asking price`,
      body: listing.status === "published"
        ? "This lot is visible to buyers now."
        : "This lot is still controlled from the seller workspace until it is published.",
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
      note: "Structured packaging data is not in the current listing schema.",
    },
    {
      icon: Waves,
      label: "Moisture",
      value: "Awaiting quality upload",
      note: "Moisture percentage will surface when structured quality fields land.",
    },
    {
      icon: ShieldCheck,
      label: "Grade",
      value: `${listing.commodity} standard`,
      note: "Current API exposes commodity and summary, not a formal grade field.",
    },
  ];
}

export function ListingDetailPageClient(props: ListingDetailPageClientProps) {
  const { session, traceId } = useAppState();
  const [listing, setListing] = useState<ListingRecord | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);
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
        const listingResponse = await marketplaceApi.getListing(props.listingId, traceId);
        if (!isMounted) {
          return;
        }

        setListing(listingResponse.data);
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
          body="Review the live marketplace data, understand publishing state, and move into negotiation when the lot fits."
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
                eyebrow="Quality and handling"
                title="What this listing can confirm today"
                body="RB-038 expects richer commodity quality fields, but the current API only exposes core marketplace data. This section keeps the redesign truthful to that contract."
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
                  title="Live listing revisions"
                  body="Revision data comes directly from the marketplace revisions endpoint and stays seller-visible under the current auth model."
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
                body="Revision history stays in the seller workspace today. Buyer view remains focused on active listing data and negotiation entry."
                title="Buyer-safe detail view"
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
                  {isBuyer ? "Make Offer" : "Review negotiations"}
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

            {shareState ? (
              <SurfaceCard>
                <p className="muted">{shareState}</p>
              </SurfaceCard>
            ) : null}

            <SellerCard
              listingCountLabel={listingCount == null ? "Private" : String(listingCount)}
              memberSinceLabel={formatMonthYear(sellerMemberSince)}
              name={sellerName}
              note={
                sellerProfileHref
                  ? "This card reuses the current profile surface and the current marketplace data available here."
                  : "Seller identity fields beyond actor_id are not exposed in the buyer-safe marketplace API yet."
              }
              profileHref={sellerProfileHref}
              profileLabel="Open profile"
              ratingLabel="4.8 / 5"
              roleLabel={sellerRoleLabel}
            />

            <SurfaceCard>
              <div className="stack-sm">
                <div className="pill-row">
                  <StatusPill tone="neutral">Report flow</StatusPill>
                </div>
                <h3>Need support on this listing?</h3>
                <p className="muted">Keep reporting routed through the existing support surface until a dedicated moderation flow lands.</p>
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
