"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";

import { DashboardActionTile } from "@/components/dashboard-action-tile";
import { AnalyticsIcon, MarketIcon, NotificationIcon, TruckIcon, WalletIcon } from "@/components/icons";
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
          setError("Unable to load the buyer workspace right now.");
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
          setError("Unable to load the buyer workspace right now.");
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
          eyebrow="Buyer workspace"
          title="Compare supply, move offers, and keep purchase decisions moving."
          body="See available lots, active deals, and payment readiness from one place."
          actions={
            snapshot ? (
              <div className="pill-row">
                <StatusPill tone="neutral">Lots {snapshot.availableListings}</StatusPill>
                <StatusPill tone={snapshot.activeNegotiations > 0 ? "degraded" : "neutral"}>
                  Offers {snapshot.activeNegotiations}
                </StatusPill>
              </div>
            ) : null
          }
        />

        <div className="metrics-grid">
          <article className="metric-card">
            <span className="metric-label">Available lots</span>
            <strong className="metric-value">{snapshot?.availableListings ?? "..."}</strong>
            <p className="muted">Fresh supply currently ready for review in the market.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Offers waiting on you</span>
            <strong className="metric-value">{snapshot?.activeNegotiations ?? "..."}</strong>
            <p className="muted">Deals that still need your answer, confirmation, or follow-up.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Payment ready</span>
            <strong className="metric-value">{snapshot?.completedTrades ?? "..."}</strong>
            <p className="muted">Completed purchases that have already cleared and closed successfully.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Wallet balance</span>
            <strong className="metric-value">
              {snapshot?.wallet ? formatMoney(snapshot.wallet.available_balance, snapshot.wallet.currency) : "..."}
            </strong>
            <p className="muted">
              {snapshot?.wallet
                  ? `${formatMoney(snapshot.wallet.held_balance, snapshot.wallet.currency)} currently waiting inside active deals.`
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
            title="Choose the next buying task"
            body="Open the next lot, deal, or payment action without hunting through extra screens."
          />
          <div className="task-list">
            <DashboardActionTile
              detail="Browse current supply and compare lot details, pricing, and quality cues."
              eyebrow="Do now"
              href="/app/market/listings"
              icon={<MarketIcon size={20} />}
              label="Browse market"
            />
            <DashboardActionTile
              detail="Resume the offers that are closest to confirmation."
              eyebrow="Keep moving"
              href="/app/market/negotiations"
              icon={<NotificationIcon size={20} />}
              label="Open offers"
            />
            <DashboardActionTile
              detail="Check buyer and processor relationships when you need a stronger next option."
              eyebrow="Compare"
              href="/app/agro-intelligence/buyers"
              icon={<AnalyticsIcon size={20} />}
              label="Buyer directory"
              tone="secondary"
            />
            <DashboardActionTile
              detail="Top up balance before moving the next deal into payment."
              eyebrow="Keep ready"
              href="/app/payments/wallet"
              icon={<WalletIcon size={20} />}
              label="Fund wallet"
              tone="secondary"
            />
            <DashboardActionTile
              detail="Open the latest lot that already moved into delivery."
              eyebrow="Track"
              href={snapshot?.shipmentHref ?? "/app/market/listings"}
              icon={<TruckIcon size={20} />}
              label="Track delivery"
              tone="secondary"
            />
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="Deals in motion"
            title="What changed most recently"
            body="Follow the latest offer updates, confirmations, and payment progress."
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
              title={isLoading ? "Loading recent activity" : "No recent buyer activity"}
              body="As new offers and payment updates arrive, they will appear here automatically."
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
