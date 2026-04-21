import { describe, expect, it } from "vitest";

import {
  buildEvidenceGallery,
  sortTimeline,
  timelineContinuityWarnings,
  traceabilityMilestoneTone,
} from "@/features/traceability/model";

describe("traceability model", () => {
  it("keeps timeline order and continuity warnings explicit", () => {
    const sorted = sortTimeline([
      {
        trace_event_id: "trace-2",
        order_index: 2,
        previous_event_reference: "evt-1",
        event_reference: "evt-2",
      },
      {
        trace_event_id: "trace-1",
        order_index: 1,
        previous_event_reference: null,
        event_reference: "evt-1",
      },
    ] as never);
    expect(sorted.map((item) => item.trace_event_id)).toEqual(["trace-1", "trace-2"]);
    expect(timelineContinuityWarnings(sorted as never)).toEqual([]);
    expect(
      timelineContinuityWarnings(
        [
          { trace_event_id: "trace-1", order_index: 1, previous_event_reference: null, event_reference: "evt-1" },
          { trace_event_id: "trace-2", order_index: 2, previous_event_reference: "evt-x", event_reference: "evt-2" },
        ] as never,
      ),
    ).toEqual(["event_trace-2_missing_predecessor"]);
  });

  it("flags orphaned and mismatched evidence attachments", () => {
    const result = buildEvidenceGallery(
      [
        {
          evidence_attachment_id: "attach-1",
          consignment_id: "consignment-1",
          trace_event_id: "trace-1",
        },
        {
          evidence_attachment_id: "attach-2",
          consignment_id: "consignment-2",
          trace_event_id: "trace-1",
        },
        {
          evidence_attachment_id: "attach-3",
          consignment_id: "consignment-1",
          trace_event_id: "trace-404",
        },
      ] as never,
      {
        consignment_id: "consignment-1",
      } as never,
      [
        {
          trace_event_id: "trace-1",
        },
      ] as never,
    );
    expect(result.valid.map((item) => item.evidence_attachment_id)).toEqual(["attach-1"]);
    expect(result.errors).toEqual([
      "attachment_attach-2_consignment_mismatch",
      "attachment_attach-3_orphaned_event",
    ]);
  });

  it("maps milestone tone explicitly", () => {
    expect(traceabilityMilestoneTone("delivered")).toBe("online");
    expect(traceabilityMilestoneTone("exception_logged")).toBe("offline");
    expect(traceabilityMilestoneTone("in_transit")).toBe("degraded");
    expect(traceabilityMilestoneTone("harvested")).toBe("neutral");
  });
});
