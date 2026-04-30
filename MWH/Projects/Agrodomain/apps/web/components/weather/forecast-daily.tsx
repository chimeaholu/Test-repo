import React from "react";

import { RainIcon, SunIcon, TemperatureIcon, WindIcon } from "@/components/icons";
import type { WeatherDailyPoint } from "@/features/climate/model";

function ConditionIcon(props: { conditionKey: WeatherDailyPoint["conditionKey"] }) {
  if (props.conditionKey === "rain" || props.conditionKey === "humid") {
    return <RainIcon aria-hidden="true" size={18} />;
  }
  if (props.conditionKey === "storm") {
    return <WindIcon aria-hidden="true" size={18} />;
  }
  if (props.conditionKey === "heat") {
    return <TemperatureIcon aria-hidden="true" size={18} />;
  }
  return <SunIcon aria-hidden="true" size={18} />;
}

export function ForecastDaily(props: { points: WeatherDailyPoint[] }) {
  return (
    <div aria-label="Weather forecast" className="weather-daily-grid" role="region">
      {props.points.map((point) => (
        <article className={`weather-day-card${point.isToday ? " is-today" : ""}`} key={point.id}>
          <div className="queue-head">
            <div>
              <strong>{point.dayLabel}</strong>
              <p className="muted">{point.dateLabel}</p>
            </div>
            <ConditionIcon conditionKey={point.conditionKey} />
          </div>
          <div className="weather-day-temps">
            <strong>{point.highTempC}°</strong>
            <span>{point.lowTempC}°</span>
          </div>
          <div className="weather-day-meta">
            <span>{point.rainProbability}% rain</span>
            <span>{point.windKph} kph wind</span>
          </div>
        </article>
      ))}
    </div>
  );
}
