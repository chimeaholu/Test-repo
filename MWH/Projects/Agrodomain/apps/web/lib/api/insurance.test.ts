import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockReadJson,
  mockReadSession,
  mockRequestJson,
  mockWalletApi,
  mockWriteJson,
} = vi.hoisted(() => ({
  mockReadJson: vi.fn(),
  mockReadSession: vi.fn(),
  mockRequestJson: vi.fn(),
  mockWalletApi: {
    getWalletSummary: vi.fn(),
  },
  mockWriteJson: vi.fn(),
}));

vi.mock("../api-client", async () => {
  const actual = await vi.importActual<typeof import("../api-client")>("../api-client");
  return {
    ...actual,
    readJson: mockReadJson,
    readSession: mockReadSession,
    requestJson: mockRequestJson,
    writeJson: mockWriteJson,
  };
});

vi.mock("./wallet", () => ({
  walletApi: mockWalletApi,
}));

import { insuranceApi } from "@/lib/api/insurance";

describe("insurance api", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockReadSession.mockReturnValue({
      actor: {
        actor_id: "actor-farmer-gh-ama",
        country_code: "GH",
        display_name: "Ama Mensah",
        email: "ama@example.com",
        locale: "en-GH",
        membership: {
          organization_id: "org-gh-01",
          organization_name: "Ghana Growers Network",
          role: "farmer",
        },
        role: "farmer",
      },
      available_roles: ["farmer"],
      consent: {
        actor_id: "actor-farmer-gh-ama",
        captured_at: "2026-04-18T00:00:00.000Z",
        channel: "pwa",
        country_code: "GH",
        policy_version: "2026.04",
        revoked_at: null,
        scope_ids: ["identity.core"],
        state: "consent_granted",
      },
    });
    mockReadJson.mockReturnValue([]);
    mockWalletApi.getWalletSummary.mockResolvedValue({
      data: {
        available_balance: 5000,
        currency: "GHS",
        total_balance: 6200,
      },
    });
    mockRequestJson.mockImplementation((path: string) => {
      if (path === "/api/v1/climate/alerts") {
        return Promise.resolve({ data: [] });
      }
      if (path === "/api/v1/climate/evidence") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("creates a reachable claim detail fallback when no live claims exist", async () => {
    const response = await insuranceApi.getDashboard("trace-insurance");

    expect(response.data.policies).toHaveLength(1);
    expect(response.data.claims).toHaveLength(1);
    expect(response.data.claims[0]?.policy_id).toBe(response.data.policies[0]?.policy_id);
    expect(response.data.claims[0]?.claim_id).toContain("-claim-review");
    expect(response.data.kpis.active_claims).toBe(0);
  });
});
