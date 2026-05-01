"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ShieldCheck, WalletCards } from "lucide-react";

import { useAppState } from "@/components/app-provider";
import { InsuranceEmpty } from "@/components/empty-states/insurance-empty";
import { CoverageFlow } from "@/components/insurance/coverage-flow";
import { PolicyCard } from "@/components/insurance/policy-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, SectionHeading, SurfaceCard } from "@/components/ui-primitives";
import { Alert } from "@/components/ui/alert";
import { insuranceApi, type InsuranceDashboard } from "@/lib/api/insurance";

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function InsuranceHome() {
  const { session, traceId } = useAppState();
  const [dashboard, setDashboard] = useState<InsuranceDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    const response = await insuranceApi.getDashboard(traceId);
    setDashboard(response.data);
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    void loadDashboard()
      .then(() => {
        if (!cancelled) {
          setError(null);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load AgroShield.");
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

  const latestClaimsByPolicy = useMemo(() => {
    if (!dashboard) {
      return new Map<string, string>();
    }
    return new Map(
      dashboard.claims.map((claim) => [claim.policy_id, `/app/insurance/claims/${claim.claim_id}`]),
    );
  }, [dashboard]);

  if (!session) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="content-stack">
        <SurfaceCard>
          <p className="muted">Loading AgroShield...</p>
        </SurfaceCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-stack">
        <Alert variant="error">
          <strong>AgroShield unavailable.</strong>
          <p>{error}</p>
        </Alert>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="content-stack">
        <InsuranceEmpty />
      </div>
    );
  }

  return (
    <div className="content-stack">
      <SurfaceCard className="insurance-hero-card">
        <div className="insurance-hero-copy">
          <div>
            <p className="insurance-policy-kicker">AgroShield</p>
            <h1>Keep coverage, claims, and weather-backed protection in one place</h1>
            <p className="muted measure">
              Review your active cover, see claims in motion, and add protection before the next risk window arrives.
            </p>
          </div>
          <div className="insurance-hero-badges">
            <Badge variant="brand">
              <ShieldCheck size={14} />
              Active cover
            </Badge>
            <Badge variant="neutral">
              <WalletCards size={14} />
              Weather-backed protection
            </Badge>
          </div>
        </div>

        <div className="insurance-kpi-grid" aria-label="Insurance KPIs">
          <article>
            <span>Protected now</span>
            <strong>{formatMoney(dashboard.kpis.total_coverage, dashboard.wallet.currency)}</strong>
            <p>Across {dashboard.policies.length} insured field{dashboard.policies.length === 1 ? "" : "s"}.</p>
          </article>
          <article>
            <span>Claims in progress</span>
            <strong>{dashboard.kpis.active_claims}</strong>
            <p>Claims still moving through verification or payout.</p>
          </article>
          <article>
            <span>Paid out</span>
            <strong>{formatMoney(dashboard.kpis.total_payouts_received, dashboard.wallet.currency)}</strong>
            <p>Settled directly back into AgroWallet-linked policies.</p>
          </article>
          <article>
            <span>Available after reserve</span>
            <strong>{formatMoney(dashboard.wallet.available_after_reserve, dashboard.wallet.currency)}</strong>
            <p>{formatMoney(dashboard.wallet.available_balance, dashboard.wallet.currency)} live wallet balance.</p>
          </article>
        </div>
      </SurfaceCard>

      <div className="insurance-dashboard-grid">
        <section className="content-stack">
          <SectionHeading
            eyebrow="Active cover"
            title="Active coverage"
            body="See what is protected now, which field is covered, and where a claim is already underway."
          />
          {dashboard.policies.length > 0 ? (
            dashboard.policies.map((policy) => (
              <PolicyCard
                claimHref={latestClaimsByPolicy.get(policy.policy_id) ?? null}
                key={policy.policy_id}
                policy={policy}
              />
            ))
          ) : (
            <InsuranceEmpty />
          )}
        </section>

        <CoverageFlow
          availableBalance={dashboard.wallet.available_after_reserve}
          currency={dashboard.wallet.currency}
          fields={dashboard.fields}
          onPurchase={async (input) => {
            await insuranceApi.purchaseCoverage(input, traceId);
            await loadDashboard();
          }}
        />
      </div>

      <section className="content-stack">
        <SectionHeading
          eyebrow="Claims in progress"
          title="Claims in progress"
          body="Each claim brings together what happened, where it stands, and what payment outcome is expected."
        />

        {dashboard.claims.length > 0 ? (
          <div className="insurance-claims-grid">
            {dashboard.claims.map((claim) => (
              <Link className="insurance-claim-card" href={`/app/insurance/claims/${claim.claim_id}`} key={claim.claim_id}>
                <div className="insurance-claim-head">
                  <div>
                    <p className="insurance-policy-kicker">{claim.field.farm_name}</p>
                    <h3>{claim.title}</h3>
                  </div>
                  <span className={`insurance-claim-status status-${claim.status}`}>{claim.status}</span>
                </div>
                <p className="muted">{claim.detail}</p>
                <div className="insurance-claim-meta">
                  <strong>{formatMoney(claim.claim_amount, claim.currency)}</strong>
                  <span>{claim.trigger_condition}</span>
                </div>
                <span className="wallet-link-inline">
                  Open claim detail
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No claims yet" body="When a covered event is triggered, the claim will appear here with payment progress." />
        )}
      </section>
    </div>
  );
}
