"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { EmptyState, InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import type { ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";
import { marketplaceApi } from "@/lib/api/marketplace";
import type { EscrowRead, WalletSummary } from "@/lib/api-types";
import { walletApi } from "@/lib/api/wallet";
import { formatMoney } from "@/features/wallet/model";

type BuyerSnapshot = {
  activity: Array<{
    detail: string;
    href: string;
    key: string;
    label: string;
    timestamp: string;
    tone: "online" | "offline" | "degraded" | "neutral";
  }>;
  activeNegotiations: number;
  availableListings: number;
  completedTrades: number;
  marketPulse: Array<{
    averagePrice: string;
    commodity: string;
    lotCount: number;
  }>;
  shipmentHref: string;
  wallet: WalletSummary | null;
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toneForThread(thread: NegotiationThreadRead): "online" | "degraded" | "neutral" {
  if (thread.status === "accepted") {
    return "online";
  }
  if (thread.status === "pending_confirmation") {
    return "degraded";
  }
  return "neutral";
}

function buildSnapshot(params: {
  actorId: string;
  escrows: EscrowRead[];
  listings: ListingRecord[];
  negotiations: NegotiationThreadRead[];
  wallet: WalletSummary | null;
}): BuyerSnapshot {
  const publishedListings = params.listings.filter((listing) => listing.status === "published");
  const buyerThreads = params.negotiations.filter((thread) => thread.buyer_actor_id === params.actorId);
  const activeNegotiations = buyerThreads.filter((thread) => thread.status === "open" || thread.status === "pending_confirmation");
  const buyerEscrows = params.escrows.filter((escrow) => escrow.buyer_actor_id === params.actorId);
  const completedTrades = buyerEscrows.filter((escrow) => escrow.state === "released");
  const trackedListingIds = buyerThreads.map((thread) => thread.listing_id);

  const marketPulse = Object.values(
    publishedListings.reduce<Record<string, { commodity: string; prices: number[] }>>((accumulator, listing) => {
      const current = accumulator[listing.commodity] ?? {
        commodity: listing.commodity,
        prices: [],
      };
      current.prices.push(listing.price_amount);
      accumulator[listing.commodity] = current;
      return accumulator;
    }, {}),
  )
    .map((entry) => ({
      averagePrice: formatMoney(
        entry.prices.reduce((total, price) => total + price, 0) / entry.prices.length,
        "GHS",
      ),
      commodity: entry.commodity,
      lotCount: entry.prices.length,
    }))
    .sort((left, right) => right.lotCount - left.lotCount)
    .slice(0, 3);

  const activity = [
    ...buyerThreads.map((thread) => ({
      detail: `${thread.current_offer_amount} ${thread.current_offer_currency} · ${thread.status.replaceAll("_", " ")}`,
      href: `/app/traceability/${thread.listing_id}`,
      key: thread.thread_id,
      label: `Negotiation ${thread.thread_id}`,
      timestamp: thread.last_action_at,
      tone: toneForThread(thread),
    })),
    ...buyerEscrows.map((escrow) => ({
      detail: `${formatMoney(escrow.amount, escrow.currency)} · ${escrow.state.replaceAll("_", " ")}`,
      href: `/app/traceability/${escrow.listing_id}`,
      key: escrow.escrow_id,
      label: `Settlement ${escrow.escrow_id}`,
      timestamp: escrow.updated_at,
      tone: escrow.state === "released" ? ("online" as const) : escrow.state === "reversed" ? ("offline" as const) : ("degraded" as const),
    })),
  ]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 5);

  return {
    activity,
    activeNegotiations: activeNegotiations.length,
    availableListings: publishedListings.length,
    completedTrades: completedTrades.length,
    marketPulse,
    shipmentHref: trackedListingIds[0] ? `/app/traceability/${trackedListingIds[0]}` : "/app/market/listings",
    wallet: params.wallet,
  };
}

