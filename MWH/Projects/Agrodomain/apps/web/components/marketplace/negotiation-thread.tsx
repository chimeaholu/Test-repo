"use client";

import type { MarketplaceNegotiationIntelligenceRead } from "@agrodomain/contracts";
import Link from "next/link";
import React from "react";
import type { NegotiationMessage, NegotiationThreadRead } from "@agrodomain/contracts";

import { Avatar } from "@/components/ui/avatar";
import { CounterpartyTrustCard } from "@/components/marketplace/counterparty-trust-card";
import { EscrowPrompt } from "@/components/marketplace/escrow-prompt";
import { OfferCard } from "@/components/marketplace/offer-card";
import {
  buildNegotiationGuidance,
  buildNegotiationTrustSummary,
  mergeNegotiationTrustSummaryWithIntelligence,
} from "@/features/marketplace/trust";
import { EmptyState, InsightCallout, SectionHeading, StatusPill } from "@/components/ui-primitives";
import type { NegotiationThreadUiState } from "@/features/negotiation/thread-state";
import type { EscrowReadModel } from "@/features/wallet/model";

type NegotiationThreadProps = {
  actorId: string;
  actorName: string;
  confirmationDecisionNote: string;
  confirmationRequestNote: string;
  counterCurrency: string;
  counterNote: string;
  counterValue: string;
  isLoadingThread: boolean;
  isMutating: boolean;
  onApprovalNoteChange: (value: string) => void;
  onBackToList: () => void;
  onConfirmationNoteChange: (value: string) => void;
  onCounterCurrencyChange: (value: string) => void;
  onCounterNoteChange: (value: string) => void;
  onCounterValueChange: (value: string) => void;
  onEscrowInitiate: () => void;
  onEscrowNoteChange: (value: string) => void;
  onReject: () => Promise<void>;
  onRequestConfirmation: (requiredConfirmerActorId: string) => Promise<void>;
  onSubmitCounter: () => Promise<void>;
  onApprove: () => Promise<void>;
  escrowError: string | null;
  escrowNote: string;
  escrowRecord: EscrowReadModel | null;
  intelligence: MarketplaceNegotiationIntelligenceRead | null;
  thread: NegotiationThreadRead | null;
  threadTitle: string | null;
  uiState: NegotiationThreadUiState | null;
};

function formatActorLabel(actorId: string): string {
  return actorId
    .replace(/^actor[-_]/u, "")
    .replace(/[-_]/gu, " ")
    .replace(/\b\w/gu, (char) => char.toUpperCase());
}

function messageVariant(action: NegotiationMessage["action"]): "offer" | "confirmation-request" | "system" | "note" {
  if (action === "offer_created" || action === "offer_countered") {
    return "offer";
  }
  if (action === "confirmation_requested") {
    return "confirmation-request";
  }
  if (action === "confirmation_approved" || action === "confirmation_rejected") {
    return "system";
  }
  return "note";
}

function previousOfferAmount(messages: NegotiationMessage[], currentIndex: number): number | null {
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if ((candidate.action === "offer_created" || candidate.action === "offer_countered") && typeof candidate.amount === "number") {
      return candidate.amount;
    }
  }
  return null;
}

function toCalloutTone(tone: "online" | "offline" | "degraded" | "neutral"): "brand" | "accent" | "neutral" {
  if (tone === "online") {
    return "brand";
  }
  if (tone === "offline" || tone === "degraded") {
    return "accent";
  }
  return "neutral";
}

