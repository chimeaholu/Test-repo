"use client";

import type { ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";
import Link from "next/link";
import React from "react";
import { useEffect, useMemo, useState } from "react";

import { ListingManagementCard } from "@/components/marketplace/listing-management-card";
import { useAppState } from "@/components/app-provider";
import { EmptyState, InsightCallout, SectionHeading, SurfaceCard } from "@/components/ui-primitives";
import { marketplaceApi } from "@/lib/api/marketplace";

type ListingTab = "all" | "draft" | "published" | "unpublished";

const tabs: Array<{ id: ListingTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "unpublished", label: "Unpublished" },
];

function filterByTab(items: ListingRecord[], tab: ListingTab): ListingRecord[] {
  if (tab === "all") {
    return items;
  }
  if (tab === "draft") {
    return items.filter((item) => item.status === "draft");
  }
  if (tab === "published") {
    return items.filter((item) => item.status === "published");
  }
  return items.filter((item) => item.status === "closed");
}

function buildOfferMap(items: NegotiationThreadRead[]): Record<string, number> {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.listing_id] = (accumulator[item.listing_id] ?? 0) + 1;
    return accumulator;
  }, {});
}

export default function MyListingsPage() {
  const { session, traceId } = useAppState();
  const [items, setItems] = useState<ListingRecord[]>([]);
  const [offerCountByListing, setOfferCountByListing] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<ListingTab>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [listingsResponse, negotiationResponse] = await Promise.all([
          marketplaceApi.listListings(traceId),
          marketplaceApi.listNegotiations(traceId),
        ]);

        if (!isMounted) {
          return;
        }

        setItems(listingsResponse.data.items);
        setOfferCountByListing(buildOfferMap(negotiationResponse.data.items));
        setError(null);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load listings.");
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
  }, [session, traceId]);

  const filteredItems = useMemo(() => filterByTab(items, activeTab), [activeTab, items]);
  const selectedVisibleIds = filteredItems.filter((item) => selectedIds.includes(item.listing_id)).map((item) => item.listing_id);

  if (!session) {
    return null;
  }

  const activeSession = session;

  if (activeSession.actor.role === "buyer") {
    return (
      <div className="content-stack">
        <SurfaceCard>
          <EmptyState
            actions={
              <Link className="button-primary" href="/app/market/listings">
                Return to marketplace
              </Link>
            }
            body="This view is for sellers managing active lots. Buyers stay in the marketplace and negotiation flow."
            title="My Listings is not available for buyer accounts"
          />
        </SurfaceCard>
      </div>
    );
  }

  async function applyListingStatus(nextItems: ListingRecord[]) {
    setItems(nextItems);
    setSelectedIds((current) => current.filter((item) => nextItems.some((listing) => listing.listing_id === item)));
  }

  async function toggleListingStatus(listing: ListingRecord) {
    setBusyId(listing.listing_id);
    setNotice(null);
    setError(null);

    try {
      const response =
        listing.status === "published"
          ? await marketplaceApi.unpublishListing(
              { listing_id: listing.listing_id },
              traceId,
              activeSession.actor.actor_id,
              activeSession.actor.country_code,
            )
          : await marketplaceApi.publishListing(
              { listing_id: listing.listing_id },
              traceId,
              activeSession.actor.actor_id,
              activeSession.actor.country_code,
            );

      await applyListingStatus(
        items.map((item) => (item.listing_id === listing.listing_id ? response.data.listing : item)),
      );
      setNotice(`${response.data.listing.title} is now ${response.data.listing.status}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update listing.");
    } finally {
      setBusyId(null);
    }
  }

  async function applyBulkStatus(targetStatus: "publish" | "unpublish") {
    const selectedItems = filteredItems.filter((item) => selectedIds.includes(item.listing_id));
    if (selectedItems.length === 0) {
      return;
    }

    setIsBulkBusy(true);
    setNotice(null);
    setError(null);

    try {
      const responses = await Promise.all(
        selectedItems.map((item) =>
          targetStatus === "publish"
            ? marketplaceApi.publishListing(
                { listing_id: item.listing_id },
                traceId,
                activeSession.actor.actor_id,
                activeSession.actor.country_code,
              )
            : marketplaceApi.unpublishListing(
                { listing_id: item.listing_id },
                traceId,
                activeSession.actor.actor_id,
                activeSession.actor.country_code,
              ),
        ),
      );

      const replacements = Object.fromEntries(responses.map((response) => [response.data.listing.listing_id, response.data.listing]));
      await applyListingStatus(items.map((item) => replacements[item.listing_id] ?? item));
      setSelectedIds([]);
      setNotice(
        targetStatus === "publish"
          ? `Published ${responses.length} selected listing${responses.length === 1 ? "" : "s"}.`
          : `Unpublished ${responses.length} selected listing${responses.length === 1 ? "" : "s"}.`,
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to complete the bulk action.");
    } finally {
      setIsBulkBusy(false);
    }
  }

  const tabCounts: Record<ListingTab, number> = {
    all: items.length,
    draft: filterByTab(items, "draft").length,
    published: filterByTab(items, "published").length,
    unpublished: filterByTab(items, "unpublished").length,
  };

  const allVisibleSelected = filteredItems.length > 0 && selectedVisibleIds.length === filteredItems.length;

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Your listings"
          title="See what is live, what needs work, and what buyers are responding to"
          body="Manage every draft, live lot, and completed record from one seller view."
          actions={
            <Link className="button-ghost" href="/app/market/listings">
              Open marketplace
            </Link>
          }
        />
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Needs attention</span>
            <strong>{items.filter((item) => item.status === "draft" || item.has_unpublished_changes).length}</strong>
            <span className="muted">Drafts and unpublished changes that still need review.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Live now</span>
            <strong>{items.filter((item) => item.status === "published").length}</strong>
            <span className="muted">Lots that buyers can review in the marketplace today.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Completed</span>
            <strong>{items.length}</strong>
            <span className="muted">All seller records, including closed lots, stay visible here.</span>
          </article>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="market-toolbar">
          <div className="market-tab-bar" role="tablist" aria-label="Filter listings by status">
            {tabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "market-tab active" : "market-tab"}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
                <span>{tabCounts[tab.id]}</span>
              </button>
            ))}
          </div>

          <label className="market-select-all">
            <input
              checked={allVisibleSelected}
              onChange={(event) =>
                setSelectedIds(
                  event.target.checked
                    ? Array.from(new Set([...selectedIds, ...filteredItems.map((item) => item.listing_id)]))
                    : selectedIds.filter((id) => !filteredItems.some((item) => item.listing_id === id)),
                )
              }
              type="checkbox"
            />
            <span>Select visible</span>
          </label>
        </div>

        <div className="market-bulk-bar">
          <p className="muted">
            {selectedIds.length} selected. Use bulk actions to move visible lots live or take them out of buyer view.
          </p>
          <div className="actions-row">
            <button
              className="button-secondary"
              disabled={isBulkBusy || selectedIds.length === 0}
              onClick={() => void applyBulkStatus("publish")}
              type="button"
            >
              {isBulkBusy ? "Working..." : "Publish selected"}
            </button>
            <button
              className="button-ghost"
              disabled={isBulkBusy || selectedIds.length === 0}
              onClick={() => void applyBulkStatus("unpublish")}
              type="button"
            >
              Unpublish selected
            </button>
          </div>
        </div>
      </SurfaceCard>

      {notice ? (
        <InsightCallout body={notice} title="Listing status updated" tone="brand" />
      ) : null}

      {error ? (
        <SurfaceCard>
          <p className="field-error">{error}</p>
        </SurfaceCard>
      ) : null}

      {isLoading ? (
        <SurfaceCard>
          <p className="muted">Loading your listings...</p>
        </SurfaceCard>
      ) : null}

      {!isLoading && filteredItems.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            actions={
              <Link className="button-primary" href="/app/market/listings">
                Create or inspect listings
              </Link>
            }
            body="No listings match the current status filter."
            title="Nothing to manage in this view"
          />
        </SurfaceCard>
      ) : null}

      <div className="market-management-grid" role="list" aria-label="Managed listings">
        {filteredItems.map((item) => (
          <ListingManagementCard
            editHref={`/app/market/listings/${item.listing_id}`}
            isBusy={busyId === item.listing_id}
            isSelected={selectedIds.includes(item.listing_id)}
            key={item.listing_id}
            listing={item}
            offersReceived={offerCountByListing[item.listing_id] ?? 0}
            onSelect={(checked) =>
              setSelectedIds((current) =>
                checked ? Array.from(new Set([...current, item.listing_id])) : current.filter((id) => id !== item.listing_id),
              )
            }
            onToggleStatus={() => void toggleListingStatus(item)}
            viewsLabel="Stub"
          />
        ))}
      </div>
    </div>
  );
}
