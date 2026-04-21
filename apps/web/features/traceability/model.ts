import type { Consignment, EvidenceAttachment, TraceabilityEvent } from "@agrodomain/contracts";

export type EvidenceGalleryResult = {
  valid: EvidenceAttachment[];
  errors: string[];
};

export function sortTimeline(events: TraceabilityEvent[]): TraceabilityEvent[] {
  return [...events].sort((left, right) => left.order_index - right.order_index);
}

export function timelineContinuityWarnings(events: TraceabilityEvent[]): string[] {
  const sorted = sortTimeline(events);
  const warnings: string[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    if (index === 0) {
      if (item.previous_event_reference !== null) {
        warnings.push(`event_${item.trace_event_id}_unexpected_predecessor`);
      }
      continue;
    }
    const previous = sorted[index - 1];
    if (item.previous_event_reference !== previous.event_reference) {
      warnings.push(`event_${item.trace_event_id}_missing_predecessor`);
    }
  }
  return warnings;
}

export function evidenceValidationTone(
  state: EvidenceAttachment["validation_state"],
): "online" | "degraded" | "offline" | "neutral" {
  switch (state) {
    case "validated":
      return "online";
    case "pending_validation":
      return "degraded";
    case "rejected":
      return "offline";
    default:
      return "neutral";
  }
}

export function traceabilityMilestoneTone(
  milestone: TraceabilityEvent["milestone"],
): "online" | "degraded" | "offline" | "neutral" {
  switch (milestone) {
    case "delivered":
      return "online";
    case "exception_logged":
      return "offline";
    case "in_transit":
    case "dispatched":
      return "degraded";
    case "harvested":
    case "handoff_confirmed":
    default:
      return "neutral";
  }
}

export function buildEvidenceGallery(
  attachments: EvidenceAttachment[],
  consignment: Consignment,
  timeline: TraceabilityEvent[],
): EvidenceGalleryResult {
  const eventIds = new Set(timeline.map((item) => item.trace_event_id));
  const valid: EvidenceAttachment[] = [];
  const errors: string[] = [];
  attachments.forEach((attachment) => {
    if (attachment.consignment_id !== consignment.consignment_id) {
      errors.push(`attachment_${attachment.evidence_attachment_id}_consignment_mismatch`);
      return;
    }
    if (!eventIds.has(attachment.trace_event_id)) {
      errors.push(`attachment_${attachment.evidence_attachment_id}_orphaned_event`);
      return;
    }
    valid.push(attachment);
  });
  return { valid, errors };
}
