"use client";

import {
  escrowDisputeOpenInputSchema,
  escrowFundInputSchema,
  escrowReleaseInputSchema,
  escrowReverseInputSchema,
} from "@agrodomain/contracts";
import Link from "next/link";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";

import { useAppState } from "@/components/app-provider";
import { WalletEmpty } from "@/components/empty-states";
import { AddFundsFlow } from "@/components/wallet/add-funds-flow";
import { BalanceCard } from "@/components/wallet/balance-card";
import { EscrowCard } from "@/components/wallet/escrow-card";
import { SendMoneyFlow } from "@/components/wallet/send-money-flow";
import { TransactionTable } from "@/components/wallet/transaction-table";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { auditApi } from "@/lib/api/audit";
import { walletApi } from "@/lib/api/wallet";
import { queueSummary } from "@/lib/offline/reducer";
import { recordTelemetry } from "@/lib/telemetry/client";
import { readUserPreferences } from "@/lib/user-preferences";
import {
  formatMoney,
  latestNotification,
  notificationTone,
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

type EscrowAction = "fund" | "release" | "reverse" | "dispute";
type EscrowFundInput = z.infer<typeof escrowFundInputSchema>;
type EscrowReleaseInput = z.infer<typeof escrowReleaseInputSchema>;
type EscrowReverseInput = z.infer<typeof escrowReverseInputSchema>;
type EscrowDisputeOpenInput = z.infer<typeof escrowDisputeOpenInputSchema>;

const DEFAULT_ACTION_NOTE = "Reviewed the latest delivery update before taking action.";
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GH: "GHS",
  JM: "JMD",
  NG: "NGN",
};
const SUPPORTED_CURRENCIES = ["GHS", "NGN", "JMD", "USD"] as const;

function currencyOptionsForCountry(countryCode: string) {
  const preferredCurrency = COUNTRY_CURRENCY_MAP[countryCode] ?? "USD";
  const ordered = [preferredCurrency, ...SUPPORTED_CURRENCIES.filter((item) => item !== preferredCurrency)];

  return ordered.map((value) => ({
    label: value,
    value,
  }));
}

function initialCurrency(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode] ?? "USD";
}

