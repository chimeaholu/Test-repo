"use client";

import type {
  ConnectivityState,
  OfflineMutationPayload,
  OfflineQueueItem,
  OfflineQueueSnapshot,
  RequestEnvelope,
  ResponseEnvelope,
} from "@agrodomain/contracts";
import { schemaVersion } from "@agrodomain/contracts";

import {
  OFFLINE_QUEUE_KEY,
  readStoredJson,
  removeStoredKey,
  writeStoredJson,
} from "./storage";
import {
  getOfflineMutationPolicy,
  handoffChannelForConnectivity,
} from "./policy";

export class DeferredMutationQueuedError extends Error {
  readonly itemId: string;

  constructor(message: string, itemId: string) {
    super(message);
    this.name = "DeferredMutationQueuedError";
    this.itemId = itemId;
  }
}

function currentConnectivityState(): ConnectivityState {
  if (typeof navigator === "undefined") {
    return "online";
  }

  return navigator.onLine ? "online" : "offline";
}

export function createEmptyQueueSnapshot(
  connectivityState = currentConnectivityState(),
): OfflineQueueSnapshot {
  return {
    connectivity_state: connectivityState,
    handoff_channel: handoffChannelForConnectivity(connectivityState),
    items: [],
  };
}

function readQueueSnapshot(): OfflineQueueSnapshot {
  return readStoredJson<OfflineQueueSnapshot>(
    OFFLINE_QUEUE_KEY,
    createEmptyQueueSnapshot(),
  );
}

export function getStoredQueueSnapshot(): OfflineQueueSnapshot {
  return readQueueSnapshot();
}

export function storeQueueSnapshot(snapshot: OfflineQueueSnapshot): void {
  writeStoredJson(OFFLINE_QUEUE_KEY, snapshot);
}

export function clearStoredQueueSnapshot(): void {
  removeStoredKey(OFFLINE_QUEUE_KEY);
}

function buildQueueEnvelope(params: {
  actorId: string;
  aggregateRef: string;
  commandName: string;
  countryCode: string;
  idempotencyKey: string;
  input: Record<string, unknown>;
  mutationScope: string;
  journeyIds: string[];
  dataCheckIds: string[];
  traceId: string;
  requestId: string;
}): RequestEnvelope<OfflineMutationPayload> {
  return {
    metadata: {
      actor_id: params.actorId,
      channel: "pwa",
      correlation_id: params.traceId,
      country_code: params.countryCode,
      idempotency_key: params.idempotencyKey,
      occurred_at: new Date().toISOString(),
      request_id: params.requestId,
      schema_version: schemaVersion,
      traceability: {
        data_check_ids: params.dataCheckIds,
        journey_ids: params.journeyIds,
      },
    },
    command: {
      aggregate_ref: params.aggregateRef,
      mutation_scope: params.mutationScope,
      name: params.commandName,
      payload: {
        workflow_id: params.aggregateRef,
        intent: params.commandName,
        payload: params.input,
      },
    },
  };
}

export function enqueueDeferredMutation(params: {
  actorId: string;
  aggregateRef: string;
  commandName: string;
  countryCode: string;
  idempotencyKey: string;
  input: Record<string, unknown>;
  mutationScope: string;
  journeyIds: string[];
  dataCheckIds: string[];
  traceId: string;
}): OfflineQueueItem {
  const snapshot = readQueueSnapshot();
  const requestId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  const envelope = buildQueueEnvelope({
    ...params,
    requestId,
  });

  const item: OfflineQueueItem = {
    item_id: itemId,
    workflow_id: params.aggregateRef,
    intent: params.commandName,
    payload: params.input,
    idempotency_key: params.idempotencyKey,
    created_at: new Date().toISOString(),
    attempt_count: 0,
    state: "queued",
    last_error_code: null,
    conflict_code: null,
    result_ref: null,
    envelope,
  };

  storeQueueSnapshot({
    ...snapshot,
    connectivity_state: snapshot.connectivity_state,
    handoff_channel: handoffChannelForConnectivity(snapshot.connectivity_state),
    items: [...snapshot.items, item].sort((left, right) =>
      left.created_at.localeCompare(right.created_at),
    ),
  });

  return item;
}

export function canAttemptLiveSync(connectivityState: ConnectivityState): boolean {
  return connectivityState === "online";
}

export function shouldQueueMutation(commandName: string): boolean {
  return getOfflineMutationPolicy(commandName).mode === "queueable";
}

