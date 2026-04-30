import type { IdentitySession, ListingRecord, NotificationFeedItem } from "@agrodomain/contracts";

import { advisoryApi } from "@/lib/api/advisory";
import { climateApi } from "@/lib/api/climate";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import {
  readUserPreferences,
  type NotificationCategory,
} from "@/lib/user-preferences";
import type { ClimateAlert } from "@/lib/api-types";
import type { EscrowReadModel } from "@/features/wallet/model";
import {
  buildSettlementNotification,
  buildTradeNotification,
  compareNotifications,
  createNotificationItem,
} from "@/features/notifications/seam";

type AdvisoryItem = Awaited<
  ReturnType<typeof advisoryApi.listConversations>
>["data"]["items"][number];

export type FeedNotification = NotificationFeedItem & {
  category: NotificationCategory;
};

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function relativeDayLabel(createdAt: string, now = new Date()): string {
  const created = new Date(createdAt);
  const diff = startOfDay(now).getTime() - startOfDay(created).getTime();
  if (diff <= 0) {
    return "TODAY";
  }
  if (diff <= 86_400_000) {
    return "YESTERDAY";
  }
  return created
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

function buildTradeNotifications(
  session: IdentitySession,
  threads: Awaited<
    ReturnType<typeof marketplaceApi.listNegotiations>
  >["data"]["items"],
  listings: ListingRecord[],
): FeedNotification[] {
  const preferences = readUserPreferences(session);
  const listingsById = new Map(
    listings.map((item) => [item.listing_id, item] as const),
  );

  return threads.slice(0, 8).map((thread) =>
    buildTradeNotification({
      actorId: session.actor.actor_id,
      listingsById,
      preferences,
      thread,
    }),
  );
}

function buildFinanceNotifications(
  session: IdentitySession,
  escrows: EscrowReadModel[],
  listings: ListingRecord[],
): FeedNotification[] {
  const preferences = readUserPreferences(session);
  const listingsById = new Map(
    listings.map((item) => [item.listing_id, item] as const),
  );
  const settlementNotifications = escrows.slice(0, 6).map((escrow) =>
    buildSettlementNotification({
      actorId: session.actor.actor_id,
      escrow,
      listingTitle: listingsById.get(escrow.listing_id)?.title ?? null,
      preferences,
    }),
  );

  if (session.actor.role !== "investor") {
    return settlementNotifications;
  }

  const opportunityNotifications = listings
    .filter((listing) => listing.status === "published")
    .slice(0, 2)
    .map((listing) =>
      createNotificationItem({
        action: {
          label: "Review opportunity",
          href: `/app/fund?listing=${listing.listing_id}`,
        },
        body: `${listing.title} is available for review in AgroFund using the current marketplace record.`,
        category: "finance",
        createdAt: listing.updated_at,
        lifecycleState: "info",
        listingId: listing.listing_id,
        module: "wallet",
        nextActionCopy: "Review the listing from AgroFund before funding a related opportunity.",
        notificationId: `finance:fund:${listing.listing_id}`,
        payload: {
          listing_id: listing.listing_id,
          settlement_state: listing.status,
        },
        preferences,
        read: false,
        templateKey: "wallet.investor_opportunity",
        title: `Funding window open for ${listing.commodity}`,
        urgency: "routine",
      }),
    );

  return [...settlementNotifications, ...opportunityNotifications];
}

function buildWeatherNotifications(
  session: IdentitySession,
  alerts: ClimateAlert[],
): FeedNotification[] {
  const preferences = readUserPreferences(session);
  return alerts.slice(0, 8).map((alert) =>
    createNotificationItem({
      action: {
        label: "Check weather",
        href: "/app/weather",
      },
      body: alert.summary,
      category: "weather",
      createdAt: alert.created_at,
      lifecycleState: alert.acknowledged ? "resolved" : "pending",
      module: "climate",
      nextActionCopy: alert.acknowledged
        ? null
        : "Review the alert and confirm the next farm action while the weather window is active.",
      notificationId: `weather:${alert.alert_id}`,
      payload: {
        alert_id: alert.alert_id,
      },
      preferences,
      read: alert.acknowledged,
      readAt: alert.acknowledged ? alert.created_at : null,
      templateKey: "climate.alert",
      title: alert.title,
      urgency: alert.acknowledged ? "routine" : "attention",
    }),
  );
}

function buildAdvisoryNotifications(
  session: IdentitySession,
  items: AdvisoryItem[],
): FeedNotification[] {
  const preferences = readUserPreferences(session);
  const isAdvisor =
    session.actor.role === "advisor" ||
    session.actor.role === "extension_agent";

  return items.slice(0, 8).map((item) =>
    createNotificationItem({
      action: {
        label: isAdvisor ? "View request" : "View tip",
        href: isAdvisor ? "/app/advisor/requests" : "/app/advisory/new",
      },
      body: item.response_text,
      category: "advisory",
      createdAt: item.delivered_at ?? item.created_at,
      lifecycleState: item.status === "delivered" ? "resolved" : "pending",
      module: "advisory",
      nextActionCopy: isAdvisor
        ? "Review the request and confirm whether further follow-up is needed."
        : "Open the advisory workspace for the full recommendation and sources.",
      notificationId: `advisory:${item.advisory_request_id}`,
      payload: {
        advisory_request_id: item.advisory_request_id,
      },
      preferences,
      read: item.status === "delivered",
      readAt:
        item.status === "delivered"
          ? item.delivered_at ?? item.created_at
          : null,
      templateKey: "advisory.response",
      title: item.topic,
      urgency: item.status === "delivered" ? "routine" : "attention",
    }),
  );
}

function buildSystemNotifications(
  session: IdentitySession,
  queueDepth: number,
): FeedNotification[] {
  const preferences = readUserPreferences(session);
  const items: FeedNotification[] = [
    createNotificationItem({
      action: {
        label: "Review profile",
        href: "/app/profile",
      },
      body:
        session.consent.state === "consent_granted"
          ? "Protected actions remain available for your current workspace."
          : "Review consent to restore protected actions across the platform.",
      category: "system",
      createdAt: session.consent.captured_at ?? new Date().toISOString(),
      lifecycleState:
        session.consent.state === "consent_granted" ? "resolved" : "blocked",
      module: "identity",
      nextActionCopy:
        session.consent.state === "consent_granted"
          ? null
          : "Complete consent review before continuing with protected actions.",
      notificationId: "system:consent",
      payload: {
        consent_state: session.consent.state,
      },
      preferences,
      read: session.consent.state === "consent_granted",
      readAt:
        session.consent.state === "consent_granted"
          ? session.consent.captured_at
          : null,
      templateKey: "identity.consent_state",
      title:
        session.consent.state === "consent_granted"
          ? "Consent is active"
          : "Consent needs review",
      urgency:
        session.consent.state === "consent_granted"
          ? "routine"
          : "attention",
    }),
  ];

  if (queueDepth > 0) {
    items.push(
      createNotificationItem({
        action: {
          label: "Open outbox",
          href: "/app/offline/outbox",
        },
        body: `${queueDepth} queued item${
          queueDepth === 1 ? "" : "s"
        } still need attention or replay.`,
        category: "system",
        createdAt: new Date().toISOString(),
        lifecycleState: "pending",
        module: "system",
        nextActionCopy:
          "Review the outbox and replay blocked changes when connectivity is stable.",
        notificationId: "system:queue",
        payload: {
          queue_depth: queueDepth,
        },
        preferences,
        read: false,
        templateKey: "system.queue_depth",
        title: "Saved work is waiting to sync",
        urgency: queueDepth > 3 ? "urgent" : "attention",
      }),
    );
  }

  return items;
}

export function applyReadState(
  session: IdentitySession,
  notifications: FeedNotification[],
): FeedNotification[] {
  const preferences = readUserPreferences(session);
  const readIds = new Set(preferences.notifications.readIds);
  return notifications.map((item) =>
    item.read || !readIds.has(item.notification_id)
      ? item
      : {
          ...item,
          read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        },
  );
}

export function groupNotifications(notifications: FeedNotification[]): Array<{
  label: string;
  items: FeedNotification[];
}> {
  const groups = new Map<string, FeedNotification[]>();
  for (const item of notifications) {
    const label = relativeDayLabel(item.created_at);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items: items.sort(compareNotifications),
  }));
}

