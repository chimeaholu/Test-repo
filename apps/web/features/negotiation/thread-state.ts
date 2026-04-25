import type { NegotiationThreadRead } from "@agrodomain/contracts";

export type NegotiationThreadUiState = {
  canCounter: boolean;
  canRequestConfirmation: boolean;
  canApprove: boolean;
  canReject: boolean;
  isAuthorizedConfirmer: boolean;
  isParticipant: boolean;
  isTerminal: boolean;
  otherParticipantActorId: string;
  pendingConfirmerActorId: string | null;
  statusTone: "online" | "offline" | "degraded" | "neutral";
  statusLabel: string;
};

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

  return {
    canCounter: isParticipant && actorId === thread.seller_actor_id && thread.status === "open",
    canRequestConfirmation: isParticipant && thread.status === "open",
    canApprove: isAuthorizedConfirmer && thread.status === "pending_confirmation",
    canReject: isAuthorizedConfirmer && thread.status === "pending_confirmation",
    isAuthorizedConfirmer,
    isParticipant,
    isTerminal,
    otherParticipantActorId: getOtherParticipantActorId(thread, actorId),
    pendingConfirmerActorId: thread.confirmation_checkpoint?.required_confirmer_actor_id ?? null,
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
