"use client";

import type { ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import React from "react";

import { useAppState } from "@/components/app-provider";
import { SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import type { EscrowReadModel } from "@/features/wallet/model";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function statusTone(status: string): "online" | "degraded" | "offline" | "neutral" {
  if (status === "published" || status === "completed") {
    return "online";
  }
  if (status === "rejected") {
    return "offline";
  }
  if (status.includes("pending") || status === "draft") {
    return "degraded";
  }
  return "neutral";
}

type DispatchCard = {
  id: string;
  title: string;
  route: string;
  driver: string;
  schedule: string;
  status: string;
};

export function CooperativeDashboard() {
  const { session, traceId } = useAppState();
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [threads, setThreads] = useState<NegotiationThreadRead[]>([]);
  const [escrows, setEscrows] = useState<EscrowReadModel[]>([]);
  const [walletBalance, setWalletBalance] = useState<{ total: number; held: number; currency: string } | null>(null);
  const [transactions, setTransactions] = useState<Array<{ amount: number; direction: string; created_at: string; reason: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      marketplaceApi.listListings(traceId),
      marketplaceApi.listNegotiations(traceId),
      walletApi.listEscrows(traceId),
      walletApi.getWalletSummary(traceId),
      walletApi.listWalletTransactions(traceId),
    ])
      .then(([listingsResponse, negotiationsResponse, escrowsResponse, walletResponse, transactionsResponse]) => {
        if (cancelled) {
          return;
        }
        setListings(listingsResponse.data.items);
        setThreads(negotiationsResponse.data.items);
        setEscrows(escrowsResponse.data.items);
        setWalletBalance({
          total: walletResponse.data.total_balance,
          held: walletResponse.data.held_balance,
          currency: walletResponse.data.currency,
        });
        setTransactions(transactionsResponse.data.items);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load the cooperative workspace.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const publishedListings = useMemo(
    () => listings.filter((item) => item.status === "published"),
    [listings],
  );

  const stats = useMemo(() => {
    const memberActors = new Set<string>();
    for (const listing of listings) {
      memberActors.add(listing.actor_id);
    }
    for (const thread of threads) {
      memberActors.add(thread.buyer_actor_id);
      memberActors.add(thread.seller_actor_id);
    }
    for (const escrow of escrows) {
      memberActors.add(escrow.buyer_actor_id);
      memberActors.add(escrow.seller_actor_id);
    }

    const totalVolume = publishedListings.reduce((sum, item) => sum + item.quantity_tons, 0);
    const pendingDispatches = publishedListings.filter((item) =>
      threads.some((thread) => thread.listing_id === item.listing_id && thread.status !== "rejected"),
    ).length;
    const revenueYtd = transactions
      .filter((entry) => entry.direction === "credit")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const pendingPayouts = escrows
      .filter((item) => item.state === "funded" || item.state === "partner_pending")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      activeMembers: memberActors.size,
      activeListings: publishedListings.length,
      totalVolume,
      pendingDispatches,
      revenueYtd,
      pendingPayouts,
    };
  }, [escrows, listings, publishedListings, threads, transactions]);

  const dispatchCards = useMemo<DispatchCard[]>(() => {
    return publishedListings.slice(0, 3).map((listing, index) => {
      const relatedThread = threads.find((item) => item.listing_id === listing.listing_id);
      const relatedEscrow = escrows.find((item) => item.listing_id === listing.listing_id);
      const status =
        relatedEscrow?.state === "released"
          ? "Completed"
          : relatedEscrow?.state === "funded"
            ? "Loading"
            : relatedThread?.status === "accepted"
              ? "En Route"
              : "Scheduled";

      return {
        id: listing.listing_id,
        title: `${listing.commodity} ${index === 0 ? "Collection" : index === 1 ? "Pickup" : "Delivery"}`,
        route: `${listing.location} -> ${session?.actor.membership.organization_name ?? "Regional depot"}`,
        driver: relatedThread ? `Driver ${relatedThread.buyer_actor_id.slice(-4).toUpperCase()}` : "Driver: Unassigned",
        schedule: relatedEscrow?.updated_at ?? relatedThread?.updated_at ?? listing.created_at,
        status,
      };
    });
  }, [escrows, publishedListings, session?.actor.membership.organization_name, threads]);

  const activityFeed = useMemo(() => {
    const listingActivity = publishedListings.slice(0, 3).map((item) => ({
      id: `listing-${item.listing_id}`,
      title: `${item.title} is live`,
      detail: `${item.quantity_tons} tons of ${item.commodity} listed from ${item.location}.`,
      createdAt: item.created_at,
    }));
    const threadActivity = threads.slice(0, 3).map((thread) => ({
      id: `thread-${thread.thread_id}`,
      title: `Negotiation ${thread.status.replaceAll("_", " ")}`,
      detail: `Listing ${thread.listing_id} has ${thread.messages.length} message${thread.messages.length === 1 ? "" : "s"}.`,
      createdAt: thread.updated_at ?? thread.created_at,
    }));
    return [...listingActivity, ...threadActivity]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 5);
  }, [publishedListings, threads]);

  if (!session) {
    return null;
  }

  return (
    <div className="r3-page-stack">
      <SurfaceCard className="r3-hero-card">
        <SectionHeading
          eyebrow="Cooperative workspace"
          title="Coordinate members, shipments, and payouts with less back-and-forth."
          body="Keep member activity, dispatch readiness, and payment follow-up visible in one operating view."
          actions={
            <div className="pill-row">
              <StatusPill tone="neutral">{stats.activeListings} live listings</StatusPill>
              <StatusPill tone={stats.pendingDispatches > 0 ? "degraded" : "online"}>
                {stats.pendingDispatches} shipments to assign
              </StatusPill>
            </div>
          }
        />
        <div className="r3-action-row">
          <Link className="button-primary" href="/app/cooperative/dispatch">
            Open Dispatch
          </Link>
          <Link className="button-secondary" href="/app/market/listings">
            Review Member Work
          </Link>
          <Link className="button-ghost" href="/app/agro-intelligence/buyers">
            Buyer Directory
          </Link>
        </div>
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      <section className="r3-kpi-grid" aria-label="Cooperative summary">
        <SurfaceCard className="r3-kpi-card">
          <span className="eyebrow">Members needing review</span>
          <strong>{formatCompact(stats.activeMembers)}</strong>
          <p className="muted">Distinct members currently visible across active work in the platform.</p>
        </SurfaceCard>
        <SurfaceCard className="r3-kpi-card">
          <span className="eyebrow">Recent cooperative activity</span>
          <strong>{formatCompact(stats.activeListings)}</strong>
          <p className="muted">{formatCompact(stats.totalVolume)} tonnes currently visible to buyers.</p>
        </SurfaceCard>
        <SurfaceCard className="r3-kpi-card">
          <span className="eyebrow">Shipments to assign</span>
          <strong>{formatCompact(stats.pendingDispatches)}</strong>
          <p className="muted">Lots that are far enough along to move into dispatch planning.</p>
        </SurfaceCard>
        <SurfaceCard className="r3-kpi-card">
          <span className="eyebrow">Payments to watch</span>
          <strong>{walletBalance ? formatMoney(stats.pendingPayouts, walletBalance.currency) : "--"}</strong>
          <p className="muted">
            Revenue {walletBalance ? formatMoney(stats.revenueYtd, walletBalance.currency) : "--"} YTD.
          </p>
        </SurfaceCard>
      </section>

      <section className="r3-two-column">
        <SurfaceCard>
          <SectionHeading
            eyebrow="What needs movement today"
            title="Dispatch board"
            body="Move member lots into collection, pickup, and delivery work from one place."
            actions={
              <Link className="button-ghost" href="/app/cooperative/dispatch">
                Open dispatch
              </Link>
            }
          />
          <div className="r3-list-stack">
            {dispatchCards.length === 0 ? (
              <div className="empty-state">
                <strong>No dispatch tasks</strong>
                <p className="muted">Collection and delivery tasks will appear here when trade work is ready to move.</p>
              </div>
            ) : (
              dispatchCards.map((item) => (
                <article className="r3-list-card" key={item.id}>
                  <div className="queue-head">
                    <div>
                      <strong>{item.title}</strong>
                      <p className="muted">{item.route}</p>
                    </div>
                    <StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill>
                  </div>
                  <p className="muted">{item.driver}</p>
                  <p className="muted">{new Date(item.schedule).toLocaleString()}</p>
                </article>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="Transport and payout follow-up"
            title="Cooperative wallet"
            body="Keep current balance, held funds, and pending payouts visible beside dispatch work."
            actions={
              <Link className="button-ghost" href="/app/payments/wallet">
                View wallet
              </Link>
            }
          />
          <div className="r3-wallet-card">
            <span className="eyebrow">Balance</span>
            <strong>{walletBalance ? formatMoney(walletBalance.total, walletBalance.currency) : "--"}</strong>
            <div className="r3-inline-metrics">
              <div>
                <span>Escrow</span>
                <strong>{walletBalance ? formatMoney(walletBalance.held, walletBalance.currency) : "--"}</strong>
              </div>
              <div>
                <span>Pending payouts</span>
                <strong>{walletBalance ? formatMoney(stats.pendingPayouts, walletBalance.currency) : "--"}</strong>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Member and market activity"
          title="What changed most recently"
          body="Follow the latest member, listing, and negotiation movement across the cooperative."
          actions={
            <Link className="button-ghost" href="/app/notifications">
              View updates
            </Link>
          }
        />
        <div className="r3-list-stack">
          {activityFeed.length === 0 ? (
            <div className="empty-state">
              <strong>No recent activity</strong>
              <p className="muted">Recent member actions will appear here as they use the platform.</p>
            </div>
          ) : (
            activityFeed.map((item) => (
              <article className="r3-list-card" key={item.id}>
                <strong>{item.title}</strong>
                <p className="muted">{item.detail}</p>
                <p className="r3-time-note">{new Date(item.createdAt).toLocaleString()}</p>
              </article>
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
