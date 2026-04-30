import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { mockUseAppState, mockTruckerApi } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockTruckerApi: {
    acceptLoad: vi.fn(),
    getMarketplaceSnapshotLive: vi.fn(),
    writeAvailability: vi.fn(),
    writeRolePreference: vi.fn(),
    requestDriver: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/trucker", () => ({
  humanizeAvailability: (value: string) => value,
  truckerApi: mockTruckerApi,
}));

import { TruckerMarketplace } from "@/features/trucker/trucker-marketplace";

describe("trucker marketplace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppState.mockReturnValue({
      session: {
        actor: {
          actor_id: "actor-transporter-gh-kofi",
          display_name: "Kofi Driver",
          email: "kofi@example.com",
          role: "transporter",
          country_code: "GH",
          locale: "en-GH",
          membership: {
            organization_id: "org-gh-01",
            organization_name: "Ghana Growers Network",
            role: "transporter",
          },
        },
        consent: {
          actor_id: "actor-transporter-gh-kofi",
          country_code: "GH",
          state: "consent_granted",
          policy_version: "2026.04.r7",
          scope_ids: ["identity.core", "workflow.audit"],
          channel: "pwa",
          captured_at: "2026-04-25T00:00:00.000Z",
          revoked_at: null,
        },
        available_roles: ["transporter"],
      },
      traceId: "trace-trucker",
    });
    mockTruckerApi.getMarketplaceSnapshotLive.mockResolvedValue({
      availableDrivers: [
        {
          actorId: "actor-transporter-gh-ama",
          availability: "available",
          displayName: "Ama Darko",
          email: "ama@example.com",
          estimatedDistanceKm: 8,
          estimatedQuote: 1200,
          rating: 4.8,
          routeLabel: "Tamale -> Accra",
          vehicleLabel: "Kia Rhino 5t",
        },
      ],
      availableLoads: [
        {
          commodity: "White maize",
          distanceLabel: "8 km from you",
          id: "listing-1",
          pickupLabel: "2026-04-27 · Morning",
          posterName: "Ibrahim A.",
          priceLabel: "GHS 1,500",
          routeLabel: "Tamale -> Accra",
          title: "Tamale to Accra",
          weightLabel: "5 tonnes",
        },
      ],
      driverAvailability: "available",
      driverShipments: [],
      rolePreference: "driver",
      shipperShipments: [
        {
          commodity: "White maize",
          currentCheckpoint: "Driver accepted",
          currentLocationLabel: "Tamale",
          etaLabel: "ETA: 4 hours",
          id: "shipment-1",
          payLabel: "GHS 1,500",
          stage: "accepted",
          stageLabel: "Driver matched",
          subtitle: "Tamale to Accra",
          title: "Tamale -> Accra",
          trackHref: "/app/trucker/shipments/shipment-1",
          weightLabel: "5 tonnes",
        },
      ],
    });
  });

  it("renders driver and shipper logistics views and persists role switching", async () => {
    render(<TruckerMarketplace />);

    expect(await screen.findByRole("heading", { name: /match loads, track deliveries, and keep transport visible/i })).toBeInTheDocument();
    expect(screen.getByText(/available loads near you/i)).toBeInTheDocument();
    expect(screen.getByText("Tamale to Accra")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /i need transport/i }));

    await waitFor(() => {
      expect(mockTruckerApi.writeRolePreference).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: expect.objectContaining({ actor_id: "actor-transporter-gh-kofi" }),
        }),
        "shipper",
      );
    });

    expect(screen.getByText(/available drivers/i)).toBeInTheDocument();
    expect(screen.getByText("Ama Darko")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /track delivery/i })).toHaveAttribute("href", "/app/trucker/shipments/shipment-1");
  });
});
