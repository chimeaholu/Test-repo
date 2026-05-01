"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { CropAdvice } from "@/components/weather/crop-advice";
import { CurrentConditions } from "@/components/weather/current-conditions";
import { ForecastDaily } from "@/components/weather/forecast-daily";
import { ForecastHourly } from "@/components/weather/forecast-hourly";
import { WeatherCharts } from "@/components/weather/weather-charts";
import { EmptyState, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import {
  buildCropAdvice,
  buildCurrentSnapshot,
  buildDailyForecast,
  buildHourlyForecast,
  climateSeverityTone,
  climateSourceConfidence,
  filterAlertsForFarm,
  mrvCompletenessTone,
  sortAlerts,
  type ClimateAlertViewModel,
  type ClimateDegradedModeViewModel,
  type MrvEvidenceViewModel,
} from "@/features/climate/model";
import { advisoryApi } from "@/lib/api/advisory";
import { climateApi } from "@/lib/api/climate";
import { climateCopy } from "@/lib/content/route-copy";
import type { ClimateObservationRead, ClimateRuntimeSnapshot, FarmProfileRead } from "@/lib/api-types";

type AdvisoryConversation = Awaited<ReturnType<typeof advisoryApi.listConversations>>["data"]["items"][number];

function uniqueFarmIds(input: {
  alerts: ClimateAlertViewModel[];
  evidenceRecords: MrvEvidenceViewModel[];
}): string[] {
  return Array.from(
    new Set([
      ...input.alerts.map((alert) => alert.farm_profile_id),
      ...input.evidenceRecords.map((record) => record.farm_profile_id),
    ].filter(Boolean)),
  );
}

function buildBestNextWindowSummary(input: {
  current: ReturnType<typeof buildCurrentSnapshot>;
  hourly: ReturnType<typeof buildHourlyForecast>;
  openAlertCount: number;
}): { detail: string; title: string } {
  const bestWindow = input.hourly.find((point) => point.rainfallMm <= 3 && point.windKph <= 18);

  if (bestWindow) {
    return {
      detail: `${bestWindow.timeLabel} looks like the clearest working window if field conditions on the ground still agree.`,
      title: `Plan around ${bestWindow.timeLabel}`,
    };
  }

  if (input.openAlertCount > 0) {
    return {
      detail: "Open alerts are still active, so keep field work light and confirm conditions locally before spraying, harvest, or transport prep.",
      title: "Wait for a calmer window",
    };
  }

  if (input.current) {
    return {
      detail: `Conditions are steady right now around ${input.current.temperatureC}°C with ${input.current.rainProbability}% rain likelihood. Use short, flexible work blocks and keep checking the next forecast update.`,
      title: "Use shorter work blocks",
    };
  }

  return {
    detail: "The latest forecast still needs enough recent readings to suggest a stronger timing window.",
    title: "Watch for the next update",
  };
}

function humanizeMethodTag(methodTag: string): string {
  return methodTag
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function WeatherDashboardClient() {
  const { session, traceId } = useAppState();
  const [alerts, setAlerts] = useState<ClimateAlertViewModel[]>([]);
  const [degradedModes, setDegradedModes] = useState<ClimateDegradedModeViewModel[]>([]);
  const [evidenceRecords, setEvidenceRecords] = useState<MrvEvidenceViewModel[]>([]);
  const [runtimeMode, setRuntimeMode] = useState<ClimateRuntimeSnapshot["runtime_mode"]>("fallback");
  const [farms, setFarms] = useState<FarmProfileRead[]>([]);
  const [observations, setObservations] = useState<Record<string, ClimateObservationRead[]>>({});
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [advisoryItems, setAdvisoryItems] = useState<AdvisoryConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFarmLoading, setIsFarmLoading] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void Promise.allSettled([
      climateApi.listRuntime(traceId, session.actor.locale),
      advisoryApi.listConversations(traceId, session.actor.locale),
    ])
      .then(async ([runtimeResult, advisoryResult]) => {
        if (cancelled) {
          return;
        }

        if (runtimeResult.status !== "fulfilled") {
          throw runtimeResult.reason;
        }

        const sortedAlerts = sortAlerts(runtimeResult.value.data.alerts);
        const farmIds = uniqueFarmIds({
          alerts: sortedAlerts,
          evidenceRecords: runtimeResult.value.data.evidence_records,
        });

        const farmResults = await Promise.allSettled(
          farmIds.map((farmId) => climateApi.getFarmProfile(farmId, traceId, session.actor.locale)),
        );

        if (cancelled) {
          return;
        }

        const nextFarms = farmResults
          .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof climateApi.getFarmProfile>>> => result.status === "fulfilled")
          .map((result) => result.value.data);

        setAlerts(sortedAlerts);
        setDegradedModes(runtimeResult.value.data.degraded_modes);
        setEvidenceRecords(runtimeResult.value.data.evidence_records);
        setRuntimeMode(runtimeResult.value.data.runtime_mode);
        setAdvisoryItems(advisoryResult.status === "fulfilled" ? advisoryResult.value.data.items : []);
        setFarms(nextFarms);
        setSelectedFarmId((current) =>
          current && nextFarms.some((farm) => farm.farm_id === current) ? current : (nextFarms[0]?.farm_id ?? farmIds[0] ?? null),
        );
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load the weather workspace.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  useEffect(() => {
    if (!session || !selectedFarmId || observations[selectedFarmId]) {
      return;
    }

    let cancelled = false;
    setIsFarmLoading(true);

    void climateApi
      .listObservations(selectedFarmId, traceId, session.actor.locale)
      .then((response) => {
        if (!cancelled) {
          setObservations((current) => ({ ...current, [selectedFarmId]: response.data }));
          setError(null);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load farm weather observations.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFarmLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [observations, selectedFarmId, session, traceId]);

  if (!session) {
    return null;
  }

  const selectedFarm = farms.find((farm) => farm.farm_id === selectedFarmId) ?? null;
  const selectedAlerts = filterAlertsForFarm(alerts, selectedFarmId);
  const selectedEvidence = selectedFarmId
    ? evidenceRecords.filter((record) => record.farm_profile_id === selectedFarmId)
    : evidenceRecords;
  const selectedObservations = selectedFarmId ? observations[selectedFarmId] ?? [] : [];
  const current = buildCurrentSnapshot(selectedObservations, selectedAlerts);
  const hourly = buildHourlyForecast(selectedObservations, selectedAlerts);
  const daily = buildDailyForecast(selectedObservations, selectedAlerts);
  const cropAdvice = buildCropAdvice({
    alerts: selectedAlerts,
    current,
    daily,
    farm: selectedFarm,
  });
  const latestAdvisory = advisoryItems[0]
    ? {
        response: advisoryItems[0].response_text,
        topic: advisoryItems[0].topic,
      }
    : null;
  const openAlertCount = selectedAlerts.filter((alert) => !alert.acknowledged).length;
  const relevantDegradedModes = selectedFarmId
    ? degradedModes.filter((item) => item.farm_profile_id === selectedFarmId)
    : degradedModes;
  const bestWindow = buildBestNextWindowSummary({
    current,
    hourly,
    openAlertCount,
  });

  async function acknowledgeAlert(alertId: string): Promise<void> {
    if (!session) {
      return;
    }
    setIsAcknowledging(alertId);
    try {
      await climateApi.acknowledgeAlert(alertId, session.actor.actor_id, traceId);
      setAlerts((currentAlerts) =>
        currentAlerts.map((item) => (item.alert_id === alertId ? { ...item, acknowledged: true } : item)),
      );
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to acknowledge this alert.");
    } finally {
      setIsAcknowledging(null);
    }
  }

  return (
    <div className="content-stack" data-testid="weather-dashboard-root">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Weather and field outlook"
          title="See what conditions matter most right now"
          body="Follow current alerts, likely field conditions, and practical timing advice for the next few hours and days."
          actions={
            <div className="inline-actions">
              <a className="button-primary" href="#climate-alerts">
                Review today&apos;s alerts
              </a>
              <Link className="button-secondary" href="/app/advisory/new">
                Ask AgroGuide
              </Link>
            </div>
          }
        />
        <div className="pill-row">
          <StatusPill tone={runtimeMode === "live" ? "online" : "degraded"}>
            {runtimeMode === "live" ? "Live updates" : "Saved reference view"}
          </StatusPill>
          <StatusPill tone={openAlertCount > 0 ? "degraded" : "online"}>
            {openAlertCount > 0 ? `${openAlertCount} alert${openAlertCount === 1 ? "" : "s"} to review` : "No urgent alerts"}
          </StatusPill>
        </div>
        <div className="weather-toolbar">
          <div className="field weather-selector-field">
            <label htmlFor="weather-farm-selector">Farm location</label>
            <select
              aria-label="Farm location"
              data-testid="weather-farm-selector"
              id="weather-farm-selector"
              onChange={(event) => setSelectedFarmId(event.target.value)}
              value={selectedFarmId ?? ""}
            >
              {farms.map((farm) => (
                <option key={farm.farm_id} value={farm.farm_id}>
                  {farm.farm_name} · {farm.district}
                </option>
              ))}
            </select>
          </div>
          <div className="actions-row">
            <Link className="button-ghost" href="/app/notifications">
              Weather notifications
            </Link>
          </div>
        </div>
      </SurfaceCard>

      {isLoading ? (
        <SurfaceCard data-testid="weather-loading-state">
          <p className="muted" role="status">
            {climateCopy.loadingCopy}
          </p>
        </SurfaceCard>
      ) : null}

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      {!isLoading && !selectedFarm ? (
        <SurfaceCard data-testid="weather-empty-state">
          <EmptyState
            title="No field is connected yet"
            body="Connect a field profile to see local alerts, forecast timing, and crop guidance here. Until then, AgroGuide can still help you work through the issue."
            actions={
              <>
                <Link className="button-primary" href="/app/profile">
                  Review profile
                </Link>
                <Link className="button-ghost" href="/app/advisory/new">
                  Open AgroGuide
                </Link>
              </>
            }
          />
        </SurfaceCard>
      ) : null}

      {!isLoading && selectedFarm ? (
        <>
          {current ? (
            <CurrentConditions
              current={current}
              degradedCount={relevantDegradedModes.length}
              farm={selectedFarm}
              openAlertCount={openAlertCount}
              runtimeMode={runtimeMode}
            />
          ) : null}

          {isFarmLoading ? (
            <SurfaceCard>
              <p className="muted" role="status">
                Refreshing forecast detail for {selectedFarm.farm_name}...
              </p>
            </SurfaceCard>
          ) : null}

          <div className="weather-dashboard-grid">
            <div className="content-stack">
              <SurfaceCard>
                <SectionHeading
                  eyebrow="Today and tomorrow"
                  title="Daily outlook"
                  body="Use the next two days to judge rain pressure, field access, and harvest timing before conditions shift again."
                />
                <ForecastDaily points={daily} />
              </SurfaceCard>

              <SurfaceCard>
                <SectionHeading
                  eyebrow="Best next window"
                  title={bestWindow.title}
                  body={bestWindow.detail}
                />
              </SurfaceCard>

              <SurfaceCard>
                <SectionHeading
                  eyebrow="Today and tomorrow"
                  title="Today in 3-hour blocks"
                  body="Use the hourly strip to time field entry, spraying, irrigation, and transport prep before the next weather swing."
                />
                <ForecastHourly points={hourly} />
              </SurfaceCard>

              <WeatherCharts daily={daily} hourly={hourly} />
            </div>

            <div className="content-stack">
              {selectedAlerts[0] ? (
                <SurfaceCard id="climate-alerts">
                  <SectionHeading
                    eyebrow="Immediate alerts"
                    title="Review today&apos;s alerts"
                    body="See what needs attention now, what it affects, and what can wait until the field settles."
                  />
                  <div className="weather-alert-stack" data-testid="weather-alert-list">
                    {selectedAlerts.map((alert) => (
                      <article
                        className={`weather-alert-card tone-${climateSeverityTone(alert.severity)}`}
                        key={alert.alert_id}
                        role={!alert.acknowledged && alert.severity !== "info" ? "alert" : undefined}
                      >
                        <div className="queue-head">
                          <div className="pill-row">
                            <StatusPill tone={climateSeverityTone(alert.severity)}>{alert.severity}</StatusPill>
                            <StatusPill tone={alert.acknowledged ? "online" : "degraded"}>
                              {alert.acknowledged ? "Acknowledged" : "Open"}
                            </StatusPill>
                          </div>
                          <span className="muted">
                            {new Date(alert.created_at).toLocaleString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <strong>{alert.title}</strong>
                        <p className="muted">{alert.summary}</p>
                        <p className="muted">{climateSourceConfidence(alert)}</p>
                        <button
                          className={alert.acknowledged ? "button-ghost" : "button-primary"}
                          disabled={alert.acknowledged || isAcknowledging === alert.alert_id}
                          onClick={() => void acknowledgeAlert(alert.alert_id)}
                          type="button"
                        >
                          {alert.acknowledged
                            ? "Reviewed"
                            : isAcknowledging === alert.alert_id
                              ? "Saving..."
                              : "Mark reviewed"}
                        </button>
                      </article>
                    ))}
                  </div>
                </SurfaceCard>
              ) : (
                <SurfaceCard>
                  <EmptyState
                    title="No urgent alerts right now"
                    body="Use the forecast, crop guidance, and field confidence note below to plan routine work."
                  />
                </SurfaceCard>
              )}

              <SurfaceCard data-testid="weather-crop-advice">
                <SectionHeading
                  eyebrow="Harvest watch"
                  title={`What this means for ${selectedFarm.crop_type}`}
                  body="The guidance below translates the forecast into the next practical move for this crop and field."
                />
                <CropAdvice advisoryContext={latestAdvisory} cropLabel={selectedFarm.farm_name} items={cropAdvice} />
              </SurfaceCard>

              <SurfaceCard>
                <SectionHeading
                  eyebrow="How reliable this view is"
                  title="Field confidence note"
                  body="Use the source checks, assumptions, and delayed-update notes below to judge how much weight to place on the forecast."
                />
                <div className="weather-evidence-stack">
                  {selectedEvidence.map((record) => (
                    <article className="queue-item" key={record.evidence_id}>
                      <div className="queue-head">
                        <strong>{humanizeMethodTag(record.method_tag)}</strong>
                        <StatusPill tone={mrvCompletenessTone(record.source_completeness)}>
                          {record.source_completeness}
                        </StatusPill>
                      </div>
                      <ul className="summary-list">
                        {record.assumption_notes.map((note) => (
                          <li key={note}>
                            <span>Field note</span>
                            <strong>{note}</strong>
                          </li>
                        ))}
                        {record.source_references.map((reference) => (
                          <li key={reference.source_id}>
                            <span>Checked with</span>
                            <strong>{reference.method_reference}</strong>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>

                {relevantDegradedModes.length > 0 ? (
                  <InsightCallout
                    body={relevantDegradedModes[0].assumptions.join(" ")}
                    title="Use extra judgment when fresh readings are delayed"
                    tone="accent"
                  />
                ) : null}
              </SurfaceCard>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export const ClimateDashboardClient = WeatherDashboardClient;
