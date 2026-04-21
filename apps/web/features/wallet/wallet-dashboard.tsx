"use client";

import {
  escrowDisputeOpenInputSchema,
  escrowFundInputSchema,
  escrowReleaseInputSchema,
  escrowReverseInputSchema,
} from "@agrodomain/contracts";
import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";
import type { z } from "zod";

import { useAppState } from "@/components/app-provider";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { agroApiClient } from "@/lib/api/mock-client";
import { queueSummary } from "@/lib/offline/reducer";
import { recordTelemetry } from "@/lib/telemetry/client";
import {
  deriveWalletActions,
  escrowStateCopy,
  formatMoney,
  latestNotification,
  notificationSummary,
  notificationTone,
  settlementLabel,
  settlementTimeline,
  settlementTone,
  walletHistory,
  type EscrowReadModel,
  type WalletBalance,
  type WalletLedgerEntry,
} from "@/features/wallet/model";

type ActionEvidence = {
  actionLabel: string;
  auditEventCount: number;
  idempotencyKey: string;
  notificationCount: number;
  replayed: boolean;
  requestId: string;
} | null;

type EscrowFundInput = z.infer<typeof escrowFundInputSchema>;
type EscrowReleaseInput = z.infer<typeof escrowReleaseInputSchema>;
type EscrowReverseInput = z.infer<typeof escrowReverseInputSchema>;
type EscrowDisputeOpenInput = z.infer<typeof escrowDisputeOpenInputSchema>;

