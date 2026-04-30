import "@testing-library/jest-dom/vitest";
import type { IdentitySession, ListingRecord } from "@agrodomain/contracts";
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

const { mockAuditApi, mockMarketplaceApi, mockUseAppState } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockAuditApi: {
    getEvents: vi.fn(),
  },
  mockMarketplaceApi: {
    createListing: vi.fn(),
    publishListing: vi.fn(),
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

import { ListingWizardContainer } from "@/components/marketplace/listing-wizard/wizard-container";

function buildSession(): IdentitySession {
  return {
    actor: {
      actor_id: "actor-ama",
      display_name: "Ama Mensah",
      email: "ama@example.com",
      role: "farmer",
      country_code: "GH",
      locale: "en-GH",
      membership: {
        organization_id: "org-1",
        organization_name: "Ama Cooperative",
        role: "farmer",
      },
    },
    consent: {
      actor_id: "actor-ama",
      country_code: "GH",
      state: "consent_granted",
      policy_version: "2026.04.w1",
      scope_ids: ["identity.core", "workflow.audit"],
      channel: "pwa",
      captured_at: "2026-04-18T00:00:00.000Z",
      revoked_at: null,
    },
    available_roles: ["farmer"],
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
    location: "Tamale, Northern Region",
    summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
    status: "draft",
    revision_number: 1,
    published_revision_number: null,
    revision_count: 1,
    has_unpublished_changes: true,
    view_scope: "owner",
    published_at: null,
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("listing wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockUseAppState.mockReturnValue({
      queue: {
        connectivity_state: "online",
        handoff_channel: null,
        items: [],
      },
      session: buildSession(),
      traceId: "trace-listing-wizard",
    });
    mockAuditApi.getEvents.mockResolvedValue({ data: { items: [{}, {}] } });
  });

  it("validates the current step before advancing", async () => {
    render(<ListingWizardContainer />);

    expect(await screen.findByText("What buyers need before they act")).toBeInTheDocument();
    const titleInput = await screen.findByLabelText("Listing title");
    fireEvent.change(titleInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Use at least 3 characters for the listing title.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Price amount")).not.toBeInTheDocument();
  });

  it("persists draft values across remounts", async () => {
    const { unmount } = render(<ListingWizardContainer />);

    fireEvent.change(await screen.findByLabelText("Listing title"), {
      target: { value: "Warehouse rice lot" },
    });

    unmount();
    render(<ListingWizardContainer />);

    expect(await screen.findByDisplayValue("Warehouse rice lot")).toBeInTheDocument();
  });

  it("runs create then publish and resets the wizard after publish", async () => {
    mockMarketplaceApi.createListing.mockResolvedValue({
      data: {
        listing: buildListing({ listing_id: "listing-9" }),
        request_id: "req-create",
        idempotency_key: "idem-create",
        replayed: false,
      },
    });
    mockMarketplaceApi.publishListing.mockResolvedValue({
      data: {
        listing: buildListing({ listing_id: "listing-9", status: "published", view_scope: "buyer_safe" }),
        revision_summary: {
          listing_id: "listing-9",
          revision_number: 2,
          change_type: "published",
          revision_status: "published",
          created_at: "2026-04-18T00:02:00.000Z",
        },
        request_id: "req-publish",
        idempotency_key: "idem-publish",
        replayed: false,
      },
    });

    render(<ListingWizardContainer />);

    fireEvent.change(await screen.findByLabelText("Listing title"), {
      target: { value: "Published maize lot" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByLabelText("Price amount")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByLabelText("Manual location entry")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("button", { name: "Publish listing" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Publish listing" }));

    await waitFor(() => {
      expect(mockMarketplaceApi.createListing).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Published maize lot",
        }),
        "trace-listing-wizard",
        "actor-ama",
        "GH",
      );
      expect(mockMarketplaceApi.publishListing).toHaveBeenCalledWith(
        { listing_id: "listing-9" },
        "trace-listing-wizard",
        "actor-ama",
        "GH",
      );
    });

    expect(await screen.findByText("Listing published confirmed")).toBeInTheDocument();
    expect(screen.getByText("No current blockers")).toBeInTheDocument();
    expect(screen.getByLabelText("Listing title")).toHaveValue("Premium cassava harvest");
    expect(window.localStorage.getItem("agrodomain_listing_wizard_v1")).toContain("\"title\":\"Premium cassava harvest\"");
  });
});
