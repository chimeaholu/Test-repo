/**
 * RB-001 — Core HTTP layer for the Agrodomain API client.
 *
 * All domain-specific service modules (identity, marketplace, wallet, etc.)
 * build on the primitives exported from this module. This file contains
 * zero domain logic — only HTTP transport, auth, storage, and envelope helpers.
 */

import type {
  IdentitySession,
  OfflineMutationPayload,
  OfflineQueueItem,
  OfflineQueueSnapshot,
  ResponseEnvelope,
} from "@agrodomain/contracts";
import { schemaVersion } from "@agrodomain/contracts";

import { getCachedReadModel, cacheReadModel } from "@/lib/offline/cache";
import {
  canAttemptLiveSync,
  createEmptyQueueSnapshot,
  DeferredMutationQueuedError,
  enqueueDeferredMutation,
} from "@/lib/offline/mutation-engine";
import { getOfflineMutationPolicy } from "@/lib/offline/policy";
import {
  OFFLINE_QUEUE_KEY,
  OFFLINE_READ_MODEL_KEY,
  removeStoredKey,
} from "@/lib/offline/storage";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

export const SESSION_KEY = "agrodomain.session.v2";
export const TOKEN_KEY = "agrodomain.session-token.v1";
export const QUEUE_KEY = OFFLINE_QUEUE_KEY;
export const CLIMATE_ALERT_ACK_KEY = "agrodomain.climate.alert-acks.v1";
export const AUTH_STATE_EVENT = "agrodomain:auth-state-changed";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function nowIso(): string {
  return new Date().toISOString();
}

export function apiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_AGRO_API_BASE_URL ?? "http://127.0.0.1:8000"
  );
}

// ---------------------------------------------------------------------------
// Response envelope builder
// ---------------------------------------------------------------------------

export function responseEnvelope<TData>(
  data: TData,
  traceId: string,
): ResponseEnvelope<TData> {
  return {
    metadata: {
      causation_id: `web-client:${traceId}`,
      correlation_id: traceId,
      emitted_at: nowIso(),
      request_id: traceId,
      schema_version: schemaVersion,
    },
    status: "completed",
    data,
  };
}

// ---------------------------------------------------------------------------
// LocalStorage helpers (SSR-safe)
// ---------------------------------------------------------------------------

export function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export function writeJson<T>(key: string, value: T): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
    if (key === SESSION_KEY || key === TOKEN_KEY) {
      window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT));
    }
  }
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
  window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT));
}

// ---------------------------------------------------------------------------
// Session storage
// ---------------------------------------------------------------------------

export function readSession(): IdentitySession | null {
  return readJson<IdentitySession>(SESSION_KEY);
}

export function writeSession(session: IdentitySession | null): void {
  writeJson(SESSION_KEY, session);
}

// ---------------------------------------------------------------------------
// Core HTTP transport
// ---------------------------------------------------------------------------

