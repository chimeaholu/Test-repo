import "@testing-library/jest-dom/vitest";
import type { IdentitySession, ListingRecord } from "@agrodomain/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const {
  mockRecordTelemetry,
  mockUseAppState,
  mockGetAuditEvents,
  mockGetListings,
  mockFetchListing,
  mockCreateListing,
  mockUpdateListing,
} = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockRecordTelemetry: vi.fn(),
  mockGetAuditEvents: vi.fn(),
  mockGetListings: vi.fn(),
  mockFetchListing: vi.fn(),
  mockCreateListing: vi.fn(),
  mockUpdateListing: vi.fn(),
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/audit", () => ({
  getAuditEvents: (...args: unknown[]) => mockGetAuditEvents(...args),
}));

vi.mock("@/lib/api/commands", () => ({
  createListing: (...args: unknown[]) => mockCreateListing(...args),
  updateListing: (...args: unknown[]) => mockUpdateListing(...args),
}));

vi.mock("@/lib/api/marketplace", () => ({
  getListings: (...args: unknown[]) => mockGetListings(...args),
  getListing: (...args: unknown[]) => mockFetchListing(...args),
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
    mockGetListings.mockResolvedValue({
      schema_version: "2026-04-18.wave1",
      items: [
        buildListing({ listing_id: "published-1", view_scope: "buyer_safe", status: "published" }),
        buildListing({ listing_id: "owner-draft", status: "draft", view_scope: "owner" }),
      ],
    });

    render(<ListingSliceClient />);

    expect(await screen.findByRole("heading", { name: "Discover live lots without owner controls leaking into view" })).toBeInTheDocument();
    expect(screen.getByText("Draft leak prevention is explicit")).toBeInTheDocument();
    expect(screen.getByText("Open negotiation inbox")).toBeInTheDocument();
    expect(screen.queryByText("owner-draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Create listing")).not.toBeInTheDocument();
  });

  it("blocks buyer detail when listing is not buyer-safe published", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-buyer-detail-blocked",
    });
    mockFetchListing.mockResolvedValue(
      buildListing({ status: "draft", view_scope: "owner", published_revision_number: null }),
    );

    render(<ListingDetailClient listingId="listing-1" />);

    expect(await screen.findByText("listing_not_published")).toBeInTheDocument();
    expect(screen.queryByText("Open negotiation inbox")).not.toBeInTheDocument();
  });

  it("renders buyer-safe detail and emits inquiry telemetry", async () => {
    mockUseAppState.mockReturnValue({
      session: buildSession("buyer"),
      traceId: "trace-buyer-detail",
    });
    mockFetchListing.mockResolvedValue(
      buildListing({ listing_id: "published-1", status: "published", view_scope: "buyer_safe" }),
    );

    render(<ListingDetailClient listingId="published-1" />);
    expect(await screen.findByText("Buyer-safe affordance boundary")).toBeInTheDocument();

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
      status: string;
      request_id: string;
      idempotency_key: string;
      result: { schema_version: string; listing: typeof updatedListing; audit_event_id: number };
      audit_event_id: number;
      replayed: boolean;
    }>();

    mockFetchListing.mockResolvedValue(initialListing);
    mockUpdateListing.mockReturnValue(updateDeferred.promise);
    mockGetAuditEvents.mockResolvedValue({ items: [{}, {}] });

    render(<ListingDetailClient listingId="listing-1" />);
    expect(await screen.findByText("Publish and revision cues")).toBeInTheDocument();
    expect(screen.getByText("Draft is owner-only")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Listing title"), {
      target: { value: "Premium cassava harvest revised" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save listing edits" }));

    await waitFor(() => {
      expect(screen.getByText("Optimistic update pending")).toBeInTheDocument();
      expect(screen.getByText("Has unpublished changes: Yes")).toBeInTheDocument();
    });

    updateDeferred.resolve({
      status: "ok",
      request_id: "req-1",
      idempotency_key: "idem-1",
      result: {
        schema_version: "2026-04-18.wave1",
        listing: updatedListing,
        audit_event_id: 17,
      },
      audit_event_id: 17,
      replayed: false,
    });

    await waitFor(() => {
      expect(screen.getByText("Optimistic state reconciled")).toBeInTheDocument();
      expect(screen.getByText("Revision 3")).toBeInTheDocument();
      expect(screen.getByText(/Request req-1 returned 2 audit events/i)).toBeInTheDocument();
    });
  });
});
