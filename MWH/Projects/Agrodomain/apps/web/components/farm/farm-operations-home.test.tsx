import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

const { mockUseAppState, mockFarmApi } = vi.hoisted(() => ({
  mockFarmApi: {
    addField: vi.fn(),
    getWorkspace: vi.fn(),
    logActivity: vi.fn(),
  },
  mockUseAppState: vi.fn(),
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/farm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/farm")>("@/lib/api/farm");

  return {
    ...actual,
    farmApi: mockFarmApi,
  };
});

import { FarmOperationsHome } from "@/components/farm/farm-operations-home";

function buildWorkspace() {
  return {
    activities: [
      {
        activityId: "activity-1",
        activityType: "fertilizing",
        cost: 120,
        date: "2026-04-24T08:00:00.000Z",
        description: "Applied nitrogen top-dress",
        farmId: "farm-1",
        fieldId: "field-1",
        inputsUsed: ["Urea 50kg bags"],
        laborHours: 4,
        notes: "Focus on the north lanes.",
        photoLabel: null,
        source: "reference",
      },
    ],
    cropCycles: [
      {
        cropCycleId: "cycle-1",
        cropType: "Maize",
        farmId: "farm-1",
        fieldId: "field-1",
        plantingDate: "2026-03-14T00:00:00.000Z",
        revenue: null,
        status: "active",
        variety: "Obatanpa",
        yieldTons: null,
        harvestDate: "2026-06-30T00:00:00.000Z",
      },
    ],
    farm: {
      countryCode: "GH",
      currentSeason: "Major rains",
      district: "Tamale Metropolitan",
      farmId: "farm-1",
      farmName: "Asante Maize Fields",
      hectares: 12.5,
      latitude: 9.4,
      longitude: -0.84,
      mode: "reference",
      primaryCrop: "Maize",
      region: "GH",
    },
    fields: [
      {
        activityCount: 2,
        areaHectares: 5.1,
        boundary: [
          { lat: 9.4, lng: -0.84 },
          { lat: 9.41, lng: -0.83 },
          { lat: 9.39, lng: -0.82 },
        ],
        currentCrop: "Maize",
        district: "Tamale Metropolitan",
        expectedHarvestDate: "2026-06-30T00:00:00.000Z",
        farmId: "farm-1",
        fieldId: "field-1",
        healthSummary: "Canopy is stable.",
        irrigationType: "Rain fed",
        lastActivityAt: "2026-04-24T08:00:00.000Z",
        lastActivityType: "fertilizing",
        name: "North Ridge",
        nextTask: "Scout after rain.",
        plantingDate: "2026-03-14T00:00:00.000Z",
        soilType: "Loam",
        status: "active",
        variety: "Obatanpa",
      },
    ],
    inputs: [
      {
        cost: 1800,
        expiryDate: "2026-08-24T00:00:00.000Z",
        farmId: "farm-1",
        inputId: "input-1",
        inputType: "fertilizer",
        name: "Urea 50kg bags",
        purchaseDate: "2026-04-10T00:00:00.000Z",
        quantity: 8,
        reorderLevel: 6,
        supplier: "Savanna Inputs Cooperative",
        unit: "bags",
      },
    ],
    weather: {
      alertSummary: "Heavy rainfall expected in the next 24 hours.",
      rainfallMm: 42,
      riskLabel: "Warning",
      soilMoisturePct: 68,
      sourceLabel: "Reference profile",
      temperatureC: 31.5,
    },
  };
}

describe("farm operations home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppState.mockReturnValue({
      session: {
        actor: {
          actor_id: "demo:farmer",
          country_code: "GH",
          display_name: "Ama",
          email: "ama@example.com",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Agrodomain",
            role: "farmer",
          },
          role: "farmer",
        },
      },
      traceId: "trace-farm",
    });
    mockFarmApi.getWorkspace.mockResolvedValue({ data: buildWorkspace() });
    mockFarmApi.addField.mockResolvedValue({
      data: {
        ...buildWorkspace().fields[0],
        fieldId: "field-2",
        name: "South Trial Plot",
      },
    });
    mockFarmApi.logActivity.mockResolvedValue({
      data: {
        ...buildWorkspace().activities[0],
        activityId: "activity-2",
        description: "New field note",
      },
    });
  });

  it("renders the farm workspace surface", async () => {
    render(<FarmOperationsHome />);

    expect(await screen.findByText("Keep your fields, season work, and inputs in one working view")).toBeInTheDocument();
    expect(await screen.findByText("Asante Maize Fields")).toBeInTheDocument();
    expect(screen.getAllByText("North Ridge").length).toBeGreaterThan(0);
    expect(screen.getByText("Heavy rainfall expected in the next 24 hours.")).toBeInTheDocument();
  });

  it("opens the add field flow", async () => {
    render(<FarmOperationsHome />);

    await screen.findByText("Asante Maize Fields");
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));

    expect(screen.getByRole("dialog", { name: "Add field" })).toBeInTheDocument();
    expect(screen.getByText("Boundary sketch")).toBeInTheDocument();
  });
});
