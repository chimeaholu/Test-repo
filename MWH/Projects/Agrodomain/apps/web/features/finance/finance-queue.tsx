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
          eyebrow="Finance review"
          title="Payments and disputes waiting for review"
          body="Use this internal board to work through the next finance-sensitive cases in order."
          actions={
            <div className="pill-row">
              <StatusPill tone={session.consent.state === "consent_granted" ? "online" : "offline"}>
                {session.consent.state === "consent_granted" ? "Ready" : "Check permissions"}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                {queue.connectivity_state === "degraded" ? "Limited updates" : "Live updates"}
              </StatusPill>
            </div>
          }
        />
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Priority reviews</span>
            <strong>{reviewQueue.length}</strong>
            <span className="muted">Cases that still need a finance decision right now.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Recent resolutions</span>
            <strong>{escrows.length}</strong>
            <span className="muted">Resolved and active finance records visible to this board.</span>
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
          eyebrow="Case details"
          title="Review summary"
          body="Use this summary to understand what needs action before opening the next case."
        />
        <InfoList
          items={[
            { label: "Priority reviews", value: reviewQueue.length },
            { label: "Visible finance records", value: escrows.length },
            { label: "Country", value: session.actor.country_code },
            { label: "Workspace", value: session.actor.role },
          ]}
        />
      </SurfaceCard>

      {reviewQueue.length === 0 && !isLoading ? (
        <SurfaceCard>
          <InsightCallout
            title="No finance work is currently queued"
            body="When a payment or dispute needs attention, it will appear here."
            tone="neutral"
          />
        </SurfaceCard>
      ) : null}

      {reviewQueue.length > 0 ? (
        <div className="stack-md">
          {reviewQueue.map((escrow, index) => {
            const notification = latestNotification(escrow);
            return (
              <SurfaceCard key={escrow.escrow_id}>
                <SectionHeading
                  eyebrow={`Case ${index + 1}`}
                  title={`Review ${escrow.state.replaceAll("_", " ")}`}
                  body={`${escrow.amount} ${escrow.currency} linked to listing ${escrow.listing_id}. Open the case to confirm the right next finance action.`}
                  actions={
                    <div className="pill-row">
                      <StatusPill tone={escrow.state === "disputed" ? "offline" : escrow.state === "partner_pending" ? "degraded" : "neutral"}>
                        {escrow.state}
                      </StatusPill>
                      <StatusPill tone={notification ? "degraded" : "neutral"}>
                        {notification ? notification.delivery_state : "no update"}
                      </StatusPill>
                    </div>
                  }
                />
                <InfoList
                  items={[
                    { label: "Timeline steps", value: escrow.timeline.length },
                    {
                      label: "Latest update",
                      value: notification ? notificationSummary(notification).headline : "No update sent yet",
                    },
                    { label: "Partner reference", value: escrow.partner_reference ?? "Pending" },
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
