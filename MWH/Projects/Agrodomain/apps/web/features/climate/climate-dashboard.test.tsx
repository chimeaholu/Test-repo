import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAdvisoryApi, mockClimateApi, mockUseAppState } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockClimateApi: {
    acknowledgeAlert: vi.fn(),
    getFarmProfile: vi.fn(),
    listObservations: vi.fn(),
    listRuntime: vi.fn(),
  },
  mockAdvisoryApi: {
    listConversations: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/climate", () => ({
  climateApi: mockClimateApi,
}));

vi.mock("@/lib/api/advisory", () => ({
  advisoryApi: mockAdvisoryApi,
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
    mockClimateApi.listRuntime.mockResolvedValue({
      data: {
        runtime_mode: "fallback",
        alerts: [
          {
            alert_id: "alert-1",
            farm_profile_id: "farm-1",
            country_code: "GH",
            locale: "en-GH",
            severity: "critical",
            title: "Heavy rainfall expected",
            summary: "Two heavy rain windows raise root stress risk.",
            source_ids: ["source-1"],
            degraded_mode: false,
            acknowledged: false,
            created_at: "2026-04-18T12:00:00.000Z",
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
    mockClimateApi.getFarmProfile.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave4",
        farm_id: "farm-1",
        actor_id: "actor-farmer",
        country_code: "GH",
        farm_name: "Tamale lowland block",
        district: "Tamale",
        crop_type: "maize",
        hectares: 12.5,
        latitude: 9.4,
        longitude: -0.85,
        metadata: {},
        created_at: "2026-04-18T00:00:00.000Z",
        updated_at: "2026-04-18T00:00:00.000Z",
      },
    });
    mockClimateApi.listObservations.mockResolvedValue({
      data: [
        {
          schema_version: "2026-04-18.wave4",
          observation_id: "obs-1",
          farm_id: "farm-1",
          actor_id: "actor-farmer",
          country_code: "GH",
          source_id: "source-1",
          source_type: "station",
          observed_at: "2026-04-18T12:00:00.000Z",
          source_window_start: "2026-04-18T09:00:00.000Z",
          source_window_end: "2026-04-18T12:00:00.000Z",
          rainfall_mm: 28,
          temperature_c: 31,
          soil_moisture_pct: 66,
          anomaly_score: 0.52,
          ingestion_state: "accepted",
          degraded_mode: false,
          degraded_reason_codes: [],
          assumptions: [],
          provenance: [],
          normalized_payload: {
            humidity_pct: 76,
            uv_index: 8,
            wind_kph: 18,
          },
          farm_profile: null,
          created_at: "2026-04-18T12:00:00.000Z",
        },
      ],
    });
    mockClimateApi.acknowledgeAlert.mockResolvedValue({
      data: {
        alert_id: "alert-1",
        actor_id: "actor-farmer",
        acknowledged_at: "2026-04-18T12:05:00.000Z",
        note: "Acknowledged from test.",
        schema_version: "2026-04-18.wave4",
      },
    });
    mockAdvisoryApi.listConversations.mockResolvedValue({
      data: {
        items: [
          {
            advisory_request_id: "adv-1",
            advisory_conversation_id: "conversation-1",
            actor_id: "actor-farmer",
            country_code: "GH",
            locale: "en-GH",
            topic: "Rainfall follow-up",
            question_text: "Should I fertilize after heavy rain?",
            response_text: "Wait until drainage clears before you top-dress the maize rows.",
            status: "delivered",
            confidence_band: "high",
            confidence_score: 0.91,
            grounded: true,
            citations: [],
            transcript_entries: [],
            reviewer_decision: null,
            source_ids: ["source-1"],
            model_name: "agro-advisor",
            model_version: "n4",
            correlation_id: "trace-1",
            request_id: "req-1",
            delivered_at: "2026-04-18T12:00:00.000Z",
            created_at: "2026-04-18T12:00:00.000Z",
            schema_version: "2026-04-18.wave4",
          },
        ],
      },
    });
  });

  it("renders the weather dashboard and acknowledges alerts", async () => {
    render(<ClimateDashboardClient />);

    expect(await screen.findByText("See what conditions matter most right now")).toBeInTheDocument();
    expect(await screen.findByText("Delay fertilizer on the maize blocks")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Farm location" })).toBeInTheDocument();
    expect(screen.getByText("IPCC Tier 2 Annex 4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));

    await waitFor(() => {
      expect(mockClimateApi.acknowledgeAlert).toHaveBeenCalledWith(
        "alert-1",
        "actor-farmer",
        "trace-climate",
      );
    });
  });
});
