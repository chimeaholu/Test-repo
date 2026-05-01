import React from "react";

import { Badge, Button, Card } from "@/components/ui";
import { ActivityLog } from "./activity-log";
import { CropCycleTimeline } from "./crop-cycle-timeline";
import { FarmMap } from "./farm-map";
import { InputTracker } from "./input-tracker";
import type { FarmField, FarmWorkspace } from "@/lib/api/farm";

interface FieldDetailProps {
  field: FarmField;
  onLogActivity: () => void;
  workspace: FarmWorkspace;
}

export function FieldDetail({ field, onLogActivity, workspace }: FieldDetailProps) {
  const linkedInputs = workspace.inputs.filter((input) =>
    workspace.activities.some((activity) => activity.fieldId === field.fieldId && activity.inputsUsed.includes(input.name)),
  );

  return (
    <div className="farm-detail-stack">
      <Card className="farm-detail-hero" variant="elevated">
        <div className="farm-detail-hero-head">
          <div>
            <p className="farm-kicker">Field detail</p>
            <h1>{field.name}</h1>
            <p>
              {field.currentCrop} · {field.variety} · {field.areaHectares.toFixed(1)} hectares
            </p>
          </div>
          <div className="farm-detail-badges">
            <Badge variant={field.status === "active" ? "success" : field.status === "preparing" ? "warning" : "neutral"}>
              {field.status}
            </Badge>
            <Badge variant="brand">{field.soilType}</Badge>
            <Badge variant="info">{field.irrigationType}</Badge>
          </div>
        </div>

        <div className="farm-detail-hero-grid">
          <div className="farm-detail-map-card">
            <FarmMap fields={[field]} selectedFieldId={field.fieldId} />
          </div>
          <div className="farm-detail-summary">
            <div className="farm-summary-pair">
              <span>District</span>
              <strong>{field.district}</strong>
            </div>
            <div className="farm-summary-pair">
              <span>Next task</span>
              <strong>{field.nextTask}</strong>
            </div>
            <div className="farm-summary-pair">
              <span>Last activity</span>
              <strong>
                {field.lastActivityType} · {new Date(field.lastActivityAt).toLocaleDateString()}
              </strong>
            </div>
            <div className="farm-summary-pair">
              <span>Weather signal</span>
              <strong>{workspace.weather.alertSummary}</strong>
            </div>
            <div className="farm-detail-actions">
              <Button onClick={onLogActivity}>Log activity</Button>
              <Button href="/app/farm/inputs" variant="ghost">
                Review inputs
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="farm-detail-grid">
        <CropCycleTimeline cycles={workspace.cropCycles} fieldId={field.fieldId} />
        <Card className="farm-detail-card">
          <div className="farm-section-head">
            <div>
              <p className="farm-kicker">Weather context</p>
              <h3>Field weather watch</h3>
            </div>
            <Badge variant="info">{workspace.weather.riskLabel}</Badge>
          </div>
          <div className="farm-weather-metrics">
            <div>
              <span>Rainfall</span>
              <strong>{workspace.weather.rainfallMm != null ? `${workspace.weather.rainfallMm} mm` : "Pending"}</strong>
            </div>
            <div>
              <span>Temperature</span>
              <strong>{workspace.weather.temperatureC != null ? `${workspace.weather.temperatureC}°C` : "Pending"}</strong>
            </div>
            <div>
              <span>Soil moisture</span>
              <strong>
                {workspace.weather.soilMoisturePct != null ? `${workspace.weather.soilMoisturePct}%` : "Pending"}
              </strong>
            </div>
          </div>
          <p className="farm-weather-callout">{workspace.weather.alertSummary}</p>
        </Card>
      </div>

      <ActivityLog activities={workspace.activities} fieldId={field.fieldId} />
      <InputTracker activities={workspace.activities} inputs={linkedInputs} />
    </div>
  );
}
