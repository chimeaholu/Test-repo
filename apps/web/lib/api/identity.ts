/**
 * RB-002 — Identity domain service.
 *
 * Handles sign-in, session restore, consent lifecycle, offline queue,
 * and protected-action gating.
 */

import type {
  ActorRole,
  ConsentCapturePayload,
  ConnectivityState,
  IdentitySession,
  OfflineQueueSnapshot,
  ProtectedActionStatus,
  ResponseEnvelope,
  SignInPayload,
} from "@agrodomain/contracts";
import { z } from "zod";

import {
  clearAll,
  QUEUE_KEY,
  readJson,
  readSession,
  readToken,
  requestJson,
  responseEnvelope,
  seedQueue,
  writeJson,
  writeSession,
  writeToken,
} from "../api-client";

const actorSearchItemSchema = z
  .object({
    actor_id: z.string().min(1),
    display_name: z.string().min(1),
    email: z.string().email(),
    role: z.string().min(1),
    country_code: z.string().min(2).max(2),
    organization_name: z.string().min(1),
  })
  .strict();

const actorSearchResultSchema = z
  .object({
    items: z.array(actorSearchItemSchema),
  })
  .strict();

// ---------------------------------------------------------------------------
// Identity API
// ---------------------------------------------------------------------------

export const identityApi = {
  async signIn(
    payload: SignInPayload,
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession>> {
    const response = await requestJson<{
      access_token: string;
      session: IdentitySession;
    }>(
      "/api/v1/identity/session",
      { method: "POST", body: JSON.stringify(payload) },
      traceId,
    );
    writeToken(response.data.access_token);
    writeSession(response.data.session);
    writeJson(QUEUE_KEY, seedQueue(response.data.session, traceId));
    return responseEnvelope(response.data.session, traceId);
  },

  async restoreSession(
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession | null>> {
    const token = readToken();
    if (!token) return responseEnvelope(null, traceId);

    const storedSession = readSession();
    try {
      const sessionResponse = await requestJson<IdentitySession>(
        "/api/v1/identity/session",
        { method: "GET" },
        traceId,
        true,
      );
      writeSession(sessionResponse.data);
      return sessionResponse;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      if (
        message === "unauthorized" ||
        message === "session_not_found"
      ) {
        writeToken(null);
        writeSession(null);
        return responseEnvelope(null, traceId);
      }
      return responseEnvelope(storedSession ?? null, traceId);
    }
  },

  async searchActors(
    query: string,
    traceId: string,
    limit = 8,
  ): Promise<ResponseEnvelope<z.infer<typeof actorSearchResultSchema>>> {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(limit),
    });
    const response = await requestJson<unknown>(
      `/api/v1/identity/actors/search?${params.toString()}`,
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(actorSearchResultSchema.parse(response.data), traceId);
  },

  getStoredSession(
    traceId: string,
  ): ResponseEnvelope<IdentitySession | null> {
    const token = readToken();
    if (!token) return responseEnvelope(null, traceId);
    return responseEnvelope(readSession(), traceId);
  },

  getStoredAccessToken(): string | null {
    return readToken();
  },

  markConsentPending(
    traceId: string,
  ): ResponseEnvelope<IdentitySession | null> {
    const session = readSession();
    if (!session) return responseEnvelope(null, traceId);
    const nextSession: IdentitySession = {
      ...session,
      consent: {
        ...session.consent,
        state:
          session.consent.state === "identified"
            ? "consent_pending"
            : session.consent.state,
      },
    };
    writeSession(nextSession);
    return responseEnvelope(nextSession, traceId);
  },

  async captureConsent(
    payload: ConsentCapturePayload,
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession | null>> {
    const response = await requestJson<IdentitySession>(
      "/api/v1/identity/consent",
      { method: "POST", body: JSON.stringify(payload) },
      traceId,
      true,
    );
    writeSession(response.data);
    return responseEnvelope(response.data, traceId);
  },

  async revokeConsent(
    reason: string,
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession | null>> {
    const response = await requestJson<{
      reason: string;
      session: IdentitySession;
    }>(
      "/api/v1/identity/consent/revoke",
      { method: "POST", body: JSON.stringify({ reason }) },
      traceId,
      true,
    );
    writeSession(response.data.session);
    return responseEnvelope(response.data.session, traceId);
  },

  evaluateProtectedAction(
    traceId: string,
  ): ResponseEnvelope<ProtectedActionStatus> {
    const session = readSession();
    const allowed = session?.consent.state === "consent_granted";
    return responseEnvelope(
      {
        allowed: Boolean(allowed),
        reason_code: !session
          ? "session_missing"
          : allowed
            ? "ok"
            : "consent_required",
      },
      traceId,
    );
  },

  getQueue(traceId: string): ResponseEnvelope<OfflineQueueSnapshot> {
    const queue = readJson<OfflineQueueSnapshot>(QUEUE_KEY) ?? {
      connectivity_state: "online",
      handoff_channel: null,
      items: [],
    };
    return responseEnvelope(queue, traceId);
  },

  storeQueue(snapshot: OfflineQueueSnapshot): void {
    writeJson(QUEUE_KEY, snapshot);
  },

  setConnectivityState(
    snapshot: OfflineQueueSnapshot,
    state: ConnectivityState,
  ): void {
    identityApi.storeQueue({ ...snapshot, connectivity_state: state });
  },

  clear(): void {
    clearAll();
  },
};

export type { ActorRole, ConnectivityState };
export type ActorSearchItem = z.infer<typeof actorSearchItemSchema>;
