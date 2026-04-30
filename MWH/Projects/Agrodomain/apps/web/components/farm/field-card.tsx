import React from "react";

import { Badge, Button, Card } from "@/components/ui";
import { CalendarIcon, FieldIcon, IrrigationIcon, LeafIcon } from "@/components/icons";
import type { FarmField } from "@/lib/api/farm";

interface FieldCardProps {
  field: FarmField;
  href?: string;
  selected?: boolean;
  onSelect?: () => void;
}

function statusVariant(status: FarmField["status"]): "neutral" | "success" | "warning" {
  if (status === "active") {
    return "success";
  }
  if (status === "preparing") {
    return "warning";
  }
  return "neutral";
}

export function FieldCard({ field, href, onSelect, selected }: FieldCardProps) {
  return (
    <Card className={`farm-card${selected ? " is-selected" : ""}`} variant="interactive">
      <div className="farm-card-head">
        <div className="farm-card-title">
          <strong>{field.name}</strong>
          <span>{field.district}</span>
        </div>
        <Badge variant={statusVariant(field.status)}>{field.status}</Badge>
      </div>

      <div className="farm-card-grid">
        <div>
          <span className="farm-card-label">
            <LeafIcon size={16} /> Crop
          </span>
          <strong>{field.currentCrop}</strong>
          <span>{field.variety}</span>
        </div>
        <div>
          <span className="farm-card-label">
            <FieldIcon size={16} /> Area
          </span>
          <strong>{field.areaHectares.toFixed(1)} ha</strong>
          <span>{field.soilType}</span>
        </div>
        <div>
          <span className="farm-card-label">
            <IrrigationIcon size={16} /> Water plan
          </span>
          <strong>{field.irrigationType}</strong>
          <span>{field.nextTask}</span>
        </div>
        <div>
          <span className="farm-card-label">
            <CalendarIcon size={16} /> Harvest
          </span>
          <strong>{new Date(field.expectedHarvestDate).toLocaleDateString()}</strong>
          <span>{field.healthSummary}</span>
        </div>
      </div>

      <div className="farm-card-footer">
        <span>
          Last {field.lastActivityType} · {new Date(field.lastActivityAt).toLocaleDateString()}
        </span>
        {href ? (
          <Button href={href} size="sm" variant="ghost">
            Open field
          </Button>
        ) : (
          <Button onClick={onSelect} size="sm" variant="ghost">
            Review field
          </Button>
        )}
      </div>
    </Card>
  );
}
