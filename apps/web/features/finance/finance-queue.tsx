"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { walletApi } from "@/lib/api/wallet";
import { latestNotification, notificationSummary, type EscrowReadModel } from "@/features/wallet/model";

export function FinanceQueueClient() {
  const { queue, session, traceId } = useAppState();
  const [escrows, setEscrows] = useState<EscrowReadModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void walletApi
      .listEscrows(traceId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setEscrows(response.data.items);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load finance queue.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const reviewQueue = useMemo(
    () =>
      escrows.filter(
        (item) =>
          item.state === "partner_pending" ||
          item.state === "funded" ||
          item.state === "disputed" ||
          item.state === "pending_funds",
      ),
    [escrows],
  );

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Finance"
          title="Protected finance queue with settlement and consent posture"
          body="Finance review reads wallet and escrow runtime directly. Queue items surface participant, state, and delivery posture without relying on generic shell filler."
          actions={
            <div className="pill-row">
              <StatusPill tone={session.consent.state === "consent_granted" ? "online" : "offline"}>
                Consent {session.consent.state}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                Queue {queue.connectivity_state}
              </StatusPill>
            </div>
          }
        />
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Actionable reviews</span>
            <strong>{reviewQueue.length}</strong>
            <span className="muted">Only live settlement states that require finance attention count here.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Escrows observed</span>
            <strong>{escrows.length}</strong>
            <span className="muted">The queue stays empty rather than implying hidden work.</span>
          </article>
        </div>
      </SurfaceCard>

      {isLoading ? (
        <SurfaceCard>
          <p className="muted">Loading finance review queue...</p>
        </SurfaceCard>
      ) : null}

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeading
          eyebrow="Queue posture"
          title="Review summary"
          body="Only live settlement records count here. If there is nothing actionable, the queue stays empty instead of implying hidden work."
        />
        <InfoList
          items={[
            { label: "Actionable reviews", value: reviewQueue.length },
            { label: "Observed escrows", value: escrows.length },
            { label: "Country pack", value: session.actor.country_code },
            { label: "Actor role", value: session.actor.role },
          ]}
        />
      </SurfaceCard>

      {reviewQueue.length === 0 && !isLoading ? (
        <SurfaceCard>
          <InsightCallout
            title="No finance work is currently queued"
            body="This route is live, but the runtime has no escrow states that require finance attention right now."
            tone="neutral"
          />
        </SurfaceCard>
      ) : null}

      {reviewQueue.length > 0 ? (
        <div className="stack-md">
          {reviewQueue.map((escrow) => {
            const notification = latestNotification(escrow);
            return (
              <SurfaceCard key={escrow.escrow_id}>
                <SectionHeading
                  eyebrow={escrow.escrow_id}
                  title={`Review ${escrow.state.replaceAll("_", " ")}`}
                  body={`Listing ${escrow.listing_id} for ${escrow.amount} ${escrow.currency}. Buyer ${escrow.buyer_actor_id}; seller ${escrow.seller_actor_id}.`}
                  actions={
                    <div className="pill-row">
                      <StatusPill tone={escrow.state === "disputed" ? "offline" : escrow.state === "partner_pending" ? "degraded" : "neutral"}>
                        {escrow.state}
                      </StatusPill>
                      <StatusPill tone={notification ? "degraded" : "neutral"}>
                        {notification ? notification.delivery_state : "no notification"}
                      </StatusPill>
                    </div>
                  }
                />
                <InfoList
                  items={[
                    { label: "Timeline steps", value: escrow.timeline.length },
                    {
                      label: "Notification posture",
                      value: notification ? notificationSummary(notification).headline : "Not emitted",
                    },
                    { label: "Partner reference", value: escrow.partner_reference ?? "pending" },
                    { label: "Updated at", value: escrow.updated_at },
                  ]}
                />
              </SurfaceCard>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
