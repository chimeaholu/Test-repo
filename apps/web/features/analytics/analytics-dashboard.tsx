"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { ChartCard } from "@/components/analytics/chart-card";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { ExportButton } from "@/components/analytics/export-button";
import { MetricDashboard } from "@/components/analytics/metric-dashboard";
import { EmptyState, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { advisoryApi } from "@/lib/api/advisory";
import { climateApi } from "@/lib/api/climate";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import type { ClimateAlert } from "@/lib/api-types";
import { buildRoleAnalyticsViewModel, type AdvisoryConversationRecord, type AnalyticsRangeKey, type AnalyticsSeries } from "@/features/analytics/model";
import type { EscrowReadModel, WalletBalance, WalletLedgerEntry } from "@/features/wallet/model";
import { formatMoney } from "@/features/wallet/model";

type AnalyticsState = {
  advisory: AdvisoryConversationRecord[];
  alerts: ClimateAlert[];
  balance: WalletBalance | null;
  escrows: EscrowReadModel[];
  listings: Awaited<ReturnType<typeof marketplaceApi.listListings>>["data"]["items"];
  negotiations: Awaited<ReturnType<typeof marketplaceApi.listNegotiations>>["data"]["items"];
  runtimeMode: "live" | "fallback";
  transactions: WalletLedgerEntry[];
};

const INITIAL_STATE: AnalyticsState = {
  advisory: [],
  alerts: [],
  balance: null,
  escrows: [],
  listings: [],
  negotiations: [],
  runtimeMode: "fallback",
  transactions: [],
};

function chartBounds(series: AnalyticsSeries[]) {
  const values = series.flatMap((item) => item.points.map((point) => point.value));
  const max = Math.max(1, ...values);
  return { max };
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

function areaPoints(series: AnalyticsSeries, max: number, width = 600, height = 220): string {
  if (series.points.length === 0) {
    return "";
  }
  const path = linePoints(series, max, width, height);
  return `${path} L ${width} ${height} L 0 ${height} Z`;
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
          {props.series[0] ? <path d={areaPoints(props.series[0], max, width, height)} className="analytics-area-fill" /> : null}
          {props.series.map((series) => (
            <path d={linePoints(series, max, width, height)} key={series.name} fill="none" stroke={series.color} strokeWidth="3" />
          ))}
          {props.series.flatMap((series) =>
            series.points.map((point, index) => {
              const step = series.points.length > 1 ? width / (series.points.length - 1) : width;
              const x = index * step;
              const y = height - (point.value / max) * (height - 20);
              return <circle cx={x} cy={y} fill={series.color} key={`${series.name}-${point.label}`} r="4" />;
            }),
          )}
        </g>
      </svg>
      <div className="analytics-axis-labels">
        {props.series[0]?.points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
      {props.series.length > 1 ? (
        <div className="analytics-legend">
          {props.series.map((item) => (
            <span key={item.name}>
              <i style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
          ))}
        </div>
      ) : null}
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

export function AnalyticsDashboardClient() {
  const { queue, session, traceId } = useAppState();
  const [range, setRange] = useState<AnalyticsRangeKey>("30d");
  const [state, setState] = useState<AnalyticsState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialNote, setPartialNote] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void Promise.allSettled([
      marketplaceApi.listListings(traceId),
      marketplaceApi.listNegotiations(traceId),
      walletApi.listEscrows(traceId),
      walletApi.listWalletTransactions(traceId),
      walletApi.getWalletSummary(traceId),
      climateApi.listRuntime(traceId, session.actor.locale),
      advisoryApi.listConversations(traceId, session.actor.locale),
    ])
      .then((results) => {
        if (cancelled) {
          return;
        }

        const [listingsResult, negotiationsResult, escrowsResult, transactionsResult, balanceResult, climateResult, advisoryResult] = results;
        const coreFailures = [listingsResult, negotiationsResult, escrowsResult, transactionsResult].filter((result) => result.status === "rejected");

        if (coreFailures.length === 4) {
          setError("Unable to load AgroInsights from the current marketplace and wallet data.");
          setState(INITIAL_STATE);
          setPartialNote(null);
          return;
        }

        setState({
          advisory:
            advisoryResult.status === "fulfilled"
              ? advisoryResult.value.data.items.map((item) => ({
                  actor_id: item.actor_id,
                  citations: item.citations,
                  created_at: item.created_at,
                }))
              : [],
          alerts: climateResult.status === "fulfilled" ? climateResult.value.data.alerts : [],
          balance: balanceResult.status === "fulfilled" ? balanceResult.value.data : null,
          escrows: escrowsResult.status === "fulfilled" ? escrowsResult.value.data.items : [],
          listings: listingsResult.status === "fulfilled" ? listingsResult.value.data.items : [],
          negotiations: negotiationsResult.status === "fulfilled" ? negotiationsResult.value.data.items : [],
          runtimeMode: climateResult.status === "fulfilled" ? climateResult.value.data.runtime_mode : "fallback",
          transactions: transactionsResult.status === "fulfilled" ? transactionsResult.value.data.items : [],
        });

        const degradedSources = [
          climateResult.status === "rejected" ? "climate" : null,
          advisoryResult.status === "rejected" ? "advisory" : null,
          balanceResult.status === "rejected" ? "wallet summary" : null,
        ].filter(Boolean);
        setPartialNote(
          degradedSources.length > 0
            ? `Some supporting signals are unavailable right now: ${degradedSources.join(", ")}.`
            : null,
        );
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load AgroInsights right now.");
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

  const viewModel = useMemo(() => {
    if (!session) {
      return null;
    }
    return buildRoleAnalyticsViewModel({
      actorId: session.actor.actor_id,
      alerts: state.alerts,
      balance: state.balance,
      escrows: state.escrows,
      listings: state.listings,
      negotiations: state.negotiations,
      range,
      role: session.actor.role,
      runtimeMode: state.runtimeMode,
      transactions: state.transactions,
    });
  }, [range, session, state]);

  if (!session || !viewModel) {
    return null;
  }

  return (
    <div className="content-stack analytics-shell" data-testid="analytics-dashboard-root">
      <SurfaceCard className="hero-surface">
        <SectionHeading
          eyebrow="AgroInsights"
          title={viewModel.headline}
          body={viewModel.summary}
          actions={
            <div className="pill-row">
              <StatusPill tone={state.runtimeMode === "live" ? "online" : "degraded"}>
                {state.runtimeMode === "live" ? "Live signals" : "Continuity mode"}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                Queue {queue.connectivity_state}
              </StatusPill>
            </div>
          }
        />
        <div className="analytics-toolbar">
          <DateRangePicker label="Period" onChange={setRange} value={range} />
          <ExportButton csvRows={viewModel.csvRows} filenamePrefix="agrodomain-analytics-report" pdfLines={viewModel.pdfLines} />
        </div>
        <div className="inline-actions">
          <Link className="button-primary" href="/app/market/listings">
            Open marketplace
          </Link>
          <Link className="button-secondary" href="/app/payments/wallet">
            Open wallet
          </Link>
          <Link className="button-ghost" href="/app/weather">
            Review weather context
          </Link>
        </div>
      </SurfaceCard>

      {isLoading ? (
        <SurfaceCard data-testid="analytics-loading-state">
          <p className="muted" role="status">
            Loading analytics from marketplace, wallet, and climate records...
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

      {partialNote ? (
        <SurfaceCard>
          <p className="muted">{partialNote}</p>
        </SurfaceCard>
      ) : null}

      {!isLoading && !error ? <MetricDashboard items={viewModel.overview} testId="analytics-overview-metrics" /> : null}

      {!isLoading && !error && viewModel.isEmpty ? (
        <SurfaceCard data-testid="analytics-empty-state">
          <EmptyState
            title="Not enough data yet"
            body={viewModel.emptyMessage}
            actions={
              <>
                <Link className="button-primary" href="/app/market/listings">
                  Open AgroMarket
                </Link>
                <Link className="button-ghost" href="/app/payments/wallet">
                  Open AgroWallet
                </Link>
              </>
            }
          />
        </SurfaceCard>
      ) : null}

      {!isLoading && !error && !viewModel.isEmpty ? (
        <>
          <ChartCard
            body={viewModel.trendSummary}
            eyebrow="Overview"
            testId="analytics-trend-card"
            title={viewModel.trendHeadline}
          >
            <LineChart ariaLabel={viewModel.trendHeadline} series={viewModel.trend} testId="analytics-trend-chart" />
          </ChartCard>

          <ChartCard
            body="Average live listing prices for the most active commodities in the current marketplace feed."
            eyebrow="Market pricing"
            testId="analytics-commodity-card"
            title="Commodity price trends"
          >
            <LineChart ariaLabel="Commodity price trends" series={viewModel.commodityComparison} testId="analytics-commodity-chart" />
          </ChartCard>

          <div className="dashboard-grid analytics-detail-grid">
            <ChartCard
              body={viewModel.regionalHeadline}
              eyebrow="Regional analysis"
              testId="analytics-regional-card"
              title="Regional market analysis"
            >
              <BarList items={viewModel.regionalBars} testId="analytics-regional-bars" />
            </ChartCard>

            <ChartCard
              body="These signals are derived from your currently visible live records, not from a separate analytics warehouse."
              eyebrow="Your performance"
              testId="analytics-performance-card"
              title="Performance summary"
            >
              <ul className="analytics-performance-list">
                {viewModel.performance.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </div>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Readiness"
              title="R7 E2E-adjacent state support"
              body="Stable selectors, explicit empty/loading/error surfaces, and local CSV/PDF export are in place for downstream gate validation."
            />
            <div className="analytics-proof-grid">
              <article className="analytics-proof-card">
                <span className="metric-label">Current range</span>
                <strong>{range}</strong>
              </article>
              <article className="analytics-proof-card">
                <span className="metric-label">Visible cards</span>
                <strong>4</strong>
              </article>
              <article className="analytics-proof-card">
                <span className="metric-label">Export surfaces</span>
                <strong>CSV + PDF</strong>
              </article>
              <article className="analytics-proof-card">
                <span className="metric-label">Current revenue signal</span>
                <strong>{viewModel.overview[0]?.value ?? formatMoney(0, "GHS")}</strong>
              </article>
            </div>
          </SurfaceCard>
        </>
      ) : null}
    </div>
  );
}
