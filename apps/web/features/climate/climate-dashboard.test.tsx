import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAgroApiClient, mockRecordTelemetry, mockUseAppState } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockRecordTelemetry: vi.fn(),
  mockAgroApiClient: {
    acknowledgeClimateAlert: vi.fn(),
    listClimateRuntime: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/mock-client", () => ({
  agroApiClient: mockAgroApiClient,
}));

vi.mock("@/lib/telemetry/client", () => ({
  recordTelemetry: (...args: unknown[]) => mockRecordTelemetry(...args),
}));

import { ClimateDashboardClient } from "@/features/climate/climate-dashboard";

describe("climate dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppState.mockReturnValue({
      session: {
        actor: {
          actor_id: "actor-farmer",
          display_name: "Farmer Kojo",
          email: "farmer@example.com",
          role: "farmer",
          country_code: "GH",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Org 1",
            role: "farmer",
          },
        },
        consent: {
          actor_id: "actor-farmer",
          country_code: "GH",
          state: "consent_granted",
          policy_version: "2026.04.n4",
          scope_ids: ["identity.core", "workflow.audit"],
          channel: "pwa",
          captured_at: "2026-04-18T00:00:00.000Z",
          revoked_at: null,
        },
        available_roles: ["farmer"],
      },
      traceId: "trace-climate",
    });
    mockAgroApiClient.listClimateRuntime.mockResolvedValue({
      data: {
        runtime_mode: "fallback",
        alerts: [
          {
            alert_id: "alert-1",
            farm_profile_id: "farm-1",
            country_code: "GH",
            locale: "en-GH",
            severity: "critical",
            title: "High soil saturation risk",
            summary: "Two heavy rain windows raise root stress risk.",
            source_ids: ["source-1"],
            degraded_mode: true,
            acknowledged: false,
            created_at: "2026-04-18T00:00:00.000Z",
            schema_version: "2026-04-18.wave4",
          },
        ],
        degraded_modes: [
          {
            source_window_id: "window-1",
            country_code: "GH",
            farm_profile_id: "farm-1",
            degraded_mode: true,
            reason_code: "source_window_missing",
            assumptions: ["Radar observations for the last 6 hours are missing."],
            source_ids: ["station-1"],
            detected_at: "2026-04-18T00:00:00.000Z",
            schema_version: "2026-04-18.wave4",
          },
        ],
        evidence_records: [
          {
            evidence_id: "evidence-1",
            farm_profile_id: "farm-1",
            country_code: "GH",
            method_tag: "ipcc-tier-2-soil-moisture",
            assumption_notes: ["North block moisture is estimated from the last verified reading."],
            source_references: [
              {
                source_id: "mrv-source-1",
                title: "Soil moisture field protocol",
                method_reference: "IPCC Tier 2 Annex 4",
              },
            ],
            source_completeness: "partial",
            created_at: "2026-04-18T00:00:00.000Z",
            schema_version: "2026-04-18.wave4",
          },
        ],
      },
    });
    mockAgroApiClient.acknowledgeClimateAlert.mockResolvedValue({
      data: {
        alert_id: "alert-1",
        actor_id: "actor-farmer",
        acknowledged_at: "2026-04-18T00:01:00.000Z",
        note: "Acknowledged from test.",
        schema_version: "2026-04-18.wave4",
      },
    });
  });

  it("renders degraded-mode detail and acknowledges alerts", async () => {
    render(<ClimateDashboardClient />);

    expect(await screen.findByText("Monitor weather risk and field evidence with confidence in view")).toBeInTheDocument();
    expect(screen.getByText("Degraded mode remains visible")).toBeInTheDocument();
    expect(screen.getByText("IPCC Tier 2 Annex 4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Acknowledge alert" }));

    await waitFor(() => {
      expect(mockAgroApiClient.acknowledgeClimateAlert).toHaveBeenCalledWith(
        "alert-1",
        "actor-farmer",
        "trace-climate",
      );
    });
  });
});
