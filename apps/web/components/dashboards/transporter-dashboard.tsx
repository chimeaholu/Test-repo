"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { EmptyState, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import type { ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";
import { marketplaceApi } from "@/lib/api/marketplace";
import type { EscrowRead } from "@/lib/api-types";
import { walletApi } from "@/lib/api/wallet";
import { formatMoney } from "@/features/wallet/model";

type TransporterSnapshot = {
  activeShipments: number;
  activity: Array<{
    detail: string;
    href: string;
    key: string;
    label: string;
    timestamp: string;
    tone: "online" | "offline" | "degraded" | "neutral";
  }>;
  availableLoads: number;
  completedDeliveries: number;
  completedHref: string;
  releasedValue: string | null;
  shipmentHref: string;
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildSnapshot(params: {
  escrows: EscrowRead[];
  listings: ListingRecord[];
  negotiations: NegotiationThreadRead[];
}): TransporterSnapshot {
  const publishedListings = params.listings.filter((listing) => listing.status === "published");
  const activeEscrows = params.escrows.filter((escrow) =>
    ["pending_funds", "partner_pending", "funded", "disputed"].includes(escrow.state),
  );
  const completedEscrows = params.escrows.filter((escrow) => escrow.state === "released");

  const activity = [
    ...activeEscrows.map((escrow) => {
      const latestTransition = [...escrow.timeline].sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
      return {
        detail: `${latestTransition?.transition?.replaceAll("_", " ") ?? escrow.state.replaceAll("_", " ")} · ${formatMoney(escrow.amount, escrow.currency)}`,
        href: `/app/traceability/${escrow.listing_id}`,
        key: escrow.escrow_id,
        label: `Shipment ${escrow.escrow_id}`,
        timestamp: latestTransition?.created_at ?? escrow.updated_at,
        tone: escrow.state === "funded" ? ("online" as const) : ("degraded" as const),
      };
    }),
    ...completedEscrows.map((escrow) => ({
      detail: `Released delivery value ${formatMoney(escrow.amount, escrow.currency)}`,
      href: `/app/traceability/${escrow.listing_id}`,
      key: `${escrow.escrow_id}-released`,
      label: `Delivery ${escrow.escrow_id}`,
      timestamp: escrow.released_at ?? escrow.updated_at,
      tone: "online" as const,
    })),
    ...params.negotiations
      .filter((thread) => thread.status === "accepted" || thread.status === "pending_confirmation")
      .map((thread) => ({
        detail: `${thread.current_offer_amount} ${thread.current_offer_currency} · ${thread.status.replaceAll("_", " ")}`,
        href: `/app/traceability/${thread.listing_id}`,
        key: thread.thread_id,
        label: `Load ${thread.thread_id}`,
        timestamp: thread.last_action_at,
        tone: thread.status === "accepted" ? ("online" as const) : ("degraded" as const),
      })),
  ]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 5);

  const releasedValue =
    completedEscrows.length > 0
      ? formatMoney(
          completedEscrows.reduce((total, escrow) => total + escrow.amount, 0),
          completedEscrows[0]?.currency ?? "GHS",
        )
      : null;

  return {
    activeShipments: activeEscrows.length,
    activity,
    availableLoads: publishedListings.length,
    completedDeliveries: completedEscrows.length,
    completedHref: completedEscrows[0] ? `/app/traceability/${completedEscrows[0].listing_id}` : "/app/market/listings",
    releasedValue,
    shipmentHref: activeEscrows[0]
      ? `/app/traceability/${activeEscrows[0].listing_id}`
      : publishedListings[0]
        ? `/app/traceability/${publishedListings[0].listing_id}`
        : "/app/market/listings",
  };
}

