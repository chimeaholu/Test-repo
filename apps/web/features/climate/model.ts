import {
  climateAlertSchema,
  climateDegradedModeSchema,
  mrvEvidenceRecordSchema,
} from "@agrodomain/contracts";
import { z } from "zod";

import type { ClimateObservationRead, FarmProfileRead } from "@/lib/api-types";

export type ClimateAlertViewModel = z.infer<typeof climateAlertSchema>;
export type ClimateDegradedModeViewModel = z.infer<typeof climateDegradedModeSchema>;
export type MrvEvidenceViewModel = z.infer<typeof mrvEvidenceRecordSchema>;

export type WeatherTone = "online" | "offline" | "degraded" | "neutral";
export type WeatherConditionKey =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "storm"
  | "humid"
  | "heat";

export type WeatherSnapshot = {
  conditionKey: WeatherConditionKey;
  conditionLabel: string;
  humidityPct: number;
  observedAt: string;
  rainProbability: number;
  rainfallMm: number;
  soilMoisturePct: number;
  temperatureC: number;
  uvIndex: number;
  windKph: number;
};

export type WeatherHourlyPoint = {
  conditionKey: WeatherConditionKey;
  conditionLabel: string;
  humidityPct: number;
  id: string;
  rainfallMm: number;
  temperatureC: number;
  timeLabel: string;
  timestamp: string;
  windKph: number;
};

export type WeatherDailyPoint = {
  conditionKey: WeatherConditionKey;
  conditionLabel: string;
  dateLabel: string;
  dayLabel: string;
  highTempC: number;
  id: string;
  isToday: boolean;
  lowTempC: number;
  rainProbability: number;
  rainfallMm: number;
  windKph: number;
};

