"use client";

import React, { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { agroApiClient } from "@/lib/api/mock-client";

export function CooperativeDispatchBoard() {
  const { queue, session, traceId } = useAppState();
  const [listings, setListings] = useState<Array<Record<string, unknown>>>([]);
  const [threads, setThreads] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    void Promise.all([
      agroApiClient.listListings(traceId),
      agroApiClient.listNegotiations(traceId),
    ])
      .then(([listingResponse, threadResponse]) => {
        if (cancelled) {
          return;
        }
        setListings(listingResponse.data.items as Array<Record<string, unknown>>);
        setThreads(threadResponse.data.items as Array<Record<string, unknown>>);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load dispatch board.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const activeQueueItems = useMemo(
    () => queue.items.filter((item) => item.state !== "acked" && item.state !== "cancelled"),
    [queue.items],
  );
  const pendingConfirmationThreads = useMemo(
    () => threads.filter((item) => item.status === "pending_confirmation" || item.status === "accepted"),
    [threads],
  );

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Cooperative dispatch"
          title="Member dispatch board"
          body="Listings, member queue status, and deal checkpoints stay visible in one operations view so dispatch teams can act without switching context."
          actions={
            <div className="pill-row">
              <StatusPill tone={activeQueueItems.length > 0 ? "degraded" : "online"}>
                {activeQueueItems.length} active member queue items
              </StatusPill>
              <StatusPill tone={pendingConfirmationThreads.length > 0 ? "degraded" : "neutral"}>
                {pendingConfirmationThreads.length} proof checkpoints
              </StatusPill>
            </div>
          }
        />
        <div className="hero-kpi-grid" aria-label="Dispatch posture">
          <article className="hero-kpi">
            <span className="metric-label">Member actions</span>
            <strong>{activeQueueItems.length}</strong>
            <p className="muted">Items still needing batching, follow-up, or recovery.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Checkpoint threads</span>
            <strong>{pendingConfirmationThreads.length}</strong>
            <p className="muted">Accepted or pending deals still shaping dispatch work.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Visible supply</span>
            <strong>{listings.length}</strong>
            <p className="muted">Recent cooperative lots loaded into the workspace.</p>
          </article>
        </div>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
      </SurfaceCard>

      <div className="detail-grid">
        <SurfaceCard className="detail-card">
          <SectionHeading
            eyebrow="Member queue"
            title="Work that needs dispatch attention"
            body="See which member actions still need batching, follow-up, or recovery before dispatch can move forward."
          />
          <InsightCallout
            title="Queue discipline"
            body="Dispatch teams should be able to explain which member actions are blocking movement and which ones are only waiting for normal replay."
            tone="neutral"
          />
          <div className="stack-sm">
            {activeQueueItems.map((item) => (
              <article className="queue-item" key={item.item_id}>
                <div className="queue-head">
                  <strong>{item.intent}</strong>
                  <StatusPill tone={item.state === "conflicted" ? "offline" : "degraded"}>{item.state}</StatusPill>
                </div>
                <p className="muted">
                  Handoff {queue.handoff_channel ?? "direct"} • Attempts {item.attempt_count}
                </p>
              </article>
            ))}
            {activeQueueItems.length === 0 ? <p className="muted">No member queue items need dispatch attention right now.</p> : null}
          </div>
        </SurfaceCard>

        <SurfaceCard className="detail-card">
          <SectionHeading
            eyebrow="Deal checkpoints"
            title="Accepted and pending negotiations"
            body="Negotiation threads that can affect dispatch are surfaced alongside the listing they belong to."
          />
          <p className="muted detail-note">This keeps commercial confirmation work adjacent to batching and transport decisions.</p>
          <div className="stack-sm">
            {pendingConfirmationThreads.map((item) => (
              <article className="queue-item" key={String(item.thread_id)}>
                <div className="queue-head">
                  <strong>{String(item.listing_id)}</strong>
                  <StatusPill tone={item.status === "accepted" ? "online" : "degraded"}>{String(item.status)}</StatusPill>
                </div>
                <p className="muted">
                  Offer {String(item.current_offer_amount)} {String(item.current_offer_currency)}
                </p>
              </article>
            ))}
            {pendingConfirmationThreads.length === 0 ? <p className="muted">No accepted or pending negotiations are currently affecting dispatch.</p> : null}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Member supply"
          title="Recent cooperative lots"
          body="Keep current supply visible for batching, transport planning, and downstream handoff."
        />
        <div className="hero-kpi-grid" aria-label="Supply summary">
          <article className="hero-kpi">
            <span className="metric-label">Published lots</span>
            <strong>{listings.filter((item) => item.status === "published").length}</strong>
            <p className="muted">Ready for downstream operational planning.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Draft or closed</span>
            <strong>{listings.filter((item) => item.status !== "published").length}</strong>
            <p className="muted">Not yet ready for active dispatch allocation.</p>
          </article>
        </div>
        <div className="stack-sm">
          {listings.slice(0, 6).map((item) => (
            <article className="queue-item" key={String(item.listing_id)}>
              <div className="queue-head">
                <strong>{String(item.title)}</strong>
                <StatusPill tone={item.status === "published" ? "online" : "neutral"}>{String(item.status)}</StatusPill>
              </div>
              <p className="muted">
                {String(item.location)} • {String(item.quantity_tons)} tons • {String(item.price_amount)} {String(item.price_currency)}
              </p>
            </article>
          ))}
          {listings.length === 0 ? <p className="muted">No cooperative lots are currently available for batching.</p> : null}
        </div>
      </SurfaceCard>
    </div>
  );
}
