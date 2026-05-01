"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";

import { DashboardActionTile } from "@/components/dashboard-action-tile";
import { MarketIcon, ProfileIcon, TruckIcon, WalletIcon } from "@/components/icons";
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
          setError("Unable to load the transport workspace right now.");
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
          setError("Unable to load the transport workspace right now.");
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
          eyebrow="Transport workspace"
          title="See active deliveries, open loads, and payout progress in one place."
          body="Use this workspace to keep trips moving, update milestones, and stay ready for the next load."
          actions={
            snapshot ? (
              <div className="pill-row">
                <StatusPill tone={snapshot.activeShipments > 0 ? "online" : "neutral"}>
                  Deliveries {snapshot.activeShipments}
                </StatusPill>
                <StatusPill tone={snapshot.completedDeliveries > 0 ? "online" : "neutral"}>
                  Payouts {snapshot.completedDeliveries}
                </StatusPill>
              </div>
            ) : null
          }
        />

        <div className="metrics-grid">
          <article className="metric-card">
            <span className="metric-label">Deliveries in progress</span>
            <strong className="metric-value">{snapshot?.activeShipments ?? "..."}</strong>
            <p className="muted">Trips currently in motion and waiting on the next update.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Loads near you</span>
            <strong className="metric-value">{snapshot?.availableLoads ?? "..."}</strong>
            <p className="muted">Loads ready for pickup planning and delivery coordination.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Recent completions</span>
            <strong className="metric-value">{snapshot?.completedDeliveries ?? "..."}</strong>
            <p className="muted">Closed deliveries that already reached final confirmation.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Payouts and earnings</span>
            <strong className="metric-value">{snapshot?.releasedValue ?? "--"}</strong>
            <p className="muted">The value tied to recently completed deliveries.</p>
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
            title="Choose the next transport task"
            body="Open the next load, live delivery, or payout action without extra back-and-forth."
          />
          <div className="task-list">
            <DashboardActionTile
              detail="Review loads available for pickup and plan the next delivery."
              eyebrow="Do now"
              href="/app/market/listings"
              icon={<MarketIcon size={20} />}
              label="View loads"
            />
            <DashboardActionTile
              detail="Open the transport board and keep the next delivery moving."
              eyebrow="Keep moving"
              href="/app/trucker"
              icon={<TruckIcon size={20} />}
              label="Track delivery"
            />
            <DashboardActionTile
              detail="Open the latest delivery timeline and confirm the next handoff."
              eyebrow="Track"
              href={snapshot?.shipmentHref ?? "/app/market/listings"}
              icon={<TruckIcon size={20} />}
              label="Active shipments"
              tone="secondary"
            />
            <DashboardActionTile
              detail="Review recent delivery timelines and confirm completed handoffs."
              eyebrow="History"
              href={snapshot?.completedHref ?? "/app/market/listings"}
              icon={<WalletIcon size={20} />}
              label="View payouts"
              tone="secondary"
            />
            <DashboardActionTile
              detail="Keep vehicle and account details current before the next assignment."
              eyebrow="Keep ready"
              href="/app/profile"
              icon={<ProfileIcon size={20} />}
              label="Vehicle details"
              tone="secondary"
            />
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="What is moving now"
            title="Recent delivery activity"
            body="Every update below reflects the latest delivery, load, or payout milestone."
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
              title={isLoading ? "Loading delivery activity" : "No delivery activity yet"}
              body="Delivery updates will appear here as new loads move from confirmation to completion."
            />
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <InsightCallout
          title="What needs an update"
          body="Use delivery history to confirm recent handoffs and keep driver details current before the next assignment."
          tone="accent"
        />
      </SurfaceCard>
    </div>
  );
}
