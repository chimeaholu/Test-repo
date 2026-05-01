import type { NegotiationThreadRead } from "@agrodomain/contracts";

export type NegotiationThreadUiState = {
  canCounter: boolean;
  canRequestConfirmation: boolean;
  canApprove: boolean;
  canReject: boolean;
  deadlineAt: string | null;
  isAuthorizedConfirmer: boolean;
  isParticipant: boolean;
  isTerminal: boolean;
  nextActionLabel: string;
  otherParticipantActorId: string;
  pendingConfirmerActorId: string | null;
  statusDetail: string;
  urgencyLabel: string;
  urgencyTone: "online" | "offline" | "degraded" | "neutral";
  statusTone: "online" | "offline" | "degraded" | "neutral";
  statusLabel: string;
};

const HOUR_MS = 3_600_000;

function addHours(timestamp: string, hours: number): string {
  return new Date(new Date(timestamp).getTime() + hours * HOUR_MS).toISOString();
}

function urgencyFromDeadline(deadlineAt: string | null): NegotiationThreadUiState["urgencyTone"] {
  if (!deadlineAt) {
    return "neutral";
  }

  const remainingHours =
    (new Date(deadlineAt).getTime() - Date.now()) / HOUR_MS;
  if (remainingHours <= -12) {
    return "offline";
  }
  if (remainingHours <= 0) {
    return "degraded";
  }
  if (remainingHours <= 6) {
    return "degraded";
  }
  return "online";
}

function urgencyLabelFor(deadlineAt: string | null): string {
  if (!deadlineAt) {
    return "No active timer";
  }

  const remainingHours =
    (new Date(deadlineAt).getTime() - Date.now()) / HOUR_MS;
  if (remainingHours <= -12) {
    return "Escalate now";
  }
  if (remainingHours <= 0) {
    return "Past due";
  }
  if (remainingHours <= 6) {
    return "Due soon";
  }
  return "On track";
}

export function getOtherParticipantActorId(thread: NegotiationThreadRead, actorId: string): string {
  return thread.seller_actor_id === actorId ? thread.buyer_actor_id : thread.seller_actor_id;
}

export function deriveNegotiationThreadUiState(
  thread: NegotiationThreadRead,
  actorId: string,
): NegotiationThreadUiState {
  const isParticipant = actorId === thread.seller_actor_id || actorId === thread.buyer_actor_id;
  const isAuthorizedConfirmer =
    thread.confirmation_checkpoint?.required_confirmer_actor_id === actorId;
  const isTerminal = thread.status === "accepted" || thread.status === "rejected";
  const deadlineAt =
    thread.status === "pending_confirmation" && thread.confirmation_checkpoint
      ? addHours(thread.confirmation_checkpoint.requested_at, 24)
      : thread.status === "accepted"
        ? addHours(thread.updated_at, 24)
        : thread.status === "open"
          ? addHours(thread.last_action_at, 48)
          : null;
  const urgencyTone = urgencyFromDeadline(deadlineAt);
  const urgencyLabel = urgencyLabelFor(deadlineAt);

  return {
    canCounter: isParticipant && actorId === thread.seller_actor_id && thread.status === "open",
    canRequestConfirmation: isParticipant && thread.status === "open",
    canApprove: isAuthorizedConfirmer && thread.status === "pending_confirmation",
    canReject: isAuthorizedConfirmer && thread.status === "pending_confirmation",
    deadlineAt,
    isAuthorizedConfirmer,
    isParticipant,
    isTerminal,
    nextActionLabel:
      thread.status === "pending_confirmation"
        ? isAuthorizedConfirmer
          ? "Approve or reject the current terms"
          : "Wait for the confirmer to decide"
        : thread.status === "accepted"
          ? "Open escrow and move settlement forward"
          : thread.status === "rejected"
            ? "Start a fresh thread if terms change"
            : actorId === thread.seller_actor_id
              ? "Respond to the buyer offer"
              : "Wait for the seller response",
    otherParticipantActorId: getOtherParticipantActorId(thread, actorId),
    pendingConfirmerActorId: thread.confirmation_checkpoint?.required_confirmer_actor_id ?? null,
    statusDetail:
      thread.status === "pending_confirmation"
        ? "The deal is waiting on a final decision before it can move into escrow."
        : thread.status === "accepted"
          ? "The trade terms are agreed and the next move is settlement."
          : thread.status === "rejected"
            ? "This thread is closed until someone starts a new negotiation."
            : actorId === thread.seller_actor_id
              ? "A buyer offer is open and the seller response window is running."
              : "The latest buyer action is recorded and the seller response window is running.",
    urgencyLabel,
    urgencyTone,
    statusTone:
      thread.status === "accepted"
        ? "online"
        : thread.status === "rejected"
          ? "offline"
          : thread.status === "pending_confirmation"
            ? "degraded"
            : "neutral",
    statusLabel:
      thread.status === "pending_confirmation"
        ? "Pending confirmation"
        : thread.status === "accepted"
          ? "Accepted"
          : thread.status === "rejected"
            ? "Rejected"
            : "Open",
  };
}
