import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadJson, mockWriteJson } = vi.hoisted(() => ({
  mockReadJson: vi.fn(),
  mockWriteJson: vi.fn(),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    readJson: mockReadJson,
    writeJson: mockWriteJson,
  };
});

vi.mock("@/lib/api/identity", () => ({
  identityApi: {
    searchActors: vi.fn(),
  },
}));

vi.mock("@/lib/api/marketplace", () => ({
  marketplaceApi: {
    listListings: vi.fn(),
    listNegotiations: vi.fn(),
  },
}));

vi.mock("@/lib/api/wallet", () => ({
  walletApi: {
    listEscrows: vi.fn(),
  },
}));

import { truckerApi } from "@/lib/api/trucker";

describe("trucker api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T04:26:00.000Z"));
    mockReadJson.mockReturnValue({
      actors: {},
      loads: {
        "shipment-123": {
          currentCheckpoint: "Final urban handoff",
          currentLocationLabel: "Accra, Greater Accra",
          destination: "Accra, Greater Accra",
          stage: "in_transit",
          updates: [],
        },
      },
    });
  });

  it("persists delivery proof and marks the shipment delivered", () => {
    const proofOfDelivery = truckerApi.completeDelivery("shipment-123", {
      photoName: "playwright-desktop.png",
      recipientName: "  Abena Receiver  ",
      signaturePoints: [
        { x: 36, y: 72 },
        { x: 70, y: 84 },
      ],
    });

    expect(proofOfDelivery).toEqual({
      deliveredAt: "2026-04-25T04:26:00.000Z",
      photoName: "playwright-desktop.png",
      recipientName: "Abena Receiver",
      signaturePoints: [
        { x: 36, y: 72 },
        { x: 70, y: 84 },
      ],
    });
    expect(mockWriteJson).toHaveBeenCalledWith(
      "agrodomain.trucker.workspace.v1",
      expect.objectContaining({
        actors: {},
        loads: expect.objectContaining({
          "shipment-123": expect.objectContaining({
            currentCheckpoint: "Delivery confirmed",
            currentLocationLabel: "Accra, Greater Accra",
            proofOfDelivery,
            stage: "delivered",
            updates: [
              expect.objectContaining({
                checkpoint: "Proof of delivery",
                note: "Delivery confirmed by Abena Receiver.",
                tone: "success",
              }),
            ],
          }),
        }),
      }),
    );
  });

  it("records structured shipment exceptions with delay and severity", () => {
    const issue = truckerApi.reportIssue("shipment-123", {
      blocked: true,
      delayMinutes: 95,
      description: "Axle failure near the weighbridge. Backup truck requested.",
      severity: "high",
      type: "breakdown",
    });

    expect(issue).toEqual({
      blocked: true,
      delayMinutes: 95,
      description: "Axle failure near the weighbridge. Backup truck requested.",
      id: expect.stringContaining("shipment-123-issue-"),
      reportedAt: "2026-04-25T04:26:00.000Z",
      severity: "high",
      type: "breakdown",
    });
    expect(mockWriteJson).toHaveBeenCalledWith(
      "agrodomain.trucker.workspace.v1",
      expect.objectContaining({
        loads: expect.objectContaining({
          "shipment-123": expect.objectContaining({
            issueCount: 1,
            issues: [
              expect.objectContaining({
                blocked: true,
                delayMinutes: 95,
                severity: "high",
                type: "breakdown",
              }),
            ],
            updates: [
              expect.objectContaining({
                checkpoint: "breakdown",
                note: "Axle failure near the weighbridge. Backup truck requested. Delay logged: 95 minutes.",
                tone: "warning",
              }),
            ],
          }),
        }),
      }),
    );
  });
});
