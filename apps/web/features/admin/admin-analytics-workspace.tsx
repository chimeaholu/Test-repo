"use client";

import React, { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { agroApiClient } from "@/lib/api/mock-client";

type SummaryRecord = {
  service_name: string;
  health_state: string;
  healthy_records: number;
  degraded_records: number;
  empty_records: number;
  last_recorded_at: string | null;
};

type RolloutRecord = {
  service_name: string;
  scope_key: string;
  state: string;
  reason_code: string;
  changed_at: string;
};

type AlertRecord = {
  service_name: string;
  status: string;
  rationale: string;
  alert_severity: string | null;
};

type ReadinessRecord = {
  readiness_status: string;
  telemetry_freshness_state: string;
  blocking_reasons: string[];
};

function resolveAdminErrorMessage(
  status: number,
  payload: unknown,
  fallbackMessage: string,
): string {
  if (status === 401) {
    return "Your session expired. Sign in again to continue.";
  }
  if (status === 403) {
    return fallbackMessage;
  }
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "object" &&
    payload.detail &&
    "error_code" in payload.detail &&
    typeof payload.detail.error_code === "string"
  ) {
    return `Admin API error: ${payload.detail.error_code}`;
  }
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }
  return fallbackMessage;
}

async function fetchAdminPayload<TData>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackMessage: string,
): Promise<TData> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as TData | null;
  if (!response.ok) {
    throw new Error(resolveAdminErrorMessage(response.status, payload, fallbackMessage));
  }
  return payload as TData;
}

function toneForState(state: string): "online" | "offline" | "degraded" | "neutral" {
  if (state === "ready" || state === "healthy" || state === "active" || state === "current") {
    return "online";
  }
  if (state === "blocked" || state === "frozen" || state === "critical") {
    return "offline";
  }
  if (state === "degraded" || state === "limited_release" || state === "warning" || state === "breached") {
    return "degraded";
  }
  return "neutral";
}

