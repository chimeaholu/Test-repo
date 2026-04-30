import { schemaVersion } from "@agrodomain/contracts";
import { describe, expect, it } from "vitest";

import {
  buildCropAdvice,
  buildCurrentSnapshot,
  buildDailyForecast,
  buildHourlyForecast,
  climateSeverityTone,
  climateSourceConfidence,
  mrvCompletenessTone,
  type ClimateAlertViewModel,
} from "@/features/climate/model";
import type { ClimateObservationRead, FarmProfileRead } from "@/lib/api-types";

const farm: FarmProfileRead = {
  schema_version: schemaVersion,
  farm_id: "farm-gh-001",
  actor_id: "actor-farmer",
  country_code: "GH",
  farm_name: "Tamale lowland block",
  district: "Tamale",
  crop_type: "maize",
  hectares: 12.5,
  latitude: 9.4,
  longitude: -0.85,
  metadata: {},
  created_at: "2026-04-18T00:00:00.000Z",
  updated_at: "2026-04-18T00:00:00.000Z",
};

const observations: ClimateObservationRead[] = [
  {
    schema_version: schemaVersion,
    observation_id: "obs-001",
    farm_id: "farm-gh-001",
    actor_id: "actor-farmer",
    country_code: "GH",
    source_id: "source-1",
    source_type: "station",
    observed_at: "2026-04-18T12:00:00.000Z",
    source_window_start: "2026-04-18T09:00:00.000Z",
    source_window_end: "2026-04-18T12:00:00.000Z",
    rainfall_mm: 28,
    temperature_c: 31,
    soil_moisture_pct: 66,
    anomaly_score: 0.52,
    ingestion_state: "accepted",
    degraded_mode: false,
    degraded_reason_codes: [],
    assumptions: [],
    provenance: [],
    normalized_payload: {
      humidity_pct: 76,
      uv_index: 8,
      wind_kph: 18,
    },
    farm_profile: farm,
    created_at: "2026-04-18T12:00:00.000Z",
  },
];

const alerts: ClimateAlertViewModel[] = [
  {
    alert_id: "alert-1",
    farm_profile_id: "farm-gh-001",
    country_code: "GH",
    locale: "en-GH",
    severity: "critical",
    title: "Heavy rainfall expected",
    summary: "Drainage risk is high.",
    source_ids: ["source-1"],
    degraded_mode: false,
    acknowledged: false,
    created_at: "2026-04-18T12:10:00.000Z",
    schema_version: schemaVersion,
  },
];

describe("climate model", () => {
  it("maps severity and completeness into visible tones", () => {
    expect(climateSeverityTone("critical")).toBe("offline");
    expect(climateSeverityTone("warning")).toBe("degraded");
    expect(mrvCompletenessTone("complete")).toBe("online");
    expect(mrvCompletenessTone("degraded")).toBe("offline");
  });

  it("keeps degraded-mode confidence explicit", () => {
    expect(
      climateSourceConfidence({
        degraded_mode: true,
      } as never),
    ).toBe("Reduced while source windows recover");
  });

  it("builds weather snapshots and synthetic forecast series from the climate runtime", () => {
    const current = buildCurrentSnapshot(observations, [...alerts]);
    const hourly = buildHourlyForecast(observations, [...alerts]);
    const daily = buildDailyForecast(observations, [...alerts]);

    expect(current).not.toBeNull();
    expect(current?.conditionLabel).toBeTruthy();
    expect(hourly).toHaveLength(6);
    expect(daily).toHaveLength(7);
    expect(daily[0].rainProbability).toBeGreaterThan(50);
  });

  it("produces crop advice for wet maize conditions", () => {
    const current = buildCurrentSnapshot(observations, [...alerts]);
    const daily = buildDailyForecast(observations, [...alerts]);
    const advice = buildCropAdvice({
      alerts: [...alerts],
      current,
      daily,
      farm,
    });

    expect(advice[0]?.title).toMatch(/fertilizer/i);
    expect(advice.some((item) => item.tone === "offline" || item.tone === "degraded")).toBe(true);
  });
});
