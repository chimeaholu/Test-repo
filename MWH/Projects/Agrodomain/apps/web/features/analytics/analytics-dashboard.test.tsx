import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const {
  mockAdvisoryApi,
  mockClimateApi,
  mockMarketplaceApi,
  mockUseAppState,
  mockWalletApi,
} = vi.hoisted(() => ({
  mockAdvisoryApi: {
    listConversations: vi.fn(),
  },
  mockClimateApi: {
    listRuntime: vi.fn(),
  },
  mockMarketplaceApi: {
    listListings: vi.fn(),
    listNegotiations: vi.fn(),
  },
  mockUseAppState: vi.fn(),
  mockWalletApi: {
    getWalletSummary: vi.fn(),
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

vi.mock("@/lib/api/marketplace", () => ({
  marketplaceApi: mockMarketplaceApi,
}));

vi.mock("@/lib/api/wallet", () => ({
  walletApi: mockWalletApi,
}));

import { AnalyticsDashboardClient } from "@/features/analytics/analytics-dashboard";

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

describe("analytics dashboard", () => {
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
          actor_id: "actor-farmer",
          country_code: "GH",
          display_name: "Farmer Ama",
          email: "farmer@example.com",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Farm Org",
            role: "farmer",
          },
          role: "farmer",
        },
        consent: {
          actor_id: "actor-farmer",
          captured_at: isoDaysAgo(1),
          channel: "pwa",
          country_code: "GH",
          policy_version: "2026.04.w1",
          revoked_at: null,
          scope_ids: ["identity.core"],
          state: "consent_granted",
        },
        available_roles: ["farmer"],
      },
      traceId: "trace-analytics",
    });
    mockMarketplaceApi.listListings.mockResolvedValue({
      data: {
        items: [
          {
            actor_id: "actor-farmer",
            commodity: "maize",
            country_code: "GH",
            created_at: isoDaysAgo(24),
            has_unpublished_changes: false,
            listing_id: "listing-1",
            location: "Tamale",
            price_amount: 420,
            price_currency: "GHS",
            published_at: isoDaysAgo(23),
            published_revision_number: 1,
            quantity_tons: 10,
            revision_count: 1,
            revision_number: 1,
            schema_version: "2026.04.r7",
            status: "published",
            summary: "Fresh maize lot",
            title: "Fresh maize lot",
            updated_at: isoDaysAgo(5),
            view_scope: "buyer_safe",
          },
          {
            actor_id: "actor-farmer",
            commodity: "maize",
            country_code: "GH",
            created_at: isoDaysAgo(40),
            has_unpublished_changes: false,
            listing_id: "listing-2",
            location: "Tamale",
            price_amount: 300,
            price_currency: "GHS",
            published_at: isoDaysAgo(39),
            published_revision_number: 1,
            quantity_tons: 8,
            revision_count: 1,
            revision_number: 1,
            schema_version: "2026.04.r7",
            status: "published",
            summary: "Stored maize lot",
            title: "Stored maize lot",
            updated_at: isoDaysAgo(20),
            view_scope: "buyer_safe",
          },
        ],
      },
    });
    mockMarketplaceApi.listNegotiations.mockResolvedValue({
      data: {
        items: [
          {
            buyer_actor_id: "actor-buyer",
            confirmation_checkpoint: null,
            country_code: "GH",
            created_at: isoDaysAgo(5),
            current_offer_amount: 420,
            current_offer_currency: "GHS",
            last_action_at: isoDaysAgo(5),
            listing_id: "listing-1",
            messages: [],
            schema_version: "2026.04.r7",
            seller_actor_id: "actor-farmer",
            status: "accepted",
            thread_id: "thread-1",
            updated_at: isoDaysAgo(5),
          },
        ],
      },
    });
    mockWalletApi.listEscrows.mockResolvedValue({
      data: {
        items: [
          {
            amount: 420,
            buyer_actor_id: "actor-buyer",
            country_code: "GH",
            created_at: isoDaysAgo(5),
            currency: "GHS",
            disputed_at: null,
            escrow_id: "escrow-1",
            funded_at: isoDaysAgo(5),
            listing_id: "listing-1",
            partner_reason_code: null,
            partner_reference: null,
            released_at: isoDaysAgo(2),
            reversed_at: null,
            schema_version: "2026.04.r7",
            seller_actor_id: "actor-farmer",
            state: "released",
            thread_id: "thread-1",
            timeline: [],
            updated_at: isoDaysAgo(2),
          },
          {
            amount: 300,
            buyer_actor_id: "actor-buyer-2",
            country_code: "GH",
            created_at: isoDaysAgo(20),
            currency: "GHS",
            disputed_at: null,
            escrow_id: "escrow-2",
            funded_at: isoDaysAgo(20),
            listing_id: "listing-2",
            partner_reason_code: null,
            partner_reference: null,
            released_at: isoDaysAgo(19),
            reversed_at: null,
            schema_version: "2026.04.r7",
            seller_actor_id: "actor-farmer",
            state: "released",
            thread_id: "thread-2",
            timeline: [],
            updated_at: isoDaysAgo(19),
          },
        ],
        schema_version: "2026.04.r7",
      },
    });
    mockWalletApi.listWalletTransactions.mockResolvedValue({
      data: {
        items: [],
        schema_version: "2026.04.r7",
        wallet: null,
      },
    });
    mockWalletApi.getWalletSummary.mockResolvedValue({
      data: {
        available_balance: 900,
        balance_version: 1,
        country_code: "GH",
        currency: "GHS",
        held_balance: 0,
        last_entry_sequence: 1,
        last_reconciliation_marker: null,
        schema_version: "2026.04.r7",
        total_balance: 900,
        updated_at: isoDaysAgo(2),
        wallet_actor_id: "actor-farmer",
        wallet_id: "wallet-1",
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
    mockAdvisoryApi.listConversations.mockResolvedValue({
      data: {
        items: [],
      },
    });
  });

  it("updates derived metrics when the date range changes", async () => {
    render(<AnalyticsDashboardClient />);

    const initialRevenue = await screen.findByRole("region", { name: /Total Revenue: GHS/i });
    expect(initialRevenue).toHaveAttribute("aria-label", expect.stringContaining("720"));

    fireEvent.click(screen.getByTestId("analytics-range-7d"));

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Total Revenue: GHS/i })).toHaveAttribute(
        "aria-label",
        expect.stringContaining("420"),
      );
    });
    expect(screen.getByTestId("analytics-trend-chart")).toBeInTheDocument();
  });

  it("renders an explicit empty state when there is no relevant activity", async () => {
    mockMarketplaceApi.listListings.mockResolvedValueOnce({ data: { items: [] } });
    mockMarketplaceApi.listNegotiations.mockResolvedValueOnce({ data: { items: [] } });
    mockWalletApi.listEscrows.mockResolvedValueOnce({ data: { items: [], schema_version: "2026.04.r7" } });

    render(<AnalyticsDashboardClient />);

    expect(await screen.findByTestId("analytics-empty-state")).toBeInTheDocument();
    expect(screen.getAllByText(/Not enough data yet/i).length).toBeGreaterThan(0);
  });
});
