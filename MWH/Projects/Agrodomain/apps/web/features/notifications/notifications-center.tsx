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
  notificationDueLabel,
  notificationTone,
  notificationUrgencyLabel,
} from "@/features/notifications/seam";
import { formatDateTime } from "@/lib/i18n/format";
import { recordMarketplaceConversion } from "@/lib/telemetry/marketplace";
import {
  markAllNotificationsRead,
  markNotificationReadState,
  readUserPreferences,
  type NotificationCategory,
} from "@/lib/user-preferences";

const PAGE_SIZE = 8;

const CATEGORY_META: Record<NotificationCategory, { label: string }> = {
  advisory: { label: "Guidance" },
  copilot: { label: "Help" },
  finance: { label: "Payments" },
  system: { label: "Account" },
  trade: { label: "Trade" },
  transport: { label: "Transport" },
  weather: { label: "Weather" },
};

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

        const marketplaceSignals = nextNotifications.filter(
          (item) => item.module === "marketplace" || item.module === "wallet",
        );
        if (marketplaceSignals.length > 0) {
          recordMarketplaceConversion({
            actorId: session.actor.actor_id,
            actorRole: session.actor.role,
            countryCode: session.actor.country_code,
            notificationCount: marketplaceSignals.length,
            outcome: "completed",
            queueDepth: queue.items.length,
            sourceSurface: "notifications_center",
            stage: "notification_impression",
            traceId,
            urgency:
              marketplaceSignals.some((item) => item.urgency === "critical")
                ? "critical"
                : marketplaceSignals.some((item) => item.urgency === "urgent")
                  ? "urgent"
                  : marketplaceSignals.some((item) => item.urgency === "attention")
                    ? "attention"
                    : "routine",
          });
        }
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
        copilot: 0,
        finance: 0,
        system: 0,
        trade: 0,
        transport: 0,
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
      current.map((item) =>
        item.notification_id === notificationId
          ? {
              ...item,
              read: nextRead,
              read_at: nextRead ? item.read_at ?? new Date().toISOString() : null,
            }
          : item,
      ),
    );
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead(
      session,
      notifications.filter((item) => !item.read).map((item) => item.notification_id),
    );
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
    );
  };

  const allFilters: Array<{ key: NotificationCategory | "all"; label: string; count: number }> = [
    { key: "all", label: "All", count: notifications.length },
    { key: "trade", label: "Trade", count: countsByFilter.trade },
    { key: "finance", label: "Payments", count: countsByFilter.finance },
    { key: "weather", label: "Weather", count: countsByFilter.weather },
    { key: "advisory", label: "Guidance", count: countsByFilter.advisory },
    { key: "copilot", label: "Help", count: countsByFilter.copilot },
    { key: "transport", label: "Transport", count: countsByFilter.transport },
    { key: "system", label: "Account", count: countsByFilter.system },
  ];

  return (
    <div className="r3-page-stack" role="main" aria-label="Notifications">
      <SurfaceCard className="r3-hero-card">
        <SectionHeading
          eyebrow="Notifications"
          title="See the updates that matter most right now"
          body="Track changes across trading, payments, transport, weather, and guidance from one feed."
          actions={
            <div className="pill-row">
              <StatusPill tone={unreadCount > 0 ? "degraded" : "online"}>{unreadCount} unread</StatusPill>
              <StatusPill tone="neutral">{enabledCategoryCount} views on</StatusPill>
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
            Mark all read
          </button>
          <Link className="button-secondary" href="/app/settings">
            Manage alerts
          </Link>
          <Link className="button-ghost" href="/app/profile">
            Review profile
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
          title="Latest updates"
          body="Choose the part of the business you want to follow most closely."
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
          <p className="muted">Loading recent updates...</p>
        </SurfaceCard>
      ) : null}

      {!isLoading && filteredNotifications.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            title={
              enabledCategoryCount === 0
                ? "No updates in this view right now"
                : activeFilter === "finance" && session.actor.role === "investor"
                  ? "No payment or portfolio updates yet"
                  : "No updates in this view right now"
            }
            body={
              enabledCategoryCount === 0
                ? "Turn on at least one update type in settings to repopulate this feed."
                : activeFilter === "finance" && session.actor.role === "investor"
                  ? "Portfolio and payment updates will appear here when something changes."
                : "When something changes here, it will appear in this feed."
            }
            actions={
              <Link className="button-primary" href={activeFilter === "finance" && session.actor.role === "investor" ? "/app/fund" : "/app/settings"}>
                {activeFilter === "finance" && session.actor.role === "investor" ? "Open portfolio" : "Open settings"}
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
              <SurfaceCard
                className={`r3-list-card${item.read ? " is-read" : ""}`}
                key={item.notification_id}
              >
                <div className="r3-notification-meta">
                  <div className="pill-row">
                    <StatusPill tone={notificationTone(item)}>
                      {CATEGORY_META[item.category].label}
                    </StatusPill>
                    <StatusPill tone={notificationTone(item)}>
                      {notificationUrgencyLabel(item.urgency)}
                    </StatusPill>
                    {!item.read ? <span className="r3-unread-dot" aria-hidden="true" /> : null}
                  </div>
                  <span className="r3-time-note">
                    {formatDateTime(item.created_at, {
                      locale: readUserPreferences(session).display.locale,
                    })}
                  </span>
                </div>
                <div className="stack-sm">
                  <strong>{item.title}</strong>
                  <p className="muted">{item.body}</p>
                  {item.next_action_copy ? (
                    <p className="muted">{item.next_action_copy}</p>
                  ) : null}
                  {notificationDueLabel(item) ? (
                    <p className="muted">{notificationDueLabel(item)}</p>
                  ) : null}
                </div>
                <div className="r3-notification-actions">
                  {item.action ? (
                    <Link
                      className="button-ghost"
                      href={item.action.href}
                      onClick={() =>
                        recordMarketplaceConversion({
                          actorId: session.actor.actor_id,
                          actorRole: session.actor.role,
                          countryCode: session.actor.country_code,
                          escrowId: item.escrow_id,
                          listingId: item.listing_id,
                          notificationCount: notifications.length,
                          outcome: "completed",
                          sourceSurface: "notifications_center",
                          stage: "notification_action",
                          threadId: item.thread_id,
                          traceId,
                          urgency: item.urgency,
                        })
                      }
                    >
                      {item.action.label}
                    </Link>
                  ) : null}
                  <button
                    className="button-secondary"
                    onClick={() =>
                      handleToggleRead(item.notification_id, !item.read)
                    }
                    type="button"
                  >
                    Mark as {item.read ? "unread" : "read"}
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
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