function resultReference(
  response: Record<string, unknown>,
): string | null {
  const result =
    response.result && typeof response.result === "object"
      ? (response.result as Record<string, unknown>)
      : null;

  if (!result) {
    return typeof response.request_id === "string" ? response.request_id : null;
  }

  const listing =
    result.listing && typeof result.listing === "object"
      ? (result.listing as Record<string, unknown>)
      : null;
  if (listing && typeof listing.listing_id === "string") {
    return `listing:${listing.listing_id}`;
  }

  const thread =
    result.thread && typeof result.thread === "object"
      ? (result.thread as Record<string, unknown>)
      : null;
  if (thread && typeof thread.thread_id === "string") {
    return `thread:${thread.thread_id}`;
  }

  return typeof response.request_id === "string" ? response.request_id : null;
}

function classifyReplayFailure(statusCode: number, message: string) {
  if (statusCode === 409 || message === "idempotency_conflict") {
    return {
      conflict_code: "duplicate_commit" as const,
      last_error_code: message || "idempotency_conflict",
      state: "conflicted" as const,
    };
  }

  if (statusCode === 403 && message === "missing_consent") {
    return {
      conflict_code: "policy_challenge" as const,
      last_error_code: message,
      state: "conflicted" as const,
    };
  }

  if (
    statusCode === 401 ||
    message === "session_expired" ||
    message === "session_timeout"
  ) {
    return {
      conflict_code: "session_refresh_required" as const,
      last_error_code: message,
      state: "conflicted" as const,
    };
  }

  if (statusCode === 422) {
    return {
      conflict_code: "version_mismatch" as const,
      last_error_code: message || "invalid_schema",
      state: "conflicted" as const,
    };
  }

  if (statusCode >= 500) {
    return {
      conflict_code: null,
      last_error_code: message || "server_error",
      state: "failed_retryable" as const,
    };
  }

  return {
    conflict_code: null,
    last_error_code: message || "request_failed",
    state: "failed_terminal" as const,
  };
}

async function replayQueuedItem(params: {
  accessToken: string;
  apiBaseUrl: string;
  item: OfflineQueueItem;
}): Promise<OfflineQueueItem> {
  const response = await fetch(`${params.apiBaseUrl}/api/v1/workflow/commands`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      "X-Request-ID": params.item.envelope.metadata.request_id,
      "X-Correlation-ID": params.item.envelope.metadata.correlation_id,
    },
    body: JSON.stringify(params.item.envelope),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const message =
      typeof detail?.detail === "string"
        ? detail.detail
        : detail?.detail?.error_code || detail?.error_code || "request_failed";
    const failure = classifyReplayFailure(response.status, message);

    return {
      ...params.item,
      attempt_count: params.item.attempt_count + 1,
      conflict_code: failure.conflict_code,
      last_error_code: failure.last_error_code,
      state: failure.state,
    };
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return {
    ...params.item,
    attempt_count: params.item.attempt_count + 1,
    conflict_code: null,
    last_error_code: null,
    result_ref: resultReference(payload),
    state: "acked",
  };
}

export async function replayQueuedMutations(params: {
  accessToken: string | null;
  apiBaseUrl: string;
  snapshot?: OfflineQueueSnapshot;
}): Promise<OfflineQueueSnapshot> {
  const snapshot = params.snapshot ?? readQueueSnapshot();
  if (!params.accessToken) {
    const nextSnapshot: OfflineQueueSnapshot = {
      ...snapshot,
      items: snapshot.items.map<OfflineQueueItem>((item) => {
        if (item.state !== "queued" && item.state !== "failed_retryable") {
          return item;
        }

        return {
          ...item,
          conflict_code: "session_refresh_required",
          last_error_code: "session_token_missing",
          state: "conflicted",
        };
      }),
    };
    storeQueueSnapshot(nextSnapshot);
    return nextSnapshot;
  }

  const nextItems: OfflineQueueItem[] = [];
  for (const item of snapshot.items) {
    if (
      item.state !== "queued" &&
      item.state !== "failed_retryable" &&
      item.state !== "replaying"
    ) {
      nextItems.push(item);
      continue;
    }

    try {
      nextItems.push(
        await replayQueuedItem({
          accessToken: params.accessToken,
          apiBaseUrl: params.apiBaseUrl,
          item: {
            ...item,
            state: "replaying",
          },
        }),
      );
    } catch {
      nextItems.push({
        ...item,
        attempt_count: item.attempt_count + 1,
        conflict_code: null,
        last_error_code: "network_unavailable",
        state: "failed_retryable",
      });
    }
  }

  const nextSnapshot: OfflineQueueSnapshot = {
    ...snapshot,
    items: nextItems,
  };
  storeQueueSnapshot(nextSnapshot);
  return nextSnapshot;
}

export function queuedMutationResponse<TData>(
  data: TData,
  traceId: string,
): ResponseEnvelope<TData> {
  return {
    metadata: {
      causation_id: `web-client:${traceId}`,
      correlation_id: traceId,
      emitted_at: new Date().toISOString(),
      request_id: traceId,
      schema_version: schemaVersion,
    },
    status: "accepted",
    data,
  };
}
