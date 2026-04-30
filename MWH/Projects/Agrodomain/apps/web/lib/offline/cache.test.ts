import { beforeEach, describe, expect, it } from "vitest";

import {
  cacheReadModel,
  getCachedReadModel,
  listCachedReadModels,
} from "@/lib/offline/cache";
import { OFFLINE_READ_MODEL_KEY } from "@/lib/offline/storage";

describe("offline read-model cache", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores supported read models and reports synced freshness online", () => {
    cacheReadModel("/api/v1/marketplace/listings", {
      items: [{ listing_id: "listing-1" }],
    });

    expect(listCachedReadModels("online")).toEqual([
      expect.objectContaining({
        label: "Marketplace listings",
        module: "Marketplace",
        state: "synced",
      }),
    ]);
  });

  it("returns cached data and marks it local after cache access", () => {
    cacheReadModel("/api/v1/wallet/summary?currency=GHS", {
      balance: 4200,
    });

    const cached = getCachedReadModel<{ balance: number }>(
      "/api/v1/wallet/summary?currency=GHS",
    );

    expect(cached?.data).toEqual({ balance: 4200 });
    expect(listCachedReadModels("offline")[0]?.state).toBe("local");
  });

  it("marks expired records as stale", () => {
    cacheReadModel("/api/v1/identity/actors/search?q=buyer", {
      items: [{ actor_id: "buyer-1" }],
    });

    const raw = window.localStorage.getItem(OFFLINE_READ_MODEL_KEY);
    const catalog = JSON.parse(raw ?? "{\"records\":[]}") as {
      version: number;
      records: Array<Record<string, unknown>>;
    };
    catalog.records[0] = {
      ...catalog.records[0],
      expires_at: "2020-01-01T00:00:00.000Z",
    };
    window.localStorage.setItem(OFFLINE_READ_MODEL_KEY, JSON.stringify(catalog));

    expect(listCachedReadModels("online")[0]?.state).toBe("stale");
  });
});