export async function requestJson<TData>(
  path: string,
  init: RequestInit,
  traceId: string,
  authenticated = false,
): Promise<ResponseEnvelope<TData>> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");
  headers.set("X-Request-ID", traceId);
  headers.set("X-Correlation-ID", traceId);

  if (authenticated) {
    const token = readToken();
    if (!token) {
      throw new Error("Session token missing");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      const message =
        typeof detail?.detail === "string"
          ? detail.detail
          : detail?.detail?.error_code ||
            detail?.error_code ||
            "request_failed";
      throw new Error(message);
    }

    const data = (await response.json()) as TData;
    if ((init.method ?? "GET").toUpperCase() === "GET") {
      cacheReadModel(path, data);
    }
    return responseEnvelope(data, traceId);
  } catch (error) {
    if ((init.method ?? "GET").toUpperCase() === "GET") {
      const cached = getCachedReadModel<TData>(path);
      if (cached) {
        return responseEnvelope(cached.data as TData, traceId);
      }
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Generic command sender (POST /api/v1/workflow/commands)
// ---------------------------------------------------------------------------

export interface CommandEnvelopeParams {
  actorId: string;
  aggregateRef: string;
  commandName: string;
  countryCode: string;
  idempotencyKey?: string;
  input: Record<string, unknown>;
  mutationScope: string;
  journeyIds: string[];
  dataCheckIds: string[];
  traceId: string;
}

export interface CommandResultEnvelope<
  TResult = Record<string, unknown>,
> {
  status: string;
  request_id: string;
  idempotency_key: string;
  result: TResult;
  audit_event_id: number;
  replayed: boolean;
}

export async function sendCommand<
  TResult = Record<string, unknown>,
>(
  params: CommandEnvelopeParams,
  traceId: string,
): Promise<ResponseEnvelope<CommandResultEnvelope<TResult>>> {
  const policy = getOfflineMutationPolicy(params.commandName);
  const connectivityState =
    typeof navigator === "undefined" || navigator.onLine ? "online" : "offline";

  if (!canAttemptLiveSync(connectivityState) && policy.mode === "online-only") {
    throw new Error(policy.blockedMessage);
  }

  if (!canAttemptLiveSync(connectivityState) && policy.mode === "queueable") {
    const queued = enqueueDeferredMutation({
      actorId: params.actorId,
      aggregateRef: params.aggregateRef,
      commandName: params.commandName,
      countryCode: params.countryCode,
      idempotencyKey: params.idempotencyKey ?? crypto.randomUUID(),
      input: params.input,
      mutationScope: params.mutationScope,
      journeyIds: params.journeyIds,
      dataCheckIds: params.dataCheckIds,
      traceId: params.traceId,
    });
    throw new DeferredMutationQueuedError(policy.blockedMessage, queued.item_id);
  }

  const requestId = crypto.randomUUID();
  const idempotencyKey = params.idempotencyKey ?? crypto.randomUUID();

  try {
    return await requestJson<CommandResultEnvelope<TResult>>(
      "/api/v1/workflow/commands",
      {
        method: "POST",
        body: JSON.stringify({
          metadata: {
            request_id: requestId,
            idempotency_key: idempotencyKey,
            actor_id: params.actorId,
            country_code: params.countryCode,
            channel: "pwa",
            schema_version: schemaVersion as typeof schemaVersion,
            correlation_id: params.traceId,
            occurred_at: nowIso(),
            traceability: {
              journey_ids: params.journeyIds,
              data_check_ids: params.dataCheckIds,
            },
          },
          command: {
            name: params.commandName,
            aggregate_ref: params.aggregateRef,
            mutation_scope: params.mutationScope,
            payload: params.input,
          },
        }),
      },
      traceId,
      true,
    );
  } catch (error) {
    if (
      policy.mode === "queueable" &&
      error instanceof Error &&
      /fetch|network|failed to fetch/i.test(error.message)
    ) {
      const queued = enqueueDeferredMutation({
        actorId: params.actorId,
        aggregateRef: params.aggregateRef,
        commandName: params.commandName,
        countryCode: params.countryCode,
        idempotencyKey,
        input: params.input,
        mutationScope: params.mutationScope,
        journeyIds: params.journeyIds,
        dataCheckIds: params.dataCheckIds,
        traceId: params.traceId,
      });
      throw new DeferredMutationQueuedError(policy.blockedMessage, queued.item_id);
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Offline queue seeding (creates a sample queue item after sign-in)
// ---------------------------------------------------------------------------

function queueEnvelope(
  actorIdValue: string,
  countryCode: string,
  payload: OfflineMutationPayload,
  traceId: string,
) {
  const idempotencyKey = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  return {
    metadata: {
      actor_id: actorIdValue,
      channel: "pwa" as const,
      correlation_id: traceId || requestId,
      country_code: countryCode,
      idempotency_key: idempotencyKey,
      occurred_at: nowIso(),
      request_id: requestId,
      schema_version: schemaVersion as typeof schemaVersion,
      traceability: {
        data_check_ids: ["offline_queue"],
        journey_ids: [`offline:${payload.workflow_id}`],
      },
    },
    command: {
      aggregate_ref: payload.workflow_id,
      mutation_scope: payload.intent,
      name: payload.intent,
      payload,
    },
  };
}

export function seedQueue(
  session: IdentitySession,
  traceId: string,
): OfflineQueueSnapshot {
  void session;
  void traceId;
  return createEmptyQueueSnapshot();
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

export function clearAll(): void {
  writeToken(null);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
    removeStoredKey(QUEUE_KEY);
    removeStoredKey(OFFLINE_READ_MODEL_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT));
  }
}

// ---------------------------------------------------------------------------
// Collection unwrapper (handles both array and {items:[]} shapes from API)
// ---------------------------------------------------------------------------

export function unwrapCollection<TItem>(value: unknown): TItem[] {
  if (Array.isArray(value)) return value as TItem[];
  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    return (value as { items: TItem[] }).items;
  }
  return [];
}
