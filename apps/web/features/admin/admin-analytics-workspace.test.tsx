import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseAppState, mockAgroApiClient } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockAgroApiClient: {
    getStoredAccessToken: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/mock-client", () => ({
  agroApiClient: mockAgroApiClient,
}));

import { AdminAnalyticsWorkspace } from "@/features/admin/admin-analytics-workspace";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("admin analytics workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppState.mockReturnValue({
      session: {
        actor: {
          actor_id: "actor-admin",
          display_name: "Admin Operator",
          email: "admin@example.com",
          role: "admin",
          country_code: "GH",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Org 1",
            role: "admin",
          },
        },
        consent: {
          actor_id: "actor-admin",
          country_code: "GH",
          state: "consent_granted",
          policy_version: "2026.04.w1",
          scope_ids: ["identity.core", "workflow.audit"],
          channel: "pwa",
          captured_at: "2026-04-18T00:00:00.000Z",
          revoked_at: null,
        },
        available_roles: ["admin"],
      },
      traceId: "trace-admin",
    });
    mockAgroApiClient.getStoredAccessToken.mockReturnValue("admin-token");
  });

  it("shows an explicit authorization error when admin APIs return forbidden", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: { error_code: "missing_operator_scope" } }, 403)),
    );

    render(<AdminAnalyticsWorkspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Admin access is required to load this workspace.");
    expect(screen.getByRole("heading", { name: "Platform health and release posture" })).toBeInTheDocument();
  });

  it("does not reload the page when rollout mutation is forbidden", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse({
          service_name: "admin_control_plane",
          health_state: "degraded",
          healthy_records: 0,
          degraded_records: 1,
          empty_records: 0,
          last_recorded_at: null,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          readiness_status: "blocked",
          telemetry_freshness_state: "breached",
          blocking_reasons: [],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ detail: { error_code: "missing_rollout_scope" } }, 403));
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAnalyticsWorkspace />);

    expect(await screen.findByRole("button", { name: "Freeze rollout" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Freeze rollout" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Admin access is required to change rollout state.");
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});
