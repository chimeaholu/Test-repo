import React from "react";

import type { ClimateRuntimeSnapshot, FarmProfileRead } from "@/lib/api-types";
import type { WeatherSnapshot } from "@/features/climate/model";
import { RainIcon, SunIcon, TemperatureIcon, WindIcon } from "@/components/icons";
import { StatusPill } from "@/components/ui-primitives";

function ConditionIcon(props: { conditionKey: WeatherSnapshot["conditionKey"] }) {
  if (props.conditionKey === "rain" || props.conditionKey === "humid") {
    return <RainIcon aria-hidden="true" size={28} />;
  }
  if (props.conditionKey === "storm") {
    return <WindIcon aria-hidden="true" size={28} />;
  }
  if (props.conditionKey === "heat") {
    return <TemperatureIcon aria-hidden="true" size={28} />;
  }
  return <SunIcon aria-hidden="true" size={28} />;
}

export function CurrentConditions(props: {
  current: WeatherSnapshot;
  degradedCount: number;
  farm: FarmProfileRead;
  openAlertCount: number;
  runtimeMode: ClimateRuntimeSnapshot["runtime_mode"];
}) {
  const updatedLabel = new Date(props.current.observedAt).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

  return (
    <section
      aria-label={`Current weather conditions for ${props.farm.farm_name}`}
      className="weather-current-card"
    >
      <div className="weather-current-head">
        <div className="stack-sm">
          <p className="eyebrow">Current conditions</p>
          <div className="weather-title-row">
            <ConditionIcon conditionKey={props.current.conditionKey} />
            <div className="stack-sm">
              <h2>{props.farm.farm_name}</h2>
              <p className="muted">
                {props.farm.district} · {props.farm.crop_type} · {props.farm.hectares} ha
              </p>
            </div>
          </div>
        </div>
        <div className="pill-row">
          <StatusPill tone={props.runtimeMode === "live" ? "online" : "degraded"}>
            {props.runtimeMode === "live" ? "Live updates" : "Saved reference view"}
          </StatusPill>
          <StatusPill tone={props.openAlertCount > 0 ? "degraded" : "online"}>
            {props.openAlertCount} open alert{props.openAlertCount === 1 ? "" : "s"}
          </StatusPill>
        </div>
      </div>

      <div className="weather-current-summary">
        <div>
          <strong className="weather-temperature">{props.current.temperatureC}°C</strong>
          <p className="weather-condition-copy">{props.current.conditionLabel}</p>
        </div>
        <p className="muted">Updated {updatedLabel}</p>
      </div>

      <div className="weather-metric-grid">
        <article className="weather-metric-chip">
          <span>Rain chance</span>
          <strong>{props.current.rainProbability}%</strong>
        </article>
        <article className="weather-metric-chip">
          <span>Rainfall</span>
          <strong>{props.current.rainfallMm} mm</strong>
        </article>
        <article className="weather-metric-chip">
          <span>Humidity</span>
          <strong>{props.current.humidityPct}%</strong>
        </article>
        <article className="weather-metric-chip">
          <span>Wind</span>
          <strong>{props.current.windKph} kph</strong>
        </article>
        <article className="weather-metric-chip">
          <span>Soil moisture</span>
          <strong>{props.current.soilMoisturePct}%</strong>
        </article>
        <article className="weather-metric-chip">
          <span>UV index</span>
          <strong>{props.current.uvIndex}</strong>
        </article>
      </div>

      {props.degradedCount > 0 ? (
        <p className="muted">
          {props.degradedCount} recent update window{props.degradedCount === 1 ? "" : "s"} came in late. Use this as
          a planning guide and confirm locally before acting.
        </p>
      ) : null}
    </section>
  );
}
