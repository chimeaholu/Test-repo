import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAdvisoryApi,
  mockClimateApi,
  mockIdentityApi,
  mockMarketplaceApi,
  mockSystemApi,
  mockUseAppState,
  mockWalletApi,
} = vi.hoisted(() => ({
  mockAdvisoryApi: {
    listConversations: vi.fn(),
  },
  mockClimateApi: {
    listRuntime: vi.fn(),
  },
  mockIdentityApi: {
    getStoredAccessToken: vi.fn(),
  },
  mockMarketplaceApi: {
    listListings: vi.fn(),
    listNegotiations: vi.fn(),
  },
  mockSystemApi: {
    getSettings: vi.fn(),
  },
  mockUseAppState: vi.fn(),
  mockWalletApi: {
    listEscrows: vi.fn(),
    listWalletTransactions: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/advisory", () => ({
  advisoryApi: mockAdvisoryApi,
}));

vi.mock("@/lib/api/climate", () => ({
  climateApi: mockClimateApi,
}));

vi.mock("@/lib/api/identity", () => ({
  identityApi: mockIdentityApi,
}));

vi.mock("@/lib/api/marketplace", () => ({
  marketplaceApi: mockMarketplaceApi,
}));

vi.mock("@/lib/api/system", () => ({
  systemApi: mockSystemApi,
}));

vi.mock("@/lib/api/wallet", () => ({
  walletApi: mockWalletApi,
}));

import { AdminAnalyticsWorkspace } from "@/features/admin/admin-analytics-workspace";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

describe("admin analytics workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppState.mockReturnValue({
      queue: {
        connectivity_state: "online",
        handoff_channel: null,
        items: [],
      },
      session: {
        actor: {
          actor_id: "actor-admin",
          country_code: "GH",
          display_name: "Admin Operator",
          email: "admin@example.com",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Org 1",
            role: "admin",
          },
          role: "admin",
        },
        consent: {
          actor_id: "actor-admin",
          captured_at: "2026-04-18T00:00:00.000Z",
          channel: "pwa",
          country_code: "GH",
          policy_version: "2026.04.w1",
          revoked_at: null,
          scope_ids: ["identity.core", "workflow.audit"],
          state: "consent_granted",
        },
        available_roles: ["admin"],
      },
      traceId: "trace-admin",
    });
    mockIdentityApi.getStoredAccessToken.mockReturnValue("admin-token");
    mockSystemApi.getSettings.mockResolvedValue({
      data: {
        app_name: "Agrodomain",
        environment: "test",
        request_id: "trace-admin",
        schema_version: "2026-04-25.wave7",
      },
    });
    mockMarketplaceApi.listListings.mockResolvedValue({
      data: {
        items: [
          {
            actor_id: "actor-farmer",
            commodity: "maize",
            country_code: "GH",
            created_at: "2026-04-18T00:00:00.000Z",
            has_unpublished_changes: false,
            listing_id: "listing-1",
            location: "Tamale",
            price_amount: 420,
            price_currency: "GHS",
            published_at: "2026-04-18T00:00:00.000Z",
            published_revision_number: 1,
            quantity_tons: 12,
            revision_count: 1,
            revision_number: 1,
            schema_version: "2026.04.r7",
            status: "published",
            summary: "Fresh maize lot",
            title: "Fresh maize lot",
            updated_at: "2026-04-20T00:00:00.000Z",
            view_scope: "buyer_safe",
          },
        ],
      },
    });
    mockMarketplaceApi.listNegotiations.mockResolvedValue({
      data: {
        items: [
          {
            body: undefined,
            buyer_actor_id: "actor-buyer",
            confirmation_checkpoint: null,
            country_code: "GH",
            created_at: "2026-04-20T00:00:00.000Z",
            current_offer_amount: 410,
            current_offer_currency: "GHS",
            last_action_at: "2026-04-20T02:00:00.000Z",
            listing_id: "listing-1",
            messages: [],
            schema_version: "2026.04.r7",
            seller_actor_id: "actor-farmer",
            status: "accepted",
            thread_id: "thread-1",
            updated_at: "2026-04-20T02:00:00.000Z",
          },
        ],
      },
    });
    mockWalletApi.listEscrows.mockResolvedValue({
      data: {
        items: [
          {
            amount: 410,
            buyer_actor_id: "actor-buyer",
            country_code: "GH",
            created_at: "2026-04-20T00:00:00.000Z",
            currency: "GHS",
            disputed_at: null,
            escrow_id: "escrow-1",
            funded_at: "2026-04-20T01:00:00.000Z",
            listing_id: "listing-1",
            partner_reason_code: null,
            partner_reference: null,
            released_at: "2026-04-21T00:00:00.000Z",
            reversed_at: null,
            schema_version: "2026.04.r7",
            seller_actor_id: "actor-farmer",
            state: "released",
            thread_id: "thread-1",
            timeline: [],
            updated_at: "2026-04-21T00:00:00.000Z",
          },
        ],
        schema_version: "2026.04.r7",
      },
    });
    mockWalletApi.listWalletTransactions.mockResolvedValue({
      data: {
        items: [
          {
            amount: 410,
            created_at: "2026-04-21T00:00:00.000Z",
            currency: "GHS",
            direction: "credit",
            entry_id: "entry-1",
            reason: "escrow_released",
          },
        ],
        schema_version: "2026.04.r7",
        wallet: null,
      },
    });
    mockAdvisoryApi.listConversations.mockResolvedValue({
      data: {
        items: [
          {
            actor_id: "actor-advisor",
            citations: [{ source_id: "src-1" }],
            created_at: "2026-04-20T00:00:00.000Z",
          },
        ],
      },
    });
    mockClimateApi.listRuntime.mockResolvedValue({
      data: {
        alerts: [],
        degraded_modes: [],
        evidence_records: [],
        runtime_mode: "live",
      },
    });
  });

  it("falls back to derived runtime analytics when optional admin control endpoints are unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ detail: { error_code: "missing_operator_scope" } }, 403))
        .mockResolvedValueOnce(jsonResponse({ detail: { error_code: "missing_operator_scope" } }, 403))
        .mockResolvedValueOnce(jsonResponse({ detail: { error_code: "missing_operator_scope" } }, 403))
        .mockResolvedValueOnce(jsonResponse({ detail: { error_code: "missing_operator_scope" } }, 403)),
    );

    render(<AdminAnalyticsWorkspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Showing derived analytics from live runtime data.");
    expect(screen.getByText(/Platform health, growth, and release posture/i)).toBeInTheDocument();
    expect(screen.getByTestId("admin-growth-chart")).toBeInTheDocument();
  });

  it("shows a mutation error when rollout control is forbidden", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          degraded_records: 0,
          empty_records: 0,
          health_state: "healthy",
          healthy_records: 1,
          last_recorded_at: "2026-04-21T00:00:00.000Z",
          service_name: "admin_control_plane",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          blocking_reasons: [],
          readiness_status: "ready",
          telemetry_freshness_state: "current",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ detail: { error_code: "missing_rollout_scope" } }, 403));
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminAnalyticsWorkspace />);

    expect(await screen.findByRole("button", { name: "Freeze rollout" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Freeze rollout" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Admin API error: missing_rollout_scope");
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
