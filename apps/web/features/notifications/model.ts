import type {
  IdentitySession,
  ListingRecord,
  NegotiationThreadRead,
} from "@agrodomain/contracts";

import { advisoryApi } from "@/lib/api/advisory";
import { climateApi } from "@/lib/api/climate";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import { readUserPreferences, type NotificationCategory } from "@/lib/user-preferences";
import type { ClimateAlert } from "@/lib/api-types";
import type { EscrowReadModel } from "@/features/wallet/model";

type AdvisoryItem = Awaited<ReturnType<typeof advisoryApi.listConversations>>["data"]["items"][number];

export interface FeedNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  actionLabel: string | null;
  href: string;
  createdAt: string;
  read: boolean;
}

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
  return created.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).toUpperCase();
}

function buildTradeNotifications(
  threads: NegotiationThreadRead[],
  listings: ListingRecord[],
): FeedNotification[] {
  const listingTitles = new Map(listings.map((item) => [item.listing_id, item.title]));
  return threads.slice(0, 8).map((thread) => ({
    id: `trade:${thread.thread_id}`,
    category: "trade" as const,
    title: `Negotiation update for ${listingTitles.get(thread.listing_id) ?? thread.listing_id}`,
    body: `Thread is ${thread.status.replaceAll("_", " ")} with ${thread.messages.length} recorded message${thread.messages.length === 1 ? "" : "s"}.`,
    actionLabel: "Open Inbox",
    href: `/app/market/negotiations?threadId=${thread.thread_id}`,
    createdAt: thread.updated_at ?? thread.created_at,
    read: false,
  }));
}

function buildFinanceNotifications(
  escrows: EscrowReadModel[],
  listings: ListingRecord[],
  role: IdentitySession["actor"]["role"],
): FeedNotification[] {
  const settlementNotifications = escrows.slice(0, 6).map((escrow) => ({
    id: `finance:${escrow.escrow_id}`,
    category: "finance" as const,
    title: `Settlement ${escrow.state.replaceAll("_", " ")}`,
    body: `Listing ${escrow.listing_id} is holding ${escrow.amount} ${escrow.currency}.`,
    actionLabel: "View Wallet",
    href: `/app/payments/wallet?escrow=${escrow.escrow_id}`,
    createdAt: escrow.updated_at,
    read: false,
  }));

  if (role !== "investor") {
    return settlementNotifications;
  }

  const opportunityNotifications = listings
    .filter((listing) => listing.status === "published")
    .slice(0, 2)
    .map((listing) => ({
      id: `finance:fund:${listing.listing_id}`,
      category: "finance" as const,
      title: `Funding window open for ${listing.commodity}`,
      body: `${listing.title} is available for review in AgroFund using the current marketplace record.`,
      actionLabel: "Review Opportunity",
      href: `/app/fund?listing=${listing.listing_id}`,
      createdAt: listing.updated_at,
      read: false,
    }));

  return [...settlementNotifications, ...opportunityNotifications];
}

function buildWeatherNotifications(alerts: ClimateAlert[]): FeedNotification[] {
  return alerts.slice(0, 8).map((alert) => ({
    id: `weather:${alert.alert_id}`,
    category: "weather" as const,
    title: alert.title,
    body: alert.summary,
    actionLabel: "Check Weather",
    href: "/app/weather",
    createdAt: alert.created_at,
    read: alert.acknowledged,
  }));
}

function buildAdvisoryNotifications(items: AdvisoryItem[], role: string): FeedNotification[] {
  return items.slice(0, 8).map((item) => ({
    id: `advisory:${item.advisory_request_id}`,
    category: "advisory" as const,
    title: item.topic,
    body: item.response_text,
    actionLabel: role === "advisor" || role === "extension_agent" ? "View Request" : "View Tip",
    href: role === "advisor" || role === "extension_agent" ? "/app/advisor/requests" : "/app/advisory/new",
    createdAt: item.delivered_at ?? item.created_at,
    read: item.status === "delivered",
  }));
}

function buildSystemNotifications(
  session: IdentitySession,
  queueDepth: number,
): FeedNotification[] {
  const items: FeedNotification[] = [
    {
      id: "system:consent",
      category: "system",
      title: session.consent.state === "consent_granted" ? "Consent is active" : "Consent needs review",
      body:
        session.consent.state === "consent_granted"
          ? "Protected actions remain available for your current workspace."
          : "Review consent to restore protected actions across the platform.",
      actionLabel: "Review Profile",
      href: "/app/profile",
      createdAt: session.consent.captured_at ?? new Date().toISOString(),
      read: session.consent.state === "consent_granted",
    },
  ];

  if (queueDepth > 0) {
    items.push({
      id: "system:queue",
      category: "system",
      title: "Saved work is waiting to sync",
      body: `${queueDepth} queued item${queueDepth === 1 ? "" : "s"} still need attention or replay.`,
      actionLabel: "Open Outbox",
      href: "/app/offline/outbox",
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  return items;
}

export function applyReadState(
  session: IdentitySession,
  notifications: FeedNotification[],
): FeedNotification[] {
  const preferences = readUserPreferences(session);
  const readIds = new Set(preferences.notifications.readIds);
  return notifications.map((item) => ({
    ...item,
    read: item.read || readIds.has(item.id),
  }));
}

export function groupNotifications(notifications: FeedNotification[]): Array<{
  label: string;
  items: FeedNotification[];
}> {
  const groups = new Map<string, FeedNotification[]>();
  for (const item of notifications) {
    const label = relativeDayLabel(item.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items: items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
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
  const [listingsResponse, negotiationsResponse, escrowsResponse, climateResponse, advisoryResponse] =
    await Promise.all([
      marketplaceApi.listListings(params.traceId),
      marketplaceApi.listNegotiations(params.traceId),
      walletApi.listEscrows(params.traceId),
      climateApi.listRuntime(params.traceId, params.session.actor.locale),
      advisoryApi.listConversations(params.traceId, params.session.actor.locale),
    ]);

  const notifications = [
    ...buildTradeNotifications(negotiationsResponse.data.items, listingsResponse.data.items),
    ...buildFinanceNotifications(escrowsResponse.data.items, listingsResponse.data.items, params.session.actor.role),
    ...buildWeatherNotifications(climateResponse.data.alerts),
    ...buildAdvisoryNotifications(advisoryResponse.data.items, params.session.actor.role),
    ...buildSystemNotifications(params.session, params.queueDepth),
  ].filter((item) => enabledCategories.has(item.category));

  return applyReadState(
    params.session,
    notifications.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
  );
}

export function unreadNotificationCount(notifications: FeedNotification[]): number {
  return notifications.filter((item) => !item.read).length;
}
