import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  enqueueDeferredMutation,
  getStoredQueueSnapshot,
  replayQueuedMutations,
} from "@/lib/offline/mutation-engine";

describe("offline mutation engine", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("queues a deferred mutation with a replay envelope", () => {
    const item = enqueueDeferredMutation({
      actorId: "actor-1",
      aggregateRef: "listing",
      commandName: "market.listings.create",
      countryCode: "GH",
      idempotencyKey: "idem-1",
      input: {
        title: "Cassava draft",
        commodity: "Cassava",
      },
      mutationScope: "marketplace.listings",
      journeyIds: ["CJ-002"],
      dataCheckIds: ["DI-001"],
      traceId: "trace-offline",
    });

    expect(item.intent).toBe("market.listings.create");
    expect(getStoredQueueSnapshot().items).toHaveLength(1);
  });

  it("marks pending work as conflicted when the session token is missing", async () => {
    enqueueDeferredMutation({
      actorId: "actor-1",
      aggregateRef: "listing",
      commandName: "market.listings.create",
      countryCode: "GH",
      idempotencyKey: "idem-2",
      input: {
        title: "Cassava draft",
      },
      mutationScope: "marketplace.listings",
      journeyIds: ["CJ-002"],
      dataCheckIds: ["DI-001"],
      traceId: "trace-offline",
    });

    const snapshot = await replayQueuedMutations({
      accessToken: null,
      apiBaseUrl: "http://127.0.0.1:8000",
    });

    expect(snapshot.items[0]?.state).toBe("conflicted");
    expect(snapshot.items[0]?.conflict_code).toBe("session_refresh_required");
  });

  it("replays queued work and marks it acked when the backend accepts it", async () => {
    enqueueDeferredMutation({
      actorId: "actor-1",
      aggregateRef: "listing",
      commandName: "market.listings.create",
      countryCode: "GH",
      idempotencyKey: "idem-3",
      input: {
        title: "Cassava draft",
      },
      mutationScope: "marketplace.listings",
      journeyIds: ["CJ-002"],
      dataCheckIds: ["DI-001"],
      traceId: "trace-offline",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          request_id: "req-acked",
          result: {
            listing: {
              listing_id: "listing-22",
            },
          },
        }),
      }),
    );

    const snapshot = await replayQueuedMutations({
      accessToken: "token-1",
      apiBaseUrl: "http://127.0.0.1:8000",
    });

    expect(snapshot.items[0]?.state).toBe("acked");
    expect(snapshot.items[0]?.result_ref).toBe("listing:listing-22");
  });
});
