import {
  schemaVersion,
  type ListingRecord,
  type NegotiationThreadRead,
  type NotificationAction,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationDispatchPlan,
  type NotificationFeedItem,
  type NotificationLifecycleState,
  type NotificationModule,
  type NotificationUrgency,
} from "@agrodomain/contracts";

import type { EscrowReadModel } from "@/features/wallet/model";
import type { UserPreferences } from "@/lib/user-preferences";

const HOUR_MS = 3_600_000;

function addHours(timestamp: string, hours: number): string {
  return new Date(new Date(timestamp).getTime() + hours * HOUR_MS).toISOString();
}

function hoursUntil(targetAt: string, now = new Date()): number {
  return (new Date(targetAt).getTime() - now.getTime()) / HOUR_MS;
}

function responseUrgency(
  targetAt: string,
  now = new Date(),
): NotificationUrgency {
  const remainingHours = hoursUntil(targetAt, now);
  if (remainingHours <= -12) {
    return "critical";
  }
  if (remainingHours <= 0) {
    return "urgent";
  }
  if (remainingHours <= 6) {
    return "attention";
  }
  return "routine";
}

function enabledChannels(
  preferences: UserPreferences,
): NotificationChannel[] {
  const channels: NotificationChannel[] = ["in_app"];
  if (preferences.notifications.push) {
    channels.push("push");
  }
  if (preferences.notifications.email) {
    channels.push("email");
  }
  if (preferences.notifications.whatsapp) {
    channels.push("whatsapp");
  }
  if (preferences.notifications.sms) {
    channels.push("sms");
  }
  return channels;
}

function fallbackChannels(
  preferred: NotificationChannel[],
): NotificationChannel[] {
  return preferred.filter((channel) => channel !== "in_app");
}

type CreateNotificationItemParams = {
  action: NotificationAction | null;
  body: string;
  category: NotificationCategory;
  createdAt: string;
  escrowId?: string | null;
  expiresAt?: string | null;
  lifecycleState: NotificationLifecycleState;
  listingId?: string | null;
  module: NotificationModule;
  nextActionCopy?: string | null;
  notificationId: string;
  payload: Record<string, string | number | boolean | null>;
  preferences: UserPreferences;
  queueState?: NotificationDispatchPlan["queue_state"];
  read: boolean;
  readAt?: string | null;
  templateKey: string;
  threadId?: string | null;
  title: string;
  urgency: NotificationUrgency;
};

export function createNotificationItem(
  params: CreateNotificationItemParams,
): NotificationFeedItem {
  const preferredChannels = enabledChannels(params.preferences);
  const expiresAt = params.expiresAt ?? null;

  return {
    schema_version: schemaVersion,
    notification_id: params.notificationId,
    module: params.module,
    category: params.category,
    lifecycle_state: params.lifecycleState,
    urgency: params.urgency,
    title: params.title,
    body: params.body,
    created_at: params.createdAt,
    read: params.read,
    read_at: params.readAt ?? null,
    expires_at: expiresAt,
    next_action_copy: params.nextActionCopy ?? null,
    listing_id: params.listingId ?? null,
    thread_id: params.threadId ?? null,
    escrow_id: params.escrowId ?? null,
    action: params.action,
    dispatch_plan: {
      schema_version: schemaVersion,
      notification_id: params.notificationId,
      template_key: params.templateKey,
      dedupe_key: params.notificationId,
      queue_state: params.queueState ?? "dispatched",
      preferred_channels: preferredChannels,
      fallback_channels: fallbackChannels(preferredChannels),
      expires_at: expiresAt,
      escalate_after:
        params.urgency === "urgent" || params.urgency === "critical"
          ? params.createdAt
          : null,
      payload: params.payload,
    },
  };
}

export function notificationUrgencyRank(
  urgency: NotificationUrgency,
): number {
  switch (urgency) {
    case "critical":
      return 4;
    case "urgent":
      return 3;
    case "attention":
      return 2;
    default:
      return 1;
  }
}

export function notificationTone(
  item: Pick<NotificationFeedItem, "lifecycle_state" | "urgency">,
): "online" | "offline" | "degraded" | "neutral" {
  if (item.lifecycle_state === "resolved") {
    return "online";
  }
  if (item.lifecycle_state === "blocked") {
    return item.urgency === "critical" ? "offline" : "degraded";
  }
  if (item.urgency === "urgent" || item.urgency === "attention") {
    return "degraded";
  }
  return "neutral";
}

