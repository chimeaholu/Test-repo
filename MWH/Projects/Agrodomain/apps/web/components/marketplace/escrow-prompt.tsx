"use client";

import type { NegotiationThreadRead } from "@agrodomain/contracts";
import Link from "next/link";
import React from "react";

import { EscrowManagement } from "@/components/wallet/escrow-management";
import { InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import type { EscrowReadModel } from "@/features/wallet/model";

type EscrowPromptProps = {
  actorId: string;
  error?: string | null;
  existingEscrow: EscrowReadModel | null;
  isMutating?: boolean;
  note: string;
  onInitiate: () => void;
  onNoteChange: (value: string) => void;
  thread: NegotiationThreadRead;
};

export function EscrowPrompt({
  actorId,
  error = null,
  existingEscrow,
  isMutating = false,
  note,
  onInitiate,
  onNoteChange,
  thread,
}: EscrowPromptProps) {
  if (thread.status !== "accepted") {
    return null;
  }

  const isBuyer = actorId === thread.buyer_actor_id;

  if (existingEscrow) {
    return (
      <SurfaceCard>
        <SectionHeading
          eyebrow="Move to payment"
          title="This deal is already protected"
          body="The accepted deal is already protected in the wallet. Keep monitoring status here or continue in the full payment view."
          actions={
            <div className="pill-row">
              <StatusPill tone="online">Escrow live</StatusPill>
              <StatusPill tone="neutral">{existingEscrow.escrow_id}</StatusPill>
            </div>
          }
        />
        <EscrowManagement actorId={actorId} escrow={existingEscrow} mode="compact" note={note} />
        <div className="inline-actions">
          <Link className="button-primary" href={`/app/payments/wallet?escrow=${existingEscrow.escrow_id}`}>
            Review details
          </Link>
          <Link className="button-ghost" href="/app/notifications">
            View related alerts
          </Link>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard>
      <SectionHeading
        eyebrow="Move to payment"
        title={isBuyer ? "Secure this accepted deal" : "Waiting for buyer escrow"}
        body={
          isBuyer
            ? "The negotiation is accepted. Start escrow now so funds are reserved before delivery and release."
            : "The terms are accepted. Once the buyer starts escrow, both parties will see the timeline in AgroWallet."
        }
      />

      <InsightCallout
        title={isBuyer ? "Create escrow from this thread" : "Escrow starts with the buyer"}
        body={
          isBuyer
            ? "Escrow initiation will bind the payment hold to this exact negotiation thread and make it visible in both wallet dashboards."
            : "You will receive wallet and notification updates as soon as the buyer secures funds for this thread."
        }
        tone={isBuyer ? "accent" : "neutral"}
      />

      {isBuyer ? (
        <>
          <div className="field">
            <label htmlFor="escrow-note">Payment note</label>
            <textarea
              className="ds-input ds-textarea"
              id="escrow-note"
              onChange={(event) => onNoteChange(event.target.value)}
              rows={3}
              value={note}
            />
            <p className="field-help">Add delivery or payment context that should travel with the escrow timeline.</p>
          </div>
          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="inline-actions">
            <button className="button-primary" disabled={isMutating} onClick={onInitiate} type="button">
              {isMutating ? "Starting payment hold..." : "Move to payment"}
            </button>
            <Link className="button-ghost" href="/app/payments/wallet">
              Review wallet
            </Link>
          </div>
        </>
      ) : (
        <div className="inline-actions">
          <Link className="button-secondary" href="/app/payments/wallet">
            Open wallet
          </Link>
          <Link className="button-ghost" href="/app/notifications">
            Watch notifications
          </Link>
        </div>
      )}
    </SurfaceCard>
  );
}
