"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight, CircleAlert, Clock3, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EscrowTimeline } from "@/components/wallet/escrow-timeline";
import {
  deriveWalletActions,
  escrowStateCopy,
  formatMoney,
  latestNotification,
  notificationSummary,
  notificationTone,
  settlementLabel,
  settlementTone,
  type EscrowReadModel,
} from "@/features/wallet/model";

function toneToVariant(tone: "online" | "offline" | "degraded" | "neutral") {
  if (tone === "online") {
    return "success" as const;
  }
  if (tone === "offline") {
    return "error" as const;
  }
  if (tone === "degraded") {
    return "warning" as const;
  }
  return "neutral" as const;
}

interface EscrowCardProps {
  actionError?: string | null;
  actorId: string;
  busyAction: "fund" | "release" | "reverse" | "dispute" | null;
  escrow: EscrowReadModel;
  note: string;
  onAction: (action: "fund" | "release" | "reverse" | "dispute", escrow: EscrowReadModel) => void;
  onNoteChange: (note: string) => void;
}

export function EscrowCard({
  actionError,
  actorId,
  busyAction,
  escrow,
  note,
  onAction,
  onNoteChange,
}: EscrowCardProps) {
  const counterparty = actorId === escrow.buyer_actor_id ? escrow.seller_actor_id : escrow.buyer_actor_id;
  const notification = latestNotification(escrow);
  const notificationState = notificationSummary(notification);
  const walletActions = deriveWalletActions(escrow, actorId);

  return (
    <article className="wallet-escrow-card">
      <div className="wallet-escrow-topline">
        <div>
          <p className="wallet-card-eyebrow">Escrow {escrow.escrow_id}</p>
          <h3>{formatMoney(escrow.amount, escrow.currency)}</h3>
          <p>
            Counterparty {counterparty} · Listing {escrow.listing_id}
          </p>
        </div>

        <div className="wallet-escrow-badges">
          <Badge variant={toneToVariant(settlementTone(escrow.state))}>{settlementLabel(escrow.state)}</Badge>
          <Badge variant={toneToVariant(notificationTone(notification))}>
            {notification ? notification.delivery_state : "No notification"}
          </Badge>
        </div>
      </div>

      <div className="wallet-escrow-grid">
        <article>
          <span>Thread</span>
          <strong>{escrow.thread_id}</strong>
        </article>
        <article>
          <span>Created</span>
          <strong>{new Date(escrow.created_at).toLocaleDateString()}</strong>
        </article>
        <article>
          <span>Last update</span>
          <strong>{new Date(escrow.updated_at).toLocaleDateString()}</strong>
        </article>
        <article>
          <span>Partner reason</span>
          <strong>{escrow.partner_reason_code ?? "None"}</strong>
        </article>
      </div>

      <div className="wallet-escrow-copy">
        <div className="wallet-callout wallet-callout-brand">
          <ReceiptText size={18} />
          <div>
            <strong>{escrowStateCopy(escrow).title}</strong>
            <p>{escrowStateCopy(escrow).body}</p>
          </div>
        </div>

        <div className="wallet-callout wallet-callout-muted">
          <Clock3 size={18} />
          <div>
            <strong>{notificationState.headline}</strong>
            <p>{notificationState.detail}</p>
          </div>
        </div>
      </div>

      <EscrowTimeline escrow={escrow} />

      <label className="wallet-note-field" htmlFor={`wallet-note-${escrow.escrow_id}`}>
        <span>Settlement note</span>
        <Textarea
          id={`wallet-note-${escrow.escrow_id}`}
          rows={3}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </label>

      {actionError ? (
        <div className="wallet-inline-error" role="alert">
          <CircleAlert size={16} />
          <span>{actionError}</span>
        </div>
      ) : null}

      <div className="wallet-escrow-actions">
        {walletActions.map((action) => (
          <div className="wallet-action-panel" key={`${escrow.escrow_id}-${action.action}`}>
            <div>
              <strong>{action.label}</strong>
              <p>{action.helperText}</p>
              {!action.allowed && action.disabledReason ? <span>{action.disabledReason}</span> : null}
            </div>
            <Button
              variant={action.allowed ? "primary" : "ghost"}
              loading={busyAction === action.action && action.allowed}
              disabled={!action.allowed}
              onClick={() => onAction(action.action, escrow)}
            >
              {action.label}
            </Button>
          </div>
        ))}
      </div>

      <div className="wallet-escrow-footer">
        <Link className="wallet-link-inline" href={`/app/market/negotiations/${escrow.thread_id}`}>
          Review negotiation thread
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
