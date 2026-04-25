import { beforeEach, describe, expect, it, vi } from "vitest";
import { schemaVersion } from "@agrodomain/contracts";

import {
  apiBaseUrl,
  clearAll,
  nowIso,
  readJson,
  readSession,
  readToken,
  requestJson,
  responseEnvelope,
  seedQueue,
  SESSION_KEY,
  TOKEN_KEY,
  unwrapCollection,
  writeJson,
  writeSession,
  writeToken,
} from "@/lib/api-client";

describe("api-client core HTTP layer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // responseEnvelope
  // -----------------------------------------------------------------------
  describe("responseEnvelope", () => {
    it("wraps data with correct metadata", () => {
      const envelope = responseEnvelope({ foo: 1 }, "trace-123");
      expect(envelope.status).toBe("completed");
      expect(envelope.data).toEqual({ foo: 1 });
      expect(envelope.metadata.correlation_id).toBe("trace-123");
      expect(envelope.metadata.request_id).toBe("trace-123");
      expect(envelope.metadata.schema_version).toBe(schemaVersion);
      expect(envelope.metadata.causation_id).toBe("web-client:trace-123");
      expect(envelope.metadata.emitted_at).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // localStorage helpers
  // -----------------------------------------------------------------------
  describe("readJson / writeJson", () => {
    it("round-trips a value through localStorage", () => {
      writeJson("test-key", { x: 42 });
      expect(readJson("test-key")).toEqual({ x: 42 });
    });

    it("returns null for missing keys", () => {
      expect(readJson("nonexistent")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Token management
  // -----------------------------------------------------------------------
  describe("readToken / writeToken", () => {
    it("persists and retrieves a token", () => {
      writeToken("abc-token");
      expect(readToken()).toBe("abc-token");
    });

    it("clears the token when null is passed", () => {
      writeToken("abc-token");
      writeToken(null);
      expect(readToken()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Session storage
  // -----------------------------------------------------------------------
  describe("readSession / writeSession", () => {
    const session = {
      actor: {
        actor_id: "actor-1",
        display_name: "Test",
        email: "test@example.com",
        role: "farmer" as const,
        country_code: "GH",
        locale: "en-GH",
        membership: {
          organization_id: "org-1",
          organization_name: "Test Org",
          role: "farmer" as const,
        },
      },
      consent: {
        actor_id: "actor-1",
        country_code: "GH",
        state: "identified" as const,
        policy_version: null,
        scope_ids: [],
        channel: null,
        captured_at: null,
        revoked_at: null,
      },
      available_roles: ["farmer" as const],
    };

    it("round-trips a session through localStorage", () => {
      writeSession(session);
      const restored = readSession();
      expect(restored?.actor.actor_id).toBe("actor-1");
    });

    it("returns null when no session stored", () => {
      expect(readSession()).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // clearAll
  // -----------------------------------------------------------------------
  describe("clearAll", () => {
    it("removes session, token, and queue from localStorage", () => {
      writeToken("token");
      writeJson(SESSION_KEY, { test: true });
      clearAll();
      expect(readToken()).toBeNull();
      expect(readJson(SESSION_KEY)).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // requestJson
  // -----------------------------------------------------------------------
  describe("requestJson", () => {
    it("sends correct headers and returns wrapped response", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "item-1" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await requestJson<{ id: string }>(
        "/api/v1/test",
        { method: "GET" },
        "trace-1",
      );

      expect(result.status).toBe("completed");
      expect(result.data.id).toBe("item-1");

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/v1/test");
      expect(new Headers(init.headers).get("X-Request-ID")).toBe("trace-1");
      expect(new Headers(init.headers).get("Content-Type")).toBe(
        "application/json",
      );
    });

    it("attaches Authorization header when authenticated", async () => {
      writeToken("my-token");
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      vi.stubGlobal("fetch", fetchMock);

      await requestJson("/api/v1/secure", { method: "GET" }, "t-2", true);

      const [, init] = fetchMock.mock.calls[0];
      expect(new Headers(init.headers).get("Authorization")).toBe(
        "Bearer my-token",
      );
    });

    it("throws when authenticated but no token", async () => {
      await expect(
        requestJson("/api/v1/secure", { method: "GET" }, "t-3", true),
      ).rejects.toThrow("Session token missing");
    });

    it("throws with backend error detail on non-ok response", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "forbidden" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        requestJson("/api/v1/fail", { method: "GET" }, "t-4"),
      ).rejects.toThrow("forbidden");
    });
  });

  // -----------------------------------------------------------------------
  // unwrapCollection
  // -----------------------------------------------------------------------
  describe("unwrapCollection", () => {
    it("passes through an array as-is", () => {
      expect(unwrapCollection([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it("extracts items from {items: []} shape", () => {
      expect(unwrapCollection({ items: [4, 5] })).toEqual([4, 5]);
    });

    it("returns empty array for non-collection values", () => {
      expect(unwrapCollection("string")).toEqual([]);
      expect(unwrapCollection(null)).toEqual([]);
      expect(unwrapCollection({})).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // seedQueue
  // -----------------------------------------------------------------------
  describe("seedQueue", () => {
    it("produces a valid offline queue snapshot", () => {
      const session = {
        actor: {
          actor_id: "actor-1",
          display_name: "Ama",
          email: "ama@test.com",
          role: "farmer" as const,
          country_code: "GH",
          locale: "en-GH",
          membership: {
            organization_id: "org-1",
            organization_name: "Org",
            role: "farmer" as const,
          },
        },
        consent: {
          actor_id: "actor-1",
          country_code: "GH",
          state: "identified" as const,
          policy_version: null,
          scope_ids: [],
          channel: null,
          captured_at: null,
          revoked_at: null,
        },
        available_roles: ["farmer" as const],
      };

      const snapshot = seedQueue(session, "trace-seed");
      expect(snapshot.connectivity_state).toBe("degraded");
      expect(snapshot.items).toHaveLength(1);
      expect(snapshot.items[0].intent).toBe("market.listings.create");
      expect(snapshot.items[0].state).toBe("queued");
    });
  });

  // -----------------------------------------------------------------------
  // apiBaseUrl
  // -----------------------------------------------------------------------
  describe("apiBaseUrl", () => {
    it("returns the default when env var is not set", () => {
      const original = process.env.NEXT_PUBLIC_AGRO_API_BASE_URL;
      delete process.env.NEXT_PUBLIC_AGRO_API_BASE_URL;
      expect(apiBaseUrl()).toBe("http://127.0.0.1:8000");
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_AGRO_API_BASE_URL = original;
      }
    });
  });

  // -----------------------------------------------------------------------
  // nowIso
  // -----------------------------------------------------------------------
  describe("nowIso", () => {
    it("returns a valid ISO timestamp", () => {
      const ts = nowIso();
      expect(() => new Date(ts)).not.toThrow();
      expect(new Date(ts).toISOString()).toBe(ts);
    });
  });
});
