import React from "react";

import { RainIcon, SunIcon, TemperatureIcon, WindIcon } from "@/components/icons";
import type { WeatherHourlyPoint } from "@/features/climate/model";

function ConditionIcon(props: { conditionKey: WeatherHourlyPoint["conditionKey"] }) {
  if (props.conditionKey === "rain" || props.conditionKey === "humid") {
    return <RainIcon aria-hidden="true" size={16} />;
  }
  if (props.conditionKey === "storm") {
    return <WindIcon aria-hidden="true" size={16} />;
  }
  if (props.conditionKey === "heat") {
    return <TemperatureIcon aria-hidden="true" size={16} />;
  }
  return <SunIcon aria-hidden="true" size={16} />;
}

export function ForecastHourly(props: { points: WeatherHourlyPoint[] }) {
  return (
    <div className="weather-hourly-strip" role="list" aria-label="Hourly weather breakdown">
      {props.points.map((point) => (
        <article className="weather-hour-card" key={point.id} role="listitem">
          <span className="weather-hour-label">{point.timeLabel}</span>
          <ConditionIcon conditionKey={point.conditionKey} />
          <strong>{point.temperatureC}°</strong>
          <span className="muted">{point.rainfallMm} mm</span>
          <span className="muted">{point.windKph} kph</span>
        </article>
      ))}
    </div>
  );
}
