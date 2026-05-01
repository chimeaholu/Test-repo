"use client";

import React from "react";

import { InfoList, InsightCallout, SectionHeading, StatusPill } from "@/components/ui-primitives";
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
  type EscrowReadModel,
} from "@/features/wallet/model";
import { buildEscrowExplainability } from "@/features/marketplace/trust";

type EscrowAction = "fund" | "release" | "reverse" | "dispute";

type EscrowManagementProps = {
  actionError?: string | null;
  actorId: string;
  escrow: EscrowReadModel | null;
  isMutating?: boolean;
  mode?: "compact" | "full";
  note: string;
  onAction?: (action: EscrowAction, escrow: EscrowReadModel) => void;
  onNoteChange?: (value: string) => void;
};

export function EscrowManagement({
  actionError = null,
  actorId,
  escrow,
  isMutating = false,
  mode = "full",
  note,
  onAction,
  onNoteChange,
}: EscrowManagementProps) {
  if (!escrow) {
    return (
      <InsightCallout
        title="No escrow selected"
        body="Choose an escrow to review status, delivery updates, and the next action."
        tone="neutral"
      />
    );
  }

  const selectedNotification = latestNotification(escrow);
  const actions = deriveWalletActions(escrow, actorId);
  const timelineItems = mode === "compact" ? settlementTimeline(escrow).slice(0, 3) : settlementTimeline(escrow);
  const stateCopy = escrowStateCopy(escrow);
  const explainability = buildEscrowExplainability(escrow, actorId);

  return (
    <div className="content-stack">
      <SectionHeading
        eyebrow={mode === "compact" ? "Escrow status" : "Selected escrow"}
        title={mode === "compact" ? "Payment hold status" : "Payment hold details"}
        body={
          mode === "compact"
            ? "This accepted deal is now connected to a payment hold you can continue in the wallet."
            : "Review the latest status, add a note, and take the next payment action from one place."
        }
      />

      <div className="pill-row">
        <StatusPill tone={settlementTone(escrow.state)}>{settlementLabel(escrow.state)}</StatusPill>
        <StatusPill tone="neutral">{formatMoney(escrow.amount, escrow.currency)}</StatusPill>
        {selectedNotification ? (
          <StatusPill tone={notificationTone(selectedNotification)}>
            Notification {selectedNotification.delivery_state}
          </StatusPill>
        ) : null}
      </div>

      <InsightCallout
        title={stateCopy.title}
        body={stateCopy.body}
        tone={escrow.state === "partner_pending" || escrow.state === "funded" ? "accent" : "brand"}
      />

      <div className="wallet-explain-grid" role="list" aria-label="Escrow explainability">
        <article className="wallet-explain-card" role="listitem">
          <span>Funds location</span>
          <strong>{explainability.fundsLocation}</strong>
          <p className="muted">{explainability.statusSummary}</p>
        </article>
        <article className="wallet-explain-card" role="listitem">
          <span>Release condition</span>
          <strong>{explainability.releaseCondition}</strong>
          <p className="muted">{explainability.blocker}</p>
        </article>
        <article className="wallet-explain-card" role="listitem">
          <span>Who acts next</span>
          <strong>{explainability.nextOwnerLabel}</strong>
          <p className="muted">Use this before you fund, release, reverse, or escalate the settlement.</p>
        </article>
      </div>

      <InfoList
        items={[
          { label: "Thread", value: escrow.thread_id },
          { label: "Listing", value: escrow.listing_id },
          { label: "Buyer", value: escrow.buyer_actor_id },
          { label: "Seller", value: escrow.seller_actor_id },
          { label: "Partner reason", value: escrow.partner_reason_code ?? "none" },
        ]}
      />

      {mode === "full" ? (
        <>
          <div className="field">
            <label htmlFor="wallet-note">Payment note</label>
            <textarea
              id="wallet-note"
              onChange={(event) => onNoteChange?.(event.target.value)}
              rows={3}
              value={note}
            />
            <p className="field-help">Add a short note to explain the action you are taking on this escrow.</p>
          </div>

          {actionError ? (
            <p className="field-error" role="alert">
              {actionError}
            </p>
          ) : null}

          <div className="wallet-actions">
            {actions.map((action) => (
              <div className="wallet-action-card" key={`${escrow.escrow_id}-${action.action}`}>
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
                  onClick={() => onAction?.(action.action, escrow)}
                  type="button"
                >
                  {isMutating && action.allowed ? `${action.label}...` : action.label}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <section className="queue-card">
        <SectionHeading
          eyebrow="Latest payment update"
          title="Latest delivery and payment status"
          body="See the most recent payment notification, delivery method, and any follow-up that may be needed."
        />

        {!selectedNotification ? (
          <InsightCallout
            title="No delivery update on the latest step"
            body="Some escrow steps update the status without sending a customer-facing payment message."
            tone="neutral"
          />
        ) : (
          <div className="content-stack">
            <div className="pill-row">
              <StatusPill tone={notificationTone(selectedNotification)}>{selectedNotification.delivery_state}</StatusPill>
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
                { label: "Recipient", value: selectedNotification.recipient_actor_id },
                { label: "Delivery channel", value: selectedNotification.channel },
                { label: "Fallback channel", value: selectedNotification.fallback_channel ?? "none" },
                { label: "Fallback reason", value: selectedNotification.fallback_reason ?? "none" },
              ]}
            />
          </div>
        )}
      </section>

      <section className="queue-card">
        <SectionHeading
          eyebrow="Payments on hold"
          title="Settlement timeline"
          body={
            mode === "compact"
              ? "Review the latest state changes without leaving the negotiation."
              : "Follow each step from funding to completion and review the note attached to every update."
          }
        />
        <ul className="timeline-list" role="list" aria-label="Escrow settlement timeline">
          {timelineItems.map((item) => (
            <li className="timeline-row" key={`${item.request_id}-${item.transition}`}>
              <div
                className={`timeline-marker ${
                  item.state === "released" || item.state === "funded"
                    ? "done"
                    : item.state === "partner_pending"
                      ? "current"
                      : ""
                }`}
              />
              <div className="stack-sm">
                <div className="queue-head">
                  <strong>{item.transition}</strong>
                  <StatusPill tone={settlementTone(item.state)}>{settlementLabel(item.state)}</StatusPill>
                </div>
                <p className="muted">
                  {item.actor_id} · {new Date(item.created_at).toLocaleString()}
                </p>
                {item.note ? <p>{item.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
