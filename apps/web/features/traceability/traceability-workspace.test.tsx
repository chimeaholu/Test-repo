import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseAppState, mockAgroApiClient, mockRecordTelemetry } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockRecordTelemetry: vi.fn(),
  mockAgroApiClient: {
    getConsignmentDetail: vi.fn(),
  },
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("@/lib/api/mock-client", () => ({
  agroApiClient: mockAgroApiClient,
}));

vi.mock("@/lib/telemetry/client", () => ({
  recordTelemetry: (...args: unknown[]) => mockRecordTelemetry(...args),
}));

import { TraceabilityWorkspace } from "@/features/traceability/traceability-workspace";

describe("traceability workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppState.mockReturnValue({
      session: {
        actor: {
          actor_id: "actor-farmer",
          display_name: "Farmer One",
          email: "farmer@example.com",
          role: "farmer",
          country_code: "GH",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Org 1",
            role: "farmer",
          },
        },
        consent: {
          actor_id: "actor-farmer",
          country_code: "GH",
          state: "consent_granted",
          policy_version: "2026.04.w5",
          scope_ids: ["identity.core", "traceability.runtime"],
          channel: "pwa",
          captured_at: "2026-04-18T00:00:00.000Z",
          revoked_at: null,
        },
        available_roles: ["farmer"],
      },
      traceId: "trace-traceability",
    });
  });

  it("renders explicit evidence metadata error when attachments are absent", async () => {
    mockAgroApiClient.getConsignmentDetail.mockResolvedValue({
      data: {
        consignment: {
          schema_version: "2026-04-18.wave5",
          consignment_id: "consignment-1",
          actor_id: "actor-farmer",
          country_code: "GH",
          partner_reference_id: "partner-shipment-77",
          status: "in_transit",
          current_custody_actor_id: "actor-transporter",
          correlation_id: "corr-1",
          created_at: "2026-04-18T00:00:00.000Z",
          updated_at: "2026-04-18T00:10:00.000Z",
        },
        timeline: [
          {
            schema_version: "2026-04-18.wave5",
            trace_event_id: "trace-1",
            consignment_id: "consignment-1",
            actor_id: "actor-farmer",
            actor_role: "farmer",
            country_code: "GH",
            request_id: "req-1",
            idempotency_key: "idem-1",
            correlation_id: "corr-1",
            causation_id: null,
            milestone: "harvested",
            event_reference: "evt-1",
            previous_event_reference: null,
            order_index: 1,
            occurred_at: "2026-04-18T00:00:00.000Z",
            created_at: "2026-04-18T00:00:00.000Z",
          },
        ],
        evidence_attachments: [],
        evidence_attachment_errors: [],
      },
    });

    render(<TraceabilityWorkspace consignmentId="consignment-1" />);
    expect(await screen.findByText("Ordered event chain")).toBeInTheDocument();
    expect(screen.getByText("No evidence attachment metadata returned")).toBeInTheDocument();
  });

  it("opens evidence details and records telemetry", async () => {
    mockAgroApiClient.getConsignmentDetail.mockResolvedValue({
      data: {
        consignment: {
          schema_version: "2026-04-18.wave5",
          consignment_id: "consignment-1",
          actor_id: "actor-farmer",
          country_code: "GH",
          partner_reference_id: "partner-shipment-77",
          status: "delivered",
          current_custody_actor_id: "actor-buyer",
          correlation_id: "corr-1",
          created_at: "2026-04-18T00:00:00.000Z",
          updated_at: "2026-04-18T00:10:00.000Z",
        },
        timeline: [
          {
            schema_version: "2026-04-18.wave5",
            trace_event_id: "trace-1",
            consignment_id: "consignment-1",
            actor_id: "actor-farmer",
            actor_role: "farmer",
            country_code: "GH",
            request_id: "req-1",
            idempotency_key: "idem-1",
            correlation_id: "corr-1",
            causation_id: null,
            milestone: "delivered",
            event_reference: "evt-1",
            previous_event_reference: null,
            order_index: 1,
            occurred_at: "2026-04-18T00:00:00.000Z",
            created_at: "2026-04-18T00:00:00.000Z",
          },
        ],
        evidence_attachments: [
          {
            schema_version: "2026-04-18.wave5",
            evidence_attachment_id: "attach-1",
            trace_event_id: "trace-1",
            consignment_id: "consignment-1",
            actor_id: "actor-farmer",
            country_code: "GH",
            media_type: "image/jpeg",
            file_name: "delivery-proof.jpg",
            storage_url: "https://example.com/delivery-proof.jpg",
            checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            validation_state: "validated",
            captured_at: "2026-04-18T00:00:00.000Z",
            created_at: "2026-04-18T00:00:00.000Z",
          },
        ],
        evidence_attachment_errors: [],
      },
    });

    render(<TraceabilityWorkspace consignmentId="consignment-1" />);
    const evidenceButton = await screen.findByRole("button", { name: /delivery-proof.jpg/i });
    fireEvent.click(evidenceButton);
    await waitFor(() => {
      expect(mockRecordTelemetry).toHaveBeenCalled();
      expect(screen.getByText("Attachment id")).toBeInTheDocument();
    });
  });
});
