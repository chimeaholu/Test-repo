import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { mockUseAppState, mockMarketplaceApi, mockWalletApi } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockMarketplaceApi: {
    listListings: vi.fn(),
  },
  mockWalletApi: {
    getWalletSummary: vi.fn(),
    listEscrows: vi.fn(),
    listWalletTransactions: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/marketplace", () => ({
  marketplaceApi: mockMarketplaceApi,
}));

vi.mock("@/lib/api/wallet", () => ({
  walletApi: mockWalletApi,
}));

import { FundPortalHome } from "@/components/fund/fund-portal-home";

function buildSession() {
  return {
    actor: {
      actor_id: "actor-investor",
      display_name: "Investor Efua",
      email: "investor@example.com",
      role: "investor",
      country_code: "GH",
      locale: "en-GH",
      membership: {
        organization_id: "org-1",
        organization_name: "Investor Syndicate",
        role: "investor",
      },
    },
    consent: {
      actor_id: "actor-investor",
      country_code: "GH",
      state: "consent_granted",
      policy_version: "2026.04.w1",
      scope_ids: ["identity.core", "workflow.audit"],
      channel: "pwa",
      captured_at: "2026-04-18T00:00:00.000Z",
      revoked_at: null,
    },
    available_roles: ["investor"],
  };
}

describe("fund portal home", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAppState.mockReturnValue({
      queue: { connectivity_state: "online", handoff_channel: null, items: [] },
      session: buildSession(),
      traceId: "trace-fund",
    });

    mockMarketplaceApi.listListings.mockResolvedValue({
      data: {
        items: [
          {
            schema_version: "2026-04-18.wave1",
            listing_id: "listing-maize",
            actor_id: "actor-farmer-1",
            country_code: "GH",
            title: "Green Maize Cluster",
            commodity: "Maize",
            quantity_tons: 40,
            price_amount: 300,
            price_currency: "GHS",
            location: "Tamale, Northern Region, Ghana",
            summary: "Warehouse-ready maize requiring seasonal working capital and storage support.",
            status: "published",
            revision_number: 2,
            published_revision_number: 2,
            revision_count: 2,
            has_unpublished_changes: false,
            view_scope: "buyer_safe",
            published_at: "2026-04-18T00:00:00.000Z",
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-18T00:00:00.000Z",
          },
          {
            schema_version: "2026-04-18.wave1",
            listing_id: "listing-cocoa",
            actor_id: "actor-farmer-2",
            country_code: "GH",
            title: "Cocoa Valley Program",
            commodity: "Cocoa",
            quantity_tons: 25,
            price_amount: 800,
            price_currency: "GHS",
            location: "Kumasi, Ashanti Region, Ghana",
            summary: "Input and processing capital for a verified cocoa aggregation and drying cycle.",
            status: "published",
            revision_number: 3,
            published_revision_number: 3,
            revision_count: 3,
            has_unpublished_changes: false,
            view_scope: "buyer_safe",
            published_at: "2026-04-18T00:00:00.000Z",
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-18T00:00:00.000Z",
          },
        ],
      },
    });

    mockWalletApi.listEscrows.mockResolvedValue({
      data: {
        items: [
          {
            schema_version: "2026-04-18.wave1",
            escrow_id: "escrow-1",
            thread_id: "thread-1",
            listing_id: "listing-maize",
            buyer_actor_id: "buyer-1",
            seller_actor_id: "seller-1",
            country_code: "GH",
            currency: "GHS",
            amount: 4200,
            state: "funded",
            partner_reference: null,
            partner_reason_code: null,
            funded_at: "2026-04-18T00:00:00.000Z",
            released_at: null,
            reversed_at: null,
            disputed_at: null,
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-18T00:00:00.000Z",
            timeline: [],
          },
          {
            schema_version: "2026-04-18.wave1",
            escrow_id: "escrow-2",
            thread_id: "thread-2",
            listing_id: "listing-cocoa",
            buyer_actor_id: "buyer-2",
            seller_actor_id: "seller-2",
            country_code: "GH",
            currency: "GHS",
            amount: 9800,
            state: "released",
            partner_reference: null,
            partner_reason_code: null,
            funded_at: "2026-04-18T00:00:00.000Z",
            released_at: "2026-04-19T00:00:00.000Z",
            reversed_at: null,
            disputed_at: null,
            created_at: "2026-04-18T00:00:00.000Z",
            updated_at: "2026-04-19T00:00:00.000Z",
            timeline: [],
          },
        ],
      },
    });

    mockWalletApi.listWalletTransactions.mockResolvedValue({
      data: {
        items: [
          {
            schema_version: "2026-04-18.wave1",
            entry_id: "entry-1",
            wallet_id: "wallet-1",
            wallet_actor_id: "actor-investor",
            counterparty_actor_id: "seller-2",
            country_code: "GH",
            currency: "GHS",
            direction: "credit",
            reason: "escrow_released",
            amount: 9800,
            available_delta: 9800,
            held_delta: 0,
            resulting_available_balance: 11800,
            resulting_held_balance: 0,
            balance_version: 2,
            entry_sequence: 2,
            escrow_id: "escrow-2",
            request_id: "req-1",
            idempotency_key: "idem-1",
            correlation_id: "trace-fund",
            reconciliation_marker: null,
            created_at: "2026-04-19T00:00:00.000Z",
          },
        ],
      },
    });

    mockWalletApi.getWalletSummary.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave1",
        wallet_id: "wallet-1",
        wallet_actor_id: "actor-investor",
        country_code: "GH",
        currency: "GHS",
        available_balance: 10000,
        held_balance: 2000,
        total_balance: 12000,
        balance_version: 4,
        last_entry_sequence: 4,
        last_reconciliation_marker: null,
        updated_at: "2026-04-19T00:00:00.000Z",
      },
    });
  });

  it("renders live opportunities and filters them by crop type", async () => {
    render(<FundPortalHome />);

    expect(await screen.findByText("Green Maize Cluster")).toBeInTheDocument();
    expect(screen.getByText("Cocoa Valley Program")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Crop type"), { target: { value: "Maize" } });

    await waitFor(() => {
      expect(screen.getByText("Green Maize Cluster")).toBeInTheDocument();
      expect(screen.queryByText("Cocoa Valley Program")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "View opportunity" })).toHaveAttribute("href", "/app/fund/listing-maize");
  });
});
