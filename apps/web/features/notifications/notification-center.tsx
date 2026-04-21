"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { agroApiClient } from "@/lib/api/mock-client";

export function NotificationCenter() {
  const { queue, session, traceId } = useAppState();
  const [items, setItems] = useState<Array<{
    notification_id: string;
    title: string;
    body: string;
    route: string;
    kind: string;
    ack_state: string;
    delivery_state: string;
    created_at: string | null;
  }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    void agroApiClient
      .getNotificationCenter(traceId)
      .then((response) => {
        if (!cancelled) {
          setItems(response.data.items);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load notifications.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const queueDerivedItems = useMemo(
    () =>
      queue.items.map((item) => ({
        notification_id: `queue-${item.item_id}`,
        title: item.intent,
        body: item.last_error_code ? `Recovery needed: ${item.last_error_code}` : "Queued mutation awaiting replay.",
        route: "/app/offline/outbox",
        kind: "queue_recovery",
        ack_state: item.state === "acked" ? "read" : "unread",
        delivery_state: item.state,
        created_at: item.created_at,
      })),
    [queue.items],
  );

  if (!session) {
    return null;
  }

  const merged = [...items, ...queueDerivedItems]
    .sort((left, right) => (right.created_at ?? "").localeCompare(left.created_at ?? ""))
    .slice(0, 20);

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Notifications"
          title="Important updates across your workflow"
          body="Escrow changes, recovery prompts, and system events are grouped here so teams can jump directly back to the affected work."
          actions={
            <div className="pill-row">
              <StatusPill tone={merged.some((item) => item.ack_state === "unread") ? "degraded" : "online"}>
                {merged.filter((item) => item.ack_state === "unread").length} unread
              </StatusPill>
            </div>
          }
        />
        <div className="hero-kpi-grid" aria-label="Notification posture">
          <article className="hero-kpi">
            <span className="metric-label">Unread items</span>
            <strong>{merged.filter((item) => item.ack_state === "unread").length}</strong>
            <p className="muted">Items still requiring operator acknowledgement or action.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Queue-derived recovery</span>
            <strong>{queueDerivedItems.length}</strong>
            <p className="muted">Notifications generated from recovery and replay conditions.</p>
          </article>
        </div>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
      </SurfaceCard>

      <InsightCallout
        title="Actionability first"
        body="Notifications are useful only if the route back to the affected work is obvious, so each card keeps a direct recovery or follow-up action."
        tone="neutral"
      />

      <div className="stack-sm notification-list">
        {merged.map((item) => (
          <article className="queue-item" key={item.notification_id}>
            <div className="queue-head">
              <strong>{item.title}</strong>
              <StatusPill tone={item.ack_state === "unread" ? "degraded" : "neutral"}>{item.delivery_state}</StatusPill>
            </div>
            <p className="muted">{item.body}</p>
            <p className="muted">
              {item.kind} • {item.created_at ?? "timestamp unavailable"}
            </p>
            <div className="actions-row">
              <Link className="button-ghost" href={item.route}>
                Open related work
              </Link>
            </div>
          </article>
        ))}
        {merged.length === 0 ? <p className="muted">There are no active notifications for this account.</p> : null}
      </div>
    </div>
  );
}
