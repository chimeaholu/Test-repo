"use client";

import React from "react";

import { Badge } from "@/components/ui";
import type { FarmField } from "@/lib/api/farm";

interface FarmMapProps {
  fields: FarmField[];
  selectedFieldId?: string | null;
  onSelect?: (fieldId: string) => void;
}

type MapPoint = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapTone(status: FarmField["status"]): string {
  if (status === "active") {
    return "#2d8a53";
  }
  if (status === "preparing") {
    return "#d4922b";
  }
  return "#8e846f";
}

function normalizePoints(fields: FarmField[]): Record<string, MapPoint[]> {
  const allPoints = fields.flatMap((field) => field.boundary);
  const latitudes = allPoints.map((point) => point.lat);
  const longitudes = allPoints.map((point) => point.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return Object.fromEntries(
    fields.map((field) => [
      field.fieldId,
      field.boundary.map((point) => ({
        x: clamp(((point.lng - minLng) / Math.max(0.0001, maxLng - minLng)) * 84 + 8, 8, 92),
        y: clamp(66 - ((point.lat - minLat) / Math.max(0.0001, maxLat - minLat)) * 50, 10, 60),
      })),
    ]),
  );
}

export function FarmMap({ fields, selectedFieldId, onSelect }: FarmMapProps) {
  const normalized = normalizePoints(fields);

  return (
    <div className="farm-map">
      <div className="farm-map-surface">
        <svg aria-label="Field boundary map" viewBox="0 0 100 70">
          <defs>
            <pattern id="farm-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(24, 42, 29, 0.08)" strokeWidth="0.7" />
            </pattern>
          </defs>
          <rect width="100" height="70" rx="8" fill="url(#farm-grid)" />
          {fields.map((field) => {
            const points = normalized[field.fieldId] ?? [];
            const isActive = field.fieldId === selectedFieldId;
            const color = mapTone(field.status);

            return (
              <g key={field.fieldId}>
                <polygon
                  fill={isActive ? `${color}33` : `${color}1c`}
                  points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                  stroke={color}
                  strokeWidth={isActive ? 2.6 : 1.8}
                />
                <text
                  fill="#18301f"
                  fontFamily="var(--font-body)"
                  fontSize="3.2"
                  fontWeight="700"
                  x={points[0]?.x ?? 10}
                  y={(points[0]?.y ?? 14) - 1}
                >
                  {field.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="farm-map-legend" role="list" aria-label="Field list">
        {fields.map((field) => {
          const active = field.fieldId === selectedFieldId;

          return (
            <button
              className={`farm-map-legend-item${active ? " is-active" : ""}`}
              key={field.fieldId}
              onClick={() => onSelect?.(field.fieldId)}
              type="button"
            >
              <span className="farm-map-dot" style={{ background: mapTone(field.status) }} />
              <span className="farm-map-copy">
                <strong>{field.name}</strong>
                <span>
                  {field.areaHectares.toFixed(1)} ha · {field.currentCrop}
                </span>
              </span>
              <Badge variant={field.status === "active" ? "success" : field.status === "preparing" ? "warning" : "neutral"}>
                {field.status}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
