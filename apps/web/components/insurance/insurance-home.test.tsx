import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { mockUseAppState, mockInsuranceApi } = vi.hoisted(() => ({
  mockInsuranceApi: {
    getDashboard: vi.fn(),
    purchaseCoverage: vi.fn(),
  },
  mockUseAppState: vi.fn(),
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/insurance", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/insurance")>("@/lib/api/insurance");
  return {
    ...actual,
    insuranceApi: mockInsuranceApi,
  };
});

import { InsuranceHome } from "@/components/insurance/insurance-home";

describe("insurance home", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAppState.mockReturnValue({
      queue: { connectivity_state: "online", handoff_channel: null, items: [] },
      session: {
        actor: {
          actor_id: "demo:farmer",
          country_code: "GH",
          display_name: "Kwame Asante",
          email: "kwame@example.com",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Ghana Growers Network",
            role: "farmer",
          },
          role: "farmer",
        },
        available_roles: ["farmer"],
        consent: {
          actor_id: "demo:farmer",
          captured_at: "2026-04-20T00:00:00.000Z",
          channel: "pwa",
          country_code: "GH",
          policy_version: "2026.04",
          revoked_at: null,
          scope_ids: ["identity.core"],
          state: "consent_granted",
        },
      },
      traceId: "trace-insurance",
    });

    mockInsuranceApi.getDashboard.mockResolvedValue({
      data: {
        claims: [
          {
            claim_amount: 2600,
            claim_id: "claim-001",
            coverage_amount: 3600,
            coverage_type: "flood",
            currency: "GHS",
            detail: "Rainfall crossed the insured threshold for the latest source window.",
            evidence_count: 2,
            field: {
              crop_type: "Maize",
              district: "Tamale Metropolitan",
              farm_id: "farm-001",
              farm_name: "Asante Maize Fields",
              hectares: 12.5,
              latitude: null,
              longitude: null,
              risk_level: "guarded",
            },
            payout_reference: "PAYOUT-001",
            payout_to: "AgroWallet",
            policy_id: "policy-001",
            reported_at: "2026-04-20T00:00:00.000Z",
            status: "processing",
            timeline: [
              { at: "2026-04-20T00:00:00.000Z", id: "triggered", label: "Triggered" },
              { at: "2026-04-21T00:00:00.000Z", id: "verified", label: "Verified" },
              { at: "2026-04-22T00:00:00.000Z", id: "processing", label: "Processing" },
            ],
            title: "Heavy rainfall expected — Tamale district",
            trigger_condition: "Rainfall exceeded the configured flood threshold in the monitored source window.",
          },
        ],
        fields: [
          {
            crop_type: "Maize",
            district: "Tamale Metropolitan",
            farm_id: "farm-001",
            farm_name: "Asante Maize Fields",
            hectares: 12.5,
            latitude: null,
            longitude: null,
            risk_level: "guarded",
          },
        ],
        kpis: {
          active_claims: 1,
          total_coverage: 3600,
          total_payouts_received: 0,
          total_premiums_reserved: 280,
        },
        policies: [
          {
            active_claim_count: 1,
            coverage_amount: 3600,
            coverage_type: "flood",
            coverage_window_label: "Main season 2026",
            currency: "GHS",
            field: {
              crop_type: "Maize",
              district: "Tamale Metropolitan",
              farm_id: "farm-001",
              farm_name: "Asante Maize Fields",
              hectares: 12.5,
              latitude: null,
              longitude: null,
              risk_level: "guarded",
            },
            payment_reference: "AGROSHIELD-0001",
            policy_id: "policy-001",
            premium_amount: 280,
            provider_name: "AgroShield Climate Pool",
            purchased_at: "2026-04-18T00:00:00.000Z",
            status: "active",
            weather_link_label: "Heavy rainfall expected — Tamale district",
          },
        ],
        wallet: {
          available_after_reserve: 4720,
          available_balance: 5000,
          currency: "GHS",
          total_balance: 6200,
        },
      },
    });
    mockInsuranceApi.purchaseCoverage.mockResolvedValue({ data: {} });
  });

  it("renders the AgroShield dashboard with policies and claims", async () => {
    render(<InsuranceHome />);

    expect(await screen.findByText("Keep coverage, claims, and weather-backed protection in one place")).toBeInTheDocument();
    expect(screen.getAllByText("Asante Maize Fields").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Heavy rainfall expected — Tamale district").length).toBeGreaterThan(0);
    expect(screen.getByText("Add protection")).toBeInTheDocument();
  });
});