export function notificationUrgencyLabel(
  urgency: NotificationUrgency,
): string {
  switch (urgency) {
    case "critical":
      return "Critical";
    case "urgent":
      return "Urgent";
    case "attention":
      return "Attention";
    default:
      return "Routine";
  }
}

export function notificationDueLabel(
  item: Pick<NotificationFeedItem, "expires_at" | "urgency">,
  now = new Date(),
): string | null {
  if (!item.expires_at) {
    return null;
  }

  const remainingHours = hoursUntil(item.expires_at, now);
  if (remainingHours <= 0) {
    return item.urgency === "critical" ? "Escalate now" : "Past due";
  }
  if (remainingHours < 1) {
    return "Due within 1 hour";
  }
  if (remainingHours < 24) {
    return `Due within ${Math.ceil(remainingHours)} hours`;
  }
  return `Due within ${Math.ceil(remainingHours / 24)} days`;
}

export function compareNotifications(
  left: NotificationFeedItem,
  right: NotificationFeedItem,
): number {
  const urgencyDelta =
    notificationUrgencyRank(right.urgency) -
    notificationUrgencyRank(left.urgency);
  if (urgencyDelta !== 0) {
    return urgencyDelta;
  }
  return (
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function listingLabel(
  listingsById: Map<string, ListingRecord>,
  listingId: string,
): string {
  return listingsById.get(listingId)?.title ?? listingId;
}

export function buildTradeNotification(params: {
  actorId: string;
  listingsById: Map<string, ListingRecord>;
  preferences: UserPreferences;
  thread: NegotiationThreadRead;
  now?: Date;
}): NotificationFeedItem {
  const now = params.now ?? new Date();
  const title = listingLabel(params.listingsById, params.thread.listing_id);

  if (
    params.thread.status === "pending_confirmation" &&
    params.thread.confirmation_checkpoint
  ) {
    const targetAt = addHours(
      params.thread.confirmation_checkpoint.requested_at,
      24,
    );
    const requiredActorId =
      params.thread.confirmation_checkpoint.required_confirmer_actor_id;
    const actorOwnsDecision = requiredActorId === params.actorId;
    const urgency = responseUrgency(targetAt, now);

    return createNotificationItem({
      action: {
        label: actorOwnsDecision ? "Review confirmation" : "Open thread",
        href: `/app/market/negotiations?threadId=${params.thread.thread_id}`,
      },
      body: actorOwnsDecision
        ? `The current terms on ${title} are waiting for your decision before the confirmation window closes.`
        : `The current terms on ${title} are waiting on ${requiredActorId.replaceAll("_", " ")} before the deal can move forward.`,
      category: "trade",
      createdAt:
        params.thread.confirmation_checkpoint.requested_at ??
        params.thread.updated_at,
      expiresAt: targetAt,
      lifecycleState: "pending",
      listingId: params.thread.listing_id,
      module: "marketplace",
      nextActionCopy: actorOwnsDecision
        ? "Approve or reject the current terms to unblock escrow."
        : "Follow up with the required confirmer if the response window expires.",
      notificationId: `trade:${params.thread.thread_id}:confirmation`,
      payload: {
        listing_id: params.thread.listing_id,
        thread_id: params.thread.thread_id,
      },
      preferences: params.preferences,
      read: false,
      templateKey: "marketplace.confirmation_due",
      threadId: params.thread.thread_id,
      title: actorOwnsDecision
        ? `Confirmation due for ${title}`
        : `Waiting for confirmation on ${title}`,
      urgency,
    });
  }

  if (params.thread.status === "accepted") {
    const targetAt = addHours(params.thread.updated_at, 24);
    return createNotificationItem({
      action: {
        label: "Open settlement",
        href: `/app/market/negotiations?threadId=${params.thread.thread_id}`,
      },
      body: `The negotiation on ${title} is accepted. Move it into escrow before the settlement handoff window expires.`,
      category: "trade",
      createdAt: params.thread.updated_at,
      expiresAt: targetAt,
      lifecycleState: "pending",
      listingId: params.thread.listing_id,
      module: "marketplace",
      nextActionCopy: "Create escrow so funding and release status become visible to both sides.",
      notificationId: `trade:${params.thread.thread_id}:accepted`,
      payload: {
        listing_id: params.thread.listing_id,
        thread_id: params.thread.thread_id,
      },
      preferences: params.preferences,
      read: false,
      templateKey: "marketplace.accepted_awaiting_escrow",
      threadId: params.thread.thread_id,
      title: `Accepted deal needs escrow for ${title}`,
      urgency: responseUrgency(targetAt, now),
    });
  }

  const targetAt = addHours(params.thread.last_action_at, 48);
  const actorOwnsNextResponse = params.thread.seller_actor_id === params.actorId;
  const urgency = responseUrgency(targetAt, now);
  const isOverdue = hoursUntil(targetAt, now) <= 0;

  return createNotificationItem({
    action: {
      label: "Open negotiation",
      href: `/app/market/negotiations?threadId=${params.thread.thread_id}`,
    },
    body: actorOwnsNextResponse
      ? `A buyer offer on ${title} is waiting for your response. The current offer is ${params.thread.current_offer_amount} ${params.thread.current_offer_currency}.`
      : `Your latest activity on ${title} is waiting on the counterparty. Keep the thread moving before it goes stale.`,
    category: "trade",
    createdAt: params.thread.last_action_at,
    expiresAt: targetAt,
    lifecycleState: "pending",
    listingId: params.thread.listing_id,
    module: "marketplace",
    nextActionCopy: actorOwnsNextResponse
      ? "Counter, confirm, or close the negotiation from the thread."
      : "Review the thread and follow up if the seller response window has expired.",
    notificationId: `trade:${params.thread.thread_id}:response`,
    payload: {
      listing_id: params.thread.listing_id,
      thread_id: params.thread.thread_id,
    },
    preferences: params.preferences,
    read: false,
    templateKey: "marketplace.response_window",
    threadId: params.thread.thread_id,
    title: actorOwnsNextResponse
      ? `${isOverdue ? "Response overdue" : "Response window aging"} for ${title}`
      : `${isOverdue ? "Counterparty response overdue" : "Waiting on response"} for ${title}`,
    urgency,
  });
}

function latestNotificationState(escrow: EscrowReadModel) {
  return [...escrow.timeline].reverse().find((entry) => entry.notification)
    ?.notification;
}

export function buildSettlementNotification(params: {
  actorId: string;
  listingTitle?: string | null;
  preferences: UserPreferences;
  escrow: EscrowReadModel;
  now?: Date;
}): NotificationFeedItem {
  const now = params.now ?? new Date();
  const title = params.listingTitle ?? params.escrow.listing_id;
  const latestDelivery = latestNotificationState(params.escrow);
  const isSeller = params.actorId === params.escrow.seller_actor_id;

  if (params.escrow.state === "disputed") {
    return createNotificationItem({
      action: {
        label: "Review dispute",
        href: `/app/payments/wallet?escrow=${params.escrow.escrow_id}`,
      },
      body: `The settlement for ${title} is under dispute, so funds stay on hold until the issue is resolved.`,
      category: "finance",
      createdAt: params.escrow.updated_at,
      lifecycleState: "blocked",
      listingId: params.escrow.listing_id,
      module: "wallet",
      nextActionCopy: "Review the latest proof and decide whether to resolve or reverse the escrow.",
      notificationId: `finance:${params.escrow.escrow_id}:disputed`,
      payload: {
        delivery_state: latestDelivery?.delivery_state ?? null,
        escrow_id: params.escrow.escrow_id,
        listing_id: params.escrow.listing_id,
      },
      preferences: params.preferences,
      read: false,
      templateKey: "wallet.dispute_open",
      escrowId: params.escrow.escrow_id,
      title: `Dispute open for ${title}`,
      urgency: "critical",
    });
  }

  if (params.escrow.state === "partner_pending") {
    const targetAt = addHours(params.escrow.updated_at, 12);
    return createNotificationItem({
      action: {
        label: "Review funding",
        href: `/app/payments/wallet?escrow=${params.escrow.escrow_id}`,
      },
      body: `Funding for ${title} is blocked in partner processing. Check the latest delivery update before retrying or reversing the escrow.`,
      category: "finance",
      createdAt: params.escrow.updated_at,
      escrowId: params.escrow.escrow_id,
      expiresAt: targetAt,
      lifecycleState: "blocked",
      listingId: params.escrow.listing_id,
      module: "wallet",
      nextActionCopy: "Retry funding or cancel and reverse if the payment rail stays blocked.",
      notificationId: `finance:${params.escrow.escrow_id}:partner_pending`,
      payload: {
        delivery_state: latestDelivery?.delivery_state ?? null,
        escrow_id: params.escrow.escrow_id,
        listing_id: params.escrow.listing_id,
      },
      preferences: params.preferences,
      read: false,
      templateKey: "wallet.partner_pending",
      title: `Funding blocked for ${title}`,
      urgency: responseUrgency(targetAt, now),
    });
  }

  if (params.escrow.state === "initiated") {
    const targetAt = addHours(params.escrow.updated_at, 24);
    return createNotificationItem({
      action: {
        label: "Open wallet",
        href: `/app/payments/wallet?escrow=${params.escrow.escrow_id}`,
      },
      body: `Escrow for ${title} has been opened but not funded yet.`,
      category: "finance",
      createdAt: params.escrow.updated_at,
      escrowId: params.escrow.escrow_id,
      expiresAt: targetAt,
      lifecycleState: "pending",
      listingId: params.escrow.listing_id,
      module: "wallet",
      nextActionCopy: "Fund the escrow so the trade can move into protected settlement.",
      notificationId: `finance:${params.escrow.escrow_id}:initiated`,
      payload: {
        escrow_id: params.escrow.escrow_id,
        listing_id: params.escrow.listing_id,
      },
      preferences: params.preferences,
      read: false,
      templateKey: "wallet.awaiting_funding",
      title: `Escrow needs funding for ${title}`,
      urgency: responseUrgency(targetAt, now),
    });
  }

  if (params.escrow.state === "funded") {
    const targetAt = addHours(params.escrow.updated_at, 24);
    return createNotificationItem({
      action: {
        label: isSeller ? "Release settlement" : "Review escrow",
        href: `/app/payments/wallet?escrow=${params.escrow.escrow_id}`,
      },
      body: isSeller
        ? `Funds for ${title} are secured in escrow and ready for release or dispute handling.`
        : `Funds for ${title} are secured in escrow while the seller reviews release conditions.`,
      category: "finance",
      createdAt: params.escrow.updated_at,
      escrowId: params.escrow.escrow_id,
      expiresAt: targetAt,
      lifecycleState: "pending",
      listingId: params.escrow.listing_id,
      module: "wallet",
      nextActionCopy: isSeller
        ? "Release the funds once proof is satisfactory, or open a dispute if terms are not met."
        : "Monitor the settlement and raise a dispute if delivery proof is inconsistent.",
      notificationId: `finance:${params.escrow.escrow_id}:funded`,
      payload: {
        escrow_id: params.escrow.escrow_id,
        listing_id: params.escrow.listing_id,
      },
      preferences: params.preferences,
      read: false,
      templateKey: "wallet.funded_pending_release",
      title: isSeller
        ? `Release decision pending for ${title}`
        : `Settlement is funded for ${title}`,
      urgency: responseUrgency(targetAt, now),
    });
  }

  const resolvedTitle =
    params.escrow.state === "released"
      ? `Settlement completed for ${title}`
      : `Settlement reversed for ${title}`;
  const resolvedBody =
    params.escrow.state === "released"
      ? `Funds for ${title} have been released successfully.`
      : `Funds for ${title} were returned to the buyer.`;

  return createNotificationItem({
    action: {
      label: "Open wallet",
      href: `/app/payments/wallet?escrow=${params.escrow.escrow_id}`,
    },
    body: resolvedBody,
    category: "finance",
    createdAt: params.escrow.updated_at,
    escrowId: params.escrow.escrow_id,
    lifecycleState: "resolved",
    listingId: params.escrow.listing_id,
    module: "wallet",
    nextActionCopy: null,
    notificationId: `finance:${params.escrow.escrow_id}:resolved`,
    payload: {
      escrow_id: params.escrow.escrow_id,
      listing_id: params.escrow.listing_id,
      settlement_state: params.escrow.state,
    },
    preferences: params.preferences,
    read: params.escrow.state === "released",
    readAt: params.escrow.state === "released" ? params.escrow.updated_at : null,
    templateKey: "wallet.settlement_resolved",
    title: resolvedTitle,
    urgency: "routine",
  });
}