export type CropAdviceItem = {
  detail: string;
  id: string;
  title: string;
  tone: WeatherTone;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function readNumericPayload(
  observation: ClimateObservationRead,
  key: string,
): number | null {
  const value = observation.normalized_payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function climateSeverityTone(
  severity: ClimateAlertViewModel["severity"],
): "online" | "degraded" | "offline" {
  switch (severity) {
    case "info":
      return "online";
    case "warning":
      return "degraded";
    case "critical":
      return "offline";
  }
}

export function climateSourceConfidence(alert: ClimateAlertViewModel): string {
  return alert.degraded_mode
    ? "Confidence is lighter while recent source updates catch up"
    : "Checked against the latest available source window";
}

export function mrvCompletenessTone(
  completeness: MrvEvidenceViewModel["source_completeness"],
): "online" | "degraded" | "offline" {
  switch (completeness) {
    case "complete":
      return "online";
    case "partial":
      return "degraded";
    case "degraded":
      return "offline";
  }
}

export function sortAlerts(items: ClimateAlertViewModel[]): ClimateAlertViewModel[] {
  const order: Record<ClimateAlertViewModel["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return [...items].sort((left, right) => {
    const severityDiff = order[left.severity] - order[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return right.created_at.localeCompare(left.created_at);
  });
}

export function filterAlertsForFarm(
  alerts: ClimateAlertViewModel[],
  farmId: string | null,
): ClimateAlertViewModel[] {
  if (!farmId) {
    return alerts;
  }
  return alerts.filter((alert) => alert.farm_profile_id === farmId);
}

export function deriveHumidityPct(
  observation: ClimateObservationRead,
): number {
  const payloadValue = readNumericPayload(observation, "humidity_pct");
  if (payloadValue !== null) {
    return clamp(Math.round(payloadValue), 10, 99);
  }
  const soil = observation.soil_moisture_pct ?? 52;
  const rainfall = observation.rainfall_mm ?? 10;
  return clamp(Math.round(soil * 0.78 + rainfall * 0.35), 18, 98);
}

export function deriveWindKph(
  observation: ClimateObservationRead,
): number {
  const payloadValue = readNumericPayload(observation, "wind_kph");
  if (payloadValue !== null) {
    return clamp(Math.round(payloadValue), 4, 55);
  }
  const anomaly = observation.anomaly_score ?? 0.35;
  const rainfall = observation.rainfall_mm ?? 0;
  return clamp(Math.round(10 + anomaly * 18 + rainfall * 0.12), 6, 48);
}

export function deriveUvIndex(
  observation: ClimateObservationRead,
): number {
  const payloadValue = readNumericPayload(observation, "uv_index");
  if (payloadValue !== null) {
    return clamp(Math.round(payloadValue), 1, 11);
  }
  const temp = observation.temperature_c ?? 28;
  const rainfall = observation.rainfall_mm ?? 0;
  return clamp(Math.round((temp - 16) / 2.2 - rainfall * 0.04), 1, 11);
}

export function deriveRainProbability(
  observation: ClimateObservationRead,
  alerts: ClimateAlertViewModel[],
): number {
  const rainfall = observation.rainfall_mm ?? 0;
  const severeAlertBonus = alerts.some((alert) => alert.severity !== "info") ? 12 : 0;
  const degradedPenalty = observation.degraded_mode ? 8 : 0;
  return clamp(Math.round(rainfall * 1.6 + severeAlertBonus + degradedPenalty), 6, 98);
}

export function weatherConditionFromSnapshot(input: {
  degradedMode?: boolean;
  humidityPct: number;
  rainfallMm: number;
  temperatureC: number;
  windKph: number;
}): {
  key: WeatherConditionKey;
  label: string;
} {
  if (input.windKph >= 26 && input.rainfallMm >= 20) {
    return { key: "storm", label: "Storm watch" };
  }
  if (input.rainfallMm >= 18) {
    return { key: "rain", label: "Steady rain" };
  }
  if (input.temperatureC >= 34) {
    return { key: "heat", label: "Hot and dry" };
  }
  if (input.humidityPct >= 78) {
    return { key: "humid", label: "Humid conditions" };
  }
  if (input.degradedMode) {
    return { key: "cloudy", label: "Cloud cover" };
  }
  if (input.windKph >= 18) {
    return { key: "partly-cloudy", label: "Breezy skies" };
  }
  return { key: "clear", label: "Clear window" };
}

export function buildCurrentSnapshot(
  observations: ClimateObservationRead[],
  alerts: ClimateAlertViewModel[],
): WeatherSnapshot | null {
  const latest = observations[0];
  if (!latest) {
    return null;
  }

  const temperatureC = round(latest.temperature_c ?? 28);
  const rainfallMm = round(latest.rainfall_mm ?? 0);
  const soilMoisturePct = round(latest.soil_moisture_pct ?? 52);
  const humidityPct = deriveHumidityPct(latest);
  const windKph = deriveWindKph(latest);
  const uvIndex = deriveUvIndex(latest);
  const rainProbability = deriveRainProbability(latest, alerts);
  const condition = weatherConditionFromSnapshot({
    degradedMode: latest.degraded_mode,
    humidityPct,
    rainfallMm,
    temperatureC,
    windKph,
  });

  return {
    conditionKey: condition.key,
    conditionLabel: condition.label,
    humidityPct,
    observedAt: latest.observed_at,
    rainProbability,
    rainfallMm,
    soilMoisturePct,
    temperatureC,
    uvIndex,
    windKph,
  };
}

function synthesizeObservationPoint(
  current: ClimateObservationRead,
  timestamp: number,
  offset: number,
): ClimateObservationRead {
  const baseTemp = current.temperature_c ?? 28;
  const baseRain = current.rainfall_mm ?? 8;
  const baseSoil = current.soil_moisture_pct ?? 55;
  const baseAnomaly = current.anomaly_score ?? 0.34;
  const temperature = round(baseTemp + Math.sin(offset / 1.5) * 2.8 - offset * 0.15);
  const rainfall = round(Math.max(baseRain - offset * 1.6 + (offset % 2 === 0 ? 3 : 0), 0));
  const soilMoisture = round(clamp(baseSoil - offset * 1.9 + rainfall * 0.14, 16, 92));

  return {
    ...current,
    observation_id: `${current.observation_id}-synthetic-${offset + 1}`,
    observed_at: new Date(timestamp).toISOString(),
    source_window_start: new Date(timestamp - 3_600_000).toISOString(),
    source_window_end: new Date(timestamp).toISOString(),
    rainfall_mm: rainfall,
    temperature_c: temperature,
    soil_moisture_pct: soilMoisture,
    anomaly_score: round(Math.max(0.1, baseAnomaly + offset * 0.04)),
    normalized_payload: {
      ...current.normalized_payload,
      humidity_pct: clamp(Math.round(soilMoisture * 0.92), 18, 99),
      uv_index: clamp(Math.round((temperature - 16) / 2.2), 1, 11),
      wind_kph: clamp(Math.round(deriveWindKph(current) + offset * 1.4), 6, 42),
    },
    created_at: new Date(timestamp).toISOString(),
  };
}

export function buildHourlyForecast(
  observations: ClimateObservationRead[],
  alerts: ClimateAlertViewModel[],
): WeatherHourlyPoint[] {
  if (observations.length === 0) {
    return [];
  }

  const sorted = [...observations]
    .sort((left, right) => left.observed_at.localeCompare(right.observed_at))
    .slice(-6);

  const sourcePoints =
    sorted.length >= 4
      ? sorted
      : Array.from({ length: 6 }, (_, index) =>
          synthesizeObservationPoint(
            observations[0],
            new Date(observations[0].observed_at).getTime() + index * 3 * 3_600_000,
            index,
          ),
        );

  return sourcePoints.map((observation, index) => {
    const humidityPct = deriveHumidityPct(observation);
    const windKph = deriveWindKph(observation);
    const condition = weatherConditionFromSnapshot({
      degradedMode: observation.degraded_mode,
      humidityPct,
      rainfallMm: observation.rainfall_mm ?? 0,
      temperatureC: observation.temperature_c ?? 28,
      windKph,
    });

    return {
      conditionKey: condition.key,
      conditionLabel: condition.label,
      humidityPct,
      id: `${observation.observation_id}-${index}`,
      rainfallMm: round(observation.rainfall_mm ?? 0),
      temperatureC: round(observation.temperature_c ?? 0),
      timeLabel: new Date(observation.observed_at).toLocaleTimeString("en-US", {
        hour: "numeric",
      }),
      timestamp: observation.observed_at,
      windKph,
    };
  });
}

export function buildDailyForecast(
  observations: ClimateObservationRead[],
  alerts: ClimateAlertViewModel[],
  days = 7,
): WeatherDailyPoint[] {
  const current = observations[0];
  if (!current) {
    return [];
  }

  const baseTemp = current.temperature_c ?? 28;
  const baseRain = current.rainfall_mm ?? 8;
  const baseWind = deriveWindKph(current);
  const hasCritical = alerts.some((alert) => alert.severity === "critical");
  const hasWarning = alerts.some((alert) => alert.severity === "warning");
  const today = new Date(current.observed_at);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    const rainfallMm = round(
      clamp(
        baseRain * (index < 2 ? 1.18 : 0.72) + (hasCritical ? 8 : 0) + Math.max(0, 4 - index),
        0,
        86,
      ),
    );
    const highTempC = round(
      clamp(baseTemp + Math.sin(index / 2.2) * 2.4 + (hasWarning ? 0.8 : 0), 18, 41),
    );
    const lowTempC = round(clamp(highTempC - 6.4 - (index % 2 === 0 ? 0.8 : 1.4), 10, 31));
    const windKph = clamp(Math.round(baseWind + Math.cos(index / 2.8) * 3 + index * 0.4), 6, 42);
    const rainProbability = clamp(Math.round(rainfallMm * 1.7 + (hasCritical ? 10 : 0)), 4, 96);
    const condition = weatherConditionFromSnapshot({
      humidityPct: clamp(Math.round((current.soil_moisture_pct ?? 55) * 0.85), 20, 98),
      rainfallMm,
      temperatureC: highTempC,
      windKph,
    });

    return {
      conditionKey: condition.key,
      conditionLabel: condition.label,
      dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dayLabel: date.toLocaleDateString("en-US", { weekday: "short" }),
      highTempC,
      id: `forecast-${index + 1}`,
      isToday: index === 0,
      lowTempC,
      rainProbability,
      rainfallMm,
      windKph,
    };
  });
}

