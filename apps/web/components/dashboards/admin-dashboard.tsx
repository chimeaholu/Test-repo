"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { DashboardActionTile } from "@/components/dashboard-action-tile";
import { AnalyticsIcon, AlertIcon, NotificationIcon, ProfileIcon } from "@/components/icons";
import { EmptyState, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { advisoryApi } from "@/lib/api/advisory";
import { climateApi } from "@/lib/api/climate";
import { marketplaceApi } from "@/lib/api/marketplace";

type AdminSummary = {
  alerts: number;
  buyerRequests: number;
  guidanceCases: number;
  liveListings: number;
  runtimeMode: "live" | "fallback";
};

export function AdminDashboard() {
  const { queue, session, traceId } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);

  useEffect(() => {
    if (!session || session.actor.role !== "admin") {
      return;
    }

    let cancelled = false;

    void Promise.allSettled([
      marketplaceApi.listListings(traceId),
      marketplaceApi.listNegotiations(traceId),
      climateApi.listRuntime(traceId, session.actor.locale),
      advisoryApi.listConversations(traceId, session.actor.locale),
    ])
      .then((results) => {
        if (cancelled) {
          return;
        }

        const [listingsResult, negotiationsResult, climateResult, advisoryResult] = results;
        if (listingsResult.status !== "fulfilled" || negotiationsResult.status !== "fulfilled") {
          setError("Unable to load the internal admin view right now.");
          return;
        }

        setSummary({
          alerts:
            climateResult.status === "fulfilled"
              ? climateResult.value.data.alerts.filter((alert) => alert.severity !== "info").length
              : 0,
          buyerRequests: negotiationsResult.value.data.items.filter((item) => item.status !== "rejected").length,
          guidanceCases:
            advisoryResult.status === "fulfilled"
              ? advisoryResult.value.data.items.filter((item) => item.status !== "delivered").length
              : 0,
          liveListings: listingsResult.value.data.items.filter((item) => item.status === "published").length,
          runtimeMode:
            climateResult.status === "fulfilled" ? climateResult.value.data.runtime_mode : "fallback",
        });
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load the internal admin view right now.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  if (!session || session.actor.role !== "admin") {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard className="hero-surface">
        <SectionHeading
          eyebrow="Internal admin view"
          title="See platform health and move into the right operating tool"
          body="Use this internal overview to spot issues quickly and jump into analytics, support, or demo operations."
          actions={
            <div className="pill-row">
              <StatusPill tone={summary?.runtimeMode === "live" ? "online" : "degraded"}>
                {summary?.runtimeMode === "live" ? "Live updates" : "Limited updates"}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                {queue.connectivity_state === "degraded" ? "Low signal" : queue.connectivity_state}
              </StatusPill>
            </div>
          }
        />
        <div className="task-list">
          <DashboardActionTile
            detail="Open the internal trend view for product health, release readiness, and operating pressure."
            eyebrow="Monitor"
            href="/app/admin/analytics"
            icon={<AnalyticsIcon size={20} />}
            label="Open analytics"
          />
          <DashboardActionTile
            detail="Check the demo-only controls that support guided walkthroughs."
            eyebrow="Demo"
            href="/app/admin/demo-operator"
            icon={<ProfileIcon size={20} />}
            label="Demo tools"
            tone="secondary"
          />
          <DashboardActionTile
            detail="Review the update feed across support, payments, weather, and marketplace work."
            eyebrow="Watch"
            href="/app/notifications"
            icon={<NotificationIcon size={20} />}
            label="View updates"
            tone="secondary"
          />
        </div>
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      <div className="dashboard-grid">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Platform health"
            title="What looks healthy right now"
            body="Use these summary checks to decide where to look first."
          />
          <div className="metrics-grid">
            <article className="metric-card">
              <span className="metric-label">Live listings</span>
              <strong className="metric-value">{summary?.liveListings ?? "..."}</strong>
              <p className="muted">Current market supply visible in the live product.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">Guidance cases</span>
              <strong className="metric-value">{summary?.guidanceCases ?? "..."}</strong>
              <p className="muted">Open advisory work that may need closer follow-up.</p>
            </article>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="Open risks"
            title="Where follow-up may be needed"
            body="High-priority checks stay visible without dropping into raw system detail."
          />
          <div className="metrics-grid">
            <article className="metric-card">
              <span className="metric-label">Active deal pressure</span>
              <strong className="metric-value">{summary?.buyerRequests ?? "..."}</strong>
              <p className="muted">Negotiations and confirmations still moving through the product.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">Alerts</span>
              <strong className="metric-value">{summary?.alerts ?? "..."}</strong>
              <p className="muted">Climate or operating changes that may affect support load.</p>
            </article>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Recent internal events"
          title="Choose the next internal lane"
          body="Use the fastest route into the team surface that matches the issue in front of you."
        />
        {summary ? (
          <div className="task-list">
            <Link className="task-card secondary" href="/app/admin/analytics">
              <div className="queue-head">
                <strong>Open admin analytics</strong>
                <StatusPill tone={summary.runtimeMode === "live" ? "online" : "degraded"}>
                  {summary.runtimeMode === "live" ? "Ready" : "Limited"}
                </StatusPill>
              </div>
              <p className="muted">Review product health, rollout pressure, and readiness trends.</p>
            </Link>
            <Link className="task-card secondary" href="/app/notifications">
              <div className="queue-head">
                <strong>Review updates</strong>
                <StatusPill tone={summary.alerts > 0 ? "degraded" : "neutral"}>
                  {summary.alerts > 0 ? "Needs attention" : "Quiet"}
                </StatusPill>
              </div>
              <p className="muted">Check the shared feed for the latest changes across the platform.</p>
            </Link>
          </div>
        ) : (
          <EmptyState
            title="Internal checks are still loading"
            body="This internal view will fill in as live product data becomes available."
          />
        )}
      </SurfaceCard>
    </div>
  );
}