export function NegotiationThread({
  actorId,
  actorName,
  confirmationDecisionNote,
  confirmationRequestNote,
  counterCurrency,
  counterNote,
  counterValue,
  isLoadingThread,
  isMutating,
  onApprovalNoteChange,
  onBackToList,
  onConfirmationNoteChange,
  onCounterCurrencyChange,
  onCounterNoteChange,
  onCounterValueChange,
  onEscrowInitiate,
  onEscrowNoteChange,
  onReject,
  onRequestConfirmation,
  onSubmitCounter,
  onApprove,
  escrowError,
  escrowNote,
  escrowRecord,
  intelligence,
  thread,
  threadTitle,
  uiState,
}: NegotiationThreadProps) {
  if (isLoadingThread) {
    return (
      <article className="queue-card negotiation-thread-card">
        <p className="muted" role="status">
          Loading selected negotiation...
        </p>
      </article>
    );
  }

  if (!thread || !uiState) {
    return (
      <article className="queue-card negotiation-thread-card">
        <EmptyState
          title="No negotiation selected"
          body="Choose a thread from the conversation list, or open a new offer from a listing to populate the workspace."
        />
      </article>
    );
  }

  const sortedMessages = [...thread.messages].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  );
  const transactionGuidance = buildNegotiationGuidance({
    actorId,
    escrow: escrowRecord,
    thread,
  });
  const trustSummary = mergeNegotiationTrustSummaryWithIntelligence(
    buildNegotiationTrustSummary({
      actorId,
      escrow: escrowRecord,
      thread,
    }),
    intelligence,
  );
  const counterpartyEntityHref = intelligence?.counterparty_entity_match
    ? intelligence.counterparty_entity_match.operator_tags.some((tag) => ["buyer", "processor", "offtaker"].includes(tag.toLowerCase()))
      ? `/app/agro-intelligence/buyers/${intelligence.counterparty_entity_match.entity_id}`
      : `/app/agro-intelligence/graph/${intelligence.counterparty_entity_match.entity_id}`
    : null;

  return (
    <article className="queue-card negotiation-thread-card">
      <div className="negotiation-thread-topbar">
        <button className="button-ghost negotiation-mobile-back" type="button" onClick={onBackToList}>
          Back to conversations
        </button>
        <div className="stack-sm">
          <SectionHeading
            eyebrow="What happens next"
            title={threadTitle ?? "Negotiation thread"}
            body="Review the chat history, watch price movement, and take the next permitted action for the current deal stage."
          />
        </div>
      </div>

      <div className="pill-row">
        <StatusPill tone={uiState.statusTone}>{uiState.statusLabel}</StatusPill>
        <StatusPill tone={uiState.urgencyTone}>{uiState.urgencyLabel}</StatusPill>
        <StatusPill tone="neutral">
          {thread.current_offer_amount} {thread.current_offer_currency}
        </StatusPill>
        <StatusPill tone="neutral">{thread.thread_id}</StatusPill>
      </div>

      <InsightCallout
        title={uiState.nextActionLabel}
        body={`${uiState.statusDetail}${uiState.deadlineAt ? ` Deadline: ${new Date(uiState.deadlineAt).toLocaleString()}.` : ""}`}
        tone={uiState.urgencyTone === "offline" ? "neutral" : uiState.urgencyTone === "degraded" ? "accent" : "brand"}
      />

      {thread.status === "pending_confirmation" && thread.confirmation_checkpoint ? (
        <InsightCallout
          title="A final decision is still needed"
          body={`Waiting for ${formatActorLabel(thread.confirmation_checkpoint.required_confirmer_actor_id)} to accept or reject the current terms.`}
          tone="accent"
        />
      ) : null}

      {uiState.isTerminal ? (
        <InsightCallout
          title="Thread closed"
          body={`This negotiation is ${thread.status}, so no further price changes can be submitted on this conversation.`}
          tone={thread.status === "accepted" ? "brand" : "neutral"}
        />
      ) : null}

      <section className="queue-card market-guidance-compact">
        <SectionHeading
          eyebrow="Next best action"
          title={transactionGuidance.title}
          body={transactionGuidance.body}
          actions={
            <div className="pill-row">
              <StatusPill tone={transactionGuidance.tone}>{transactionGuidance.primaryActionLabel}</StatusPill>
              <StatusPill tone={transactionGuidance.urgencyLabel.includes("overdue") ? "degraded" : "neutral"}>
                {transactionGuidance.urgencyLabel}
              </StatusPill>
            </div>
          }
        />
        <div className="queue-grid market-guidance-grid">
          <article className="queue-card">
            <InsightCallout
              title="Current blocker"
              body={transactionGuidance.blockerLabel}
              tone={toCalloutTone(transactionGuidance.tone)}
            />
            <ul className="summary-list">
              {transactionGuidance.checklist.map((item) => (
                <li key={item}>
                  <span>Do next</span>
                  <strong>{item}</strong>
                </li>
              ))}
            </ul>
          </article>

          <div className="stack-sm">
            <CounterpartyTrustCard eyebrow="Counterparty trust" summary={trustSummary} />
            {counterpartyEntityHref ? (
              <Link className="button-ghost" href={counterpartyEntityHref}>
                Review buyer profile
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <EscrowPrompt
        actorId={actorId}
        error={escrowError}
        existingEscrow={escrowRecord}
        isMutating={isMutating}
        note={escrowNote}
        onInitiate={onEscrowInitiate}
        onNoteChange={onEscrowNoteChange}
        thread={thread}
      />

      <div className="chat-thread" role="log" aria-live="polite">
        {sortedMessages.map((message, index) => {
          const variant = messageVariant(message.action);
          const isOwnMessage = message.actor_id === actorId;

          if (variant === "system") {
            return (
              <div className="chat-system-row" key={`${message.created_at}-${index}`}>
                <span className="chat-system-pill">
                  {message.action === "confirmation_approved" ? "Confirmation approved" : "Confirmation rejected"}
                </span>
                {message.note ? <p className="muted">{message.note}</p> : null}
              </div>
            );
          }

          return (
            <div
              className={`chat-row ${isOwnMessage ? "is-own" : "is-other"}`}
              key={`${message.created_at}-${index}`}
            >
              {!isOwnMessage ? <Avatar name={formatActorLabel(message.actor_id)} size="sm" /> : null}
              <div className={`chat-bubble ${variant === "confirmation-request" ? "is-action" : ""}`}>
                <div className="chat-meta">
                  <strong>{isOwnMessage ? actorName : formatActorLabel(message.actor_id)}</strong>
                  <span>{new Date(message.created_at).toLocaleString()}</span>
                </div>
                {variant === "offer" ? (
                  <OfferCard message={message} previousAmount={previousOfferAmount(sortedMessages, index)} />
                ) : null}
                {variant === "confirmation-request" ? (
                  <div className="offer-card">
                    <div className="offer-card-head">
                      <StatusPill tone="degraded">Confirmation request</StatusPill>
                    </div>
                    <p>{message.note ?? "Ready for final agreement review."}</p>
                  </div>
                ) : null}
                {variant === "note" && message.note ? <p>{message.note}</p> : null}
              </div>
              {isOwnMessage ? <Avatar name={actorName} size="sm" /> : null}
            </div>
          );
        })}
      </div>

      <div className="negotiation-actions-bar">
        {uiState.canCounter ? (
          <section className="queue-card negotiation-action-card">
            <h3>Send counteroffer</h3>
            <div className="grid-two">
              <div className="field">
                <label htmlFor="counter-amount">Counter amount</label>
                <input
                  className="ds-input"
                  id="counter-amount"
                  step="0.01"
                  type="number"
                  value={counterValue}
                  onChange={(event) => onCounterValueChange(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="counter-currency">Currency</label>
                <input
                  className="ds-input"
                  id="counter-currency"
                  value={counterCurrency}
                  onChange={(event) => onCounterCurrencyChange(event.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="counter-note">Terms note</label>
              <textarea
                className="ds-input ds-textarea"
                id="counter-note"
                rows={3}
                value={counterNote}
                onChange={(event) => onCounterNoteChange(event.target.value)}
              />
            </div>
            <button className="button-secondary" disabled={isMutating} type="button" onClick={() => void onSubmitCounter()}>
              {isMutating ? "Submitting..." : "Send counteroffer"}
            </button>
          </section>
        ) : null}

        {uiState.canRequestConfirmation ? (
          <section className="queue-card negotiation-action-card">
            <h3>Prepare the deal for a final answer</h3>
            <div className="field">
              <label htmlFor="confirmation-note">Checkpoint note</label>
              <textarea
                className="ds-input ds-textarea"
                id="confirmation-note"
                rows={3}
                value={confirmationRequestNote}
                onChange={(event) => onConfirmationNoteChange(event.target.value)}
              />
            </div>
            <button
              className="button-ghost"
              disabled={isMutating}
              type="button"
              onClick={() => void onRequestConfirmation(uiState.otherParticipantActorId)}
            >
              {isMutating ? "Requesting..." : "Move to payment review"}
            </button>
          </section>
        ) : null}

        {uiState.canApprove || uiState.canReject ? (
          <section className="queue-card negotiation-action-card">
            <h3>Resolve confirmation</h3>
            <div className="field">
              <label htmlFor="approval-note">Decision note</label>
              <textarea
                className="ds-input ds-textarea"
                id="approval-note"
                rows={3}
                value={confirmationDecisionNote}
                onChange={(event) => onApprovalNoteChange(event.target.value)}
              />
            </div>
            <div className="actions-row">
              {uiState.canApprove ? (
                <button className="button-primary" disabled={isMutating} type="button" onClick={() => void onApprove()}>
                  {isMutating ? "Approving..." : "Accept offer"}
                </button>
              ) : null}
              {uiState.canReject ? (
                <button className="button-ghost" disabled={isMutating} type="button" onClick={() => void onReject()}>
                  {isMutating ? "Rejecting..." : "Decline"}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
