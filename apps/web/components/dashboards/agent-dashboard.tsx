"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { DashboardActionTile } from "@/components/dashboard-action-tile";
import { AdvisoryIcon, AnalyticsIcon, MarketIcon, SunIcon } from "@/components/icons";
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

  const isAdvisor = session.actor.role === "advisor";
  const heroEyebrow = isAdvisor ? "Advisory workspace" : "Field support workspace";
  const heroTitle = isAdvisor
    ? "Handle the next request with clear guidance and visible support."
    : "Respond to farmer needs with clearer local context.";
  const heroBody = isAdvisor
    ? "Open the next case, review what matters, and send practical advice with confidence."
    : "See who needs help, what is changing in the field, and what guidance is most useful right now.";

  return (
    <div className="content-stack">
      <SurfaceCard className="hero-surface">
        <SectionHeading
          eyebrow={heroEyebrow}
          title={heroTitle}
          body={heroBody}
          actions={
            snapshot ? (
              <div className="pill-row">
                <StatusPill tone={snapshot.runtimeMode === "live" ? "online" : "degraded"}>
                  {snapshot.runtimeMode === "live" ? "Live guidance" : "Limited guidance"}
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
            <span className="metric-label">{isAdvisor ? "Open cases" : "Requests waiting"}</span>
            <strong className="metric-value">{snapshot?.pendingRequests ?? "..."}</strong>
            <p className="muted">Requests that still need a response, revision, or closer judgment.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">{isAdvisor ? "Completed guidance" : "Recent guidance sent"}</span>
            <strong className="metric-value">{snapshot?.completedReviews ?? "..."}</strong>
            <p className="muted">Responses that already have a clear next action attached to them.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">{isAdvisor ? "Needs human review" : "High-pressure locations"}</span>
            <strong className="metric-value">{snapshot?.farmersAssisted ?? "..."}</strong>
            <p className="muted">A simple count of the farmers or cases currently in view.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Support context</span>
            <strong className="metric-value">{snapshot?.knowledgeBaseArticles ?? "..."}</strong>
            <p className="muted">Helpful source material currently supporting recent responses.</p>
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
            title={isAdvisor ? "Choose the next advisory task" : "Choose the next field-support task"}
            body="Use short, icon-led actions to respond, follow up, and check local conditions."
          />
          <div className="task-list">
            <DashboardActionTile
              detail="Open the queue with the latest requests and the context needed to respond."
              eyebrow="Do now"
              href="/app/advisor/requests"
              icon={<AdvisoryIcon size={20} />}
              label="Open requests"
            />
            <DashboardActionTile
              detail="Capture a new case and the context needed for a strong answer."
              eyebrow="Respond"
              href="/app/advisory/new"
              icon={<MarketIcon size={20} />}
              label={isAdvisor ? "New request" : "Create request"}
            />
            <DashboardActionTile
              detail="Review recent support context before you answer the next case."
              eyebrow="Check"
              href="/app/advisor/requests"
              icon={<AnalyticsIcon size={20} />}
              label={isAdvisor ? "Review cases" : "Recent support"}
              tone="secondary"
            />
            <DashboardActionTile
              detail="Check alert pressure before you prioritize the next follow-up."
              eyebrow="Watch"
              href="/app/weather"
              icon={<SunIcon size={20} />}
              label={isAdvisor ? "Local alerts" : "Review alerts"}
              tone="secondary"
            />
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow={isAdvisor ? "Recently completed guidance" : "Recent follow-through"}
            title={isAdvisor ? "Advisory activity" : "Field-support activity"}
            body="Every row below highlights the latest request and response activity."
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
              title={isLoading ? "Loading requests" : "No activity yet"}
              body="As requests and follow-up activity arrive, they will surface here automatically."
            />
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow={isAdvisor ? "What needs closer judgment" : "Local weather and field pressure"}
          title={isAdvisor ? "Case support summary" : "Regional support summary"}
          body="Keep demand and climate pressure visible together while you prioritize outreach."
        />
        {snapshot ? (
          <InfoList
            items={[
              { label: "Guidance status", value: snapshot.runtimeMode === "live" ? "Live" : "Limited" },
              { label: isAdvisor ? "Open cases" : "Pending requests", value: snapshot.pendingRequests },
              { label: "Alerts needing awareness", value: snapshot.severeAlerts },
              { label: "Support sources in use", value: snapshot.knowledgeBaseArticles },
            ]}
          />
        ) : (
          <InsightCallout
            title="Waiting for updates"
            body="This panel will populate as soon as guidance and weather updates are available for your area."
            tone="neutral"
          />
        )}
      </SurfaceCard>
    </div>
  );
}