export function TransporterDashboard() {
  const { session, traceId } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<TransporterSnapshot | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void Promise.allSettled([
      marketplaceApi.listListings(traceId),
      marketplaceApi.listNegotiations(traceId),
      walletApi.listEscrows(traceId),
    ])
      .then((results) => {
        if (cancelled) {
          return;
        }

        const [listingsResult, negotiationsResult, escrowsResult] = results;
        if (
          listingsResult.status !== "fulfilled" ||
          negotiationsResult.status !== "fulfilled" ||
          escrowsResult.status !== "fulfilled"
        ) {
          setError("Unable to load the transporter dashboard right now.");
          return;
        }

        setSnapshot(
          buildSnapshot({
            escrows: escrowsResult.value.data.items,
            listings: listingsResult.value.data.items,
            negotiations: negotiationsResult.value.data.items,
          }),
        );
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load the transporter dashboard right now.");
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

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard className="hero-surface">
        <SectionHeading
          eyebrow="Transporter dashboard"
          title="Track live loads, follow shipment state, and keep delivery proof within reach."
          body="Stay on top of available loads, active deliveries, and confirmed completions from one logistics view."
          actions={
            snapshot ? (
              <div className="pill-row">
                <StatusPill tone={snapshot.activeShipments > 0 ? "online" : "neutral"}>
                  Active {snapshot.activeShipments}
                </StatusPill>
                <StatusPill tone={snapshot.completedDeliveries > 0 ? "online" : "neutral"}>
                  Completed {snapshot.completedDeliveries}
                </StatusPill>
              </div>
            ) : null
          }
        />

        <div className="metrics-grid">
          <article className="metric-card">
            <span className="metric-label">Active shipments</span>
            <strong className="metric-value">{snapshot?.activeShipments ?? "..."}</strong>
            <p className="muted">Consignments currently in motion and awaiting the next handoff.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Available loads</span>
            <strong className="metric-value">{snapshot?.availableLoads ?? "..."}</strong>
            <p className="muted">Loads ready for pickup planning and delivery coordination.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Completed deliveries</span>
            <strong className="metric-value">{snapshot?.completedDeliveries ?? "..."}</strong>
            <p className="muted">Deliveries marked complete and ready for final confirmation.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Earnings</span>
            <strong className="metric-value">{snapshot?.releasedValue ?? "--"}</strong>
            <p className="muted">A view of the value tied to recently completed consignments.</p>
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

      <div className="dashboard-grid">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Quick actions"
            title="Open the tools that keep deliveries moving"
            body="Go straight to load discovery, shipment tracking, delivery history, and account details."
          />
          <div className="task-list">
            <Link className="task-card primary" href="/app/market/listings">
              <strong>Browse loads</strong>
              <p className="muted">Review loads available for pickup and plan the next delivery.</p>
            </Link>
            <Link className="task-card primary" href="/app/trucker">
              <strong>AgroTrucker</strong>
              <p className="muted">Switch into the transport marketplace for route-aware load matching and carrier controls.</p>
            </Link>
            <Link className="task-card secondary" href={snapshot?.shipmentHref ?? "/app/market/listings"}>
              <strong>Active shipments</strong>
              <p className="muted">Open the latest consignment timeline and confirm the next handoff.</p>
            </Link>
            <Link className="task-card secondary" href={snapshot?.completedHref ?? "/app/market/listings"}>
              <strong>Delivery history</strong>
              <p className="muted">Review recent delivery timelines and confirm completed handoffs.</p>
            </Link>
            <Link className="task-card secondary" href="/app/profile">
              <strong>Vehicle management</strong>
              <p className="muted">Review your account details and keep transport information up to date.</p>
            </Link>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="Shipment events"
            title="Recent transport-adjacent activity"
            body="Every event below reflects the latest shipment, negotiation, or settlement milestone."
          />
          {snapshot?.activity.length ? (
            <div className="task-list">
              {snapshot.activity.map((item) => (
                <Link className="task-card secondary" href={item.href} key={item.key}>
                  <div className="queue-head">
                    <strong>{item.label}</strong>
                    <StatusPill tone={item.tone}>{item.tone}</StatusPill>
                  </div>
                  <p className="muted">{item.detail}</p>
                  <span className="metric-label">{formatTimestamp(item.timestamp)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title={isLoading ? "Loading shipment events" : "No shipment events yet"}
              body="Shipment updates will appear here as new loads move from confirmation to delivery."
            />
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <InsightCallout
          title="Transport tip"
          body="Use delivery history to confirm recent handoffs and keep your account details current before the next assignment."
          tone="accent"
        />
      </SurfaceCard>
    </div>
  );
}
