"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { marketplaceApi } from "@/lib/api/marketplace";
import type { ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";

export function DispatchBoardClient() {
  const { session, traceId } = useAppState();
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [threads, setThreads] = useState<NegotiationThreadRead[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    void Promise.all([marketplaceApi.listListings(traceId), marketplaceApi.listNegotiations(traceId)])
      .then(([listingsResponse, negotiationsResponse]) => {
        if (cancelled) {
          return;
        }
        setListings(listingsResponse.data.items);
        setThreads(negotiationsResponse.data.items);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load cooperative dispatch data.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const dispatchReady = useMemo(
    () =>
      listings.filter((listing) =>
        threads.some((thread) => thread.listing_id === listing.listing_id && thread.status !== "rejected"),
      ),
    [listings, threads],
  );

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Cooperative"
          title="Dispatch-ready lots and negotiation handoff state"
          body="This route now reads the current listing and negotiation runtime so operations can see which lots have real downstream activity."
          actions={
            <div className="pill-row">
              <StatusPill tone="neutral">Listings {listings.length}</StatusPill>
              <StatusPill tone="neutral">Negotiations {threads.length}</StatusPill>
            </div>
          }
        />
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Dispatch candidates</span>
            <strong>{dispatchReady.length}</strong>
            <span className="muted">Listings appear here only when real negotiation handoff state exists.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Runtime threads</span>
            <strong>{threads.length}</strong>
            <span className="muted">Operational review now reflects the current negotiation runtime.</span>
          </article>
        </div>
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeading
          eyebrow="Operational queue"
          title="Dispatch candidates"
          body="A listing only appears here when the runtime already has an associated thread. This avoids the old low-signal behavior where a route existed without operational state behind it."
        />
        {dispatchReady.length === 0 ? (
          <InsightCallout
            title="No dispatch candidates yet"
            body="The route is live, but there are no listings with active negotiation handoff state in the current runtime."
            tone="neutral"
          />
        ) : (
          <div className="stack-md">
            {dispatchReady.map((listing) => {
              const relatedThreads = threads.filter((thread) => thread.listing_id === listing.listing_id);
              return (
                <SurfaceCard key={listing.listing_id}>
                  <SectionHeading
                    eyebrow={listing.listing_id}
                    title={listing.title}
                    body={listing.summary}
                    actions={
                      <div className="pill-row">
                        <StatusPill tone={listing.status === "published" ? "online" : "degraded"}>{listing.status}</StatusPill>
                        <StatusPill tone="neutral">{relatedThreads.length} handoff threads</StatusPill>
                      </div>
                    }
                  />
                  <InfoList
                    items={[
                      { label: "Commodity", value: listing.commodity },
                      { label: "Location", value: listing.location },
                      { label: "Price", value: `${listing.price_amount} ${listing.price_currency}` },
                      { label: "Latest thread", value: relatedThreads[0]?.status ?? "pending" },
                    ]}
                  />
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
