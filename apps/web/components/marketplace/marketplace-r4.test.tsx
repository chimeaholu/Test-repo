import "@testing-library/jest-dom/vitest";
import type { IdentitySession, ListingRecord, NegotiationThreadRead } from "@agrodomain/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: ReactNode;
    href: string;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

const { mockMarketplaceApi, mockUseAppState, mockReadUserPreferences } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockReadUserPreferences: vi.fn(),
  mockMarketplaceApi: {
    getListing: vi.fn(),
    listListingRevisions: vi.fn(),
    listListings: vi.fn(),
    listNegotiations: vi.fn(),
    publishListing: vi.fn(),
    unpublishListing: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/marketplace", () => ({
  marketplaceApi: mockMarketplaceApi,
}));

vi.mock("@/lib/user-preferences", () => ({
  readUserPreferences: (...args: unknown[]) => mockReadUserPreferences(...args),
}));

import MyListingsPage from "@/app/app/market/my-listings/page";
import { ListingDetailPageClient } from "@/components/marketplace/listing-detail-page";

function buildSession(role: IdentitySession["actor"]["role"] = "farmer"): IdentitySession {
  return {
    actor: {
      actor_id: role === "buyer" ? "actor-buyer" : "actor-owner",
      display_name: role === "buyer" ? "Kofi Buyer" : "Ama Owner",
      email: "actor@example.com",
      role,
      country_code: "GH",
      locale: "en-GH",
      membership: {
        organization_id: "org-1",
        organization_name: "Agrodomain Co-op",
        role,
      },
    },
    consent: {
      actor_id: role === "buyer" ? "actor-buyer" : "actor-owner",
      country_code: "GH",
      state: "consent_granted",
      policy_version: "2026.04.w1",
      scope_ids: ["identity.core", "workflow.audit"],
      channel: "pwa",
      captured_at: "2026-01-02T00:00:00.000Z",
      revoked_at: null,
    },
    available_roles: [role],
  };
}

function buildListing(overrides: Partial<ListingRecord> = {}): ListingRecord {
  return {
    schema_version: "2026-04-18.wave1",
    listing_id: "listing-1",
    actor_id: "actor-owner",
    country_code: "GH",
    title: "Premium cassava harvest",
    commodity: "Cassava",
    quantity_tons: 4.2,
    price_amount: 320,
    price_currency: "GHS",
    location: "Tamale, GH",
    summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
    status: "published",
    revision_number: 2,
    published_revision_number: 2,
    revision_count: 2,
    has_unpublished_changes: false,
    view_scope: "buyer_safe",
    published_at: "2026-04-18T00:00:00.000Z",
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T00:00:00.000Z",
    ...overrides,
  };
}

function buildNegotiation(listingId: string): NegotiationThreadRead {
  return {
    schema_version: "2026-04-18.wave1",
    thread_id: `thread-${listingId}`,
    listing_id: listingId,
    seller_actor_id: "actor-owner",
    buyer_actor_id: "actor-buyer",
    country_code: "GH",
    status: "open",
    current_offer_amount: 300,
    current_offer_currency: "GHS",
    last_action_at: "2026-04-18T00:00:00.000Z",
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T00:00:00.000Z",
    confirmation_checkpoint: null,
    messages: [],
  };
}

