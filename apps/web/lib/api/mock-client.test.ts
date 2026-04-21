import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OfflineQueueItem } from "@agrodomain/contracts";
import { schemaVersion } from "@agrodomain/contracts";

import { agroApiClient } from "@/lib/api/mock-client";

describe("api client", () => {
  beforeEach(() => {
    agroApiClient.clear();
    vi.restoreAllMocks();
  });

  it("persists sign-in and consent lifecycle end to end", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "session-token",
          session: {
            actor: {
              actor_id: "actor-farmer-gh-ama",
              display_name: "Ama Mensah",
              email: "ama@example.com",
              role: "farmer",
              country_code: "GH",
              locale: "en-GH",
              membership: {
                organization_id: "org-gh-01",
                organization_name: "Ghana Growers Network",
                role: "farmer",
              },
            },
            consent: {
              actor_id: "actor-farmer-gh-ama",
              country_code: "GH",
              state: "identified",
              policy_version: null,
              scope_ids: [],
              channel: null,
              captured_at: null,
              revoked_at: null,
            },
            available_roles: ["farmer"],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          actor: {
            actor_id: "actor-farmer-gh-ama",
            display_name: "Ama Mensah",
            email: "ama@example.com",
            role: "farmer",
            country_code: "GH",
            locale: "en-GH",
            membership: {
              organization_id: "org-gh-01",
              organization_name: "Ghana Growers Network",
              role: "farmer",
            },
          },
          consent: {
            actor_id: "actor-farmer-gh-ama",
            country_code: "GH",
            state: "consent_granted",
            policy_version: "2026.04.w1",
            scope_ids: ["identity.core", "workflow.audit"],
            channel: "pwa",
            captured_at: "2026-04-18T00:00:00.000Z",
            revoked_at: null,
          },
          available_roles: ["farmer"],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reason: "manual_review",
          session: {
            actor: {
              actor_id: "actor-farmer-gh-ama",
              display_name: "Ama Mensah",
              email: "ama@example.com",
              role: "farmer",
              country_code: "GH",
              locale: "en-GH",
              membership: {
                organization_id: "org-gh-01",
                organization_name: "Ghana Growers Network",
                role: "farmer",
              },
            },
            consent: {
              actor_id: "actor-farmer-gh-ama",
              country_code: "GH",
              state: "consent_revoked",
              policy_version: "2026.04.w1",
              scope_ids: ["identity.core", "workflow.audit"],
              channel: "pwa",
              captured_at: "2026-04-18T00:00:00.000Z",
              revoked_at: "2026-04-18T01:00:00.000Z",
            },
            available_roles: ["farmer"],
          },
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const signInResponse = await agroApiClient.signIn(
      {
        country_code: "GH",
        display_name: "Ama Mensah",
        email: "ama@example.com",
        role: "farmer",
      },
      "trace-signin",
    );
    expect(signInResponse.metadata.schema_version).toBe(schemaVersion);
    expect(signInResponse.metadata.correlation_id).toBe("trace-signin");

    const signedIn = signInResponse.data;
    expect(signedIn.consent.state).toBe("identified");

    const pending = agroApiClient.markConsentPending("trace-pending").data;
    expect(pending?.consent.state).toBe("consent_pending");

    const granted = (
      await agroApiClient.captureConsent(
      {
        captured_at: "2026-04-18T00:00:00.000Z",
        policy_version: "2026.04.w1",
        scope_ids: ["identity.core", "workflow.audit"],
      },
      "trace-grant",
    )
    ).data;
    expect(granted?.consent.state).toBe("consent_granted");

    const protectedAction = agroApiClient.evaluateProtectedAction("trace-gate").data;
    expect(protectedAction.allowed).toBe(true);

    const revoked = (await agroApiClient.revokeConsent("manual_review", "trace-revoke")).data;
    expect(revoked?.consent.state).toBe("consent_revoked");

    const blocked = agroApiClient.evaluateProtectedAction("trace-blocked").data;
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason_code).toBe("consent_required");
  });

  it("replays offline queue items through the backend command lifecycle", async () => {
    window.localStorage.setItem("agrodomain.session-token.v1", "session-token");
    const item: OfflineQueueItem = {
      attempt_count: 0,
      conflict_code: null,
      created_at: "2026-04-18T00:00:00.000Z",
      envelope: {
        metadata: {
          actor_id: "actor-farmer-gh-ama",
          channel: "pwa",
          correlation_id: "trace-offline",
          country_code: "GH",
          idempotency_key: "idem-offline-1",
          occurred_at: "2026-04-18T00:00:00.000Z",
          request_id: "req-offline-1",
          schema_version: schemaVersion,
          traceability: {
            data_check_ids: ["offline_queue"],
            journey_ids: ["offline:wf-1"],
          },
        },
        command: {
          aggregate_ref: "wf-1",
          mutation_scope: "marketplace.listings",
          name: "market.listings.create",
          payload: {
            workflow_id: "wf-1",
            intent: "market.listings.create",
            payload: { crop: "Cassava" },
          },
        },
      },
      idempotency_key: "idem-offline-1",
      intent: "market.listings.create",
      item_id: "offline-1",
      last_error_code: null,
      payload: { crop: "Cassava" },
      result_ref: null,
      state: "queued",
      workflow_id: "wf-1",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "accepted",
        request_id: "req-offline-1",
        idempotency_key: "idem-offline-1",
        result: {
          schema_version: schemaVersion,
          listing: {
            schema_version: schemaVersion,
            listing_id: "listing-123",
            actor_id: "actor-farmer-gh-ama",
            country_code: "GH",
            title: "Cassava",
            commodity_code: "cassava",
            quantity: 4,
            unit: "tons",
            price_per_unit: 100,
            currency: "GHS",
            status: "draft",
            delivery_window_start: "2026-04-20T00:00:00.000Z",
            delivery_window_end: "2026-04-30T00:00:00.000Z",
            origin_location: "Tamale",
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-18T00:00:00.000Z",
            revision_count: 1,
          },
        },
        audit_event_id: 11,
        replayed: false,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await agroApiClient.replayOfflineQueueItem(item, "farmer", "trace-offline");

    expect(response.data.result_ref).toBe("listing-123");
    expect(response.data.retryable).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
