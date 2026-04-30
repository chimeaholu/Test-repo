"use client";

import React from "react";

import type { InsuranceClaimStage } from "@/lib/api/insurance";

type ClaimTimelineProps = {
  stages: InsuranceClaimStage[];
  status: InsuranceClaimStage["id"];
};

export function ClaimTimeline({ stages, status }: ClaimTimelineProps) {
  return (
    <ol className="insurance-timeline" aria-label="Claim status timeline">
      {stages.map((stage, index) => {
        const active = stage.id === status;
        const complete = index < stages.findIndex((item) => item.id === status) || status === "paid";

        return (
          <li className="insurance-timeline-item" key={`${stage.id}-${stage.at}`}>
            <span
              aria-hidden="true"
              className={[
                "insurance-timeline-dot",
                active ? "is-active" : "",
                complete ? "is-complete" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
            <div>
              <strong>{stage.label}</strong>
              <p>{new Date(stage.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