describe("R4 marketplace surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadUserPreferences.mockReturnValue({
      notifications: { readIds: [] },
      display: {},
      privacy: {},
      profile: {
        city: "",
        memberSince: "2026-01-02T00:00:00.000Z",
        region: "",
        roleFocus: "",
      },
    });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders the redesigned listing detail with revisions and share behavior", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("farmer"),
      traceId: "trace-detail",
    });
    mockMarketplaceApi.getListing.mockResolvedValue({
      data: buildListing({ status: "draft", view_scope: "owner", has_unpublished_changes: true }),
    });
    mockMarketplaceApi.listListingRevisions.mockResolvedValue({
      data: {
        items: [
          {
            actor_id: "actor-owner",
            change_type: "created",
            changed_at: "2026-04-18T00:00:00.000Z",
            commodity: "Cassava",
            country_code: "GH",
            listing_id: "listing-1",
            location: "Tamale, GH",
            price_amount: 300,
            price_currency: "GHS",
            quantity_tons: 4,
            revision_number: 1,
            schema_version: "2026-04-18.wave1",
            status: "draft",
            summary: "Initial draft",
            title: "Premium cassava harvest",
          },
          {
            actor_id: "actor-owner",
            change_type: "draft_updated",
            changed_at: "2026-04-19T00:00:00.000Z",
            commodity: "Cassava",
            country_code: "GH",
            listing_id: "listing-1",
            location: "Tamale, GH",
            price_amount: 320,
            price_currency: "GHS",
            quantity_tons: 4.2,
            revision_number: 2,
            schema_version: "2026-04-18.wave1",
            status: "draft",
            summary: "Updated draft",
            title: "Premium cassava harvest",
          },
        ],
      },
    });
    mockMarketplaceApi.listListings.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave1",
        items: [buildListing({ listing_id: "listing-1", view_scope: "owner", status: "draft" }), buildListing({ listing_id: "listing-2", view_scope: "owner", status: "draft" })],
      },
    });

    render(<ListingDetailPageClient listingId="listing-1" />);

    expect((await screen.findAllByRole("heading", { name: "Premium cassava harvest" })).length).toBeGreaterThan(0);
    expect(screen.getByText("Quality and handling")).toBeInTheDocument();
    expect(screen.getByText("Show 2 recorded revisions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open profile" })).toHaveAttribute("href", "/app/profile");

    fireEvent.click(screen.getByRole("button", { name: "Share listing" }));

    await waitFor(() => {
      expect(screen.getByText("Link copied")).toBeInTheDocument();
    });
  });

  it("renders my listings filters and applies a publish status mutation", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("farmer"),
      traceId: "trace-my-listings",
    });
    mockMarketplaceApi.listListings.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave1",
        items: [
          buildListing({ listing_id: "draft-1", status: "draft", view_scope: "owner", title: "Draft cassava lot" }),
          buildListing({ listing_id: "published-1", status: "published", title: "Published maize lot" }),
          buildListing({ listing_id: "closed-1", status: "closed", view_scope: "owner", title: "Closed yam lot" }),
        ],
      },
    });
    mockMarketplaceApi.listNegotiations.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave1",
        items: [buildNegotiation("draft-1"), buildNegotiation("draft-1"), buildNegotiation("published-1")],
      },
    });
    mockMarketplaceApi.unpublishListing.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave1",
        listing: buildListing({ listing_id: "published-1", status: "closed", view_scope: "owner", title: "Published maize lot" }),
        revision_summary: {
          schema_version: "2026-04-18.wave1",
          listing_id: "published-1",
          revision_number: 3,
          change_type: "unpublished",
          actor_id: "actor-owner",
          country_code: "GH",
          status: "closed",
          title: "Published maize lot",
          commodity: "Cassava",
          quantity_tons: 4.2,
          price_amount: 320,
          price_currency: "GHS",
          location: "Tamale, GH",
          summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
          changed_at: "2026-04-20T00:00:00.000Z",
        },
        request_id: "req-1",
        idempotency_key: "idem-1",
        replayed: false,
      },
    });

    render(<MyListingsPage />);

    expect(await screen.findByRole("heading", { name: "My listings" })).toBeInTheDocument();
    expect(await screen.findByText("Draft cassava lot")).toBeInTheDocument();
    expect(screen.getByText("Published maize lot")).toBeInTheDocument();

    const publishedTab = screen
      .getAllByRole("tab")
      .find((item) => item.textContent?.startsWith("Published"));

    expect(publishedTab).toBeDefined();
    fireEvent.click(publishedTab!);
    fireEvent.click(screen.getByLabelText("Select visible"));
    fireEvent.click(screen.getByRole("button", { name: "Unpublish selected" }));

    await waitFor(() => {
      expect(mockMarketplaceApi.unpublishListing).toHaveBeenCalledWith(
        { listing_id: "published-1" },
        "trace-my-listings",
        "actor-owner",
        "GH",
      );
      expect(screen.getByText("Unpublished 1 selected listing.")).toBeInTheDocument();
    });
  });
});
