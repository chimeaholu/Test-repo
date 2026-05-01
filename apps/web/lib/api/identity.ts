/**
 * RB-002 — Identity domain service.
 *
 * Handles sign-in, session restore, consent lifecycle, offline queue,
 * and protected-action gating.
 */

import type {
  ConsentCapturePayload,
  ConnectivityState,
  IdentitySession,
  OfflineQueueSnapshot,
  ProtectedActionStatus,
  ResponseEnvelope,
} from "@agrodomain/contracts";
import { z } from "zod";

import type {
  MagicLinkChallenge,
  PreviewRole,
} from "@/lib/auth/auth-context";
import {
  clearAll,
  readSession,
  readToken,
  requestJson,
  responseEnvelope,
  seedQueue,
  writeSession,
  writeToken,
} from "../api-client";
import {
  getStoredQueueSnapshot,
  storeQueueSnapshot,
} from "../offline/mutation-engine";

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

const demoPersonaSchema = z
  .object({
    actor_id: z.string().min(1),
    display_name: z.string().min(1),
    email: z.string().email(),
    role: z.string().min(1),
    country_code: z.string().min(2).max(2),
    organization_name: z.string().min(1),
    scenario_key: z.string().min(1),
    scenario_label: z.string().min(1),
    scenario_summary: z.string().min(1),
    operator: z.boolean(),
  })
  .strict();

const demoPersonaListSchema = z
  .object({
    items: z.array(demoPersonaSchema),
    runbook: z.array(
      z
        .object({
          runbook_id: z.string().min(1),
          title: z.string().min(1),
          summary: z.string().min(1),
          actor_ids: z.array(z.string().min(1)),
        })
        .strict(),
    ),
  })
  .strict();

// ---------------------------------------------------------------------------
// Identity API
// ---------------------------------------------------------------------------

export const identityApi = {
  async signIn(
    payload: {
      country_code: string;
      display_name: string;
      email: string;
      role: PreviewRole;
    },
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession>> {
    return identityApi.signInPreview(payload, traceId);
  },

  async signInPreview(
    payload: {
      country_code: string;
      display_name: string;
      email: string;
      role: PreviewRole;
    },
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
    storeQueueSnapshot(seedQueue(response.data.session, traceId));
    return responseEnvelope(response.data.session, traceId);
  },

  async signInWithPassword(
    payload: { identifier: string; password: string; countryCode: string },
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession>> {
    const response = await requestJson<{
      access_token: string;
      session: IdentitySession;
    }>(
      "/api/v1/identity/login/password",
      {
        method: "POST",
        body: JSON.stringify({
          identifier: payload.identifier,
          password: payload.password,
          country_code: payload.countryCode,
        }),
      },
      traceId,
    );
    writeToken(response.data.access_token);
    writeSession(response.data.session);
    storeQueueSnapshot(seedQueue(response.data.session, traceId));
    return responseEnvelope(response.data.session, traceId);
  },

  async requestMagicLink(
    payload: { identifier: string; countryCode: string },
    traceId: string,
  ): Promise<ResponseEnvelope<MagicLinkChallenge>> {
    const response = await requestJson<{
      challenge_id: string;
      delivery_channel: "sms" | "email";
      provider: string;
      fallback_provider: string | null;
      masked_target: string;
      expires_at: string;
      preview_code: string | null;
    }>(
      "/api/v1/identity/login/magic-link/request",
      {
        method: "POST",
        body: JSON.stringify({
          identifier: payload.identifier,
          country_code: payload.countryCode,
          delivery_channel: "sms",
        }),
      },
      traceId,
    );
    return responseEnvelope(
      {
        challengeId: response.data.challenge_id,
        deliveryChannel: response.data.delivery_channel,
        provider: response.data.provider,
        fallbackProvider: response.data.fallback_provider,
        maskedTarget: response.data.masked_target,
        expiresAt: response.data.expires_at,
        previewCode: response.data.preview_code,
      },
      traceId,
    );
  },

  async verifyMagicLink(
    payload: { challengeId: string; verificationCode: string },
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession>> {
    const response = await requestJson<{
      access_token: string;
      session: IdentitySession;
    }>(
      "/api/v1/identity/login/magic-link/verify",
      {
        method: "POST",
        body: JSON.stringify({
          challenge_id: payload.challengeId,
          verification_code: payload.verificationCode,
        }),
      },
      traceId,
    );
    writeToken(response.data.access_token);
    writeSession(response.data.session);
    storeQueueSnapshot(seedQueue(response.data.session, traceId));
    return responseEnvelope(response.data.session, traceId);
  },

  async registerPasswordAccount(
    payload: {
      displayName: string;
      email: string;
      phoneNumber: string;
      password: string;
      role: PreviewRole;
      countryCode: string;
    },
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession>> {
    const response = await requestJson<{
      access_token: string;
      session: IdentitySession;
    }>(
      "/api/v1/identity/register/password",
      {
        method: "POST",
        body: JSON.stringify({
          display_name: payload.displayName,
          email: payload.email,
          phone_number: payload.phoneNumber,
          password: payload.password,
          role: payload.role,
          country_code: payload.countryCode,
        }),
      },
      traceId,
    );
    writeToken(response.data.access_token);
    writeSession(response.data.session);
    storeQueueSnapshot(seedQueue(response.data.session, traceId));
    return responseEnvelope(response.data.session, traceId);
  },

  async restoreSession(
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession | null>> {
    const token = readToken();
    if (!token) return responseEnvelope(null, traceId);
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
        message === "session_expired" ||
        message === "session_not_found"
      ) {
        writeToken(null);
        writeSession(null);
        return responseEnvelope(null, traceId);
      }
      writeToken(null);
      writeSession(null);
      return responseEnvelope(null, traceId);
    }
  },

  async logout(traceId: string): Promise<void> {
    const token = readToken();
    if (!token) return;
    try {
      await requestJson(
        "/api/v1/identity/session/logout",
        { method: "POST", body: JSON.stringify({}) },
        traceId,
        true,
      );
    } finally {
      writeToken(null);
      writeSession(null);
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

  async listDemoPersonas(
    traceId: string,
  ): Promise<ResponseEnvelope<z.infer<typeof demoPersonaListSchema>>> {
    const response = await requestJson<unknown>(
      "/api/v1/identity/demo/personas",
      { method: "GET" },
      traceId,
      true,
    );
    return responseEnvelope(demoPersonaListSchema.parse(response.data), traceId);
  },

  async switchDemoPersona(
    payload: { targetActorId: string; targetRole: string },
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession>> {
    const response = await requestJson<{
      access_token: string;
      session: IdentitySession;
    }>(
      "/api/v1/identity/session/demo/switch",
      {
        method: "POST",
        body: JSON.stringify({
          target_actor_id: payload.targetActorId,
          target_role: payload.targetRole,
        }),
      },
      traceId,
      true,
    );
    writeToken(response.data.access_token);
    writeSession(response.data.session);
    storeQueueSnapshot(seedQueue(response.data.session, traceId));
    return responseEnvelope(response.data.session, traceId);
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
    return responseEnvelope(getStoredQueueSnapshot(), traceId);
  },

  storeQueue(snapshot: OfflineQueueSnapshot): void {
    storeQueueSnapshot(snapshot);
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

export type ActorRole = PreviewRole;
export type { ConnectivityState };
export type ActorSearchItem = z.infer<typeof actorSearchItemSchema>;
export type DemoPersona = z.infer<typeof demoPersonaSchema>;
