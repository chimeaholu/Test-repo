"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useAppState } from "@/components/app-provider";
import { AppShell } from "@/components/layout/app-shell";
import { loadNotificationFeed, unreadNotificationCount } from "@/features/notifications/model";
import { roleLabel } from "@/features/shell/model";
import { StatusPill } from "@/components/ui-primitives";
import { queueSummary } from "@/lib/offline/reducer";
import { USER_PREFERENCES_EVENT } from "@/lib/user-preferences";

function SyncBanner() {
  const { queue, setConnectivityState } = useAppState();
  const summary = queueSummary(queue.items);

  return (
    <section aria-label="Sync status" className="sync-banner">
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
        <h2>Your work stays saved, even when the connection drops.</h2>
        <p className="muted">
          Pending items: {summary.actionableCount}. Review conflicts: {summary.conflictedCount}. We keep recent actions ready to replay when the network stabilizes.
        </p>
      </div>
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
    </section>
  );
}

export function ProtectedShell({
  children,
  showAgroGuide = false,
}: {
  children: ReactNode;
  showAgroGuide?: boolean;
}) {
  const { clearSession, isHydrated, queue, session, traceId } = useAppState();
  const [notificationCount, setNotificationCount] = useState(0);
  const summary = queueSummary(queue.items);
  const fallbackNotificationCount = summary.conflictedCount + (queue.handoff_channel ? 1 : 0);

  useEffect(() => {
    if (!session) {
      setNotificationCount(0);
      return;
    }

    let cancelled = false;

    const refreshNotifications = () => {
      void loadNotificationFeed({
        queueDepth: queue.items.length,
        session,
        traceId,
      })
        .then((feed) => {
          if (!cancelled) {
            setNotificationCount(unreadNotificationCount(feed));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setNotificationCount(fallbackNotificationCount);
          }
        });
    };

    refreshNotifications();

    const handlePreferencesChanged = () => {
      refreshNotifications();
    };

    window.addEventListener(USER_PREFERENCES_EVENT, handlePreferencesChanged);
    window.addEventListener("storage", handlePreferencesChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(USER_PREFERENCES_EVENT, handlePreferencesChanged);
      window.removeEventListener("storage", handlePreferencesChanged);
    };
  }, [fallbackNotificationCount, queue.items.length, session, traceId]);

  if (!isHydrated) {
    return (
      <main className="page-shell" id="main-content">
        <section className="hero-card">
          <p className="eyebrow">Loading workspace</p>
          <h1 className="display-title">Restoring your workspace.</h1>
          <p className="lede">We are bringing back your recent activity and saved progress so you can continue where you left off.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page-shell" id="main-content">
        <section className="hero-card">
          <p className="eyebrow">Sign in required</p>
          <h1 className="display-title">Sign in to continue to this workspace.</h1>
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
      <AppShell
        agroGuideEnabled={showAgroGuide}
        banner={<SyncBanner />}
        countryCode={session.actor.country_code}
        email={session.actor.email}
        notificationCount={notificationCount}
        onSignOut={clearSession}
        organizationName={session.actor.membership.organization_name}
        queueCount={summary.actionableCount}
        role={session.actor.role}
        roleLabel={roleLabel(session.actor.role)}
        userName={session.actor.display_name}
      >
        {children}
      </AppShell>
    </div>
  );
}
