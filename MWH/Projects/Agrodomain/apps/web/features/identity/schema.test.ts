import { describe, expect, it } from "vitest";

import { consentSchema, revokeSchema, signInSchema } from "@/features/identity/schema";

describe("identity schemas", () => {
  it("validates sign-in payloads", () => {
    expect(
      signInSchema.safeParse({
        countryCode: "GH",
        displayName: "Ama Mensah",
        email: "ama@example.com",
        role: "farmer",
      }).success,
    ).toBe(true);
  });

  it("requires enough consent scopes", () => {
    const result = consentSchema.safeParse({
      accepted: true,
      policyVersion: "2026.04.w1",
      scopeIds: ["identity.core"],
    });
    expect(result.success).toBe(false);
  });

  it("requires a non-trivial revoke reason", () => {
    expect(revokeSchema.safeParse({ reason: "short" }).success).toBe(false);
  });
});
