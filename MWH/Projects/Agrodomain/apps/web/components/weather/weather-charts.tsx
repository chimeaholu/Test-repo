import React from "react";

import type { WeatherDailyPoint, WeatherHourlyPoint } from "@/features/climate/model";

function buildPolyline(points: number[], height: number): string {
  if (points.length === 0) {
    return "";
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = max - min || 1;

  return points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = height - ((value - min) / spread) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");
}

export function WeatherCharts(props: {
  daily: WeatherDailyPoint[];
  hourly: WeatherHourlyPoint[];
}) {
  const rainfallBars = props.daily.map((point) => point.rainfallMm);
  const maxRain = Math.max(...rainfallBars, 1);
  const tempPolyline = buildPolyline(props.hourly.map((point) => point.temperatureC), 120);

  return (
    <div className="weather-chart-grid">
      <section className="weather-chart-card" aria-label="Precipitation chart">
        <div className="section-heading">
          <div className="stack-sm">
            <p className="eyebrow">Precipitation</p>
            <h3>7-day rain outlook</h3>
          </div>
        </div>
        <div className="weather-bar-chart" role="img" aria-label="Bar chart of rainfall over 7 days">
          {props.daily.map((point) => (
            <div className="weather-bar-column" key={point.id}>
              <div className="weather-bar-rail">
                <div
                  className="weather-bar-fill"
                  style={{ height: `${Math.max((point.rainfallMm / maxRain) * 100, 8)}%` }}
                />
              </div>
              <strong>{point.rainfallMm}</strong>
              <span>{point.dayLabel}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="weather-chart-card" aria-label="Temperature chart">
        <div className="section-heading">
          <div className="stack-sm">
            <p className="eyebrow">Temperature</p>
            <h3>Today&apos;s hourly curve</h3>
          </div>
        </div>
        <div className="weather-line-chart" role="img" aria-label="Line chart of hourly temperature">
          <svg preserveAspectRatio="none" viewBox="0 0 100 120">
            <polyline fill="none" points={tempPolyline} stroke="var(--color-info)" strokeWidth="3" />
          </svg>
          <div className="weather-line-labels">
            {props.hourly.map((point) => (
              <div key={point.id}>
                <strong>{point.temperatureC}°</strong>
                <span>{point.timeLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
