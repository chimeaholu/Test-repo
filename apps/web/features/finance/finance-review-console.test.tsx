import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { schemaVersion } from "@agrodomain/contracts";

const { mockUseAppState, mockAgroApiClient, mockRecordTelemetry } = vi.hoisted(() => ({
  mockUseAppState: vi.fn(),
  mockRecordTelemetry: vi.fn(),
  mockAgroApiClient: {
    submitFinancePartnerRequest: vi.fn(),
    recordFinancePartnerDecision: vi.fn(),
    evaluateInsuranceTrigger: vi.fn(),
    getAuditEvents: vi.fn(),
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

import { FinanceReviewConsole } from "@/features/finance/finance-review-console";

describe("finance review console", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppState.mockReturnValue({
      session: {
        actor: {
          actor_id: "actor-finance",
          display_name: "Finance Operator",
          email: "finance@example.com",
          role: "finance",
          country_code: "GH",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Org 1",
            role: "finance",
          },
        },
        consent: {
          actor_id: "actor-finance",
          country_code: "GH",
          state: "consent_granted",
          policy_version: "2026.04.w5",
          scope_ids: ["identity.core", "workflow.audit", "regulated.finance"],
          channel: "pwa",
          captured_at: "2026-04-18T00:00:00.000Z",
          revoked_at: null,
        },
        available_roles: ["finance"],
      },
      traceId: "trace-finance",
    });
    mockAgroApiClient.submitFinancePartnerRequest.mockResolvedValue({
      data: {
        finance_request: {
          schema_version: schemaVersion,
          finance_request_id: "finance-001",
          request_id: "req-1",
          idempotency_key: "idem-1",
          actor_id: "actor-finance",
          actor_role: "finance",
          country_code: "GH",
          channel: "pwa",
          correlation_id: "corr-1",
          case_reference: "listing/listing-201",
          product_type: "invoice_advance",
          requested_amount: 1500,
          currency: "GHS",
          partner_id: "partner-agri-bank",
          partner_reference_id: "partner-case-201",
          status: "pending_partner",
          responsibility_boundary: {
            owner: "partner",
            internal_can_prepare: true,
            internal_can_block: true,
            internal_can_approve: false,
            partner_decision_required: true,
          },
          policy_context: {
            policy_id: "finance.partner.v1",
            policy_version: "2026-04",
            matched_rule: "finance.partner.invoice_advance",
            requires_hitl: true,
          },
          transcript_entries: [],
          created_at: "2026-04-18T00:00:00.000Z",
          updated_at: "2026-04-18T00:00:00.000Z",
        },
        request_id: "req-1",
        idempotency_key: "idem-1",
        replayed: false,
        audit_event_id: 10,
      },
    });
    mockAgroApiClient.recordFinancePartnerDecision.mockResolvedValue({
      data: {
        finance_request: {
          schema_version: schemaVersion,
          finance_request_id: "finance-001",
          request_id: "req-1",
          idempotency_key: "idem-1",
          actor_id: "actor-finance",
          actor_role: "finance",
          country_code: "GH",
          channel: "pwa",
          correlation_id: "corr-1",
          case_reference: "listing/listing-201",
          product_type: "invoice_advance",
          requested_amount: 1500,
          currency: "GHS",
          partner_id: "partner-agri-bank",
          partner_reference_id: "partner-case-201",
          status: "partner_approved",
          responsibility_boundary: {
            owner: "partner",
            internal_can_prepare: true,
            internal_can_block: true,
            internal_can_approve: false,
            partner_decision_required: true,
          },
          policy_context: {
            policy_id: "finance.partner.v1",
            policy_version: "2026-04",
            matched_rule: "finance.partner.invoice_advance",
            requires_hitl: true,
          },
          transcript_entries: [],
          created_at: "2026-04-18T00:00:00.000Z",
          updated_at: "2026-04-18T00:01:00.000Z",
        },
        finance_decision: {
          schema_version: schemaVersion,
          decision_id: "decision-1",
          finance_request_id: "finance-001",
          request_id: "req-2",
          actor_id: "actor-finance",
          actor_role: "finance",
          decision_source: "partner",
          outcome: "approved",
          reason_code: "evidence_sufficient",
          note: "Partner approval recorded",
          partner_reference_id: "partner-case-201",
          responsibility_boundary: {
            owner: "partner",
            internal_can_prepare: true,
            internal_can_block: true,
            internal_can_approve: false,
            partner_decision_required: true,
          },
          policy_context: {
            policy_id: "finance.partner.v1",
            policy_version: "2026-04",
            matched_rule: "finance.partner.invoice_advance",
            requires_hitl: true,
          },
          transcript_link: "audit://finance/finance-001/approved",
          decided_at: "2026-04-18T00:01:00.000Z",
        },
        request_id: "req-2",
        idempotency_key: "idem-2",
        replayed: false,
        audit_event_id: 11,
      },
    });
    mockAgroApiClient.getAuditEvents.mockResolvedValue({ data: { items: [{ id: 1 }] } });
    mockAgroApiClient.evaluateInsuranceTrigger.mockResolvedValue({
      data: {
        insurance_trigger: { trigger_id: "trigger-rain-201", threshold_source_id: "threshold-201", threshold_source_type: "policy_table" },
        insurance_evaluation: { evaluation_state: "payout_emitted", payout_dedupe_key: "dedupe-1" },
        insurance_payout_event: { payout_event_id: "payout-1" },
        request_id: "req-3",
        idempotency_key: "idem-3",
        replayed: false,
        audit_event_id: 12,
      },
    });
  });

  it("submits queue items and records partner decisions with telemetry", async () => {
    render(<FinanceReviewConsole />);

    fireEvent.click(screen.getByRole("button", { name: "Submit finance request" }));

    expect(await screen.findByText("listing/listing-201 • invoice_advance")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Record partner approved" }));

    await waitFor(() => {
      expect(mockAgroApiClient.recordFinancePartnerDecision).toHaveBeenCalledTimes(1);
      expect(mockRecordTelemetry).toHaveBeenCalled();
    });
  });
});
