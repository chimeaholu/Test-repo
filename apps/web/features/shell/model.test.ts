import { describe, expect, it } from "vitest";
import type { IdentitySession } from "@agrodomain/contracts";

import { getRouteDecision, homeRouteForRole } from "@/features/shell/model";

const consentGrantedSession: IdentitySession = {
  actor: {
    actor_id: "actor-1",
    country_code: "GH",
    display_name: "Ama",
    email: "ama@example.com",
    locale: "en-GH",
    membership: {
      organization_id: "org-1",
      organization_name: "Org",
      role: "farmer" as const,
    },
    role: "farmer" as const,
  },
  available_roles: ["farmer" as const],
  consent: {
    actor_id: "actor-1",
    captured_at: "2026-04-18T00:00:00.000Z",
    channel: "pwa",
    country_code: "GH",
    policy_version: "2026.04.w1",
    revoked_at: null,
    scope_ids: ["identity.core"],
    state: "consent_granted" as const,
  },
};

describe("route guards", () => {
  it("redirects anonymous users to sign in", () => {
    expect(getRouteDecision("/app/farmer", null)).toEqual({
      allowed: false,
      redirectTo: "/signin",
      reason: "signin_required",
    });
  });

  it("redirects consent-pending users to onboarding", () => {
    const session = {
      ...consentGrantedSession,
      consent: { ...consentGrantedSession.consent, state: "consent_pending" as const },
    };
    expect(getRouteDecision("/app/farmer", session)).toEqual({
      allowed: false,
      redirectTo: "/onboarding/consent",
      reason: "consent_required",
    });
  });

  it("redirects role mismatches to the actor home route", () => {
    expect(getRouteDecision("/app/admin", consentGrantedSession)).toEqual({
      allowed: false,
      redirectTo: homeRouteForRole("farmer"),
      reason: "role_mismatch",
    });
  });
});
