"use client";

import React from "react";
import type { EscrowReadModel } from "@/features/wallet/model";
import { settlementLabel } from "@/features/wallet/model";

const ESCROW_STAGES: EscrowReadModel["state"][] = [
  "initiated",
  "pending_funds",
  "partner_pending",
  "funded",
  "released",
  "reversed",
  "disputed",
];

export function EscrowTimeline({ escrow }: { escrow: EscrowReadModel }) {
  const visitedStates = new Set(escrow.timeline.map((item) => item.state));
  visitedStates.add(escrow.state);

  return (
    <ol className="wallet-stage-rail" aria-label={`Escrow state progression for ${escrow.escrow_id}`}>
      {ESCROW_STAGES.map((stage) => {
        const status =
          stage === escrow.state ? "current" : visitedStates.has(stage) ? "completed" : "upcoming";

        return (
          <li className={`wallet-stage-step wallet-stage-${status}`} key={`${escrow.escrow_id}-${stage}`}>
            <span className="wallet-stage-marker" aria-hidden="true" />
            <div>
              <strong>{settlementLabel(stage)}</strong>
              <span>{status === "current" ? "Current state" : status === "completed" ? "Reached" : "Not reached"}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
