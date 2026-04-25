import type {
  ConnectivityState,
  OfflineQueueItem,
  OfflineQueueSnapshot,
} from "@agrodomain/contracts";

export type QueueAction =
  | { type: "set_connectivity"; connectivityState: ConnectivityState }
  | { type: "retry_item"; itemId: string }
  | { type: "dismiss_item"; itemId: string }
  | { type: "seed_snapshot"; snapshot: OfflineQueueSnapshot }
  | { type: "ack_item"; itemId: string; resultRef: string };

export function reduceQueueSnapshot(
  state: OfflineQueueSnapshot,
  action: QueueAction,
): OfflineQueueSnapshot {
  switch (action.type) {
    case "seed_snapshot":
      return action.snapshot;
    case "set_connectivity":
      return {
        ...state,
        connectivity_state: action.connectivityState,
        handoff_channel:
          action.connectivityState === "offline"
            ? "whatsapp"
            : action.connectivityState === "degraded"
              ? "ussd"
              : null,
      };
    case "retry_item":
      return {
        ...state,
        items: state.items.map((item) =>
          item.item_id === action.itemId
            ? {
                ...item,
                attempt_count: item.attempt_count + 1,
                state: item.state === "conflicted" ? "failed_retryable" : "replaying",
              }
            : item,
        ),
      };
    case "dismiss_item":
      return {
        ...state,
        items: state.items.map((item) =>
          item.item_id === action.itemId ? { ...item, state: "cancelled" } : item,
        ),
      };
    case "ack_item":
      return {
        ...state,
        items: state.items.map((item) =>
          item.item_id === action.itemId
            ? { ...item, state: "acked", result_ref: action.resultRef, conflict_code: null }
            : item,
        ),
      };
    default:
      return state;
  }
}

export function queueSummary(items: OfflineQueueItem[]): {
  actionableCount: number;
  conflictedCount: number;
} {
  const actionableCount = items.filter((item) =>
    ["queued", "failed_retryable", "conflicted", "replaying"].includes(item.state),
  ).length;
  const conflictedCount = items.filter((item) => item.state === "conflicted").length;
  return { actionableCount, conflictedCount };
}
