"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { FundEmpty, WalletEmpty } from "@/components/empty-states";
import { FundIcon, WalletIcon } from "@/components/icons";
import { StatusPill, SurfaceCard, SectionHeading } from "@/components/ui-primitives";
import { buildFundInvestments, buildFundOpportunities, buildFundPortfolioSummary } from "@/features/fund/model";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import type { ListingRecord } from "@agrodomain/contracts";
import type { EscrowReadModel, WalletBalance, WalletLedgerEntry } from "@/features/wallet/model";

type FundDashboardProps = {
  mode: "opportunities" | "portfolio";
};

export function FundDashboard({ mode }: FundDashboardProps) {
  const { session, traceId } = useAppState();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [escrows, setEscrows] = useState<EscrowReadModel[]>([]);
  const [transactions, setTransactions] = useState<WalletLedgerEntry[]>([]);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void Promise.all([
      marketplaceApi.listListings(traceId),
      walletApi.listEscrows(traceId),
      walletApi.listWalletTransactions(traceId),
      walletApi.getWalletSummary(traceId),
    ])
      .then(([listingsResponse, escrowsResponse, transactionsResponse, walletResponse]) => {
        if (cancelled) {
          return;
        }
        setListings(listingsResponse.data.items);
        setEscrows(escrowsResponse.data.items);
        setTransactions(transactionsResponse.data.items);
        setBalance(walletResponse.data);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load AgroFund workspace.");
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

  const opportunities = useMemo(() => buildFundOpportunities(listings), [listings]);
  const investments = useMemo(() => buildFundInvestments(escrows, transactions), [escrows, transactions]);
  const portfolio = useMemo(() => buildFundPortfolioSummary(balance, escrows, transactions), [balance, escrows, transactions]);
  const highlightedListing = searchParams.get("listing");
  const highlightedEscrow = searchParams.get("escrow");

  if (!session) {
    return null;
  }

  const headerActions =
    mode === "opportunities" ? (
      <div className="pill-row">
        <StatusPill tone="online">{opportunities.length} live opportunities</StatusPill>
        <StatusPill tone="neutral">{portfolio.availableCashLabel} available</StatusPill>
      </div>
    ) : (
      <div className="pill-row">
        <StatusPill tone="online">{portfolio.activeCount} active positions</StatusPill>
        <StatusPill tone="neutral">{portfolio.totalReturnsLabel} returns</StatusPill>
      </div>
    );

  return (
    <div className="r3-page-stack">
      <SurfaceCard className="fund-hero-card">
        <SectionHeading
          eyebrow="AgroFund"
          title={mode === "opportunities" ? "Farm investment opportunities" : "My investments and returns"}
          body={
            mode === "opportunities"
              ? "Use current marketplace supply and wallet visibility to evaluate which agricultural opportunities are ready for funding."
              : "Track wallet-linked fund exposure, realized returns, and the next portfolio actions from a mobile-ready surface."
          }
          actions={headerActions}
        />
        <div className="fund-hero-grid">
          <article className="fund-stat-card">
            <span>Available cash</span>
            <strong>{portfolio.availableCashLabel}</strong>
            <p className="muted">Live wallet balance you can deploy into the next opportunity.</p>
          </article>
          <article className="fund-stat-card">
            <span>Total invested</span>
            <strong>{portfolio.totalInvestedLabel}</strong>
            <p className="muted">Exposure currently linked to escrow-backed marketplace trades.</p>
          </article>
          <article className="fund-stat-card">
            <span>Returns tracked</span>
            <strong>{portfolio.totalReturnsLabel}</strong>
            <p className="muted">Credits already visible in your wallet history.</p>
          </article>
        </div>
        <div className="inline-actions">
          <Link className="button-primary" href={mode === "opportunities" ? "/app/fund/my-investments" : "/app/fund"}>
            {mode === "opportunities" ? "View my investments" : "Explore opportunities"}
          </Link>
          <Link className="button-secondary" href="/app/payments/wallet">
            Open wallet
          </Link>
          <Link className="button-ghost" href="/app/notifications">
            Review notifications
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

      {isLoading ? (
        <SurfaceCard>
          <p className="muted">Loading AgroFund workspace...</p>
        </SurfaceCard>
      ) : null}

      {!isLoading && mode === "opportunities" ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="Opportunity stream"
            title="Marketplace-linked funding queue"
            body="Published listings are staged here as fund-ready opportunities until the dedicated funding backend is live."
          />
          {opportunities.length === 0 ? (
            <FundEmpty />
          ) : (
            <div className="fund-opportunity-grid">
              {opportunities.map((item) => (
                <article
                  className={`fund-opportunity-card${highlightedListing === item.listingId ? " is-highlighted" : ""}`}
                  key={item.listingId}
                >
                  <div className="fund-opportunity-top">
                    <span className="fund-opportunity-icon">
                      <FundIcon aria-hidden="true" size={20} />
                    </span>
                    <StatusPill tone={item.progressPct >= 70 ? "online" : "degraded"}>{item.statusLabel}</StatusPill>
                  </div>
                  <div className="stack-sm">
                    <strong>{item.title}</strong>
                    <p className="muted">{item.commodity} · {item.location}</p>
                    <div className="r3-progress-track" aria-label="Funding progress">
                      <span style={{ width: `${item.progressPct}%` }} />
                    </div>
                    <p className="muted">{item.projectedRaise}</p>
                  </div>
                  <div className="pill-row">
                    <StatusPill tone="online">{item.expectedReturnLabel}</StatusPill>
                    <StatusPill tone="neutral">{item.listingId}</StatusPill>
                  </div>
                  <Link className="button-ghost" href={item.href}>
                    Review listing
                  </Link>
                </article>
              ))}
            </div>
          )}
        </SurfaceCard>
      ) : null}

      {!isLoading && mode === "portfolio" ? (
        <div className="fund-portfolio-layout">
          <SurfaceCard>
          <SectionHeading
            eyebrow="Investment book"
            title="Wallet-linked positions"
            body="These positions are derived from the wallet and escrow records, so portfolio state stays consistent with live settlement data."
            />
            {investments.length === 0 ? (
              <WalletEmpty />
            ) : (
              <div className="r3-list-stack">
                {investments.map((item) => (
                  <article
                    className={`r3-list-card${highlightedEscrow === item.escrowId ? " is-highlighted" : ""}`}
                    key={item.escrowId}
                  >
                    <div className="queue-head">
                      <strong>{item.title}</strong>
                      <StatusPill tone={item.statusLabel === "released" ? "online" : "degraded"}>{item.statusLabel}</StatusPill>
                    </div>
                    <p className="muted">{item.amountLabel} · Listing {item.listingId}</p>
                    <p className="muted">{item.returnsLabel}</p>
                    <p className="muted">Updated {item.updatedAtLabel}</p>
                    <div className="inline-actions">
                      <Link className="button-secondary" href={item.href}>
                        Open wallet record
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SurfaceCard>

          <div className="r3-page-stack">
            <SurfaceCard>
              <SectionHeading
                eyebrow="Mobile posture"
                title="Fund state on the go"
                body="These summary cards stay stacked and readable on small screens so buyers, investors, and finance users can verify capital posture quickly."
              />
              <div className="fund-mobile-grid">
                <article className="fund-stat-card">
                  <span>Open positions</span>
                  <strong>{portfolio.activeCount}</strong>
                </article>
                <article className="fund-stat-card">
                  <span>Cash ready</span>
                  <strong>{portfolio.availableCashLabel}</strong>
                </article>
                <article className="fund-stat-card">
                  <span>Wallet link</span>
                  <strong><WalletIcon aria-hidden="true" size={18} /> Live</strong>
                </article>
              </div>
            </SurfaceCard>

            <SurfaceCard>
            <SectionHeading
              eyebrow="Next actions"
              title="Stay synced with wallet and marketplace"
              body="AgroFund is currently layered on top of the existing wallet and marketplace experience, so these routes remain the primary operational views."
            />
              <div className="inline-actions">
                <Link className="button-primary" href="/app/payments/wallet">
                  Open wallet
                </Link>
                <Link className="button-secondary" href="/app/market/listings">
                  Browse marketplace
                </Link>
              </div>
            </SurfaceCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
