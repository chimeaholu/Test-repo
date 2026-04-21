import { describe, expect, it } from "vitest";

import { schemaVersion } from "@agrodomain/contracts";
import type { OfflineQueueSnapshot } from "@agrodomain/contracts";

import { reduceQueueSnapshot } from "@/lib/offline/reducer";

const baseSnapshot: OfflineQueueSnapshot = {
  connectivity_state: "degraded" as const,
  handoff_channel: "ussd" as const,
  items: [
    {
      attempt_count: 0,
      conflict_code: null,
      created_at: "2026-04-18T00:00:00.000Z",
      envelope: {
        metadata: {
          actor_id: "actor-1",
          channel: "pwa" as const,
          correlation_id: "corr-1",
          country_code: "GH",
          idempotency_key: "idem-1",
          occurred_at: "2026-04-18T00:00:00.000Z",
          request_id: "req-1",
          schema_version: schemaVersion,
          traceability: {
            data_check_ids: [],
            journey_ids: ["offline:wf-1"],
          },
        },
        command: {
          aggregate_ref: "wf-1",
          mutation_scope: "market.listings.create",
          name: "market.listings.create",
          payload: {
            intent: "market.listings.create",
            payload: {},
            workflow_id: "wf-1",
          },
        },
      },
      idempotency_key: "idem-1",
      intent: "market.listings.create",
      item_id: "item-1",
      last_error_code: null,
      payload: {},
      result_ref: null,
      state: "queued" as const,
      workflow_id: "wf-1",
    },
  ],
};

describe("offline queue reducer", () => {
  it("preserves envelope metadata while retrying", () => {
    const next = reduceQueueSnapshot(baseSnapshot, { type: "retry_item", itemId: "item-1" });
    expect(next.items[0]?.envelope.metadata.idempotency_key).toBe("idem-1");
    expect(next.items[0]?.attempt_count).toBe(1);
  });

  it("moves to acked when replay succeeds", () => {
    const next = reduceQueueSnapshot(baseSnapshot, {
      type: "ack_item",
      itemId: "item-1",
      resultRef: "result-1",
    });
    expect(next.items[0]?.state).toBe("acked");
    expect(next.items[0]?.result_ref).toBe("result-1");
  });

  it("applies backend failure states without a client-only ack shortcut", () => {
    const next = reduceQueueSnapshot(baseSnapshot, {
      type: "apply_backend_result",
      itemId: "item-1",
      errorCode: "delivery_failed",
      retryable: true,
    });
    expect(next.items[0]?.state).toBe("failed_retryable");
    expect(next.items[0]?.last_error_code).toBe("delivery_failed");
  });
});