export function WalletDashboardClient() {
  const { queue, session, traceId } = useAppState();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletLedgerEntry[]>([]);
  const [escrows, setEscrows] = useState<EscrowReadModel[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("GHS");
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<ActionEvidence>(null);
  const [mutatingEscrowId, setMutatingEscrowId] = useState<string | null>(null);
  const [mutatingAction, setMutatingAction] = useState<EscrowAction | null>(null);
  const [notesByEscrow, setNotesByEscrow] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session) {
      return;
    }

    const countryCurrency = initialCurrency(session.actor.country_code);
    const savedCurrency = readUserPreferences(session).display.currency;
    setSelectedCurrency(savedCurrency === "USD" ? savedCurrency : countryCurrency);
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }
    void refreshWallet(selectedCurrency);
  }, [selectedCurrency, session, traceId]);

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
  const currencyOptions = currencyOptionsForCountry(activeSession.actor.country_code);
  const queueCounts = queueSummary(queue.items);
  const pendingFallback = escrows.some((item) => {
    const notification = latestNotification(item);
    return (
      item.state === "partner_pending" ||
      notification?.delivery_state === "fallback_sent" ||
      notification?.delivery_state === "action_required"
    );
  });
  const totalEscrowExposure = escrows.reduce((sum, item) => sum + item.amount, 0);

  async function refreshWallet(currency: string): Promise<void> {
    setIsLoading(true);
    try {
      const [summaryResponse, transactionsResponse, escrowsResponse] = await Promise.all([
        walletApi.getWalletSummary(traceId, currency),
        walletApi.listWalletTransactions(traceId, currency),
        walletApi.listEscrows(traceId),
      ]);

      setBalance(summaryResponse.data);
      setTransactions(walletHistory(transactionsResponse.data.items));
      setEscrows(escrowsResponse.data.items);
      setNotesByEscrow((current) => {
        const next = { ...current };
        for (const escrow of escrowsResponse.data.items) {
          next[escrow.escrow_id] = next[escrow.escrow_id] ?? DEFAULT_ACTION_NOTE;
        }
        return next;
      });
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load wallet and escrow data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAuditEvidence(requestId: string, idempotencyKey: string): Promise<number> {
    const response = await auditApi.getEvents(requestId, idempotencyKey, traceId);
    return response.data.items.length;
  }

  async function runAction(action: EscrowAction, escrow: EscrowReadModel): Promise<void> {
    setMutatingEscrowId(escrow.escrow_id);
    setMutatingAction(action);
    setActionError(null);
    const startedAt = performance.now();
    const note = notesByEscrow[escrow.escrow_id] ?? DEFAULT_ACTION_NOTE;

    try {
      const baseInput = {
        escrow_id: escrow.escrow_id,
        note: note.trim() || undefined,
      };

      const response =
        action === "fund"
          ? await walletApi.fundEscrow(
              {
                ...baseInput,
                partner_outcome: "funded",
              } satisfies EscrowFundInput,
              traceId,
              activeSession.actor.actor_id,
              activeSession.actor.country_code,
            )
          : action === "release"
            ? await walletApi.releaseEscrow(
                baseInput satisfies EscrowReleaseInput,
                traceId,
                activeSession.actor.actor_id,
                activeSession.actor.country_code,
              )
            : action === "reverse"
              ? await walletApi.reverseEscrow(
                  {
                    ...baseInput,
                    reversal_reason: escrow.state === "partner_pending" ? "partner_failed" : "buyer_cancelled",
                  } satisfies EscrowReverseInput,
                  traceId,
                  activeSession.actor.actor_id,
                  activeSession.actor.country_code,
                )
              : await walletApi.disputeEscrow(
                  {
                    escrow_id: escrow.escrow_id,
                    note: note.trim() || "Participant raised proof mismatch for operator review.",
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

      await refreshWallet(selectedCurrency);

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
      setMutatingEscrowId(null);
      setMutatingAction(null);
    }
  }

  const headerBadges = useMemo(
    () => (
      <div className="pill-row">
        <StatusPill tone={balance ? "online" : "neutral"}>{balance ? "Wallet live" : "Wallet pending"}</StatusPill>
        <StatusPill tone={pendingFallback ? "degraded" : "neutral"}>
          {pendingFallback ? "Needs attention" : "All updates delivered"}
        </StatusPill>
        <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
          {queue.connectivity_state === "online" ? "Connected" : "Offline changes pending"}
        </StatusPill>
      </div>
    ),
    [balance, pendingFallback, queue.connectivity_state],
  );

  return (
    <div className="wallet-home-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Wallet home"
          title="Your balance, transactions, and escrows"
          body="Track available cash, review live settlement status, and keep portfolio money movement visible across every device."
          actions={headerBadges}
        />
        <div className="inline-actions">
          <Link className="button-secondary" href="/app/fund">
            Explore AgroFund
          </Link>
          <Link className="button-ghost" href="/app/fund/my-investments">
            View my investments
          </Link>
        </div>
        <div className="wallet-hero-metrics">
          <article>
            <span>Escrow exposure</span>
            <strong>{balance ? formatMoney(totalEscrowExposure, balance.currency) : "--"}</strong>
          </article>
          <article>
            <span>Recent transactions</span>
            <strong>{transactions.length}</strong>
          </article>
          <article>
            <span>Review items</span>
            <strong>{queueCounts.actionableCount}</strong>
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
            title="Some payment updates still need attention"
            body={`Review the latest escrow activity and any pending updates before you retry, reverse, or escalate. Current review items: ${queueCounts.actionableCount} active and ${queueCounts.conflictedCount} conflicted.`}
            tone="accent"
          />
          <div className="inline-actions">
            <a className="button-secondary" href="/app/offline/outbox">
              Review pending updates
            </a>
            <a className="button-ghost" href="/app/profile">
              Review account settings
            </a>
          </div>
        </SurfaceCard>
      ) : null}

      <BalanceCard
        activeEscrowCount={escrows.length}
        balance={balance}
        currencyOptions={currencyOptions}
        onCurrencyChange={setSelectedCurrency}
        pendingReviewCount={queueCounts.actionableCount}
        selectedCurrency={selectedCurrency}
      />

      <div className="wallet-flow-grid">
        <AddFundsFlow
          actorId={activeSession.actor.actor_id}
          countryCode={activeSession.actor.country_code}
          currency={selectedCurrency}
          onCompleted={() => refreshWallet(selectedCurrency)}
          traceId={traceId}
        />
        <SendMoneyFlow
          availableBalance={balance?.available_balance ?? 0}
          currency={selectedCurrency}
          onCompleted={() => refreshWallet(selectedCurrency)}
          senderLabel={activeSession.actor.display_name}
          traceId={traceId}
        />
      </div>

      <div className="wallet-two-up">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Money movement"
            title="Transaction history"
            body="Filter credits, debits, and escrow-linked ledger movement, then export the exact set you need."
          />
          <TransactionTable entries={transactions} />
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="Escrow overview"
            title="Active settlement cards"
            body="Every open escrow shows its state, participant context, and the real action buttons tied to the wallet API."
          />

          {isLoading ? <p className="muted">Loading wallet and escrow activity...</p> : null}
          {!isLoading && escrows.length === 0 ? (
            <WalletEmpty />
          ) : (
            <div className="wallet-escrow-grid-stack" role="list" aria-label="Wallet escrow collection">
              {escrows.map((escrow) => (
                <EscrowCard
                  actionError={mutatingEscrowId === escrow.escrow_id ? actionError : null}
                  actorId={activeSession.actor.actor_id}
                  busyAction={mutatingEscrowId === escrow.escrow_id ? mutatingAction : null}
                  escrow={escrow}
                  key={escrow.escrow_id}
                  note={notesByEscrow[escrow.escrow_id] ?? DEFAULT_ACTION_NOTE}
                  onAction={(action, item) => void runAction(action, item)}
                  onNoteChange={(note) =>
                    setNotesByEscrow((current) => ({
                      ...current,
                      [escrow.escrow_id]: note,
                    }))
                  }
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>

      {evidence ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="Recent activity"
            title="Latest wallet action"
            body="After you fund, release, reverse, or dispute an escrow, the latest reference details appear here."
          />
          <InfoList
            items={[
              { label: "Action", value: evidence.actionLabel },
              { label: "Update status", value: evidence.replayed ? "Updated again" : "Updated once" },
              { label: "Reference", value: evidence.requestId },
              { label: "Support code", value: evidence.idempotencyKey },
              { label: "Timeline updates", value: evidence.auditEventCount },
              { label: "Payment messages", value: evidence.notificationCount },
            ]}
          />
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeading
          eyebrow="Portfolio controls"
          title="Wallet operating context"
          body="Quick operational cues for funds visibility, AgroFund posture, queue health, and settlement accountability."
        />
        <div className="wallet-context-grid">
          <article>
            <strong>{escrows.filter((item) => notificationTone(latestNotification(item)) === "degraded").length}</strong>
            <span>Escrows with follow-up notifications</span>
          </article>
          <article>
            <strong>{escrows.filter((item) => settlementTone(item.state) === "online").length}</strong>
            <span>Escrows in healthy settlement states</span>
          </article>
          <article>
            <strong>{queueCounts.conflictedCount}</strong>
            <span>Conflicted offline items awaiting resolution</span>
          </article>
          <article>
            <strong>{transactions.filter((item) => item.direction === "credit").length}</strong>
            <span>Credits that can roll into fund opportunities</span>
          </article>
        </div>
      </SurfaceCard>
    </div>
  );
}
