import "@testing-library/jest-dom/vitest";
import type { IdentitySession, ListingRecord, UpdateListingResult } from "@agrodomain/contracts";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: { children: ReactNode; href: string; onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void }) => (
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

const { mockAuditApi, mockMarketplaceApi, mockRecordTelemetry, mockUseAppState } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockRecordTelemetry: vi.fn(),
  mockAuditApi: {
    getEvents: vi.fn(),
  },
  mockMarketplaceApi: {
    createListing: vi.fn(),
    getListing: vi.fn(),
    listListings: vi.fn(),
    updateListing: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/audit", () => ({
  auditApi: mockAuditApi,
}));

vi.mock("@/lib/api/marketplace", () => ({
  marketplaceApi: mockMarketplaceApi,
}));

vi.mock("@/lib/telemetry/client", () => ({
  recordTelemetry: (...args: unknown[]) => mockRecordTelemetry(...args),
}));

import { ListingDetailClient, ListingSliceClient } from "@/features/listings/listing-slice";

function buildSession(role: IdentitySession["actor"]["role"] = "farmer"): IdentitySession {
  return {
    actor: {
      actor_id: role === "buyer" ? "actor-buyer" : "actor-ama",
      display_name: role === "buyer" ? "Kofi Buyer" : "Ama Mensah",
      email: role === "buyer" ? "buyer@example.com" : "ama@example.com",
      role,
      country_code: "GH",
      locale: "en-GH",
      membership: {
        organization_id: "org-1",
        organization_name: role === "buyer" ? "Kofi Foods" : "Ama Cooperative",
        role,
      },
    },
    consent: {
      actor_id: role === "buyer" ? "actor-buyer" : "actor-ama",
      country_code: "GH",
      state: "consent_granted",
      policy_version: "2026.04.w1",
      scope_ids: ["identity.core", "workflow.audit"],
      channel: "pwa",
      captured_at: "2026-04-18T00:00:00.000Z",
      revoked_at: null,
    },
    available_roles: [role],
  };
}

