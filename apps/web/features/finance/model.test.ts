import { describe, expect, it } from "vitest";
import { schemaVersion } from "@agrodomain/contracts";

import {
  queueStatusFromRequestStatus,
  queueStatusLabel,
  queueStatusTone,
  toQueueItem,
  toReviewDetail,
  type FinanceConsoleRecord,
} from "@/features/finance/model";

const baseRecord: FinanceConsoleRecord = {
    request: {
    schema_version: schemaVersion,
    finance_request_id: "finance-001",
    request_id: "request-001",
    idempotency_key: "idem-001",
    actor_id: "actor-finance",
    actor_role: "finance_ops",
    country_code: "GH",
    channel: "pwa",
    correlation_id: "corr-001",
    case_reference: "listing/listing-001",
    product_type: "invoice_advance",
    requested_amount: 1200,
    currency: "GHS",
    partner_id: "partner-1",
    partner_reference_id: "partner-ref-1",
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
    created_at: "2026-04-18T20:00:00Z",
    updated_at: "2026-04-18T20:00:00Z",
  },
  decisions: [],
};

describe("finance model", () => {
  it("maps request statuses into operator queue states", () => {
    expect(queueStatusFromRequestStatus("pending_partner")).toBe("pending_review");
    expect(queueStatusFromRequestStatus("partner_approved")).toBe("approved");
    expect(queueStatusFromRequestStatus("partner_declined")).toBe("blocked");
    expect(queueStatusFromRequestStatus("hitl_required")).toBe("hitl_required");
  });

  it("maps queue statuses into explicit tone and copy", () => {
    expect(queueStatusTone("approved")).toBe("online");
    expect(queueStatusTone("blocked")).toBe("offline");
    expect(queueStatusTone("hitl_required")).toBe("degraded");
    expect(queueStatusTone("pending_review")).toBe("neutral");
    expect(queueStatusLabel("pending_review")).toBe("Pending review");
  });

  it("builds contract-validated queue and detail payloads", () => {
    const queueItem = toQueueItem(baseRecord);
    const detail = toReviewDetail({
      ...baseRecord,
      decisions: [
        {
          schema_version: schemaVersion,
          decision_id: "decision-2",
          finance_request_id: "finance-001",
          request_id: "request-003",
          actor_id: "actor-finance",
          actor_role: "finance_ops",
          decision_source: "partner",
          outcome: "hitl_required",
          reason_code: "policy_hitl_required",
          note: "Needs manual document validation",
          partner_reference_id: "partner-ref-1",
          responsibility_boundary: baseRecord.request.responsibility_boundary,
          policy_context: baseRecord.request.policy_context,
          transcript_link: "audit://finance/finance-001/decision-2",
          decided_at: "2026-04-18T20:04:00Z",
        },
        {
          schema_version: schemaVersion,
          decision_id: "decision-1",
          finance_request_id: "finance-001",
          request_id: "request-002",
          actor_id: "actor-finance",
          actor_role: "finance_ops",
          decision_source: "partner",
          outcome: "blocked",
          reason_code: "policy_denied",
          note: "Blocked by partner policy",
          partner_reference_id: "partner-ref-1",
          responsibility_boundary: baseRecord.request.responsibility_boundary,
          policy_context: baseRecord.request.policy_context,
          transcript_link: "audit://finance/finance-001/decision-1",
          decided_at: "2026-04-18T20:02:00Z",
        },
      ],
    });

    expect(queueItem.finance_request_id).toBe("finance-001");
    expect(queueItem.status).toBe("pending_review");
    expect(detail.decisions.map((item) => item.decision_id)).toEqual(["decision-1", "decision-2"]);
  });
});
