"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAppState } from "@/components/app-provider";
import { ROLE_EXPERIENCE } from "@/features/shell/content";
import {
  homeRouteForRole,
  navigationForRole,
  roleLabel,
  shellStatusTone,
} from "@/features/shell/model";
import { queueSummary } from "@/lib/offline/reducer";
import { InfoList, InsightCallout, SectionHeading, StatusPill } from "@/components/ui-primitives";

function SyncBanner() {
  const { queue, traceId, setConnectivityState } = useAppState();
  const summary = queueSummary(queue.items);

  return (
    <section className="sync-banner" aria-label="Sync status">
      <div className="stack-sm">
        <div className="pill-row">
          <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
            {queue.connectivity_state === "online"
              ? "Online"
              : queue.connectivity_state === "degraded"
                ? "Low connectivity"
                : "Offline"}
          </StatusPill>
          {queue.handoff_channel ? <StatusPill tone="degraded">Handoff {queue.handoff_channel}</StatusPill> : null}
        </div>
        <h2>Offline work stays visible and recoverable.</h2>
        <p className="muted">
          Pending items: {summary.actionableCount}. Conflicts: {summary.conflictedCount}.
        </p>
      </div>
      {process.env.NODE_ENV === "development" && (
        <div className="inline-actions">
          <button className="button-ghost" onClick={() => setConnectivityState("online")} type="button">
            Force online
          </button>
          <button className="button-ghost" onClick={() => setConnectivityState("degraded")} type="button">
            Simulate degraded
          </button>
          <button className="button-secondary" onClick={() => setConnectivityState("offline")} type="button">
            Simulate offline
          </button>
        </div>
      )}
    </section>
  );
}

function ShellNav() {
  const pathname = usePathname();
  const { queue, session } = useAppState();
  if (!session) {
    return null;
  }

  const summary = queueSummary(queue.items);
  const navigation = navigationForRole(session.actor.role, summary.actionableCount, 2);
  const experience = ROLE_EXPERIENCE[session.actor.role];

  return (
    <div className="detail-stack">
      <div className="stack-md">
        <SectionHeading
          eyebrow="Role-aware workspace"
          title={`${roleLabel(session.actor.role)} operations`}
          body="The workspace routes to the correct role surface while keeping consent, queue, and offline state visible."
        />
        <nav aria-label="Primary">
          <div className="nav-list">
            {navigation.map((item) => (
              <Link
                className="nav-link"
                href={item.href}
                key={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                <span>{item.label}</span>
                {item.badgeCount ? <span className="badge">{item.badgeCount}</span> : null}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      <InfoList
        items={[
          { label: "Home route", value: homeRouteForRole(session.actor.role) },
          { label: "Field posture", value: experience.queueTitle },
          { label: "Proof posture", value: experience.proofTitle },
        ]}
      />
      <InsightCallout title="Design note" body={experience.trustNote} tone="brand" />
    </div>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { queue, session } = useAppState();
  if (!session) {
    return null;
  }
  const summary = queueSummary(queue.items);
  const items = navigationForRole(session.actor.role, summary.actionableCount, 2).slice(0, 5);

  return (
    <div className="mobile-nav-wrap">
      <nav className="mobile-nav" aria-label="Mobile primary">
        {items.map((item) => (
          <Link
            className="nav-link"
            href={item.href}
            key={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            <span>{item.label}</span>
            {item.badgeCount ? <span className="badge">{item.badgeCount}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function ProtectedShell({ children }: { children: ReactNode }) {
  const { clearSession, session, traceId, isHydrated } = useAppState();

  if (!isHydrated) {
    return (
      <main className="page-shell" id="main-content">
        <section className="hero-card">
          <p className="eyebrow">Loading workspace</p>
          <h1 className="display-title">Restoring your workspace and recent activity.</h1>
          <p className="lede">The workspace waits for your identity and queued activity so recovery stays clear when connectivity changes.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page-shell" id="main-content">
        <section className="hero-card">
          <p className="eyebrow">Protected route</p>
          <h1 className="display-title">This workspace needs an authenticated session.</h1>
          <div className="actions-row">
            <Link className="button-primary" href="/signin">
              Go to sign in
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <main className="app-shell">
        <div className="topbar">
          <div className="stack-sm">
            <div className="pill-row">
              <StatusPill tone={shellStatusTone(session)}>{roleLabel(session.actor.role)}</StatusPill>
              <StatusPill tone="neutral">{session.actor.country_code}</StatusPill>
            </div>
            <p className="eyebrow">{session.actor.display_name}</p>
            <h1>{session.actor.membership.organization_name}</h1>
            <p className="muted">
              {session.actor.email} · {roleLabel(session.actor.role)} · {session.actor.country_code}
            </p>
            <p className="muted measure">
              This protected workspace keeps role routing, queue state, and permission status visible while you move between operational routes.
            </p>
          </div>
          <div className="inline-actions">
            {process.env.NODE_ENV === "development" && (
              <span className="trace-chip">Trace {traceId}</span>
            )}
            <button className="button-ghost" type="button" onClick={clearSession}>
              Sign out
            </button>
          </div>
        </div>
        <SyncBanner />
        <div className="app-grid">
          <aside className="rail">
            <ShellNav />
          </aside>
          <section className="content-stack" id="main-content">
            {children}
          </section>
        </div>
        <MobileNav />
      </main>
    </div>
  );
}
