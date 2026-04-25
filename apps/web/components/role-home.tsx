"use client";

import Link from "next/link";

import { AgentDashboard } from "@/components/dashboards/agent-dashboard";
import { BuyerDashboard } from "@/components/dashboards/buyer-dashboard";
import { CooperativeDashboard } from "@/components/dashboards/cooperative-dashboard";
import { InvestorDashboard } from "@/components/dashboards/investor-dashboard";
import { TransporterDashboard } from "@/components/dashboards/transporter-dashboard";
import { agroApiClient } from "@/lib/api/api-client";
import { useAppState } from "@/components/app-provider";
import { queueSummary } from "@/lib/offline/reducer";
import { ActionLink, InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { ROLE_EXPERIENCE } from "@/features/shell/content";

export function RoleHome() {
  const { queue, session, traceId } = useAppState();
  if (!session) {
    return null;
  }
  if (session.actor.role === "buyer") {
    return <BuyerDashboard />;
  }
  if (session.actor.role === "advisor" || session.actor.role === "extension_agent") {
    return <AgentDashboard />;
  }
  if (session.actor.role === "cooperative") {
    return <CooperativeDashboard />;
  }
  if (session.actor.role === "admin" || session.actor.role === "transporter") {
    return <TransporterDashboard />;
  }
  if (session.actor.role === "investor") {
    return <InvestorDashboard />;
  }
  const summary = queueSummary(queue.items);
  const gate = agroApiClient.evaluateProtectedAction(traceId).data;
  const copy = ROLE_EXPERIENCE[session.actor.role];

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
                {session.consent.state === "consent_granted" ? "Consent active" : "Consent needs attention"}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                {queue.connectivity_state === "degraded" ? "Low signal" : queue.connectivity_state}
              </StatusPill>
              <StatusPill tone={gate.allowed ? "online" : "offline"}>{gate.allowed ? "Access ready" : "Access needs review"}</StatusPill>
            </div>
            <p className="muted measure">{copy.trustNote}</p>
            <InfoList
              items={[
                { label: copy.queueTitle, value: `${summary.actionableCount} active` },
                { label: "Conflicts", value: summary.conflictedCount },
                { label: "Policy version", value: session.consent.policy_version ?? "pending" },
                { label: "Last updated", value: session.consent.captured_at ?? "not recorded" },
              ]}
            />
            <div className="stat-strip">
              <article className="stat-chip">
                <span className="metric-label">Access</span>
                <strong>{gate.allowed ? "Ready" : "Needs review"}</strong>
                <span className="muted">We only show actions that are available for your current role and permissions.</span>
              </article>
              <article className="stat-chip">
                <span className="metric-label">Connection</span>
                <strong>{queue.connectivity_state === "degraded" ? "Low signal" : queue.connectivity_state}</strong>
                <span className="muted">Saved work stays visible so you can finish it once the network improves.</span>
              </article>
            </div>
          </div>

          <div className="stack-md">
            <InsightCallout title="On the go" body={copy.fieldMode} tone="brand" />
            <InsightCallout title="Desktop view" body={copy.deskMode} tone="neutral" />
            <InsightCallout title={copy.proofTitle} body={copy.confidenceNote} tone="accent" />
          </div>
        </div>
      </SurfaceCard>

      <div className="dashboard-grid">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Start here"
            title="Next actions"
            body="Pick up the work that matters most without hunting through a generic dashboard."
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
            eyebrow="At a glance"
            title="What needs attention"
            body="These cues keep the most important next-step information visible while you work."
          />
          <div className="metrics-grid">
            <article className="metric-card">
              <span className="metric-label">Consent</span>
              <strong className="metric-value">{session.consent.state === "consent_granted" ? "Active" : "Needs review"}</strong>
              <p className="muted">Protected actions stay available only while your permissions are current.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">Pending work</span>
              <strong className="metric-value">{summary.actionableCount}</strong>
              <p className="muted">{summary.conflictedCount} items need review before they can be completed.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">Next step</span>
              <strong className="metric-value">{gate.allowed ? "Continue" : "Review access"}</strong>
              <p className="muted">{copy.nextStepNote}</p>
            </article>
          </div>
        </SurfaceCard>
      </div>
    </>
  );
}