export function AdminAnalyticsWorkspace() {
  const { session, traceId } = useAppState();
  const [summary, setSummary] = useState<SummaryRecord | null>(null);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [rollouts, setRollouts] = useState<RolloutRecord[]>([]);
  const [readiness, setReadiness] = useState<ReadinessRecord | null>(null);
  const [auditEvents, setAuditEvents] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [mutationState, setMutationState] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    setError(null);
    const token = agroApiClient.getStoredAccessToken();
    const apiBaseUrl = process.env.NEXT_PUBLIC_AGRO_API_BASE_URL ?? "http://127.0.0.1:8000";

    void Promise.all([
      fetchAdminPayload<SummaryRecord>(`${apiBaseUrl}/api/v1/admin/analytics/health`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-ID": traceId,
          "X-Correlation-ID": traceId,
        },
        cache: "no-store",
      }, "Admin access is required to load this workspace."),
      fetchAdminPayload<{ items?: AlertRecord[] }>(`${apiBaseUrl}/api/v1/admin/observability/alerts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-ID": `${traceId}-alerts`,
          "X-Correlation-ID": `${traceId}-alerts`,
        },
        cache: "no-store",
      }, "Admin access is required to load this workspace."),
      fetchAdminPayload<{ items?: RolloutRecord[] }>(`${apiBaseUrl}/api/v1/admin/rollouts/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-ID": `${traceId}-rollouts`,
          "X-Correlation-ID": `${traceId}-rollouts`,
        },
        cache: "no-store",
      }, "Admin access is required to load this workspace."),
      fetchAdminPayload<ReadinessRecord>(`${apiBaseUrl}/api/v1/admin/release-readiness`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-ID": `${traceId}-readiness`,
          "X-Correlation-ID": `${traceId}-readiness`,
        },
        cache: "no-store",
      }, "Admin access is required to load this workspace."),
      fetchAdminPayload<{ items?: Array<Record<string, unknown>> }>(`${apiBaseUrl}/api/v1/admin/audit/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-ID": `${traceId}-audit`,
          "X-Correlation-ID": `${traceId}-audit`,
        },
        cache: "no-store",
      }, "Admin access is required to load this workspace."),
    ])
      .then(([healthPayload, alertPayload, rolloutPayload, readinessPayload, auditPayload]) => {
        if (cancelled) {
          return;
        }
        setSummary(healthPayload);
        setAlerts(Array.isArray(alertPayload.items) ? alertPayload.items : []);
        setRollouts(Array.isArray(rolloutPayload.items) ? rolloutPayload.items : []);
        setReadiness(readinessPayload);
        setAuditEvents(Array.isArray(auditPayload.items) ? auditPayload.items : []);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load admin analytics.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  async function mutateRollout(endpoint: "freeze" | "canary" | "promote" | "rollback"): Promise<void> {
    if (!session) {
      return;
    }
    setMutationState(endpoint);
    setError(null);
    try {
      const token = agroApiClient.getStoredAccessToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_AGRO_API_BASE_URL ?? "http://127.0.0.1:8000";
      await fetchAdminPayload(
        `${apiBaseUrl}/api/v1/admin/rollouts/${endpoint}`,
        {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Request-ID": `${traceId}-${endpoint}`,
          "X-Correlation-ID": `${traceId}-${endpoint}`,
        },
        body: JSON.stringify({
          schema_version: "2026-04-18.wave1",
          request_id: `${traceId}-${endpoint}`,
          actor_id: session.actor.actor_id,
          country_code: session.actor.country_code,
          channel: "pwa",
          service_name: "admin_control_plane",
          slo_id: "admin-shell",
          alert_severity: "warning",
          audit_event_id: 0,
          idempotency_key: `${traceId}-${endpoint}`,
          actor_role: "admin",
          scope_key: "web-route-surface",
          intent:
            endpoint === "canary"
              ? "limited_release"
              : endpoint === "promote"
                ? "resume"
                : "freeze",
          reason_code: endpoint === "rollback" ? "manual_rollback" : "operator_review",
          reason_detail: `R4 route surface ${endpoint} validation run.`,
          limited_release_percent: endpoint === "canary" ? 25 : null,
        }),
      },
        "Admin access is required to change rollout state.",
      );
      window.location.reload();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to mutate rollout state.");
    } finally {
      setMutationState(null);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Admin analytics"
          title="Platform health and release posture"
          body="Service health, release readiness, rollout posture, and recent operator activity stay visible in one admin view."
          actions={
            <div className="pill-row">
              <StatusPill tone={toneForState(summary?.health_state ?? "neutral")}>
                {summary?.health_state ?? "Loading"}
              </StatusPill>
              <StatusPill tone={toneForState(readiness?.readiness_status ?? "neutral")}>
                {readiness?.readiness_status ?? "Readiness loading"}
              </StatusPill>
            </div>
          }
        />
        <div className="hero-kpi-grid" aria-label="Admin control posture">
          <article className="hero-kpi">
            <span className="metric-label">Service health</span>
            <strong>{summary?.health_state ?? "Loading"}</strong>
            <p className="muted">Current summary of service health signals.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Readiness</span>
            <strong>{readiness?.readiness_status ?? "Loading"}</strong>
            <p className="muted">Release posture before any promote action is taken.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Active alerts</span>
            <strong>{alerts.length}</strong>
            <p className="muted">Operational conditions that may block or constrain release activity.</p>
          </article>
        </div>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
      </SurfaceCard>

      <div className="detail-grid">
        <SurfaceCard className="detail-card">
          <SectionHeading
            eyebrow="Alert summary"
            title="Operational alerts"
            body="This panel stays explicit when telemetry is stale, degraded, or blocking release progress."
          />
          <InsightCallout
            title="Operator expectation"
            body="Alerts should help an admin explain the current platform posture quickly, not force a hunt across separate tools."
            tone="neutral"
          />
          <div className="stack-sm">
            {alerts.map((alert) => (
              <article className="queue-item" key={`${alert.service_name}-${alert.status}`}>
                <div className="queue-head">
                  <strong>{alert.service_name}</strong>
                  <StatusPill tone={toneForState(alert.alert_severity ?? alert.status)}>{alert.status}</StatusPill>
                </div>
                <p className="muted">{alert.rationale}</p>
              </article>
            ))}
            {alerts.length === 0 ? <p className="muted">There are no active platform alerts right now.</p> : null}
          </div>
        </SurfaceCard>

        <SurfaceCard className="detail-card">
          <SectionHeading
            eyebrow="Release readiness"
            title="Readiness, ownership, and rollout controls"
            body="Rollout actions remain actor-attributed and country-scoped before a release is promoted."
          />
          <InfoList
            items={[
              { label: "Readiness", value: readiness?.readiness_status ?? "Unknown" },
              { label: "Telemetry freshness", value: readiness?.telemetry_freshness_state ?? "Unknown" },
              { label: "Country scope", value: session.actor.country_code },
              { label: "Actor attribution", value: session.actor.actor_id },
            ]}
          />
          <div className="pill-row">
            <button className="button-secondary" onClick={() => void mutateRollout("freeze")} type="button">
              {mutationState === "freeze" ? "Freezing..." : "Freeze rollout"}
            </button>
            <button className="button-secondary" onClick={() => void mutateRollout("canary")} type="button">
              {mutationState === "canary" ? "Starting canary..." : "Canary release"}
            </button>
            <button className="button-secondary" onClick={() => void mutateRollout("promote")} type="button">
              {mutationState === "promote" ? "Promoting..." : "Promote"}
            </button>
            <button className="button-secondary" onClick={() => void mutateRollout("rollback")} type="button">
              {mutationState === "rollback" ? "Rolling back..." : "Rollback"}
            </button>
          </div>
          <p className="muted detail-note">These controls are for operator-attributed rollout state changes only. They are not general navigation shortcuts.</p>
          {readiness?.blocking_reasons?.length ? (
            <div className="stack-sm">
              {readiness.blocking_reasons.map((reason) => (
                <p className="field-error" key={reason}>{reason}</p>
              ))}
            </div>
          ) : null}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Rollout controls"
          title="Current rollout states"
          body="Scope, state, and last change timestamp stay visible for operator review."
        />
        <div className="stack-sm">
          {rollouts.map((item) => (
            <article className="queue-item" key={`${item.service_name}-${item.scope_key}`}>
              <div className="queue-head">
                <strong>{item.service_name}</strong>
                <StatusPill tone={toneForState(item.state)}>{item.state}</StatusPill>
              </div>
              <p className="muted">
                Scope {item.scope_key} • {item.reason_code} • {item.changed_at}
              </p>
            </article>
          ))}
          {rollouts.length === 0 ? <p className="muted">No rollout states have been written yet.</p> : null}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Audit history"
          title="Recent operator events"
          body="Recent admin events remain attached to request IDs for release and incident review."
        />
        <div className="stack-sm">
          {auditEvents.slice(0, 6).map((event, index) => (
            <article className="queue-item" key={`${String(event.request_id ?? index)}`}>
              <div className="queue-head">
                <strong>{String(event.event_type ?? "admin.event")}</strong>
                <StatusPill tone="neutral">{String(event.status ?? "accepted")}</StatusPill>
              </div>
              <p className="muted">
                Request {String(event.request_id ?? "unknown")} • Reason {String(event.reason_code ?? "n/a")}
              </p>
            </article>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
