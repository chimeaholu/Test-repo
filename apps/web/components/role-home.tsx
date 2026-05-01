"use client";

import { DashboardActionTile } from "@/components/dashboard-action-tile";
import {
  AdvisoryIcon,
  AlertIcon,
  AnalyticsIcon,
  FieldIcon,
  InsuranceIcon,
  MarketIcon,
  NotificationIcon,
  ProfileIcon,
  SunIcon,
  TruckIcon,
  WalletIcon,
} from "@/components/icons";
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

function actionIcon(href: string) {
  if (href.includes("/market/listings")) {
    return <MarketIcon size={20} />;
  }
  if (href.includes("/market/negotiations")) {
    return <NotificationIcon size={20} />;
  }
  if (href.includes("/payments/wallet")) {
    return <WalletIcon size={20} />;
  }
  if (href.includes("/weather")) {
    return <SunIcon size={20} />;
  }
  if (href.includes("/advisor") || href.includes("/advisory")) {
    return <AdvisoryIcon size={20} />;
  }
  if (href.includes("/finance/queue")) {
    return <AnalyticsIcon size={20} />;
  }
  if (href.includes("/insurance")) {
    return <InsuranceIcon size={20} />;
  }
  if (href.includes("/cooperative/dispatch") || href.includes("/trucker")) {
    return <TruckIcon size={20} />;
  }
  if (href.includes("/farm")) {
    return <FieldIcon size={20} />;
  }
  if (href.includes("/profile")) {
    return <ProfileIcon size={20} />;
  }
  return <AlertIcon size={20} />;
}

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
  const quickActions = [
    {
      detail: "Start with the clearest next action for this workspace.",
      href: copy.dominantActionHref,
      icon: actionIcon(copy.dominantActionHref),
      label: copy.dominantActionLabel,
      tone: "primary" as const,
    },
    {
      detail: "Anything you started earlier stays easy to find here.",
      href: "/app/offline/outbox",
      icon: <AlertIcon size={20} />,
      label: "Saved work",
      tone: "secondary" as const,
    },
    ...copy.tasks.map((task) => ({
      detail: task.detail,
      href: task.href,
      icon: actionIcon(task.href),
      label: task.label,
      tone: task.tone,
    })),
  ].slice(0, 4);

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
              <ActionLink href="/app/offline/outbox" label="Saved work" tone="secondary" />
            </>
          }
        />

        <div className="hero-action-grid">
          {quickActions.map((task, index) => (
              <DashboardActionTile
                detail={task.detail}
                eyebrow={index === 0 ? "Start here" : task.tone === "warning" ? "Needs attention" : "Keep moving"}
                href={task.href}
                icon={task.icon}
                key={`${task.label}-${task.href}`}
              label={task.label}
              tone={task.tone}
            />
          ))}
        </div>

        <div className="hero-grid role-home-hero-grid">
          <div className="stack-md">
            <div className="pill-row">
              <StatusPill tone={session.consent.state === "consent_granted" ? "online" : "degraded"}>
                {session.consent.state === "consent_granted" ? "Ready" : "Needs attention"}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                {queue.connectivity_state === "degraded" ? "Limited updates" : queue.connectivity_state}
              </StatusPill>
              <StatusPill tone={gate.allowed ? "online" : "offline"}>
                {gate.allowed ? "Open to work" : "Review access"}
              </StatusPill>
            </div>
            <p className="muted measure">{copy.trustNote}</p>
            <InfoList
              items={[
                { label: copy.queueTitle, value: `${summary.actionableCount} saved` },
                { label: "Needs attention", value: summary.conflictedCount },
                { label: "Permissions", value: gate.allowed ? "Open" : "Check required" },
                { label: "Last update", value: session.consent.captured_at ?? "not recorded" },
              ]}
            />
            <div className="stat-strip role-home-scan-grid">
              <article className="stat-chip">
                <span className="metric-label">Workspace</span>
                <strong>{gate.allowed ? "Ready" : "Needs review"}</strong>
                <span className="muted">The next action stays clear when access is ready.</span>
              </article>
              <article className="stat-chip">
                <span className="metric-label">Updates</span>
                <strong>{queue.connectivity_state === "degraded" ? "Limited" : "Live"}</strong>
                <span className="muted">Saved work stays visible even when the signal drops.</span>
              </article>
            </div>
          </div>

          <div className="stack-md">
            <InsightCallout title="Phone mode" body={copy.fieldMode} tone="brand" />
            <InsightCallout title="Shared view" body={copy.deskMode} tone="neutral" />
            <InsightCallout title={copy.proofTitle} body={copy.confidenceNote} tone="accent" />
          </div>
        </div>
      </SurfaceCard>

      <div className="dashboard-grid">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Start here"
            title="Next actions"
            body="Move into the next task without digging through dense panels."
          />
          <div className="task-list">
            {copy.tasks.map((task) => (
              <DashboardActionTile
                detail={task.detail}
                eyebrow={task.tone === "warning" ? "Watch" : "Next"}
                href={task.href}
                icon={actionIcon(task.href)}
                key={task.label}
                label={task.label}
                tone={task.tone}
              />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="At a glance"
            title="Keep these in view"
            body="These short cues keep the next move clear while you work."
          />
          <div className="metrics-grid">
            <article className="metric-card">
              <span className="metric-label">Permissions</span>
              <strong className="metric-value">{session.consent.state === "consent_granted" ? "Ready" : "Review"}</strong>
              <p className="muted">The work you can do next stays visible here.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">Saved work</span>
              <strong className="metric-value">{summary.actionableCount}</strong>
              <p className="muted">{summary.conflictedCount} items need attention before they can finish.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">Next step</span>
              <strong className="metric-value">{gate.allowed ? "Continue" : "Review"}</strong>
              <p className="muted">{copy.nextStepNote}</p>
            </article>
          </div>
        </SurfaceCard>
      </div>
    </>
  );
}
