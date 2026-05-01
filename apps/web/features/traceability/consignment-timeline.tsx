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
          setError(nextError instanceof Error ? nextError.message : "Unable to load traceability chain.");
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
      { key: "created", title: "Listing created", detail: listing.created_at, tone: "online" as const },
      { key: "status", title: "Current listing state", detail: listing.status, tone: listing.status === "published" ? "online" as const : "degraded" as const },
      ...revisions.map((revision, index) => ({
        key: `revision-${index + 1}`,
        title: `Revision ${revision.revision_number ?? index + 1}`,
        detail: `${revision.change_type ?? "update"} at ${revision.changed_at ?? "unknown time"}`,
        tone: "neutral" as const,
      })),
      ...threads.map((thread) => ({
        key: thread.thread_id,
        title: "Negotiation thread linked",
        detail: `${thread.thread_id} is ${thread.status.replaceAll("_", " ")}`,
        tone: thread.status === "accepted" ? "online" as const : "degraded" as const,
      })),
      {
        key: "escrow",
        title: "Settlement linkage",
        detail: escrowCount > 0 ? `${escrowCount} escrow record(s) attached` : "No settlement record linked yet",
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
          eyebrow="Traceability"
          title={`Traceability chain for ${props.consignmentId}`}
          body="This timeline is assembled from live listing, revision, negotiation, and settlement state rather than a static canned sequence."
        />
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Negotiations linked</span>
            <strong>{threads.length}</strong>
            <span className="muted">Accepted and in-flight negotiation context stays attached to the listing identifier.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Escrows linked</span>
            <strong>{escrowCount}</strong>
            <span className="muted">Settlement linkage appears only when the runtime already carries it.</span>
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
              { label: "Location", value: listing.location },
              { label: "Price", value: `${listing.price_amount} ${listing.price_currency}` },
              { label: "Revisions", value: revisions.length },
              { label: "Negotiations", value: threads.length },
            ]}
          />
        </SurfaceCard>
      ) : null}

      {timeline.length > 0 ? (
        <div className="stack-md">
          {timeline.map((item) => (
            <SurfaceCard key={item.key}>
              <SectionHeading
                eyebrow="Trace step"
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
            title="Traceability chain not found"
            body="This route expects a live listing identifier. No runtime record was found for the requested consignment."
            tone="accent"
          />
        </SurfaceCard>
      ) : null}
    </div>
  );
}
