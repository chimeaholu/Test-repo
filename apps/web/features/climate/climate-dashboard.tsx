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
          eyebrow="AgroWeather"
          title="Forecasts, field context, and weather-linked advice in one workflow"
          body="See the latest forecast, field conditions, and weather-linked advice in one place so daily planning stays simple."
          actions={
            <div className="pill-row">
              <StatusPill tone={runtimeMode === "live" ? "online" : "degraded"}>
                {runtimeMode === "live" ? "Live mode" : "Continuity mode"}
              </StatusPill>
              <StatusPill tone={session.consent.state === "consent_granted" ? "online" : "degraded"}>
                {session.consent.state === "consent_granted" ? "Protected actions ready" : "Consent needs review"}
              </StatusPill>
            </div>
          }
        />
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
            <Link className="button-secondary" href="/app/advisory/new">
              Open AgroGuide
            </Link>
            <Link className="button-ghost" href="/app/notifications">
              Weather notifications
            </Link>
          </div>
        </div>
      </SurfaceCard>

      {isLoading ? (
        <SurfaceCard data-testid="weather-loading-state">
          <p className="muted" role="status">
            Loading weather intelligence for your current farm context...
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
            title="No farm profile is mapped yet"
            body="Weather intelligence activates after the climate signal service can match your actor to at least one field profile. Until the farm-management lane lands, review your profile or continue in AgroGuide."
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
                  eyebrow="7-day forecast"
                  title="Daily outlook"
                  body="Daily highs, lows, rain probability, and wind are projected from the latest climate observation window and active alert posture."
                />
                <ForecastDaily points={daily} />
              </SurfaceCard>

              <SurfaceCard>
                <SectionHeading
                  eyebrow="Hourly breakdown"
                  title="Today in 3-hour blocks"
                  body="Use the hourly strip to time field entry, spraying, irrigation, and transport prep before the next weather swing."
                />
                <ForecastHourly points={hourly} />
              </SurfaceCard>

              <WeatherCharts daily={daily} hourly={hourly} />
            </div>

            <div className="content-stack">
              {selectedAlerts[0] ? (
                <SurfaceCard>
                  <SectionHeading
                    eyebrow="Alerts"
                    title="Weather alert center"
                    body="See open and acknowledged alerts together, with clear confidence notes to support your next field decision."
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
                            ? "Acknowledged"
                            : isAcknowledging === alert.alert_id
                              ? "Saving..."
                              : "Acknowledge alert"}
                        </button>
                      </article>
                    ))}
                  </div>
                </SurfaceCard>
              ) : (
                <SurfaceCard>
                  <EmptyState
                    title="No active weather alerts"
                    body="The selected farm has no open weather alert right now. Use the forecast and crop advice to plan routine field work."
                  />
                </SurfaceCard>
              )}

              <SurfaceCard data-testid="weather-crop-advice">
                <SectionHeading
                  eyebrow="Crop-specific advice"
                  title={`What this means for ${selectedFarm.crop_type}`}
                  body="The advice below stays rule-based for now. It uses the selected farm crop, weather projection, and alert severity to recommend the next safe move."
                />
                <CropAdvice advisoryContext={latestAdvisory} cropLabel={selectedFarm.farm_name} items={cropAdvice} />
              </SurfaceCard>

              <SurfaceCard>
                <SectionHeading
                  eyebrow="Confidence notes"
                  title="How this forecast was checked"
                  body="Reference notes and field observations stay beside the forecast so you can judge confidence before acting."
                />
                <div className="weather-evidence-stack">
                  {selectedEvidence.map((record) => (
                    <article className="queue-item" key={record.evidence_id}>
                      <div className="queue-head">
                        <strong>{record.method_tag}</strong>
                        <StatusPill tone={mrvCompletenessTone(record.source_completeness)}>
                          {record.source_completeness}
                        </StatusPill>
                      </div>
                      <ul className="summary-list">
                        {record.assumption_notes.map((note) => (
                          <li key={note}>
                            <span>Assumption</span>
                            <strong>{note}</strong>
                          </li>
                        ))}
                        {record.source_references.map((reference) => (
                          <li key={reference.source_id}>
                            <span>Method reference</span>
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
