"use client";

import type { CopilotRecommendation } from "@agrodomain/contracts";
import React from "react";

interface ProactiveRecommendationsProps {
  completedIds: string[];
  confirmingId: string | null;
  items: CopilotRecommendation[];
  onAction: (recommendation: CopilotRecommendation) => void;
  onCancelConfirm: () => void;
  pendingId: string | null;
}

function priorityLabel(priority: CopilotRecommendation["priority"]): string {
  if (priority === "critical") return "Critical";
  if (priority === "high") return "High";
  return "Medium";
}

export function ProactiveRecommendations({
  completedIds,
  confirmingId,
  items,
  onAction,
  onCancelConfirm,
  pendingId,
}: ProactiveRecommendationsProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="agroguide-recommendations" aria-label="AgroGuide recommended next steps">
      <div className="agroguide-recommendations-head">
        <strong>Recommended next steps</strong>
        <span>Live from marketplace, weather, and shipment context</span>
      </div>

      <div className="agroguide-recommendation-list">
        {items.map((item) => {
          const isConfirming = confirmingId === item.recommendation_id;
          const isPending = pendingId === item.recommendation_id;
          const isCompleted = completedIds.includes(item.recommendation_id);

          return (
            <article className="agroguide-recommendation-card" key={item.recommendation_id}>
              <div className="agroguide-recommendation-meta">
                <span className={`agroguide-recommendation-priority agroguide-priority-${item.priority}`}>
                  {priorityLabel(item.priority)}
                </span>
                <span>{item.category}</span>
              </div>

              <div className="agroguide-recommendation-copy">
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
                <span className="agroguide-inline-meta">{item.rationale}</span>
                <span className="agroguide-inline-meta">
                  Guardrails: {item.guardrails.join(" ")}
                </span>
              </div>

              {isConfirming ? (
                <div className="agroguide-recommendation-actions">
                  <button
                    className="agroguide-send-button"
                    disabled={isPending}
                    onClick={() => onAction(item)}
                    type="button"
                  >
                    {isPending ? "Applying..." : `Confirm ${item.action.label}`}
                  </button>
                  <button
                    className="agroguide-input-icon"
                    disabled={isPending}
                    onClick={onCancelConfirm}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="agroguide-recommendation-actions">
                  <button
                    className="agroguide-send-button"
                    disabled={isPending}
                    onClick={() => onAction(item)}
                    type="button"
                  >
                    {isCompleted ? "Applied" : item.action.label}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
