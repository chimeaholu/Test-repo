"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { EmptyState, InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { advisoryApi } from "@/lib/api/advisory";
import { climateApi } from "@/lib/api/climate";
import { advisoryStatusTone, reviewerHeadline } from "@/features/advisory/model";

type AdvisoryConversation = Awaited<ReturnType<typeof advisoryApi.listConversations>>["data"]["items"][number];

type AgentSnapshot = {
  completedReviews: number;
  farmersAssisted: number;
  knowledgeBaseArticles: number;
  pendingRequests: number;
  recentActivity: Array<{
    detail: string;
    key: string;
    status: string;
    timestamp: string;
    title: string;
    tone: "online" | "offline" | "degraded" | "neutral";
  }>;
  runtimeMode: "live" | "fallback";
  severeAlerts: number;
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildSnapshot(params: {
  alertsCount: number;
  items: AdvisoryConversation[];
  runtimeMode: "live" | "fallback";
}): AgentSnapshot {
  const pendingRequests = params.items.filter((item) =>
    item.status === "ready" || item.status === "hitl_required" || item.status === "revised",
  );
  const completedReviews = params.items.filter((item) =>
    item.reviewer_decision.outcome === "approve" ||
    item.reviewer_decision.outcome === "revise" ||
    item.reviewer_decision.outcome === "block",
  );
  const knowledgeBaseArticles = new Set(
    params.items.flatMap((item) => item.citations.map((citation) => citation.source_id)),
  ).size;

  return {
    completedReviews: completedReviews.length,
    farmersAssisted: params.items.length,
    knowledgeBaseArticles,
    pendingRequests: pendingRequests.length,
    recentActivity: [...params.items]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 5)
      .map((item) => ({
        detail: reviewerHeadline(item),
        key: item.advisory_request_id,
        status: item.status,
        timestamp: item.created_at,
        title: item.topic,
        tone: advisoryStatusTone(item.status),
      })),
    runtimeMode: params.runtimeMode,
    severeAlerts: params.alertsCount,
  };
}

export function AgentDashboard() {
  const { session, traceId } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<AgentSnapshot | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void Promise.allSettled([
      advisoryApi.listConversations(traceId, session.actor.locale),
      climateApi.listRuntime(traceId, session.actor.locale),
    ])
      .then((results) => {
        if (cancelled) {
          return;
        }

        const [advisoryResult, climateResult] = results;
        if (advisoryResult.status !== "fulfilled") {
          setError("Unable to load the extension agent dashboard right now.");
          return;
        }

        const severeAlerts =
          climateResult.status === "fulfilled"
            ? climateResult.value.data.alerts.filter((alert) => alert.severity === "critical" || alert.severity === "warning").length
            : 0;

        setSnapshot(
          buildSnapshot({
            alertsCount: severeAlerts,
            items: advisoryResult.value.data.items,
            runtimeMode: advisoryResult.value.data.runtime_mode,
          }),
        );
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load the extension agent dashboard right now.");
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

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard className="hero-surface">
        <SectionHeading
          eyebrow="Extension agent dashboard"
          title="Triaging advisory requests, review decisions, and field intelligence without losing evidence."
          body="Stay close to advisory requests, climate alerts, and review decisions from one field-support view."
          actions={
            snapshot ? (
              <div className="pill-row">
                <StatusPill tone={snapshot.runtimeMode === "live" ? "online" : "degraded"}>
                  Advisory {snapshot.runtimeMode === "live" ? "live" : "continuity"}
                </StatusPill>
                <StatusPill tone={snapshot.severeAlerts > 0 ? "degraded" : "neutral"}>
                  Alerts {snapshot.severeAlerts}
                </StatusPill>
              </div>
            ) : null
          }
        />

        <div className="metrics-grid">
          <article className="metric-card">
            <span className="metric-label">Pending advisory requests</span>
            <strong className="metric-value">{snapshot?.pendingRequests ?? "..."}</strong>
            <p className="muted">Requests that still need approval, revision, or explicit human review.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Completed reviews</span>
            <strong className="metric-value">{snapshot?.completedReviews ?? "..."}</strong>
            <p className="muted">Responses that already include a reviewer decision and a clear next action.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Farmers assisted</span>
            <strong className="metric-value">{snapshot?.farmersAssisted ?? "..."}</strong>
            <p className="muted">An estimate of farmers supported through active advisory requests.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Knowledge base articles</span>
            <strong className="metric-value">{snapshot?.knowledgeBaseArticles ?? "..."}</strong>
            <p className="muted">Source materials currently helping agents ground recommendations.</p>
          </article>
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
            eyebrow="Quick actions"
            title="Move straight into review work"
            body="Open the tools you need to review requests, send guidance, and monitor regional conditions."
          />
          <div className="task-list">
            <Link className="task-card primary" href="/app/advisor/requests">
              <strong>Review queue</strong>
              <p className="muted">Open the review workspace with the latest decisions and supporting references.</p>
            </Link>
            <Link className="task-card primary" href="/app/advisory/new">
              <strong>Create advisory</strong>
              <p className="muted">Submit a new guidance request and capture the context needed for a strong recommendation.</p>
            </Link>
            <Link className="task-card secondary" href="/app/advisor/requests">
              <strong>Browse knowledge base</strong>
              <p className="muted">Review the sources and supporting materials attached to each answer.</p>
            </Link>
            <Link className="task-card secondary" href="/app/weather">
              <strong>Regional analytics</strong>
              <p className="muted">Check the current alert load before prioritizing follow-up recommendations.</p>
            </Link>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="Recent decisions"
            title="Advisory queue activity"
            body="Every row below highlights the latest review activity from the advisory queue."
          />
          {snapshot?.recentActivity.length ? (
            <div className="task-list">
              {snapshot.recentActivity.map((item) => (
                <Link className="task-card secondary" href="/app/advisor/requests" key={item.key}>
                  <div className="queue-head">
                    <strong>{item.title}</strong>
                    <StatusPill tone={item.tone}>{item.status.replaceAll("_", " ")}</StatusPill>
                  </div>
                  <p className="muted">{item.detail}</p>
                  <span className="metric-label">{formatTimestamp(item.timestamp)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title={isLoading ? "Loading advisory queue" : "No advisory activity yet"}
              body="As requests and reviewer decisions arrive, they will surface here automatically."
            />
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Field context"
          title="Regional support posture"
          body="Keep advisory demand and climate pressure visible together while you prioritize outreach."
        />
        {snapshot ? (
          <InfoList
            items={[
              { label: "Advisory status", value: snapshot.runtimeMode === "live" ? "Live" : "Continuity" },
              { label: "Pending queue", value: snapshot.pendingRequests },
              { label: "Weather alerts needing awareness", value: snapshot.severeAlerts },
              { label: "Citation sources in play", value: snapshot.knowledgeBaseArticles },
            ]}
          />
        ) : (
          <InsightCallout
            title="Waiting for updates"
            body="This panel will populate as soon as advisory and climate updates are available for your area."
            tone="neutral"
          />
        )}
      </SurfaceCard>
    </div>
  );
}
