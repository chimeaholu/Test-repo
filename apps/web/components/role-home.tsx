"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { queueSummary } from "@/lib/offline/reducer";
import { ActionLink, InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { ROLE_EXPERIENCE } from "@/features/shell/content";
import { agroApiClient } from "@/lib/api/mock-client";

export function RoleHome() {
  const { queue, session, traceId } = useAppState();
  const [gate, setGate] = useState({ allowed: false, reason_code: "session_missing" });
  if (!session) {
    return null;
  }
  const summary = queueSummary(queue.items);
  const copy = ROLE_EXPERIENCE[session.actor.role];

  useEffect(() => {
    let cancelled = false;
    void agroApiClient
      .getProtectedActionStatus(traceId)
      .then((response) => {
        if (!cancelled) {
          setGate(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGate({ allowed: false, reason_code: "session_missing" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  return (
    <>
      <SurfaceCard className="hero-surface">
        <SectionHeading
          eyebrow={copy.eyebrow}
          title={copy.headline}
          body={copy.summary}
          actions={
            <>
              <ActionLink href={copy.dominantActionHref} label={copy.dominantActionLabel} />
              <ActionLink href="/app/offline/outbox" label="Open outbox" tone="secondary" />
            </>
          }
        />

        <div className="hero-grid">
          <div className="stack-md">
            <div className="pill-row">
              <StatusPill tone={session.consent.state === "consent_granted" ? "online" : "degraded"}>
                {session.consent.state === "consent_granted" ? "Consent active" : `Consent ${session.consent.state}`}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                {queue.connectivity_state === "degraded" ? "Low signal" : queue.connectivity_state}
              </StatusPill>
              <StatusPill tone={gate.allowed ? "online" : "offline"}>{gate.allowed ? "Protected work available" : "Review required first"}</StatusPill>
            </div>
            <p className="muted measure">{copy.trustNote}</p>
            <InfoList
              items={[
                { label: copy.queueTitle, value: `${summary.actionableCount} active item(s)` },
                { label: "Conflicts", value: summary.conflictedCount },
                { label: "Policy version", value: session.consent.policy_version ?? "pending" },
                { label: "Last consent capture", value: session.consent.captured_at ?? "not recorded" },
              ]}
            />
            <div className="hero-kpi-grid" aria-label="Role landing summary">
              <article className="hero-kpi">
                <span className="metric-label">Dominant action</span>
                <strong>{copy.dominantActionLabel}</strong>
                <p className="muted">The route starts with one clear next move rather than a dashboard of equal-weight options.</p>
              </article>
              <article className="hero-kpi">
                <span className="metric-label">Recovery posture</span>
                <strong>{summary.actionableCount > 0 ? "Resume queued work" : "Queue is clear"}</strong>
                <p className="muted">
                  {summary.conflictedCount > 0
                    ? `${summary.conflictedCount} conflict(s) still need explicit review.`
                    : "No queue conflicts are currently forcing an escalation."}
                </p>
              </article>
            </div>
          </div>

          <div className="stack-md">
            <InsightCallout title="Mobile mode" body={copy.fieldMode} tone="brand" />
            <InsightCallout title="Desktop mode" body={copy.deskMode} tone="neutral" />
            <InsightCallout title={copy.proofTitle} body={`Current access reason: ${gate.reason_code}. Trace ${traceId}.`} tone="accent" />
          </div>
        </div>
      </SurfaceCard>

      <div className="dashboard-grid">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Queue first"
            title="Priority actions"
            body="Every role lands on work that can be resumed immediately instead of a generic dashboard."
          />
          <div className="task-list">
            {copy.tasks.map((task) => (
              <Link className={`task-card ${task.tone}`} href={task.href} key={task.label}>
                <strong>{task.label}</strong>
                <p className="muted">{task.detail}</p>
              </Link>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="State framing"
            title="Workspace status"
            body="These signals stay visible so teams know whether they can proceed, recover, or escalate."
          />
          <div className="metrics-grid">
            <article className="metric-card">
              <span className="metric-label">Access status</span>
              <strong className="metric-value">{session.consent.state === "consent_granted" ? "Ready" : "Blocked"}</strong>
              <p className="muted">Protected actions depend on current consent, not a stale local session.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">Queue depth</span>
              <strong className="metric-value">{summary.actionableCount}</strong>
              <p className="muted">{summary.conflictedCount} conflict(s) currently need explicit attention.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">Next step</span>
              <strong className="metric-value">{gate.allowed ? "Continue" : "Review"}</strong>
              <p className="muted">Reason code: {gate.reason_code}</p>
            </article>
          </div>
        </SurfaceCard>
      </div>
    </>
  );
}
