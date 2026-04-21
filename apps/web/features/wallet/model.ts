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
        title: "Funding has not been committed yet",
        body: "The escrow shell exists, but buyer funds have not moved into hold. No settlement release can happen before a funded entry lands in the ledger.",
      };
    case "pending_funds":
      return {
        title: "Funding request is in flight",
        body: "The platform has sent the funding request and is waiting for the definitive partner result. Treat this state as non-final until the next timeline event appears.",
      };
    case "partner_pending":
      return {
        title: "Partner confirmation timed out or degraded",
        body: "The platform marked the transfer as pending and emitted fallback settlement updates. Retrying is safe because repeated submit remains idempotent on the canonical command bus.",
      };
    case "funded":
      return {
        title: "Funds are held in escrow",
        body: "Buyer funds are in hold and the release or reversal path now requires an explicit actor-authorized command. No automatic release occurs from this state.",
      };
    case "released":
      return {
        title: "Settlement completed",
        body: "Held funds were released through compensating ledger movement into the seller wallet. Repeating the command should reconcile as a single-effect terminal state.",
      };
    case "reversed":
      return {
        title: "Escrow was reversed",
        body: "The buyer wallet received the reversal through append-only compensation. This is terminal and safe to read back under audit review.",
      };
    case "disputed":
      return {
        title: "Settlement is frozen for review",
        body: "A participant opened a dispute after funding. Release stays blocked until an explicit next command resolves the state.",
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
          ? "Retry the funding confirmation after the pending marker. Repeated submit remains replay-safe."
          : "Move buyer funds into hold on the canonical escrow runtime.",
      label: escrow.state === "partner_pending" ? "Retry funding" : "Fund escrow",
    });
  }

  if (escrow.state === "funded") {
    actions.push({
      action: "release",
      allowed: isSeller,
      disabledReason: isSeller ? null : "Only the seller can release a funded escrow.",
      helperText: "Release moves held funds to the seller wallet and emits participant settlement updates.",
      label: "Release settlement",
    });
    actions.push({
      action: "dispute",
      allowed: isBuyer || isSeller,
      disabledReason: isBuyer || isSeller ? null : "Only settlement participants can open a dispute.",
      helperText: "Use dispute when delivery or proof posture is unresolved and release must stay blocked.",
      label: "Open dispute",
    });
  }

  if (escrow.state === "funded" || escrow.state === "partner_pending" || escrow.state === "disputed") {
    actions.push({
      action: "reverse",
      allowed: isBuyer,
      disabledReason: isBuyer ? null : "Only the buyer can reverse this escrow state.",
      helperText: "Reversal refunds the buyer through append-only compensation rather than mutating prior entries.",
      label: escrow.state === "partner_pending" ? "Cancel and reverse" : "Reverse escrow",
    });
  }

  if (actions.length === 0) {
    actions.push({
      action: "release",
      allowed: false,
      disabledReason: "No interactive settlement action is available in this state.",
      helperText: "This surface remains read-only because the escrow is already terminal or awaiting a different actor.",
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
      headline: "No participant update recorded",
      detail: "The selected timeline item does not include a settlement notification payload.",
    };
  }

  if (notification.delivery_state === "fallback_sent") {
    return {
      headline: `Fallback sent via ${notification.fallback_channel ?? "backup channel"}`,
      detail: `Primary push confirmation degraded, so settlement updates moved to a scoped fallback. Reason: ${notification.fallback_reason ?? "unspecified"}.`,
    };
  }

  if (notification.delivery_state === "action_required") {
    return {
      headline: "Participant follow-up required",
      detail: "The settlement update reached an action-required state. Keep the outbox and delivery evidence visible until the participant response is resolved.",
    };
  }

  if (notification.delivery_state === "sent") {
    return {
      headline: `Delivered on ${notification.channel}`,
      detail: "The latest settlement update was emitted without fallback or retry requirements.",
    };
  }

  return {
    headline: notification.delivery_state,
    detail: "Review the notification payload and queue posture before retrying or escalating.",
  };
}

export function settlementTimeline(escrow: EscrowReadModel): SettlementTimelineEntry[] {
  return [...escrow.timeline].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function walletHistory(entries: WalletLedgerEntry[]): WalletLedgerEntry[] {
  return [...entries].sort((left, right) => right.created_at.localeCompare(left.created_at));
}
