import {
  escrowReadSchema,
  settlementNotificationPayloadSchema,
  settlementTimelineEntrySchema,
  walletBalanceReadSchema,
  walletLedgerEntrySchema,
} from "@agrodomain/contracts";
import { z } from "zod";

export type WalletBalance = z.infer<typeof walletBalanceReadSchema>;
export type WalletLedgerEntry = z.infer<typeof walletLedgerEntrySchema>;
export type SettlementNotification = z.infer<typeof settlementNotificationPayloadSchema>;
export type SettlementTimelineEntry = z.infer<typeof settlementTimelineEntrySchema>;
export type EscrowReadModel = z.infer<typeof escrowReadSchema>;

export interface WalletActionDescriptor {
  action:
    | "fund"
    | "release"
    | "reverse"
    | "dispute";
  allowed: boolean;
  disabledReason: string | null;
  helperText: string;
  label: string;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GH", {
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    style: "currency",
  }).format(amount);
}

export function settlementTone(
  state: EscrowReadModel["state"],
): "online" | "offline" | "degraded" | "neutral" {
  switch (state) {
    case "funded":
    case "released":
      return "online";
    case "partner_pending":
    case "pending_funds":
      return "degraded";
    case "reversed":
    case "disputed":
      return "offline";
    default:
      return "neutral";
  }
}

export function settlementLabel(state: EscrowReadModel["state"]): string {
  switch (state) {
    case "pending_funds":
      return "Pending funds";
    case "partner_pending":
      return "Partner pending";
    default:
      return state[0].toUpperCase() + state.slice(1);
  }
}

export function escrowStateCopy(escrow: EscrowReadModel): { title: string; body: string } {
  switch (escrow.state) {
    case "initiated":
      return {
        title: "Funding has not started yet",
        body: "The deal is ready for funding, but no money has been placed into escrow yet.",
      };
    case "pending_funds":
      return {
        title: "Funding is being processed",
        body: "Your payment request has been sent and is still being confirmed.",
      };
    case "partner_pending":
      return {
        title: "Funding needs attention",
        body: "The payment is still pending. You can retry funding or review the latest update before taking the next step.",
      };
    case "funded":
      return {
        title: "Funds are held in escrow",
        body: "The buyer's funds are secured and ready for release, reversal, or dispute based on what happens next.",
      };
    case "released":
      return {
        title: "Settlement completed",
        body: "The escrow has been released and the seller has received the funds.",
      };
    case "reversed":
      return {
        title: "Funds were returned",
        body: "The escrow was reversed and the buyer has been refunded.",
      };
    case "disputed":
      return {
        title: "This escrow is under review",
        body: "A dispute has been opened, so the funds will stay on hold until the issue is resolved.",
      };
  }
}

export function deriveWalletActions(escrow: EscrowReadModel, actorId: string): WalletActionDescriptor[] {
  const isBuyer = actorId === escrow.buyer_actor_id;
  const isSeller = actorId === escrow.seller_actor_id;

  const actions: WalletActionDescriptor[] = [];

  if (escrow.state === "initiated" || escrow.state === "partner_pending") {
    actions.push({
      action: "fund",
      allowed: isBuyer,
      disabledReason: isBuyer ? null : "Only the buyer can move funding into escrow.",
      helperText:
        escrow.state === "partner_pending"
          ? "Try funding again after reviewing the latest payment update."
          : "Move the buyer's funds into escrow to secure the deal.",
      label: escrow.state === "partner_pending" ? "Retry funding" : "Fund escrow",
    });
  }

  if (escrow.state === "funded") {
    actions.push({
      action: "release",
      allowed: isSeller,
      disabledReason: isSeller ? null : "Only the seller can release a funded escrow.",
      helperText: "Release the funds to complete the sale and pay the seller.",
      label: "Release settlement",
    });
    actions.push({
      action: "dispute",
      allowed: isBuyer || isSeller,
      disabledReason: isBuyer || isSeller ? null : "Only settlement participants can open a dispute.",
      helperText: "Open a dispute if the delivery or terms need review before the funds are released.",
      label: "Open dispute",
    });
  }

  if (escrow.state === "funded" || escrow.state === "partner_pending" || escrow.state === "disputed") {
    actions.push({
      action: "reverse",
      allowed: isBuyer,
      disabledReason: isBuyer ? null : "Only the buyer can reverse this escrow state.",
      helperText: "Cancel the escrow and return the funds to the buyer.",
      label: escrow.state === "partner_pending" ? "Cancel and reverse" : "Reverse escrow",
    });
  }

  if (actions.length === 0) {
    actions.push({
      action: "release",
      allowed: false,
      disabledReason: "No interactive settlement action is available in this state.",
      helperText: "This escrow is read-only right now because it is complete or waiting on someone else.",
      label: "No further action",
    });
  }

  return actions;
}

export function latestNotification(escrow: EscrowReadModel): SettlementNotification | null {
  const entry = [...escrow.timeline].reverse().find((item) => item.notification);
  return entry?.notification ?? null;
}

export function notificationTone(
  notification: SettlementNotification | null,
): "online" | "offline" | "degraded" | "neutral" {
  if (!notification) {
    return "neutral";
  }
  switch (notification.delivery_state) {
    case "sent":
      return "online";
    case "fallback_sent":
    case "action_required":
      return "degraded";
    case "failed":
      return "offline";
    default:
      return "neutral";
  }
}

export function notificationSummary(notification: SettlementNotification | null): {
  headline: string;
  detail: string;
} {
  if (!notification) {
    return {
      headline: "No delivery update yet",
      detail: "There is no customer-facing delivery message attached to the latest step.",
    };
  }

  if (notification.delivery_state === "fallback_sent") {
    return {
      headline: `Fallback sent via ${notification.fallback_channel ?? "backup channel"}`,
      detail: `The primary delivery method was unavailable, so the update was sent through a backup channel. Reason: ${notification.fallback_reason ?? "unspecified"}.`,
    };
  }

  if (notification.delivery_state === "action_required") {
    return {
      headline: "Follow-up required",
      detail: "The latest payment update needs attention before the escrow can continue.",
    };
  }

  if (notification.delivery_state === "sent") {
    return {
      headline: `Delivered on ${notification.channel}`,
      detail: "The latest payment update was delivered successfully.",
    };
  }

  return {
    headline: notification.delivery_state,
    detail: "Review this update before deciding whether to retry or escalate.",
  };
}

export function settlementTimeline(escrow: EscrowReadModel): SettlementTimelineEntry[] {
  return [...escrow.timeline].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function walletHistory(entries: WalletLedgerEntry[]): WalletLedgerEntry[] {
  return [...entries].sort((left, right) => right.created_at.localeCompare(left.created_at));
}