export function BuyerDashboard() {
  const { session, traceId } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<BuyerSnapshot | null>(null);

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
      walletApi.getWalletSummary(traceId),
    ])
      .then((results) => {
        if (cancelled) {
          return;
        }

        const [listingsResult, negotiationsResult, escrowsResult, walletResult] = results;

        if (
          listingsResult.status !== "fulfilled" ||
          negotiationsResult.status !== "fulfilled" ||
          escrowsResult.status !== "fulfilled"
        ) {
          setError("Unable to load the buyer dashboard right now.");
          return;
        }

        setSnapshot(
          buildSnapshot({
            actorId: session.actor.actor_id,
            escrows: escrowsResult.value.data.items,
            listings: listingsResult.value.data.items,
            negotiations: negotiationsResult.value.data.items,
            wallet: walletResult.status === "fulfilled" ? walletResult.value.data : null,
          }),
        );
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load the buyer dashboard right now.");
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
          eyebrow="Buyer dashboard"
          title="Source live supply, keep deals moving, and watch settlement readiness in one place."
          body="See fresh supply, active negotiations, and wallet readiness at a glance."
          actions={
            snapshot ? (
              <div className="pill-row">
                <StatusPill tone="neutral">Listings {snapshot.availableListings}</StatusPill>
                <StatusPill tone={snapshot.activeNegotiations > 0 ? "degraded" : "neutral"}>
                  Negotiations {snapshot.activeNegotiations}
                </StatusPill>
              </div>
            ) : null
          }
        />

        <div className="metrics-grid">
          <article className="metric-card">
            <span className="metric-label">Available listings</span>
            <strong className="metric-value">{snapshot?.availableListings ?? "..."}</strong>
            <p className="muted">Published lots currently available for review in the marketplace.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Active negotiations</span>
            <strong className="metric-value">{snapshot?.activeNegotiations ?? "..."}</strong>
            <p className="muted">Buyer-owned threads that still need an answer, confirmation, or closure.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Completed trades</span>
            <strong className="metric-value">{snapshot?.completedTrades ?? "..."}</strong>
            <p className="muted">Completed purchases that have cleared settlement and closed successfully.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Wallet balance</span>
            <strong className="metric-value">
              {snapshot?.wallet ? formatMoney(snapshot.wallet.available_balance, snapshot.wallet.currency) : "..."}
            </strong>
            <p className="muted">
              {snapshot?.wallet
                ? `${formatMoney(snapshot.wallet.held_balance, snapshot.wallet.currency)} currently held in escrow.`
                : "Wallet details will appear here as soon as your balance is available."}
            </p>
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
            title="Move directly into buyer work"
            body="Jump straight into the tools you use to source, negotiate, fund, and track shipments."
          />
          <div className="task-list">
            <Link className="task-card primary" href="/app/market/listings">
              <strong>Browse marketplace</strong>
              <p className="muted">Review live supply, compare lots, and inspect quality proof.</p>
            </Link>
            <Link className="task-card primary" href="/app/market/negotiations">
              <strong>View negotiations</strong>
              <p className="muted">Resume active pricing threads and close the deals that are nearest to confirmation.</p>
            </Link>
            <Link className="task-card secondary" href="/app/payments/wallet">
              <strong>Fund wallet</strong>
              <p className="muted">Top up working balance before moving a deal into escrow.</p>
            </Link>
            <Link className="task-card secondary" href={snapshot?.shipmentHref ?? "/app/market/listings"}>
              <strong>View shipments</strong>
              <p className="muted">Open the shipment timeline for the lot that most recently moved into delivery.</p>
            </Link>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="Trade activity"
            title="Recent buyer-side movement"
            body="Follow the latest negotiation updates, confirmations, and settlement milestones."
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
              title={isLoading ? "Loading trade activity" : "No recent trade activity"}
              body="As new negotiations and settlements land in the live records, they will appear here automatically."
            />
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Market intelligence"
          title="Watched commodity price snapshot"
          body="Trend history is not wired yet, so this widget shows the current live listing snapshot and makes the missing trend seam explicit."
        />
        {snapshot?.marketPulse.length ? (
          <InfoList
            items={snapshot.marketPulse.map((entry) => ({
              label: `${entry.commodity} · ${entry.lotCount} lot${entry.lotCount === 1 ? "" : "s"}`,
              value: entry.averagePrice,
            }))}
          />
        ) : (
          <InsightCallout
            title="No watched commodity data yet"
            body="The dashboard is live, but there are no published listings to summarize into a buyer market snapshot right now."
            tone="accent"
          />
        )}
      </SurfaceCard>
    </div>
  );
}
