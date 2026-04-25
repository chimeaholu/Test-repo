"use client";

import React, { useState } from "react";

import { Badge, Button, Card } from "@/components/ui";
import type { FarmActivity } from "@/lib/api/farm";

interface ActivityLogProps {
  activities: FarmActivity[];
  fieldId: string;
  limit?: number;
}

const FILTERS: Array<"all" | FarmActivity["activityType"]> = [
  "all",
  "planting",
  "weeding",
  "fertilizing",
  "spraying",
  "irrigating",
  "harvesting",
  "scouting",
];

function tone(type: FarmActivity["activityType"]): "neutral" | "success" | "warning" {
  if (type === "fertilizing" || type === "planting" || type === "irrigating") {
    return "success";
  }
  if (type === "scouting" || type === "weeding") {
    return "warning";
  }
  return "neutral";
}

export function ActivityLog({ activities, fieldId, limit }: ActivityLogProps) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const scoped = activities
    .filter((activity) => activity.fieldId === fieldId)
    .filter((activity) => filter === "all" || activity.activityType === filter)
    .slice(0, limit ?? Number.MAX_SAFE_INTEGER);

  return (
    <Card className="farm-detail-card">
      <div className="farm-section-head">
        <div>
          <p className="farm-kicker">Activity log</p>
          <h3>Operational record</h3>
        </div>
        <div className="farm-filter-row">
          {FILTERS.map((item) => (
            <Button
              className={filter === item ? "farm-filter-active" : undefined}
              key={item}
              onClick={() => setFilter(item)}
              size="sm"
              variant="ghost"
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      <div className="farm-activity-list">
        {scoped.map((activity) => (
          <article className="farm-activity-item" key={activity.activityId}>
            <div className="farm-activity-head">
              <div>
                <strong>{activity.description}</strong>
                <span>{new Date(activity.date).toLocaleDateString()}</span>
              </div>
              <Badge variant={tone(activity.activityType)}>{activity.activityType}</Badge>
            </div>
            <p>{activity.notes || "No additional notes captured."}</p>
            <div className="farm-activity-meta">
              <span>{activity.laborHours.toFixed(1)} labour hours</span>
              <span>{activity.cost.toLocaleString()} cost</span>
              <span>{activity.inputsUsed.length ? activity.inputsUsed.join(", ") : "No linked inputs"}</span>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