export function WalletDashboardClient() {
  const { queue, session, traceId } = useAppState();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletLedgerEntry[]>([]);
  const [escrows, setEscrows] = useState<EscrowReadModel[]>([]);
  const [selectedEscrowId, setSelectedEscrowId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [note, setNote] = useState("Delivery records checked against the latest payment timeline.");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<ActionEvidence>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    void refreshWallet();
  }, [session, traceId]);

  useEffect(() => {
    if (!session || isLoading) {
      return;
    }
    recordTelemetry({
      event: "settlement_timeline_view",
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      detail: {
        actor_role: session.actor.role,
        escrow_count: escrows.length,
        queue_depth: queue.items.length,
      },
    });
  }, [escrows.length, isLoading, queue.items.length, session, traceId]);

  if (!session) {
    return null;
  }

  const activeSession = session;

  const selectedEscrow = escrows.find((item) => item.escrow_id === selectedEscrowId) ?? escrows[0] ?? null;
  const selectedNotification = selectedEscrow ? latestNotification(selectedEscrow) : null;
  const pendingFallback = escrows.some((item) => {
    const notification = latestNotification(item);
    return (
      item.state === "partner_pending" ||
      notification?.delivery_state === "fallback_sent" ||
      notification?.delivery_state === "action_required"
    );
  });
  const queueCounts = queueSummary(queue.items);

  async function refreshWallet(preferredEscrowId?: string): Promise<void> {
    setIsLoading(true);
    try {
      const [summaryResponse, transactionsResponse, escrowsResponse] = await Promise.all([
        agroApiClient.getWalletSummary(traceId),
        agroApiClient.listWalletTransactions(traceId),
        agroApiClient.listEscrows(traceId),
      ]);

      setBalance(summaryResponse.data);
      setTransactions(walletHistory(transactionsResponse.data.items));
      setEscrows(escrowsResponse.data.items);
      setSelectedEscrowId(preferredEscrowId ?? escrowsResponse.data.items[0]?.escrow_id ?? "");
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load wallet and escrow data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAuditEvidence(requestId: string, idempotencyKey: string): Promise<number> {
    const response = await agroApiClient.getAuditEvents(requestId, idempotencyKey, traceId);
    return response.data.items.length;
  }

  async function runAction(action: "fund" | "release" | "reverse" | "dispute", escrow: EscrowReadModel): Promise<void> {
    setIsMutating(true);
    setActionError(null);
    const startedAt = performance.now();

    try {
      const baseInput = {
        escrow_id: escrow.escrow_id,
        note: note.trim() || undefined,
      };

      const response =
        action === "fund"
          ? await agroApiClient.fundEscrow(
              {
                ...baseInput,
                partner_outcome: "funded",
              } satisfies EscrowFundInput,
              traceId,
              activeSession.actor.actor_id,
              activeSession.actor.country_code,
            )
          : action === "release"
            ? await agroApiClient.releaseEscrow(
                baseInput satisfies EscrowReleaseInput,
                traceId,
                activeSession.actor.actor_id,
                activeSession.actor.country_code,
              )
            : action === "reverse"
              ? await agroApiClient.reverseEscrow(
                  {
                    ...baseInput,
                    reversal_reason: escrow.state === "partner_pending" ? "partner_failed" : "buyer_cancelled",
                  } satisfies EscrowReverseInput,
                  traceId,
                  activeSession.actor.actor_id,
                  activeSession.actor.country_code,
                )
              : await agroApiClient.disputeEscrow(
                  {
                    escrow_id: escrow.escrow_id,
                    note: note.trim() || "Dispute raised for review.",
                  } satisfies EscrowDisputeOpenInput,
                  traceId,
                  activeSession.actor.actor_id,
                  activeSession.actor.country_code,
                );

      const auditEventCount = await loadAuditEvidence(response.data.request_id, response.data.idempotency_key);
      setEvidence({
        actionLabel:
          action === "fund"
            ? "Funding committed"
            : action === "release"
              ? "Release committed"
              : action === "reverse"
                ? "Reversal committed"
                : "Dispute committed",
        auditEventCount,
        idempotencyKey: response.data.idempotency_key,
        notificationCount: response.data.escrow_transition.notification_count,
        replayed: response.data.replayed,
        requestId: response.data.request_id,
      });

      await refreshWallet(response.data.escrow.escrow_id);

      recordTelemetry({
        event: "settlement_action_latency",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          action,
          duration_ms: Math.round(performance.now() - startedAt),
          escrow_id: escrow.escrow_id,
          replayed: response.data.replayed,
        },
      });
    } catch (nextError) {
      const code = nextError instanceof Error ? nextError.message : "settlement_action_failed";
      setActionError(code);
      recordTelemetry({
        event: "settlement_action_failed",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          action,
          error_code: code,
          escrow_id: escrow.escrow_id,
        },
      });
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Wallet and escrow"
          title="Payment timeline and delivery records"
          body="Live wallet balance, escrow lifecycle, participant notifications, and payment actions."
        />
        <div className="pill-row">
          <StatusPill tone={balance ? "online" : "neutral"}>
            {balance ? formatMoney(balance.total_balance, balance.currency) : "Wallet pending"}
          </StatusPill>
          <StatusPill tone={pendingFallback ? "degraded" : "neutral"}>
            {pendingFallback ? "Pending fallback active" : "No fallback active"}
          </StatusPill>
          <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
            Queue {queue.connectivity_state}
          </StatusPill>
        </div>
        <div className="stat-strip">
          <article className="stat-chip">
            <span className="metric-label">Escrows in scope</span>
            <strong>{escrows.length}</strong>
            <span className="muted">Settlement records currently visible in your workspace.</span>
          </article>
          <article className="stat-chip">
            <span className="metric-label">Queue recovery</span>
            <strong>{queueCounts.actionableCount}</strong>
            <span className="muted">Pending offline actions still requiring sync or review.</span>
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

      {pendingFallback ? (
        <SurfaceCard>
          <InsightCallout
            title="Settlement fallback is visible and recoverable"
            body={`Some payments are pending or require fallback delivery. Review the payment timeline, then use the outbox if connectivity remains degraded. Current queue: ${queueCounts.actionableCount} actionable, ${queueCounts.conflictedCount} conflicted.`}
            tone="accent"
          />
          <div className="inline-actions">
            <Link className="button-secondary" href="/app/offline/outbox">
              Open outbox
            </Link>
            <Link className="button-ghost" href="/app/profile">
              Review session and consent
            </Link>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="metrics-grid">
        <article className="metric-card">
          <span className="metric-label">Available balance</span>
          <strong className="metric-value">
            {balance ? formatMoney(balance.available_balance, balance.currency) : "Loading"}
          </strong>
          <p className="muted">Spendable or released funds visible to you.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Held in escrow</span>
          <strong className="metric-value">
            {balance ? formatMoney(balance.held_balance, balance.currency) : "Loading"}
          </strong>
          <p className="muted">Funds locked behind funded escrow transitions.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Balance version</span>
          <strong className="metric-value">{balance ? balance.balance_version : "0"}</strong>
          <p className="muted">Current ledger version number.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Ledger entries</span>
          <strong className="metric-value">{transactions.length}</strong>
          <p className="muted">Read-only transaction history for audit review.</p>
        </article>
      </div>

      <div className="wallet-layout">
        <article className="queue-card">
          <SectionHeading
            eyebrow="Escrow work"
            title="Your escrow queue"
            body="Escrows filtered to your account. Completed escrows remain visible for reference but cannot be changed."
          />

          {isLoading ? <p className="muted">Loading wallet and escrow timeline...</p> : null}
          {!isLoading && escrows.length === 0 ? (
            <InsightCallout
              title="No escrow records yet"
              body="Settlement records will appear here once accepted negotiations create them."
              tone="neutral"
            />
          ) : null}

          <div className="queue-list" role="list" aria-label="Wallet escrow collection">
            {escrows.map((escrow) => {
              const notification = latestNotification(escrow);
              return (
                <button
                  className={`thread-list-item ${selectedEscrow?.escrow_id === escrow.escrow_id ? "is-active" : ""}`}
                  key={escrow.escrow_id}
                  onClick={() => setSelectedEscrowId(escrow.escrow_id)}
                  type="button"
                >
                  <div className="queue-head">
                    <strong>{escrow.thread_id}</strong>
                    <StatusPill tone={settlementTone(escrow.state)}>{settlementLabel(escrow.state)}</StatusPill>
                  </div>
                  <p className="muted">
                    {formatMoney(escrow.amount, escrow.currency)} · Listing {escrow.listing_id}
                  </p>
                  <div className="pill-row">
                    <StatusPill tone={notificationTone(notification)}>
                      {notification ? notification.delivery_state : "notification pending"}
                    </StatusPill>
                    <StatusPill tone="neutral">{new Date(escrow.updated_at).toLocaleString()}</StatusPill>
                  </div>
                </button>
              );
            })}
          </div>
        </article>

        <div className="content-stack">
          <article className="queue-card">
            <SectionHeading
              eyebrow="Selected escrow"
              title={selectedEscrow ? selectedEscrow.escrow_id : "Choose an escrow"}
              body="Status and available actions are shown clearly so you can review and act without guessing the next step."
            />

            {!selectedEscrow ? (
              <InsightCallout
                title="No escrow selected"
                body="Select an escrow from the queue to inspect timeline, notification, and settlement action state."
                tone="neutral"
              />
            ) : (
              <div className="content-stack">
                <div className="pill-row">
                  <StatusPill tone={settlementTone(selectedEscrow.state)}>
                    {settlementLabel(selectedEscrow.state)}
                  </StatusPill>
                  <StatusPill tone="neutral">{formatMoney(selectedEscrow.amount, selectedEscrow.currency)}</StatusPill>
                  {selectedNotification ? (
                    <StatusPill tone={notificationTone(selectedNotification)}>
                      Notification {selectedNotification.delivery_state}
                    </StatusPill>
                  ) : null}
                </div>

                <InsightCallout
                  title={escrowStateCopy(selectedEscrow).title}
                  body={escrowStateCopy(selectedEscrow).body}
                  tone={selectedEscrow.state === "partner_pending" || selectedEscrow.state === "funded" ? "accent" : "brand"}
                />

                <InfoList
                  items={[
                    { label: "Thread", value: selectedEscrow.thread_id },
                    { label: "Listing", value: selectedEscrow.listing_id },
                    { label: "Buyer", value: selectedEscrow.buyer_actor_id },
                    { label: "Seller", value: selectedEscrow.seller_actor_id },
                    { label: "Partner reason", value: selectedEscrow.partner_reason_code ?? "none" },
                  ]}
                />

                <div className="field">
                  <label htmlFor="wallet-note">Settlement note</label>
                  <textarea
                    id="wallet-note"
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    value={note}
                  />
                  <p className="field-help">
                    This note will be attached to the escrow action for record-keeping.
                  </p>
                </div>

                {actionError ? (
                  <p className="field-error" role="alert">
                    {actionError}
                  </p>
                ) : null}

                <div className="wallet-actions">
                  {deriveWalletActions(selectedEscrow, activeSession.actor.actor_id).map((action) => (
                    <div className="wallet-action-card" key={`${selectedEscrow.escrow_id}-${action.action}`}>
                      <div className="stack-sm">
                        <strong>{action.label}</strong>
                        <p className="muted">{action.helperText}</p>
                        {!action.allowed && action.disabledReason ? (
                          <p className="field-help">{action.disabledReason}</p>
                        ) : null}
                      </div>
                      <button
                        className={action.allowed ? "button-primary" : "button-ghost"}
                        disabled={!action.allowed || isMutating}
                        onClick={() => void runAction(action.action, selectedEscrow)}
                        type="button"
                      >
                        {isMutating && action.allowed ? `${action.label}...` : action.label}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="queue-card">
            <SectionHeading
              eyebrow="Participant updates"
              title="Delivery and fallback status"
              body="Notifications for escrow updates, with fallback status shown alongside the timeline."
            />

            {!selectedNotification ? (
              <InsightCallout
                title="No notifications for this selection"
                body="Some timeline entries do not include notification details. Funding timeout and dispute events typically have the most complete notification records."
                tone="neutral"
              />
            ) : (
              <div className="content-stack">
                <div className="pill-row">
                  <StatusPill tone={notificationTone(selectedNotification)}>
                    {selectedNotification.delivery_state}
                  </StatusPill>
                  <StatusPill tone="neutral">{selectedNotification.channel}</StatusPill>
                  {selectedNotification.fallback_channel ? (
                    <StatusPill tone="degraded">Fallback {selectedNotification.fallback_channel}</StatusPill>
                  ) : null}
                </div>
                <InsightCallout
                  title={notificationSummary(selectedNotification).headline}
                  body={notificationSummary(selectedNotification).detail}
                  tone={selectedNotification.delivery_state === "sent" ? "brand" : "accent"}
                />
                <InfoList
                  items={[
                    { label: "Message key", value: selectedNotification.message_key },
                    { label: "Recipient", value: selectedNotification.recipient_actor_id },
                    { label: "Correlation", value: selectedNotification.correlation_id },
                    { label: "Fallback reason", value: selectedNotification.fallback_reason ?? "none" },
                  ]}
                />
              </div>
            )}
          </article>
        </div>
      </div>

      {evidence ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="Transaction records"
            title="Payment confirmation"
            body="Request details and audit count are shown so settlement actions can be verified."
          />
          <InfoList
            items={[
              { label: "Action", value: evidence.actionLabel },
              { label: "Status", value: evidence.replayed ? "Confirmed" : "Processed" },
              { label: "Request ID", value: evidence.requestId },
              { label: "Reference ID", value: evidence.idempotencyKey },
              { label: "Audit events", value: evidence.auditEventCount },
              { label: "Settlement notifications", value: evidence.notificationCount },
            ]}
          />
        </SurfaceCard>
      ) : null}

      <div className="wallet-detail-grid">
        <article className="queue-card">
          <SectionHeading
            eyebrow="Settlement timeline"
            title="Escrow transitions"
            body="Each entry shows the participant, transition type, reference ID, and delivery status."
          />

          {selectedEscrow ? (
            <ul className="timeline-list" role="list" aria-label="Escrow settlement timeline">
              {settlementTimeline(selectedEscrow).map((item) => (
                <li className="timeline-row" key={`${item.request_id}-${item.transition}`}>
                  <div className={`timeline-marker ${item.state === "released" || item.state === "funded" ? "done" : item.state === "partner_pending" ? "current" : ""}`} />
                  <div className="stack-sm">
                    <div className="queue-head">
                      <strong>{item.transition}</strong>
                      <StatusPill tone={settlementTone(item.state)}>{settlementLabel(item.state)}</StatusPill>
                    </div>
                    <p className="muted">
                      {item.actor_id} · {new Date(item.created_at).toLocaleString()}
                    </p>
                    {item.note ? <p>{item.note}</p> : null}
                    <div className="pill-row">
                      <StatusPill tone="neutral">Request {item.request_id}</StatusPill>
                      <StatusPill tone="neutral">Ref {item.idempotency_key}</StatusPill>
                      {item.notification ? (
                        <StatusPill tone={notificationTone(item.notification)}>
                          {item.notification.delivery_state}
                        </StatusPill>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Select an escrow to review timeline entries.</p>
          )}
        </article>

        <article className="queue-card">
          <SectionHeading
            eyebrow="Wallet ledger"
            title="Latest entries"
            body="Every balance change below shows the reason and resulting version."
          />

          {transactions.length === 0 ? (
            <p className="muted">No wallet ledger entries are visible yet.</p>
          ) : (
            <ul className="queue-list" role="list" aria-label="Wallet transaction history">
              {transactions.slice(0, 8).map((entry) => (
                <li className="queue-item" key={entry.entry_id}>
                  <div className="queue-head">
                    <strong>{entry.reason}</strong>
                    <StatusPill tone={entry.direction === "credit" ? "online" : entry.direction === "debit" ? "degraded" : "neutral"}>
                      {entry.direction}
                    </StatusPill>
                  </div>
                  <p className="muted">
                    {formatMoney(entry.amount, entry.currency)} · Seq {entry.entry_sequence} · Version {entry.balance_version}
                  </p>
                  <p className="muted">
                    Available {entry.resulting_available_balance} · Held {entry.resulting_held_balance}
                  </p>
                  <p className="muted">{new Date(entry.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
