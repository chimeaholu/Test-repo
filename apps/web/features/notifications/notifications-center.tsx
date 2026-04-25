"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { EmptyState, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import {
  groupNotifications,
  loadNotificationFeed,
  unreadNotificationCount,
  type FeedNotification,
} from "@/features/notifications/model";
import {
  markAllNotificationsRead,
  markNotificationReadState,
  readUserPreferences,
  type NotificationCategory,
} from "@/lib/user-preferences";

const PAGE_SIZE = 8;

const CATEGORY_META: Record<
  NotificationCategory,
  {
    label: string;
    tone: "online" | "offline" | "degraded" | "neutral";
  }
> = {
  advisory: { label: "Advisory", tone: "neutral" },
  finance: { label: "Finance", tone: "online" },
  system: { label: "System", tone: "degraded" },
  trade: { label: "Trade", tone: "online" },
  weather: { label: "Weather", tone: "degraded" },
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function NotificationsCenterClient() {
  const { queue, session, traceId } = useAppState();
  const [notifications, setNotifications] = useState<FeedNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationCategory | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void loadNotificationFeed({
      session,
      traceId,
      queueDepth: queue.items.length,
    })
      .then((nextNotifications) => {
        if (cancelled) {
          return;
        }
        setNotifications(nextNotifications);
        setError(null);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load notifications.");
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
  }, [queue.items.length, session, traceId]);

  const enabledCategoryCount = useMemo(() => {
    if (!session) {
      return 0;
    }
    return Object.values(readUserPreferences(session).notifications.categories).filter(Boolean).length;
  }, [session, notifications]);

  const countsByFilter = useMemo(() => {
    return notifications.reduce<Record<NotificationCategory, number>>(
      (accumulator, item) => ({
        ...accumulator,
        [item.category]: accumulator[item.category] + 1,
      }),
      {
        advisory: 0,
        finance: 0,
        system: 0,
        trade: 0,
        weather: 0,
      },
    );
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") {
      return notifications;
    }
    return notifications.filter((item) => item.category === activeFilter);
  }, [activeFilter, notifications]);

  const visibleNotifications = useMemo(
    () => filteredNotifications.slice(0, visibleCount),
    [filteredNotifications, visibleCount],
  );

  const groupedNotifications = useMemo(
    () => groupNotifications(visibleNotifications),
    [visibleNotifications],
  );

  if (!session) {
    return null;
  }

  const unreadCount = unreadNotificationCount(notifications);

  const handleToggleRead = (notificationId: string, nextRead: boolean) => {
    markNotificationReadState(session, notificationId, nextRead);
    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, read: nextRead } : item)),
    );
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead(
      session,
      notifications.filter((item) => !item.read).map((item) => item.id),
    );
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const allFilters: Array<{ key: NotificationCategory | "all"; label: string; count: number }> = [
    { key: "all", label: "All", count: notifications.length },
    { key: "trade", label: "Trade", count: countsByFilter.trade },
    { key: "finance", label: "Finance", count: countsByFilter.finance },
    { key: "weather", label: "Weather", count: countsByFilter.weather },
    { key: "advisory", label: "Advisory", count: countsByFilter.advisory },
    { key: "system", label: "System", count: countsByFilter.system },
  ];

  return (
    <div className="r3-page-stack" role="main" aria-label="Notifications">
      <SurfaceCard className="r3-hero-card">
        <SectionHeading
          eyebrow="Notification center"
          title="Trade, finance, weather, advisory, and system updates"
          body="Each item is anchored to live marketplace, wallet, climate, advisory, or consent state. Category preferences are applied before the feed is rendered."
          actions={
            <div className="pill-row">
              <StatusPill tone={unreadCount > 0 ? "degraded" : "online"}>{unreadCount} unread</StatusPill>
              <StatusPill tone="neutral">{enabledCategoryCount} categories enabled</StatusPill>
            </div>
          }
        />
        <div className="r3-action-row">
          <button
            className="button-primary"
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
            type="button"
          >
            Mark All Read
          </button>
          <Link className="button-secondary" href="/app/settings">
            Manage Preferences
          </Link>
          <Link className="button-ghost" href="/app/profile">
            Review Profile
          </Link>
        </div>
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeading
          eyebrow="Filter"
          title="Focus the feed by workflow"
          body="Muted categories are removed from the feed and badge count until they are re-enabled in settings."
        />
        <div className="r3-filter-row" role="tablist" aria-label="Notification categories">
          {allFilters.map((filter) => (
            <button
              aria-selected={activeFilter === filter.key}
              className={`r3-filter-chip${activeFilter === filter.key ? " is-active" : ""}`}
              key={filter.key}
              onClick={() => {
                setActiveFilter(filter.key);
                setVisibleCount(PAGE_SIZE);
              }}
              role="tab"
              type="button"
            >
              <span>{filter.label}</span>
              <strong>{filter.count}</strong>
            </button>
          ))}
        </div>
      </SurfaceCard>

      {isLoading ? (
        <SurfaceCard>
          <p className="muted">Loading live notifications...</p>
        </SurfaceCard>
      ) : null}

      {!isLoading && filteredNotifications.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            title={
              enabledCategoryCount === 0
                ? "All categories are muted"
                : activeFilter === "finance" && session.actor.role === "investor"
                  ? "No wallet or fund notifications yet"
                  : "No notifications match this filter"
            }
            body={
              enabledCategoryCount === 0
                ? "Re-enable at least one notification category in settings to repopulate this feed."
                : activeFilter === "finance" && session.actor.role === "investor"
                  ? "AgroFund updates will appear here when new marketplace-backed opportunities or wallet-linked portfolio changes are available."
                : "The selected category has no active updates from the current runtime."
            }
            actions={
              <Link className="button-primary" href={activeFilter === "finance" && session.actor.role === "investor" ? "/app/fund" : "/app/settings"}>
                {activeFilter === "finance" && session.actor.role === "investor" ? "Open AgroFund" : "Open Settings"}
              </Link>
            }
          />
        </SurfaceCard>
      ) : null}

      {groupedNotifications.map((group) => (
        <section className="r3-page-stack" key={group.label} aria-label={group.label}>
          <div className="r3-group-label">{group.label}</div>
          <div className="r3-list-stack">
            {group.items.map((item) => (
              <SurfaceCard className={`r3-list-card${item.read ? " is-read" : ""}`} key={item.id}>
                <div className="r3-notification-meta">
                  <div className="pill-row">
                    <StatusPill tone={CATEGORY_META[item.category].tone}>{CATEGORY_META[item.category].label}</StatusPill>
                    {!item.read ? <span className="r3-unread-dot" aria-hidden="true" /> : null}
                  </div>
                  <span className="r3-time-note">{formatTimestamp(item.createdAt)}</span>
                </div>
                <div className="stack-sm">
                  <strong>{item.title}</strong>
                  <p className="muted">{item.body}</p>
                </div>
                <div className="r3-notification-actions">
                  {item.actionLabel ? (
                    <Link className="button-ghost" href={item.href}>
                      {item.actionLabel}
                    </Link>
                  ) : null}
                  <button
                    className="button-secondary"
                    onClick={() => handleToggleRead(item.id, !item.read)}
                    type="button"
                  >
                    Mark as {item.read ? "Unread" : "Read"}
                  </button>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </section>
      ))}

      {filteredNotifications.length > visibleNotifications.length ? (
        <div className="r3-form-actions">
          <button
            className="button-secondary"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            type="button"
          >
            Load More
          </button>
        </div>
      ) : null}
    </div>
  );
}
