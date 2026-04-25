"use client";

import React from "react";
import type { NegotiationMessage } from "@agrodomain/contracts";

import { StatusPill } from "@/components/ui-primitives";

type OfferCardProps = {
  message: NegotiationMessage;
  previousAmount?: number | null;
};

function offerLabel(action: NegotiationMessage["action"]): string {
  return action === "offer_countered" ? "Counteroffer" : "Offer";
}

export function OfferCard({ message, previousAmount }: OfferCardProps) {
  const delta =
    typeof previousAmount === "number" && typeof message.amount === "number"
      ? message.amount - previousAmount
      : null;

  return (
    <div className="offer-card">
      <div className="offer-card-head">
        <StatusPill tone={message.action === "offer_countered" ? "degraded" : "online"}>
          {offerLabel(message.action)}
        </StatusPill>
        {delta !== null ? (
          <span className={`offer-delta ${delta >= 0 ? "positive" : "negative"}`}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(2)}
          </span>
        ) : null}
      </div>
      <strong className="offer-price">
        {message.amount ?? "--"} {message.currency ?? ""}
      </strong>
      {message.note ? <p>{message.note}</p> : null}
    </div>
  );
}
