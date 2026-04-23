/**
 * Traceability domain service — typed functions for consignment detail
 * and timeline reads.
 */

import type { z } from "zod";
import {
  consignmentSchema,
  traceabilityEventSchema,
  evidenceAttachmentSchema,
} from "@agrodomain/contracts";

import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Consignment = z.infer<typeof consignmentSchema>;
type TraceabilityEvent = z.infer<typeof traceabilityEventSchema>;
type EvidenceAttachment = z.infer<typeof evidenceAttachmentSchema>;

export type ConsignmentDetailResponse = {
  schema_version: string;
  consignment: Consignment;
  timeline: TraceabilityEvent[];
  evidence_attachments?: EvidenceAttachment[];
};

export type ConsignmentTimelineResponse = {
  schema_version: string;
  consignment_id: string;
  items: TraceabilityEvent[];
};

type CallOptions = {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  noAuth?: boolean;
  params?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch a consignment with its timeline and evidence attachments.
 *
 * Backend: GET /api/v1/traceability/consignments/:consignmentId
 */
export async function getConsignment(
  consignmentId: string,
  options?: CallOptions,
): Promise<ConsignmentDetailResponse> {
  return api.get<ConsignmentDetailResponse>(
    `/api/v1/traceability/consignments/${consignmentId}`,
    options,
  );
}

/**
 * Fetch only the timeline for a consignment.
 *
 * Backend: GET /api/v1/traceability/consignments/:consignmentId/timeline
 */
export async function getConsignmentTimeline(
  consignmentId: string,
  options?: CallOptions,
): Promise<ConsignmentTimelineResponse> {
  return api.get<ConsignmentTimelineResponse>(
    `/api/v1/traceability/consignments/${consignmentId}/timeline`,
    options,
  );
}
