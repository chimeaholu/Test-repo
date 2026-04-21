"use client";

import React from "react";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import {
  climateSeverityTone,
  climateSourceConfidence,
  mrvCompletenessTone,
  sortAlerts,
  type ClimateAlertViewModel,
  type ClimateDegradedModeViewModel,
  type MrvEvidenceViewModel,
} from "@/features/climate/model";
import { agroApiClient } from "@/lib/api/mock-client";
import { climateCopy } from "@/lib/content/route-copy";
import { recordTelemetry } from "@/lib/telemetry/client";

export function ClimateDashboardClient() {
  const { session, traceId } = useAppState();
  const [alerts, setAlerts] = useState<ClimateAlertViewModel[]>([]);
  const [degradedModes, setDegradedModes] = useState<ClimateDegradedModeViewModel[]>([]);
  const [evidenceRecords, setEvidenceRecords] = useState<MrvEvidenceViewModel[]>([]);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [runtimeMode, setRuntimeMode] = useState<"live" | "fallback">("fallback");
  const [isLoading, setIsLoading] = useState(true);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void agroApiClient
      .listClimateRuntime(traceId, session.actor.locale)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const sortedAlerts = sortAlerts(response.data.alerts);
        setAlerts(sortedAlerts);
        setDegradedModes(response.data.degraded_modes);
        setEvidenceRecords(response.data.evidence_records);
        setRuntimeMode(response.data.runtime_mode);
        setActiveAlertId(sortedAlerts[0]?.alert_id ?? null);
        setError(null);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load climate alerts.");
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
    if (degradedModes.length === 0) {
      return;
    }

    recordTelemetry({
      event: "climate_degraded_mode_visible",
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      detail: {
        degraded_mode_count: degradedModes.length,
      },
    });
  }, [degradedModes.length, traceId]);

  const activeAlert = alerts.find((item) => item.alert_id === activeAlertId) ?? alerts[0] ?? null;

  async function acknowledgeAlert(): Promise<void> {
    if (!session || !activeAlert || activeAlert.acknowledged) {
      return;
    }

    setIsAcknowledging(true);
    try {
      await agroApiClient.acknowledgeClimateAlert(activeAlert.alert_id, session.actor.actor_id, traceId);
      setAlerts((current) =>
        current.map((item) => (item.alert_id === activeAlert.alert_id ? { ...item, acknowledged: true } : item)),
      );
      recordTelemetry({
        event: "climate_alert_acknowledged",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          alert_id: activeAlert.alert_id,
          severity: activeAlert.severity,
        },
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to acknowledge alert.");
    } finally {
      setIsAcknowledging(false);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Climate and MRV"
          title="Monitor weather risk and field evidence with confidence in view"
          body="Alert severity, acknowledgement state, source posture, and evidence assumptions stay visible together so operators do not over-read partial data."
          actions={
            <div className="pill-row">
              <StatusPill tone={runtimeMode === "live" ? "online" : "degraded"}>
                {runtimeMode === "live" ? "Live service" : "Reference view"}
              </StatusPill>
              <StatusPill tone="neutral">{session.actor.locale}</StatusPill>
            </div>
          }
        />
        <p className="muted">
          {runtimeMode === "live" ? climateCopy.runtimeLive : climateCopy.runtimeFallback}
        </p>
      </SurfaceCard>

      {isLoading ? (
        <SurfaceCard>
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

      {!isLoading && activeAlert ? (
        <div className="climate-layout">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Alert center"
              title="Farm alerts"
              body="Severity order is preserved so the highest-risk item is the first thing a mobile or desktop operator sees."
            />
            <div className="advisory-thread-list" role="list" aria-label="Climate alerts">
              {alerts.map((alert) => (
                <button
                  className={`thread-list-item advisory-list-item${alert.alert_id === activeAlert.alert_id ? " is-active" : ""}`}
                  key={alert.alert_id}
                  onClick={() => setActiveAlertId(alert.alert_id)}
                  type="button"
                >
                  <div className="queue-head">
                    <div className="pill-row">
                      <StatusPill tone={climateSeverityTone(alert.severity)}>{alert.severity}</StatusPill>
                      <StatusPill tone={alert.acknowledged ? "online" : "degraded"}>
                        {alert.acknowledged ? "Acknowledged" : "Open"}
                      </StatusPill>
                    </div>
                    <span className="muted">{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                  <h3>{alert.title}</h3>
                  <p className="muted">{alert.summary}</p>
                  <p className="muted">{climateSourceConfidence(alert)}</p>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <div className="content-stack">
            <SurfaceCard>
                <SectionHeading
                  eyebrow={activeAlert.title}
                  title="Alert detail"
                  body={activeAlert.summary}
                actions={
                  <div className="pill-row">
                    <StatusPill tone={climateSeverityTone(activeAlert.severity)}>{activeAlert.severity}</StatusPill>
                    <StatusPill tone={activeAlert.degraded_mode ? "offline" : "online"}>
                      {activeAlert.degraded_mode ? "Source gap" : "Current data window"}
                    </StatusPill>
                  </div>
                }
              />
              <ul className="info-list">
                <li>
                  <span>Source confidence</span>
                  <strong>{climateSourceConfidence(activeAlert)}</strong>
                </li>
                <li>
                  <span>Acknowledgement</span>
                  <strong>{activeAlert.acknowledged ? "Recorded" : "Pending operator action"}</strong>
                </li>
                <li>
                  <span>Source ids</span>
                  <strong>{activeAlert.source_ids.join(", ")}</strong>
                </li>
              </ul>
              {activeAlert.degraded_mode ? (
                <InsightCallout
                  title="Degraded mode remains visible"
                  body="This alert is marked degraded because one or more source windows are stale or missing. Do not treat it as complete climate certainty."
                  tone="accent"
                />
              ) : null}
              <div className="actions-row">
                <button
                  className={activeAlert.acknowledged ? "button-ghost" : "button-primary"}
                  disabled={activeAlert.acknowledged || isAcknowledging}
                  onClick={() => void acknowledgeAlert()}
                  type="button"
                >
                  {activeAlert.acknowledged ? "Acknowledged" : isAcknowledging ? "Saving..." : "Acknowledge alert"}
                </button>
              </div>
              <p className="muted">Acknowledgement is recorded here, but source completeness is always shown separately so no one mistakes this for full certainty.</p>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow="Degraded windows"
                title="Assumptions and method references"
                body="When data windows fail, the assumptions remain on-screen so operators can decide whether the alert is still actionable."
              />
              <div className="stack-md">
                {degradedModes.map((item) => (
                  <article className="queue-item" key={item.source_window_id}>
                    <div className="queue-head">
                      <strong>{item.reason_code}</strong>
                      <StatusPill tone="offline">degraded</StatusPill>
                    </div>
                    <ul className="summary-list">
                      {item.assumptions.map((assumption) => (
                        <li key={assumption}>
                          <span>Assumption</span>
                          <strong>{assumption}</strong>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow="MRV evidence"
                title="Evidence and method references"
                body="Evidence records keep provenance visible so MRV completeness is not overstated in field operations."
              />
              <div className="stack-md">
                {evidenceRecords.map((record) => (
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
            </SurfaceCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