function buildListing(overrides: Partial<ListingRecord> = {}): ListingRecord {
  return {
    schema_version: "2026-04-18.wave1",
    listing_id: "listing-1",
    actor_id: "actor-ama",
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe("listing surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders buyer discovery from buyer-safe published listings only", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-buyer",
    });
    mockMarketplaceApi.listListings.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave1",
        items: [
          ...Array.from({ length: 25 }, (_, index) =>
            buildListing({
              actor_id: `actor-seller-${index}`,
              commodity: index % 2 === 0 ? "Cassava" : "Maize",
              listing_id: `published-${index + 1}`,
              location: index % 3 === 0 ? "Tamale, GH" : "Kumasi, GH",
              price_amount: 300 + index,
              published_at: `2026-04-${String((index % 9) + 10).padStart(2, "0")}T00:00:00.000Z`,
              status: "published",
              title: `Published lot ${index + 1}`,
              view_scope: "buyer_safe",
            }),
          ),
          buildListing({ listing_id: "owner-draft", status: "draft", title: "Owner-only draft", view_scope: "owner" }),
        ],
      },
    });

    render(<ListingSliceClient />);

    expect(await screen.findByRole("heading", { name: "Discover trusted agricultural supply in one place" })).toBeInTheDocument();
    expect(screen.getByText("Live inventory only")).toBeInTheDocument();
    expect(screen.getByText("Showing 20 of 25 matching lots.")).toBeInTheDocument();
    const listingFeed = screen.getByRole("list", { name: "Published listings" });
    expect(within(listingFeed).getAllByRole("link", { name: "Inspect lot" })).toHaveLength(20);
    expect(screen.getByRole("button", { name: "Load more lots" })).toBeInTheDocument();
    expect(screen.queryByText("Owner-only draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Create listing")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load more lots" }));
    await waitFor(() => {
      expect(within(listingFeed).getAllByRole("link", { name: "Inspect lot" })).toHaveLength(25);
      expect(screen.getByText("Showing 25 of 25 matching lots.")).toBeInTheDocument();
    });
  });

  it("combines buyer discovery filters and shows an empty state when nothing matches", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-buyer-filters",
    });
    mockMarketplaceApi.listListings.mockResolvedValue({
      data: {
        schema_version: "2026-04-18.wave1",
        items: [
          buildListing({
            actor_id: "actor-ama",
            commodity: "Cassava",
            listing_id: "listing-cassava",
            location: "Tamale, GH",
            price_amount: 320,
            published_at: "2026-04-18T00:00:00.000Z",
            title: "Tamale cassava lot",
            view_scope: "buyer_safe",
          }),
          buildListing({
            actor_id: "actor-ekow",
            commodity: "Maize",
            listing_id: "listing-maize",
            location: "Kumasi, GH",
            price_amount: 420,
            published_at: "2026-04-17T00:00:00.000Z",
            title: "Kumasi maize lot",
            view_scope: "buyer_safe",
          }),
        ],
      },
    });

    render(<ListingSliceClient />);
    expect(await screen.findByRole("heading", { name: "Discover trusted agricultural supply in one place" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Commodity"), { target: { value: "Cassava" } });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Tamale, GH" } });
    fireEvent.change(screen.getByLabelText("Max price"), { target: { value: "350" } });

    await waitFor(() => {
      expect(screen.getByText("1 live lot match your filters.")).toBeInTheDocument();
      const listingFeed = screen.getByRole("list", { name: "Published listings" });
      expect(within(listingFeed).getAllByText("Tamale cassava lot").length).toBeGreaterThan(0);
      expect(within(listingFeed).getAllByRole("link", { name: "Inspect lot" })).toHaveLength(1);
    });

    fireEvent.change(screen.getByLabelText("Search lots"), { target: { value: "banana" } });

    await waitFor(() => {
      expect(screen.getByText("No live lots match these filters yet")).toBeInTheDocument();
      expect(screen.getByText("0 live lots match your filters.")).toBeInTheDocument();
    });
  });

  it("blocks buyer detail when listing is not buyer-safe published", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-buyer-detail-blocked",
    });
    mockMarketplaceApi.getListing.mockResolvedValue({
      data: buildListing({ status: "draft", view_scope: "owner", published_revision_number: null }),
    });

    render(<ListingDetailClient listingId="listing-1" />);

    expect(await screen.findByText("listing_not_published")).toBeInTheDocument();
    expect(screen.queryByText("Open negotiation inbox")).not.toBeInTheDocument();
  });

  it("renders buyer-safe detail and emits inquiry telemetry", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-buyer-detail",
    });
    mockMarketplaceApi.getListing.mockResolvedValue({
      data: buildListing({ listing_id: "published-1", status: "published", view_scope: "buyer_safe" }),
    });

    render(<ListingDetailClient listingId="published-1" />);
    expect(await screen.findByText("Built for buyers")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Open negotiation inbox"));
    expect(mockRecordTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "inquiry_start",
        trace_id: "trace-buyer-detail",
        detail: expect.objectContaining({
          listing_id: "published-1",
          negotiation_runtime_ready: false,
        }),
      }),
    );
  });

  it("shows owner publish and revision cues with optimistic reconciliation", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("farmer"),
      traceId: "trace-owner-detail",
    });

    const initialListing = buildListing({
      status: "draft",
      view_scope: "owner",
      published_revision_number: 1,
      revision_number: 2,
      revision_count: 2,
      has_unpublished_changes: true,
    });
    const updatedListing = buildListing({
      title: "Premium cassava harvest revised",
      status: "draft",
      view_scope: "owner",
      published_revision_number: 1,
      revision_number: 3,
      revision_count: 3,
      has_unpublished_changes: true,
      updated_at: "2026-04-18T00:05:00.000Z",
    });
    const updateDeferred = deferred<{
      data: UpdateListingResult & { request_id: string; idempotency_key: string };
    }>();

    mockMarketplaceApi.getListing.mockResolvedValue({ data: initialListing });
    mockMarketplaceApi.updateListing.mockReturnValue(updateDeferred.promise);
    mockAuditApi.getEvents.mockResolvedValue({ data: { items: [{}, {}] } });

    render(<ListingDetailClient listingId="listing-1" />);
    expect(await screen.findByText("Listing status")).toBeInTheDocument();
    expect(screen.getByText("Draft only")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Listing title"), {
      target: { value: "Premium cassava harvest revised" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save listing edits" }));

    await waitFor(() => {
      expect(screen.getByText("Saving update")).toBeInTheDocument();
      expect(screen.getByText("Draft changes waiting to publish: Yes")).toBeInTheDocument();
    });

    updateDeferred.resolve({
      data: {
        schema_version: "2026-04-18.wave1",
        listing: updatedListing,
        audit_event_id: 17,
        replayed: false,
        request_id: "req-1",
        idempotency_key: "idem-1",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Update saved")).toBeInTheDocument();
      expect(screen.getByText("Revision 3")).toBeInTheDocument();
      expect(screen.getByText(/Update reference req-1 generated 2 timeline updates/i)).toBeInTheDocument();
    });
  });
});