export function buildCropAdvice(params: {
  alerts: ClimateAlertViewModel[];
  current: WeatherSnapshot | null;
  daily: WeatherDailyPoint[];
  farm: FarmProfileRead | null;
}): CropAdviceItem[] {
  if (!params.current || !params.farm) {
    return [];
  }

  const crop = params.farm.crop_type.toLowerCase();
  const advice: CropAdviceItem[] = [];
  const wetWindow = params.daily.slice(0, 3).some((day) => day.rainProbability >= 70 || day.rainfallMm >= 22);
  const dryWindow = params.daily.slice(0, 3).every((day) => day.rainProbability <= 30 && day.rainfallMm <= 8);
  const heatWindow = params.daily.slice(0, 3).some((day) => day.highTempC >= 34);
  const criticalAlert = params.alerts.some((alert) => alert.severity === "critical");

  if (wetWindow && (crop.includes("maize") || crop.includes("corn"))) {
    advice.push({
      id: "wet-maize",
      title: "Delay fertilizer on the maize blocks",
      detail: "Heavy rain is likely in the next 72 hours. Hold top-dressing until the field drains so nutrients are not washed off.",
      tone: criticalAlert ? "offline" : "degraded",
    });
  }

  if (wetWindow && crop.includes("rice")) {
    advice.push({
      id: "wet-rice",
      title: "Inspect bunds before the next rain window",
      detail: "Rainfall pressure is rising. Reinforce bund weak points and clear inlets so water depth stays controlled.",
      tone: "degraded",
    });
  }

  if (dryWindow) {
    advice.push({
      id: "dry-window",
      title: "Use the dry window for spraying or field access",
      detail: "The next few days show a lower rain chance. Prioritize crop protection, pruning, or access-heavy work while the canopy can dry down.",
      tone: "online",
    });
  }

  if (heatWindow || params.current.uvIndex >= 9) {
    advice.push({
      id: "heat-window",
      title: "Shift labor and irrigation earlier in the day",
      detail: "Afternoon heat stress is building. Water early, protect nursery work, and move manual labor to sunrise or late afternoon.",
      tone: heatWindow ? "degraded" : "neutral",
    });
  }

  if (params.current.soilMoisturePct <= 35) {
    advice.push({
      id: "soil-check",
      title: "Confirm soil moisture before adding inputs",
      detail: "The latest soil reading is on the dry side. Check root-zone moisture before applying more fertilizer or increasing seeding density.",
      tone: "neutral",
    });
  }

  if (advice.length === 0) {
    advice.push({
      id: "steady-state",
      title: "Conditions are stable for routine field work",
      detail: "No major weather swing is projected from the current climate window. Keep scouting and log any crop stress changes into AgroGuide.",
      tone: "online",
    });
  }

  return advice.slice(0, 3);
}
