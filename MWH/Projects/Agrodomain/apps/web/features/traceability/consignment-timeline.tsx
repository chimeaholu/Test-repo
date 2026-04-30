"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import type { ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";

type ConsignmentTimelineProps = {
  consignmentId: string;
};

export function ConsignmentTimelineClient(props: ConsignmentTimelineProps) {
  const { session, traceId } = useAppState();
  const [listing, setListing] = useState<ListingRecord | null>(null);
  const [revisions, setRevisions] = useState<Array<Record<string, unknown>>>([]);
  const [threads, setThreads] = useState<NegotiationThreadRead[]>([]);
  const [escrowCount, setEscrowCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      marketplaceApi.getListing(props.consignmentId, traceId),
      marketplaceApi.listListingRevisions(props.consignmentId, traceId),
      marketplaceApi.listNegotiations(traceId),
      walletApi.listEscrows(traceId),
    ])
      .then(([listingResponse, revisionsResponse, negotiationsResponse, escrowsResponse]) => {
        if (cancelled) {
          return;
        }
        setListing(listingResponse.data);
        setRevisions(revisionsResponse.data.items);
        setThreads(negotiationsResponse.data.items.filter((thread) => thread.listing_id === props.consignmentId));
        setEscrowCount(escrowsResponse.data.items.filter((item) => item.listing_id === props.consignmentId).length);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load sale and shipment history.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [props.consignmentId, session, traceId]);

  const timeline = useMemo(() => {
    if (!listing) {
      return [];
    }

    return [
      { key: "created", title: "Listed", detail: listing.created_at, tone: "online" as const },
      { key: "status", title: "Updated", detail: listing.status, tone: listing.status === "published" ? "online" as const : "degraded" as const },
      ...revisions.map((revision, index) => ({
        key: `revision-${index + 1}`,
        title: "Updated",
        detail: `${revision.change_type ?? "update"} at ${revision.changed_at ?? "unknown time"}`,
        tone: "neutral" as const,
      })),
      ...threads.map((thread) => ({
        key: thread.thread_id,
        title: "Offer linked",
        detail: `${thread.thread_id} is ${thread.status.replaceAll("_", " ")}`,
        tone: thread.status === "accepted" ? "online" as const : "degraded" as const,
      })),
      {
        key: "escrow",
        title: "Payment started",
        detail: escrowCount > 0 ? `${escrowCount} payment hold record(s) attached` : "Payment has not started yet",
        tone: escrowCount > 0 ? ("online" as const) : ("neutral" as const),
      },
    ];
  }, [escrowCount, listing, revisions, threads]);

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Sale and shipment history"
          title="Track the journey for this lot"
          body="Follow the lot from listing through offer, payment, and completion with a clear customer-facing history of what happened."
        />
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Offer linked</span>
            <strong>{threads.length}</strong>
            <span className="muted">See how many deal conversations were tied to this lot.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Payment started</span>
            <strong>{escrowCount}</strong>
            <span className="muted">Payment history appears once money-on-hold activity exists for this lot.</span>
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

      {listing ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow={listing.commodity}
            title={listing.title}
            body={listing.summary}
            actions={<StatusPill tone={listing.status === "published" ? "online" : "degraded"}>{listing.status}</StatusPill>}
          />
          <InfoList
            items={[
              { label: "Lot snapshot", value: `${listing.quantity_tons} tons · ${listing.location}` },
              { label: "Price", value: `${listing.price_amount} ${listing.price_currency}` },
              { label: "Timeline", value: `${threads.length} linked offer${threads.length === 1 ? "" : "s"}` },
              { label: "Supporting details", value: `${revisions.length} update${revisions.length === 1 ? "" : "s"}` },
            ]}
          />
        </SurfaceCard>
      ) : null}

      {timeline.length > 0 ? (
        <div className="stack-md">
          {timeline.map((item) => (
            <SurfaceCard key={item.key}>
              <SectionHeading
                eyebrow="Timeline"
                title={item.title}
                body={item.detail}
                actions={<StatusPill tone={item.tone}>{item.tone}</StatusPill>}
              />
            </SurfaceCard>
          ))}
        </div>
      ) : null}

      {!listing && !error ? (
        <SurfaceCard>
          <InsightCallout
            title="Sale and shipment history not found"
            body="No live lot record was found for this identifier yet."
            tone="accent"
          />
        </SurfaceCard>
      ) : null}
    </div>
  );
}
