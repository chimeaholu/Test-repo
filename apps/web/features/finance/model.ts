import type {
  FinanceDecision,
  FinancePartnerRequest,
  FinanceReviewDetail,
  FinanceReviewQueueItem,
} from "@agrodomain/contracts";
import { financeReviewDetailSchema, financeReviewQueueItemSchema, schemaVersion } from "@agrodomain/contracts";

export type FinanceQueueStatus = FinanceReviewQueueItem["status"];

export type FinanceConsoleRecord = {
  request: FinancePartnerRequest;
  decisions: FinanceDecision[];
};

export function queueStatusFromRequestStatus(status: FinancePartnerRequest["status"]): FinanceQueueStatus {
  switch (status) {
    case "partner_approved":
      return "approved";
    case "blocked":
    case "partner_declined":
      return "blocked";
    case "hitl_required":
      return "hitl_required";
    case "pending_partner":
    case "pending_review":
    default:
      return "pending_review";
  }
}

export function queueStatusTone(status: FinanceQueueStatus): "online" | "offline" | "degraded" | "neutral" {
  switch (status) {
    case "approved":
      return "online";
    case "blocked":
      return "offline";
    case "hitl_required":
      return "degraded";
    case "pending_review":
    default:
      return "neutral";
  }
}

export function queueStatusLabel(status: FinanceQueueStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "blocked":
      return "Blocked";
    case "hitl_required":
      return "HITL required";
    case "pending_review":
    default:
      return "Pending review";
  }
}

export function toQueueItem(record: FinanceConsoleRecord): FinanceReviewQueueItem {
  const status = queueStatusFromRequestStatus(record.request.status);
  return financeReviewQueueItemSchema.parse({
    schema_version: schemaVersion,
    queue_item_id: `queue-${record.request.finance_request_id}`,
    finance_request_id: record.request.finance_request_id,
    partner_id: record.request.partner_id,
    partner_reference_id: record.request.partner_reference_id,
    actor_id: record.request.actor_id,
    actor_role: record.request.actor_role,
    country_code: record.request.country_code,
    status,
    responsibility_boundary: record.request.responsibility_boundary,
    policy_context: record.request.policy_context,
    summary: `${record.request.case_reference} • ${record.request.product_type}`,
    created_at: record.request.created_at,
    updated_at: record.request.updated_at,
  });
}

export function toReviewDetail(record: FinanceConsoleRecord): FinanceReviewDetail {
  return financeReviewDetailSchema.parse({
    ...toQueueItem(record),
    request: record.request,
    decisions: [...record.decisions].sort((left, right) => left.decided_at.localeCompare(right.decided_at)),
  });
}

export function responsibilityOwnerCopy(owner: FinanceReviewQueueItem["responsibility_boundary"]["owner"]): string {
  switch (owner) {
    case "partner":
      return "Partner owned";
    case "internal":
      return "Internal owned";
    case "shared":
      return "Shared ownership";
  }
}
