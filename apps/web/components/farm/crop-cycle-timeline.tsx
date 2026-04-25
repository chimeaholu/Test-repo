import React from "react";

import { Badge, Card } from "@/components/ui";
import type { CropCycle } from "@/lib/api/farm";

interface CropCycleTimelineProps {
  cycles: CropCycle[];
  fieldId: string;
}

function statusVariant(status: CropCycle["status"]): "neutral" | "success" | "warning" {
  if (status === "active") {
    return "success";
  }
  if (status === "planned") {
    return "warning";
  }
  return "neutral";
}

export function CropCycleTimeline({ cycles, fieldId }: CropCycleTimelineProps) {
  const fieldCycles = cycles.filter((cycle) => cycle.fieldId === fieldId);

  return (
    <Card className="farm-detail-card">
      <div className="farm-section-head">
        <div>
          <p className="farm-kicker">Crop cycle</p>
          <h3>Season timeline</h3>
        </div>
      </div>

      <ol className="farm-timeline">
        {fieldCycles.map((cycle) => (
          <li className="farm-timeline-item" key={cycle.cropCycleId}>
            <span className="farm-timeline-dot" />
            <div className="farm-timeline-copy">
              <div className="farm-timeline-head">
                <strong>
                  {cycle.cropType} · {cycle.variety}
                </strong>
                <Badge variant={statusVariant(cycle.status)}>{cycle.status}</Badge>
              </div>
              <span>
                Planting {new Date(cycle.plantingDate).toLocaleDateString()}
                {cycle.harvestDate ? ` · Harvest ${new Date(cycle.harvestDate).toLocaleDateString()}` : ""}
              </span>
              <p>
                {cycle.yieldTons != null ? `${cycle.yieldTons.toFixed(1)}t harvested` : "Yield not yet closed"}
                {cycle.revenue != null ? ` · Revenue ${cycle.revenue.toLocaleString()}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
