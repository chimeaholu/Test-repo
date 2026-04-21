"use client";

import React, { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { EmptyState, ErrorState, InfoList, InsightCallout, LoadingState, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { agroApiClient } from "@/lib/api/mock-client";
import { walletCopy } from "@/lib/content/route-copy";

type WalletWorkspaceState = Awaited<ReturnType<typeof agroApiClient.getWalletWorkspace>>["data"];

export function WalletWorkspace() {
  const { session, traceId } = useAppState();
  const [workspace, setWorkspace] = useState<WalletWorkspaceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    if (!session) {
      return;
    }
    setError(null);
    const response = await agroApiClient.getWalletWorkspace(traceId);
    setWorkspace(response.data);
  }

  useEffect(() => {
    void refresh().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Unable to load wallet workspace.");
    });
  }, [session, traceId]);

  async function initiateEscrow(threadId: string): Promise<void> {
    setBusyKey(`initiate-${threadId}`);
    try {
      await agroApiClient.initiateEscrow(threadId, traceId, "Escrow initiated from wallet route.");
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to initiate escrow.");
    } finally {
      setBusyKey(null);
    }
  }

  async function markPartnerPending(escrowId: string): Promise<void> {
    setBusyKey(`pending-${escrowId}`);
    try {
      await agroApiClient.markEscrowPartnerPending(
        escrowId,
        traceId,
        "partner_followup_pending",
        "Partner proof is still pending final settlement release.",
      );
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update escrow state.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Wallet and escrow"
          title="Track balances, escrow, and settlement exceptions"
          body={walletCopy.body}
          actions={
            <div className="pill-row">
              <StatusPill tone={workspace?.escrow.escrows.length ? "degraded" : "neutral"}>
                {workspace?.escrow.escrows.length ?? 0} escrow(s)
              </StatusPill>
              <StatusPill tone={workspace?.escrow.candidates.length ? "degraded" : "online"}>
                {workspace?.escrow.candidates.length ?? 0} candidate(s)
              </StatusPill>
            </div>
          }
        />
        {workspace ? (
          <div className="hero-kpi-grid" aria-label="Wallet posture">
            <article className="hero-kpi">
              <span className="metric-label">Available balance</span>
              <strong>{workspace.wallet.balance.available_balance.toFixed(2)}</strong>
              <p className="muted">{workspace.wallet.currency} available for settlement movement.</p>
            </article>
            <article className="hero-kpi">
              <span className="metric-label">Held balance</span>
              <strong>{workspace.wallet.balance.held_balance.toFixed(2)}</strong>
              <p className="muted">Funds currently retained in controlled flows.</p>
            </article>
            <article className="hero-kpi">
              <span className="metric-label">Settlement risk</span>
              <strong>{workspace.escrow.escrows.length + workspace.escrow.candidates.length} item(s)</strong>
              <p className="muted">Escrows and accepted-deal candidates requiring attention.</p>
            </article>
          </div>
        ) : null}
        {error ? <p className="field-error" role="alert">{error}</p> : null}
      </SurfaceCard>

      {!workspace && !error ? <LoadingState label="Loading wallet and escrow activity..." /> : null}

      {workspace ? (
        <div className="detail-grid">
          <SurfaceCard className="detail-card">
            <SectionHeading
              eyebrow="Ledger"
              title="Wallet balance"
              body="Available and held balances stay attributable to ledger entries and reconciliation markers."
            />
            <InsightCallout
              title="Ledger interpretation"
              body="Operations and finance teams should be able to explain every held or released amount from this route without opening a separate reconciliation view."
              tone="neutral"
            />
            <InfoList
              items={[
                { label: "Wallet id", value: workspace.wallet.balance.wallet_id },
                { label: "Currency", value: workspace.wallet.currency },
                { label: "Available", value: workspace.wallet.balance.available_balance.toFixed(2) },
                { label: "Held", value: workspace.wallet.balance.held_balance.toFixed(2) },
                { label: "Total", value: workspace.wallet.balance.total_balance.toFixed(2) },
              ]}
            />
            <div className="stack-sm">
              {workspace.wallet.entries.map((entry) => (
                <article className="queue-item" key={entry.entry_id}>
                  <div className="queue-head">
                    <strong>{entry.reason}</strong>
                    <StatusPill tone={entry.direction === "credit" ? "online" : "degraded"}>{entry.direction}</StatusPill>
                  </div>
                  <p className="muted">
                    {entry.amount} {workspace.wallet.currency} • {entry.created_at ?? "timestamp unavailable"}
                  </p>
                </article>
              ))}
              {workspace.wallet.entries.length === 0 ? <p className="muted">No ledger entries have been recorded for this wallet yet.</p> : null}
            </div>
          </SurfaceCard>

          <SurfaceCard className="detail-card">
            <SectionHeading
              eyebrow="Escrow candidates"
              title="Accepted deals waiting for escrow"
              body="Accepted negotiation threads without escrow records can be started directly from this workspace."
            />
            <p className="muted detail-note">These records are already commercially accepted. The next job is to start a controlled settlement path.</p>
            <div className="stack-sm">
              {workspace.escrow.candidates.map((candidate) => (
                <article className="queue-item" key={candidate.thread_id}>
                  <div className="queue-head">
                    <strong>{candidate.thread_id}</strong>
                    <StatusPill tone="degraded">Awaiting initiation</StatusPill>
                  </div>
                  <p className="muted">
                    Listing {candidate.listing_id} • {candidate.current_offer_amount} {candidate.current_offer_currency}
                  </p>
                  <button className="button-secondary" onClick={() => void initiateEscrow(candidate.thread_id)} type="button">
                    {busyKey === `initiate-${candidate.thread_id}` ? "Starting escrow..." : "Start escrow"}
                  </button>
                </article>
              ))}
              {workspace.escrow.candidates.length === 0 ? <p className="muted">No accepted deals are waiting for escrow right now.</p> : null}
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      {workspace?.escrow.escrows.length ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="Escrow timeline"
            title="Settlement exceptions"
            body="Partner-pending state, actor attribution, and settlement history remain visible until release is complete."
          />
          <div className="hero-kpi-grid" aria-label="Escrow exception summary">
            <article className="hero-kpi">
              <span className="metric-label">Open escrows</span>
              <strong>{workspace.escrow.escrows.length}</strong>
              <p className="muted">Controlled settlements still in flight.</p>
            </article>
            <article className="hero-kpi">
              <span className="metric-label">Partner pending</span>
              <strong>{workspace.escrow.escrows.filter((escrow) => escrow.state === "partner_pending").length}</strong>
              <p className="muted">Cases currently waiting on partner-side follow-up.</p>
            </article>
          </div>
          <div className="stack-sm">
            {workspace.escrow.escrows.map((escrow) => (
              <article className="queue-item" key={escrow.escrow_id}>
                <div className="queue-head">
                  <strong>{escrow.escrow_id}</strong>
                  <StatusPill tone={escrow.state === "partner_pending" ? "degraded" : "neutral"}>{escrow.state}</StatusPill>
                </div>
                <p className="muted">
                  Thread {escrow.thread_id} • {escrow.amount} {escrow.currency}
                </p>
                <div className="stack-sm">
                  {escrow.timeline.map((item) => (
                    <p className="muted" key={`${escrow.escrow_id}-${item.transition}-${item.created_at}`}>
                      {item.transition} • {item.created_at ?? "timestamp unavailable"} • {item.note ?? "no note"}
                    </p>
                  ))}
                </div>
                {escrow.state !== "partner_pending" ? (
                  <button className="button-secondary" onClick={() => void markPartnerPending(escrow.escrow_id)} type="button">
                    {busyKey === `pending-${escrow.escrow_id}` ? "Updating..." : "Mark as partner pending"}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </SurfaceCard>
      ) : workspace ? (
        <EmptyState
          title="No active escrows"
          body="Escrow records will appear here after an accepted deal is moved into settlement."
        />
      ) : null}
    </div>
  );
}
