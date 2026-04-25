import { beforeEach, describe, expect, it, vi } from "vitest";
import { schemaVersion } from "@agrodomain/contracts";

import { agroApiClient } from "@/lib/api/api-client";

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
});
