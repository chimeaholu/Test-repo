"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import React from "react";
import type { ReactNode } from "react";

import { useAppState } from "@/components/app-provider";
import { AppShell } from "@/components/layout/app-shell";
import { loadNotificationFeed, unreadNotificationCount } from "@/features/notifications/model";
import { roleLabel } from "@/features/shell/model";
import { StatusPill } from "@/components/ui-primitives";
import { resolveLocaleProfile } from "@/lib/i18n/config";
import { getLocaleMessages, interpolate, type MessageCatalog } from "@/lib/i18n/messages";
import { queueSummary } from "@/lib/offline/reducer";
import { readUserPreferences, USER_PREFERENCES_EVENT } from "@/lib/user-preferences";

function SyncBanner({ copy }: { copy: MessageCatalog["shell"] }) {
  const { cachedReadModels, queue, setConnectivityState } = useAppState();
  const summary = queueSummary(queue.items);
  const staleReadModels = cachedReadModels.filter((item) => item.state === "stale").length;
  const localReadModels = cachedReadModels.filter((item) => item.state === "local").length;

  return (
    <section aria-label={copy.sync.ariaLabel} className="sync-banner">
      <div className="stack-sm">
        <div className="pill-row">
          <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
            {queue.connectivity_state === "online"
              ? copy.sync.online
              : queue.connectivity_state === "degraded"
                ? copy.sync.lowConnectivity
                : copy.sync.offline}
          </StatusPill>
          {queue.handoff_channel ? <StatusPill tone="degraded">{`${copy.sync.handoffLabel} ${queue.handoff_channel}`}</StatusPill> : null}
        </div>
        <h2>{copy.sync.title}</h2>
        <p className="muted">
          {interpolate(copy.sync.summary, {
            actionableCount: summary.actionableCount,
            cachedCount: cachedReadModels.length,
            conflictedCount: summary.conflictedCount,
            localCount: localReadModels,
            staleCount: staleReadModels,
          })}
        </p>
      </div>
      <div className="inline-actions">
        <button className="button-ghost" onClick={() => setConnectivityState("online")} type="button">
          {copy.sync.forceOnline}
        </button>
        <button className="button-ghost" onClick={() => setConnectivityState("degraded")} type="button">
          {copy.sync.simulateDegraded}
        </button>
        <button className="button-secondary" onClick={() => setConnectivityState("offline")} type="button">
          {copy.sync.simulateOffline}
        </button>
      </div>
    </section>
  );
}

function DemoBoundaryBanner({ watermark }: { watermark: string }) {
  return (
    <section aria-label="Demo boundary" className="sync-banner">
      <div className="stack-sm">
        <div className="pill-row">
          <StatusPill tone="degraded">Guided preview</StatusPill>
          <StatusPill tone="neutral">Sample data</StatusPill>
        </div>
        <h2>This walkthrough uses sample data and stays separate from live work.</h2>
        <p className="muted">{watermark}</p>
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
  const [preferences, setPreferences] = useState(() =>
    session ? readUserPreferences(session) : null,
  );
  const summary = queueSummary(queue.items);
  const fallbackNotificationCount = summary.conflictedCount + (queue.handoff_channel ? 1 : 0);

  useEffect(() => {
    if (!session) {
      setPreferences(null);
      return;
    }

    const syncPreferences = () => {
      setPreferences(readUserPreferences(session));
    };

    syncPreferences();

    window.addEventListener(USER_PREFERENCES_EVENT, syncPreferences);
    window.addEventListener("storage", syncPreferences);

    return () => {
      window.removeEventListener(USER_PREFERENCES_EVENT, syncPreferences);
      window.removeEventListener("storage", syncPreferences);
    };
  }, [session]);

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

  const localeProfile = resolveLocaleProfile({
    countryCode: session.actor.country_code,
    preferredLocale: preferences?.display.locale,
    readingLevelBand: preferences?.display.readingLevelBand,
    sessionLocale: session.actor.locale,
  });
  const shellCopy = getLocaleMessages(localeProfile).shell;

  return (
    <div className="app-frame">
      <AppShell
        agroGuideEnabled={showAgroGuide}
        banner={
          <>
            {session.workspace?.is_demo_tenant ? (
              <DemoBoundaryBanner watermark={session.workspace.watermark} />
            ) : null}
            <SyncBanner copy={shellCopy} />
          </>
        }
        countryCode={session.actor.country_code}
        demoWatermark={session.workspace?.watermark}
        email={session.actor.email}
        isDemoTenant={session.workspace?.is_demo_tenant}
        localeProfile={localeProfile}
        notificationCount={notificationCount}
        onSignOut={clearSession}
        operatorCanSwitchPersonas={session.workspace?.operator_can_switch_personas}
        organizationName={session.actor.membership.organization_name}
        queueCount={summary.actionableCount}
        role={session.actor.role}
        roleLabel={roleLabel(session.actor.role)}
        shellCopy={shellCopy}
        userName={session.actor.display_name}
      >
        {children}
      </AppShell>
    </div>
  );
}
