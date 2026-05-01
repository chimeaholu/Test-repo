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
    completeDeliveryLive: vi.fn(),
    getShipmentSnapshotLive: vi.fn(),
    reportIssueLive: vi.fn(),
    updateShipmentStageLive: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/trucker", () => ({
  truckerApi: mockTruckerApi,
}));

import { ShipmentTracking } from "@/features/trucker/shipment-tracking";

describe("shipment tracking", () => {
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
          scope_ids: ["identity.core", "workflow.audit", "transport.logistics"],
          channel: "pwa",
          captured_at: "2026-04-25T00:00:00.000Z",
          revoked_at: null,
        },
        available_roles: ["transporter"],
      },
      traceId: "trace-trucker",
    });
    mockTruckerApi.getShipmentSnapshotLive.mockResolvedValue({
      budgetLabel: "GHS 1,500 corridor budget",
      commodity: "White maize",
      currentCheckpoint: "In transit",
      currentLocationLabel: "Mid-route corridor",
      deliveryDeadline: "2026-04-27",
      destination: "Accra, Greater Accra",
      distanceKm: 420,
      driver: {
        actorId: "actor-transporter-gh-kofi",
        availability: "busy",
        displayName: "Kofi Driver",
        email: "kofi@example.com",
        estimatedDistanceKm: 8,
        estimatedQuote: 1200,
        rating: 4.8,
        routeLabel: "Tamale -> Accra",
        vehicleLabel: "Kia Rhino 5t",
      },
      etaLabel: "In transit",
      exceptionCount: 1,
      issueCount: 1,
      issues: [
        {
          blocked: true,
          delayMinutes: 95,
          description: "Axle failure near the weighbridge. Backup truck requested.",
          id: "issue-1",
          reportedAt: "2026-04-25T04:26:00.000Z",
          severity: "high",
          type: "breakdown",
        },
      ],
      lastUpdatedAt: "2026-04-25T04:26:00.000Z",
      listing: null,
      pickupLocation: "Tamale, Northern Region",
      podStatusLabel: "Awaiting handoff proof",
      proofOfDelivery: null,
      rateEstimate: { min: 1200, max: 1500 },
      routeLabel: "Tamale -> Accra",
      slaLabel: "At risk",
      slaState: "at_risk",
      stage: "in_transit",
      timeline: [],
      weightLabel: "5 tonnes (50 items)",
    });
  });

  it("renders SLA details and submits structured exceptions", async () => {
    render(<ShipmentTracking shipmentId="shipment-123" />);

    expect(await screen.findByRole("heading", { name: "Delivery timing" })).toBeInTheDocument();
    expect(screen.getAllByText("At risk").length).toBeGreaterThan(0);
    expect(screen.getByText(/95 min delay/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Report issue" }));
    const [issueTypeSelect, issueSeveritySelect] = screen.getAllByRole("combobox");
    fireEvent.change(issueTypeSelect, { target: { value: "breakdown" } });
    fireEvent.change(issueSeveritySelect, { target: { value: "high" } });
    fireEvent.change(screen.getByPlaceholderText("Delay minutes (optional)"), { target: { value: "120" } });
    fireEvent.change(screen.getByPlaceholderText(/Describe the issue/i), {
      target: { value: "Engine stopped at the corridor checkpoint." },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Save issue" }));

    await waitFor(() => {
      expect(mockTruckerApi.reportIssueLive).toHaveBeenCalledWith(
        "shipment-123",
        {
          blocked: true,
          delayMinutes: 120,
          description: "Engine stopped at the corridor checkpoint.",
          severity: "high",
          type: "breakdown",
        },
        "trace-trucker",
      );
    });
  });
});
