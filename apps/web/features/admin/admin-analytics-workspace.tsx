"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/app-provider";
import { ChartCard } from "@/components/analytics/chart-card";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { ExportButton } from "@/components/analytics/export-button";
import { MetricDashboard } from "@/components/analytics/metric-dashboard";
import { SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { advisoryApi } from "@/lib/api/advisory";
import { climateApi } from "@/lib/api/climate";
import { identityApi } from "@/lib/api/identity";
import { marketplaceApi } from "@/lib/api/marketplace";
import { systemApi } from "@/lib/api/system";
import { walletApi } from "@/lib/api/wallet";
import { buildAdminAnalyticsViewModel, type AdminSignals, type AnalyticsRangeKey, type AnalyticsSeries } from "@/features/analytics/model";

type LiveAnalyticsState = {
  advisory: Array<{
    actor_id: string;
    citations: Array<{ source_id: string }>;
    created_at: string;
  }>;
  alerts: Awaited<ReturnType<typeof climateApi.listRuntime>>["data"]["alerts"];
  escrows: Awaited<ReturnType<typeof walletApi.listEscrows>>["data"]["items"];
  listings: Awaited<ReturnType<typeof marketplaceApi.listListings>>["data"]["items"];
  negotiations: Awaited<ReturnType<typeof marketplaceApi.listNegotiations>>["data"]["items"];
  runtimeMode: Awaited<ReturnType<typeof climateApi.listRuntime>>["data"]["runtime_mode"];
  systemSettings: Awaited<ReturnType<typeof systemApi.getSettings>>["data"] | null;
  transactions: Awaited<ReturnType<typeof walletApi.listWalletTransactions>>["data"]["items"];
};

type RolloutMutation = "freeze" | "canary" | "promote" | "rollback";

const INITIAL_LIVE_STATE: LiveAnalyticsState = {
  advisory: [],
  alerts: [],
  escrows: [],
  listings: [],
  negotiations: [],
  runtimeMode: "fallback",
  systemSettings: null,
  transactions: [],
};

const INITIAL_SIGNALS: AdminSignals = {
  alerts: [],
  readiness: null,
  rollouts: [],
  summary: null,
};

function resolveAdminErrorMessage(status: number, payload: unknown, fallbackMessage: string): string {
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
  if (payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }
  if (status === 401) {
    return "Your session expired. Sign in again to continue.";
  }
  if (status === 403 || status === 404) {
    return fallbackMessage;
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

async function fetchOptionalAdminPayload<TData>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackMessage: string,
): Promise<{ data: TData | null; error: string | null }> {
  try {
    return {
      data: await fetchAdminPayload<TData>(input, init, fallbackMessage),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : fallbackMessage,
    };
  }
}

function toneForState(state: string): "online" | "offline" | "degraded" | "neutral" {
  if (state === "ready" || state === "healthy" || state === "live" || state === "normal") {
    return "online";
  }
  if (state === "blocked" || state === "critical" || state === "down") {
    return "offline";
  }
  if (state === "degraded" || state === "warning" || state === "fallback" || state === "limited_release") {
    return "degraded";
  }
  return "neutral";
}

function chartBounds(series: AnalyticsSeries[]) {
  const values = series.flatMap((item) => item.points.map((point) => point.value));
  return { max: Math.max(1, ...values) };
}

function linePoints(series: AnalyticsSeries, max: number, width = 600, height = 220): string {
  if (series.points.length === 0) {
    return "";
  }
  const step = series.points.length > 1 ? width / (series.points.length - 1) : width;
  return series.points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.value / max) * (height - 20);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function LineChart(props: {
  ariaLabel: string;
  series: AnalyticsSeries[];
  testId?: string;
}) {
  const { max } = chartBounds(props.series);
  const width = 600;
  const height = 220;

  return (
    <div className="analytics-chart-frame" data-testid={props.testId}>
      <svg className="analytics-chart-svg" role="img" viewBox={`0 0 ${width} ${height + 28}`} aria-label={props.ariaLabel}>
        <g transform="translate(0, 10)">
          {[0.25, 0.5, 0.75, 1].map((step) => {
            const y = height - step * (height - 20);
            return <line key={step} x1="0" x2={width} y1={y} y2={y} className="analytics-grid-line" />;
          })}
          {props.series.map((series) => (
            <path d={linePoints(series, max, width, height)} key={series.name} fill="none" stroke={series.color} strokeWidth="3" />
          ))}
        </g>
      </svg>
      <div className="analytics-axis-labels">
        {props.series[0]?.points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
      <div className="analytics-legend">
        {props.series.map((item) => (
          <span key={item.name}>
            <i style={{ backgroundColor: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function BarList(props: {
  items: Array<{ emphasized?: boolean; label: string; value: number; valueLabel: string }>;
  testId?: string;
}) {
  const max = Math.max(1, ...props.items.map((item) => item.value));
  return (
    <div className="analytics-bar-list" data-testid={props.testId}>
      {props.items.map((item) => (
        <article className={`analytics-bar-item${item.emphasized ? " is-emphasized" : ""}`} key={item.label}>
          <div className="analytics-bar-copy">
            <strong>{item.label}</strong>
            <span>{item.valueLabel}</span>
          </div>
          <div aria-label={`${item.label}: ${item.valueLabel}`} className="analytics-bar-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={item.value}>
            <span style={{ width: `${Math.max(10, (item.value / max) * 100)}%` }} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function AdminAnalyticsWorkspace() {
  const { queue, session, traceId } = useAppState();
  const [range, setRange] = useState<AnalyticsRangeKey>("30d");
  const [refreshTick, setRefreshTick] = useState(0);
  const [liveState, setLiveState] = useState<LiveAnalyticsState>(INITIAL_LIVE_STATE);
  const [signals, setSignals] = useState<AdminSignals>(INITIAL_SIGNALS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [mutationState, setMutationState] = useState<RolloutMutation | null>(null);

  useEffect(() => {
    if (!session || session.actor.role !== "admin") {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const token = identityApi.getStoredAccessToken();
    const apiBaseUrl = process.env.NEXT_PUBLIC_AGRO_API_BASE_URL ?? "http://127.0.0.1:8000";
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "X-Correlation-ID": traceId,
      "X-Request-ID": traceId,
    };

    void Promise.allSettled([
      systemApi.getSettings(traceId),
      marketplaceApi.listListings(traceId),
      marketplaceApi.listNegotiations(traceId),
      walletApi.listEscrows(traceId),
      walletApi.listWalletTransactions(traceId),
      advisoryApi.listConversations(traceId, session.actor.locale),
      climateApi.listRuntime(traceId, session.actor.locale),
      fetchOptionalAdminPayload<AdminSignals["summary"]>(`${apiBaseUrl}/api/v1/admin/analytics/health`, {
        cache: "no-store",
        headers: authHeaders,
      }, "Admin control-plane health is unavailable in this environment."),
      fetchOptionalAdminPayload<{ items?: AdminSignals["alerts"] }>(`${apiBaseUrl}/api/v1/admin/observability/alerts`, {
        cache: "no-store",
        headers: {
          ...authHeaders,
          "X-Correlation-ID": `${traceId}-alerts`,
          "X-Request-ID": `${traceId}-alerts`,
        },
      }, "Admin alert signals are unavailable in this environment."),
      fetchOptionalAdminPayload<{ items?: AdminSignals["rollouts"] }>(`${apiBaseUrl}/api/v1/admin/rollouts/status`, {
        cache: "no-store",
        headers: {
          ...authHeaders,
          "X-Correlation-ID": `${traceId}-rollouts`,
          "X-Request-ID": `${traceId}-rollouts`,
        },
      }, "Admin rollout signals are unavailable in this environment."),
      fetchOptionalAdminPayload<AdminSignals["readiness"]>(`${apiBaseUrl}/api/v1/admin/release-readiness`, {
        cache: "no-store",
        headers: {
          ...authHeaders,
          "X-Correlation-ID": `${traceId}-readiness`,
          "X-Request-ID": `${traceId}-readiness`,
        },
      }, "Admin readiness signals are unavailable in this environment."),
    ])
      .then((results) => {
        if (cancelled) {
          return;
        }

        const [systemResult, listingsResult, negotiationsResult, escrowsResult, transactionsResult, advisoryResult, climateResult, summaryResult, alertsResult, rolloutsResult, readinessResult] = results;

        const coreFailures = [systemResult, listingsResult, negotiationsResult, escrowsResult, transactionsResult].filter((result) => result.status === "rejected");
        if (coreFailures.length === 5) {
          setError("Unable to load the admin analytics workspace from live runtime data.");
          setLiveState(INITIAL_LIVE_STATE);
          setSignals(INITIAL_SIGNALS);
          setControlError(null);
          return;
        }

        setLiveState({
          advisory:
            advisoryResult.status === "fulfilled"
              ? advisoryResult.value.data.items.map((item) => ({
                  actor_id: item.actor_id,
                  citations: item.citations,
                  created_at: item.created_at,
                }))
              : [],
          alerts: climateResult.status === "fulfilled" ? climateResult.value.data.alerts : [],
          escrows: escrowsResult.status === "fulfilled" ? escrowsResult.value.data.items : [],
          listings: listingsResult.status === "fulfilled" ? listingsResult.value.data.items : [],
          negotiations: negotiationsResult.status === "fulfilled" ? negotiationsResult.value.data.items : [],
          runtimeMode: climateResult.status === "fulfilled" ? climateResult.value.data.runtime_mode : "fallback",
          systemSettings: systemResult.status === "fulfilled" ? systemResult.value.data : null,
          transactions: transactionsResult.status === "fulfilled" ? transactionsResult.value.data.items : [],
        });

        const nextSignals: AdminSignals = {
          alerts:
            alertsResult.status === "fulfilled" && Array.isArray(alertsResult.value.data?.items)
              ? alertsResult.value.data.items
              : [],
          readiness: readinessResult.status === "fulfilled" ? readinessResult.value.data : null,
          rollouts:
            rolloutsResult.status === "fulfilled" && Array.isArray(rolloutsResult.value.data?.items)
              ? rolloutsResult.value.data.items
              : [],
          summary: summaryResult.status === "fulfilled" ? summaryResult.value.data : null,
        };
        setSignals(nextSignals);

        const signalErrors = [
          summaryResult.status === "fulfilled" ? summaryResult.value.error : "Admin control-plane health is unavailable in this environment.",
          alertsResult.status === "fulfilled" ? alertsResult.value.error : "Admin alert signals are unavailable in this environment.",
          rolloutsResult.status === "fulfilled" ? rolloutsResult.value.error : "Admin rollout signals are unavailable in this environment.",
          readinessResult.status === "fulfilled" ? readinessResult.value.error : "Admin readiness signals are unavailable in this environment.",
        ].filter((item): item is string => Boolean(item));
        setControlError(signalErrors.length > 0 ? signalErrors[0] : null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load the admin analytics workspace.");
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
  }, [refreshTick, session, traceId]);

  async function mutateRollout(endpoint: RolloutMutation): Promise<void> {
    if (!session) {
      return;
    }
    setMutationState(endpoint);
    setError(null);
    try {
      const token = identityApi.getStoredAccessToken();
      const apiBaseUrl = process.env.NEXT_PUBLIC_AGRO_API_BASE_URL ?? "http://127.0.0.1:8000";
      await fetchAdminPayload(
        `${apiBaseUrl}/api/v1/admin/rollouts/${endpoint}`,
        {
          body: JSON.stringify({
            actor_id: session.actor.actor_id,
            actor_role: "admin",
            alert_severity: "warning",
            audit_event_id: 0,
            channel: "pwa",
            country_code: session.actor.country_code,
            idempotency_key: `${traceId}-${endpoint}`,
            intent:
              endpoint === "canary"
                ? "limited_release"
                : endpoint === "promote"
                  ? "resume"
                  : "freeze",
            limited_release_percent: endpoint === "canary" ? 25 : null,
            reason_code: endpoint === "rollback" ? "manual_rollback" : "operator_review",
            reason_detail: `R7 analytics ${endpoint} validation run.`,
            request_id: `${traceId}-${endpoint}`,
            schema_version: "2026-04-25.wave7",
            scope_key: "analytics-dashboard",
            service_name: "admin_control_plane",
            slo_id: "admin-analytics",
          }),
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Correlation-ID": `${traceId}-${endpoint}`,
            "X-Request-ID": `${traceId}-${endpoint}`,
          },
          method: "POST",
        },
        "Admin access is required to change rollout state.",
      );
      setRefreshTick((current) => current + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to mutate rollout state.");
    } finally {
      setMutationState(null);
    }
  }

  const viewModel = useMemo(
    () =>
      buildAdminAnalyticsViewModel({
        advisory: liveState.advisory,
        alerts: liveState.alerts,
        escrows: liveState.escrows,
        listings: liveState.listings,
        negotiations: liveState.negotiations,
        range,
        runtimeMode: liveState.runtimeMode,
        signals,
        transactions: liveState.transactions,
      }),
    [liveState, range, signals],
  );

  if (!session) {
    return null;
  }

  if (session.actor.role !== "admin") {
    return (
      <SurfaceCard>
        <p className="field-error" role="alert">
          You don&apos;t have permission to view this page. Admin access required.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="content-stack analytics-shell" data-testid="admin-analytics-root">
      <SurfaceCard className="hero-surface">
        <SectionHeading
          eyebrow="Admin analytics"
          title="Platform health, growth, and release posture in one admin workspace."
          body={viewModel.note}
          actions={
            <div className="pill-row">
              <StatusPill tone={toneForState(signals.summary?.health_state ?? "normal")}>
                {signals.summary?.health_state ?? "Derived health"}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                Queue {queue.connectivity_state}
              </StatusPill>
            </div>
          }
        />
        <div className="analytics-toolbar">
          <DateRangePicker label="Period" onChange={setRange} value={range} />
          <div className="analytics-export-actions">
            <ExportButton csvRows={viewModel.csvRows} filenamePrefix="agrodomain-admin-analytics" pdfLines={viewModel.pdfLines} />
            <button className="button-ghost" data-testid="admin-analytics-refresh" onClick={() => setRefreshTick((current) => current + 1)} type="button">
              Refresh
            </button>
          </div>
        </div>
      </SurfaceCard>

      {isLoading ? (
        <SurfaceCard data-testid="admin-analytics-loading-state">
          <p className="muted" role="status">
            Loading platform analytics and release posture...
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

      {controlError ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {controlError} Showing derived analytics from live runtime data.
          </p>
        </SurfaceCard>
      ) : null}

      {!isLoading && !error ? <MetricDashboard items={viewModel.overview} testId="admin-analytics-overview" /> : null}

      {!isLoading && !error ? (
        <>
          <ChartCard
            body="Cumulative and period-active actors are derived from the records currently visible through live routes."
            eyebrow="Platform metrics"
            testId="admin-growth-card"
            title="User growth"
          >
            <LineChart ariaLabel="Platform growth chart" series={viewModel.growthSeries} testId="admin-growth-chart" />
          </ChartCard>

          <div className="dashboard-grid analytics-detail-grid">
            <ChartCard
              body={viewModel.geographySummary}
              eyebrow="Geographic distribution"
              testId="admin-geography-card"
              title="Live listing density"
            >
              <BarList items={viewModel.geography} testId="admin-geography-bars" />
            </ChartCard>

            <ChartCard
              body="Adoption rates are estimated from current module activity rather than a dedicated telemetry warehouse."
              eyebrow="Module adoption"
              testId="admin-adoption-card"
              title="Module usage"
            >
              <BarList items={viewModel.moduleAdoption} testId="admin-adoption-bars" />
            </ChartCard>
          </div>

          <ChartCard
            body="These health lines blend optional admin control-plane reads with live app-runtime availability."
            eyebrow="System health"
            testId="admin-health-card"
            title="Operational posture"
          >
            <ul className="analytics-performance-list">
              {viewModel.healthItems.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.status}</strong>
                </li>
              ))}
            </ul>
          </ChartCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Release controls"
              title="Current rollout posture"
              body={`Environment: ${liveState.systemSettings?.environment ?? "unknown"} · Schema: ${liveState.systemSettings?.schema_version ?? "pending"}`}
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
            {signals.readiness?.blocking_reasons?.length ? (
              <div className="stack-sm">
                {signals.readiness.blocking_reasons.map((reason) => (
                  <p className="field-error" key={reason}>
                    {reason}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="analytics-proof-grid">
              <article className="analytics-proof-card">
                <span className="metric-label">Rollout records</span>
                <strong>{signals.rollouts.length}</strong>
              </article>
              <article className="analytics-proof-card">
                <span className="metric-label">Live listings</span>
                <strong>{liveState.listings.length}</strong>
              </article>
              <article className="analytics-proof-card">
                <span className="metric-label">Escrows</span>
                <strong>{liveState.escrows.length}</strong>
              </article>
              <article className="analytics-proof-card">
                <span className="metric-label">Alerts</span>
                <strong>{signals.alerts.length}</strong>
              </article>
            </div>
          </SurfaceCard>
        </>
      ) : null}
    </div>
  );
}