export async function loadNotificationFeed(params: {
  session: IdentitySession;
  traceId: string;
  queueDepth: number;
}): Promise<FeedNotification[]> {
  const preferences = readUserPreferences(params.session);
  const enabledCategories = new Set(
    Object.entries(preferences.notifications.categories)
      .filter(([, enabled]) => enabled)
      .map(([category]) => category as NotificationCategory),
  );
  const [
    listingsResponse,
    negotiationsResponse,
    escrowsResponse,
    climateResponse,
    advisoryResponse,
  ] = await Promise.all([
    marketplaceApi.listListings(params.traceId),
    marketplaceApi.listNegotiations(params.traceId),
    walletApi.listEscrows(params.traceId),
    climateApi.listRuntime(params.traceId, params.session.actor.locale),
    advisoryApi.listConversations(params.traceId, params.session.actor.locale),
  ]);

  const notifications = [
    ...buildTradeNotifications(
      params.session,
      negotiationsResponse.data.items,
      listingsResponse.data.items,
    ),
    ...buildFinanceNotifications(
      params.session,
      escrowsResponse.data.items,
      listingsResponse.data.items,
    ),
    ...buildWeatherNotifications(params.session, climateResponse.data.alerts),
    ...buildAdvisoryNotifications(params.session, advisoryResponse.data.items),
    ...buildSystemNotifications(params.session, params.queueDepth),
  ].filter((item) => enabledCategories.has(item.category));

  return applyReadState(
    params.session,
    notifications.sort(compareNotifications),
  );
}

export function unreadNotificationCount(
  notifications: FeedNotification[],
): number {
  return notifications.filter((item) => !item.read).length;
}
