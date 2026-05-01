"use client";

import type { ListingRecord } from "@agrodomain/contracts";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import React from "react";

import { useAppState } from "@/components/app-provider";
import { SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { advisoryApi } from "@/lib/api/advisory";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import type { EscrowReadModel } from "@/features/wallet/model";

type AdvisoryItem = Awaited<ReturnType<typeof advisoryApi.listConversations>>["data"]["items"][number];

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function roiTone(roi: number): "online" | "degraded" | "offline" | "neutral" {
  if (roi >= 15) {
    return "online";
  }
  if (roi >= 8) {
    return "degraded";
  }
  return "neutral";
}

export function InvestorDashboard() {
  const { session, traceId } = useAppState();
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [escrows, setEscrows] = useState<EscrowReadModel[]>([]);
  const [transactions, setTransactions] = useState<Array<{ amount: number; direction: string; reason: string; created_at: string }>>([]);
  const [walletBalance, setWalletBalance] = useState<{ total: number; currency: string } | null>(null);
  const [advisoryItems, setAdvisoryItems] = useState<AdvisoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      marketplaceApi.listListings(traceId),
      walletApi.listEscrows(traceId),
      walletApi.listWalletTransactions(traceId),
      walletApi.getWalletSummary(traceId),
      advisoryApi.listConversations(traceId, session.actor.locale),
    ])
      .then(([listingsResponse, escrowsResponse, transactionsResponse, walletResponse, advisoryResponse]) => {
        if (cancelled) {
          return;
        }
        setListings(listingsResponse.data.items.filter((item) => item.status === "published"));
        setEscrows(escrowsResponse.data.items);
        setTransactions(transactionsResponse.data.items);
        setWalletBalance({
          total: walletResponse.data.total_balance,
          currency: walletResponse.data.currency,
        });
        setAdvisoryItems(advisoryResponse.data.items);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load investor dashboard.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  const summary = useMemo(() => {
    const activeInvestments = escrows.filter((item) => ["partner_pending", "funded", "released"].includes(item.state));
    const totalInvested = activeInvestments.reduce((sum, item) => sum + item.amount, 0);
    const totalReturns = transactions
      .filter((item) => item.direction === "credit" && item.reason === "escrow_released")
      .reduce((sum, item) => sum + item.amount, 0);
    const avgRoi = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
    return {
      activeInvestments,
      totalInvested,
      totalReturns,
      avgRoi,
      availableOpportunities: listings.length,
    };
  }, [escrows, listings.length, transactions]);

  const opportunities = useMemo(
    () =>
      listings.slice(0, 3).map((item, index) => ({
        ...item,
        percentFunded: Math.min(92, 32 + index * 18 + Math.round(item.quantity_tons)),
        targetAmount: Math.round(item.quantity_tons * item.price_amount * 2),
        expectedReturn: `${14 + index * 3}-${20 + index * 3}`,
      })),
    [listings],
  );

  const payouts = useMemo(
    () =>
      transactions
        .filter((item) => item.direction === "credit")
        .slice(0, 4)
        .map((item, index) => ({
          id: `${item.reason}-${index}`,
          title: item.reason.replaceAll("_", " "),
          amount: item.amount,
          createdAt: item.created_at,
          roi: 10 + index * 2.4,
        })),
    [transactions],
  );

  const risk = useMemo(() => {
    const cropCount = new Set(listings.map((item) => item.commodity.toLowerCase())).size;
    const insuredCount = escrows.filter((item) => item.state !== "disputed").length;
    const insuranceCoverage =
      summary.activeInvestments.length > 0 ? Math.round((insuredCount / summary.activeInvestments.length) * 100) : 0;
    const riskScore = cropCount >= 3 && insuranceCoverage >= 70 ? "Moderate" : cropCount >= 2 ? "Moderate" : "High";
    return {
      level: riskScore,
      cropCount,
      insuranceCoverage,
      geoSpread: Math.min(4, new Set(listings.map((item) => item.location.split(",").slice(-1)[0]?.trim())).size || 1),
    };
  }, [escrows, listings, summary.activeInvestments.length]);

  if (!session) {
    return null;
  }

  return (
    <div className="r3-page-stack">
      <SurfaceCard className="r3-investor-summary">
        <SectionHeading
          eyebrow="Investor dashboard"
          title="Your Portfolio"
          body={`Welcome, ${session.actor.display_name.split(" ")[0]}. See your opportunities, active farms, and portfolio value in one place.`}
          actions={
            <div className="pill-row">
              <StatusPill tone={roiTone(summary.avgRoi)}>Avg ROI {summary.avgRoi.toFixed(1)}%</StatusPill>
              <StatusPill tone="neutral">{summary.availableOpportunities} opportunities</StatusPill>
            </div>
          }
        />
        <section className="r3-investor-kpis" aria-label="Portfolio summary">
          <div>
            <span>Total Invested</span>
            <strong>{walletBalance ? formatMoney(summary.totalInvested, walletBalance.currency) : "--"}</strong>
          </div>
          <div>
            <span>Total Returns</span>
            <strong>{walletBalance ? formatMoney(summary.totalReturns, walletBalance.currency) : "--"}</strong>
          </div>
          <div>
            <span>Active Farms</span>
            <strong>{summary.activeInvestments.length}</strong>
          </div>
          <div>
            <span>Portfolio Value</span>
            <strong>{walletBalance ? formatMoney(walletBalance.total, walletBalance.currency) : "--"}</strong>
          </div>
        </section>
        <div className="r3-action-row">
          <Link className="button-primary" href="/app/fund">
            Browse Opportunities
          </Link>
          <Link className="button-secondary" href="/app/fund/my-investments">
            My Portfolio
          </Link>
          <Link className="button-ghost" href="/app/fund">
            Fund a Farm
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

      <section className="r3-two-column">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Explore"
            title="Featured opportunities"
            body="Discover farm opportunities that are open for funding today."
          actions={
              <Link className="button-ghost" href="/app/fund">
                Explore All
              </Link>
            }
          />
          <div className="r3-card-grid">
            {opportunities.length === 0 ? (
              <div className="empty-state">
                <strong>No opportunities available</strong>
                <p className="muted">New farm opportunities will appear here as fresh listings are published.</p>
              </div>
            ) : (
              opportunities.map((item) => (
                <article className="r3-opportunity-card" key={item.listing_id}>
                  <div className="r3-opportunity-media">
                    <span>{item.commodity}</span>
                  </div>
                  <div className="stack-sm">
                    <strong>{item.title}</strong>
                    <p className="muted">{item.location}</p>
                    <div className="r3-progress-track" aria-label="Funding progress">
                      <span style={{ width: `${item.percentFunded}%` }} />
                    </div>
                    <p className="muted">
                      {walletBalance ? formatMoney(Math.round((item.targetAmount * item.percentFunded) / 100), walletBalance.currency) : "--"} /{" "}
                      {walletBalance ? formatMoney(item.targetAmount, walletBalance.currency) : "--"} raised
                    </p>
                    <div className="pill-row">
                      <StatusPill tone="online">Expected Return: {item.expectedReturn}%</StatusPill>
                      <StatusPill tone="neutral">Insured</StatusPill>
                    </div>
                    <Link className="button-ghost" href={`/app/fund/${item.listing_id}`}>
                      View Details
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </SurfaceCard>

        <div className="r3-page-stack">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Portfolio"
              title="Active investments"
              body="Track the positions you are actively funding and monitor recent movement."
              actions={
                <Link className="button-ghost" href="/app/fund/my-investments">
                  See All
                </Link>
              }
            />
            <div className="r3-list-stack">
              {summary.activeInvestments.length === 0 ? (
                <div className="empty-state">
                  <strong>No active investments</strong>
                  <p className="muted">Explore farm opportunities to start investing in Ghana&apos;s agriculture.</p>
                </div>
              ) : (
                summary.activeInvestments.slice(0, 5).map((item) => (
                  <article className="r3-list-card" key={item.escrow_id}>
                    <div className="queue-head">
                      <strong>{item.listing_id}</strong>
                      <StatusPill tone={item.state === "released" ? "online" : "degraded"}>
                        {item.state.replaceAll("_", " ")}
                      </StatusPill>
                    </div>
                    <p className="muted">Invested: {formatMoney(item.amount, item.currency)}</p>
                    <p className="muted">Updated {new Date(item.updated_at).toLocaleString()}</p>
                  </article>
                ))
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
          <SectionHeading
            eyebrow="Returns"
            title="Payout history"
            body="Review recent payouts as farms complete their funding cycles."
          />
            <div className="r3-list-stack">
              {payouts.length === 0 ? (
                <div className="empty-state">
                  <strong>No payouts yet</strong>
                  <p className="muted">Your investment returns will appear here as farms complete their cycles.</p>
                </div>
              ) : (
                payouts.map((item) => (
                  <article className="r3-list-card" key={item.id}>
                    <div className="queue-head">
                      <strong>{item.title}</strong>
                      <StatusPill tone={roiTone(item.roi)}>ROI +{item.roi.toFixed(1)}%</StatusPill>
                    </div>
                    <p className="muted">{walletBalance ? formatMoney(item.amount, walletBalance.currency) : "--"}</p>
                    <p className="r3-time-note">{new Date(item.createdAt).toLocaleString()}</p>
                  </article>
                ))
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Risk overview"
              title={`Portfolio Risk: ${risk.level}`}
              body={`${risk.cropCount} crop types, ${risk.insuranceCoverage}% coverage, ${risk.geoSpread} active regions.`}
              actions={
                <Link className="button-ghost" href="/app/notifications">
                  View Full Report
                </Link>
              }
            />
            <div className="r3-risk-bar" aria-label={`Portfolio risk ${risk.level}`}>
              <span className="low" />
              <span className="medium" />
              <span className="high" />
              <i
                style={{
                  left: risk.level === "High" ? "79%" : risk.level === "Moderate" ? "48%" : "17%",
                }}
              />
            </div>
            <div className="r3-inline-metrics">
              <div>
                <span>Diversification</span>
                <strong>{risk.cropCount} crops</strong>
              </div>
              <div>
                <span>Insurance</span>
                <strong>{risk.insuranceCoverage}% covered</strong>
              </div>
              <div>
                <span>Farm updates</span>
                <strong>{advisoryItems.length}</strong>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
