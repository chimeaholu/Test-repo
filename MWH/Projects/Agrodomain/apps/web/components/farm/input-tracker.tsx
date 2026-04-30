import React from "react";

import { Badge, Button, Card } from "@/components/ui";
import type { FarmActivity, FarmInput } from "@/lib/api/farm";

interface InputTrackerProps {
  activities: FarmActivity[];
  compact?: boolean;
  inputs: FarmInput[];
  onAddRequested?: () => void;
}

function lowStock(input: FarmInput): boolean {
  return input.quantity <= input.reorderLevel;
}

export function InputTracker({ activities, compact = false, inputs, onAddRequested }: InputTrackerProps) {
  const visibleInputs = compact ? inputs.slice(0, 4) : inputs;

  return (
    <Card className="farm-detail-card">
      <div className="farm-section-head">
        <div>
          <p className="farm-kicker">Input inventory</p>
          <h3>Stock posture</h3>
        </div>
        {onAddRequested ? (
          <Button onClick={onAddRequested} size="sm" variant="ghost">
            Add input
          </Button>
        ) : null}
      </div>

      <div className="farm-input-list">
        {visibleInputs.map((input) => {
          const usageCount = activities.filter((activity) => activity.inputsUsed.includes(input.name)).length;

          return (
            <article className="farm-input-item" key={input.inputId}>
              <div className="farm-input-head">
                <div>
                  <strong>{input.name}</strong>
                  <span>{input.supplier}</span>
                </div>
                <Badge variant={lowStock(input) ? "warning" : "success"}>
                  {lowStock(input) ? "low stock" : "ready"}
                </Badge>
              </div>
              <div className="farm-input-metrics">
                <span>
                  {input.quantity} {input.unit}
                </span>
                <span>Reorder at {input.reorderLevel}</span>
                <span>{usageCount} linked activities</span>
                <span>{input.expiryDate ? `Expires ${new Date(input.expiryDate).toLocaleDateString()}` : "No expiry set"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </Card>
  );
}
