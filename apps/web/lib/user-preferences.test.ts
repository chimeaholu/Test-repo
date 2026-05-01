import type { IdentitySession } from "@agrodomain/contracts";
import { beforeEach, describe, expect, it } from "vitest";

import {
  defaultPreferences,
  markAllNotificationsRead,
  markNotificationReadState,
  patchUserPreferences,
  readUserPreferences,
  USER_PREFERENCES_KEY,
} from "@/lib/user-preferences";

function buildSession(overrides: Partial<IdentitySession> = {}): IdentitySession {
  return {
    actor: {
      actor_id: "actor-1",
      country_code: "GH",
      display_name: "Ama Mensah",
      email: "ama@example.com",
      locale: "en-GH",
      membership: {
        organization_id: "org-1",
        organization_name: "Northern Co-op",
        role: "investor",
      },
      role: "investor",
    },
    available_roles: ["investor"],
    consent: {
      actor_id: "actor-1",
      captured_at: "2026-04-18T00:00:00.000Z",
      channel: "pwa",
      country_code: "GH",
      policy_version: "2026.04.w1",
      revoked_at: null,
      scope_ids: ["identity.core"],
      state: "consent_granted",
    },
    ...overrides,
  };
}

describe("user preferences store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates defaults from the live session", () => {
    const session = buildSession();
    expect(defaultPreferences(session).display.locale).toBe("en-GH");
    expect(defaultPreferences(session).display.currency).toBe("GHS");
    expect(defaultPreferences(session).display.readingLevelBand).toBe("plain");
    expect(readUserPreferences(session).notifications.push).toBe(true);
    expect(readUserPreferences(session).notifications.categories.system).toBe(true);
  });

  it("merges patches without dropping existing values", () => {
    const session = buildSession();
    patchUserPreferences(session, {
      profile: { city: "Tamale", region: "Northern Region", memberSince: "2026-01-01T00:00:00.000Z", roleFocus: "Maize" },
    });

    const next = patchUserPreferences(session, {
      display: { locale: "en-NG", currency: "USD", readingLevelBand: "standard" },
    });

    expect(next.profile.city).toBe("Tamale");
    expect(next.display.locale).toBe("en-NG");
    expect(next.display.readingLevelBand).toBe("standard");
  });

  it("tracks read and unread notification state", () => {
    const session = buildSession();
    markNotificationReadState(session, "note-1", true);
    markNotificationReadState(session, "note-2", true);
    markNotificationReadState(session, "note-1", false);

    expect(readUserPreferences(session).notifications.readIds).toEqual(["note-2"]);
  });

  it("marks multiple notifications as read in one action", () => {
    const session = buildSession();
    markAllNotificationsRead(session, ["note-1", "note-2", "note-3"]);

    expect(readUserPreferences(session).notifications.readIds).toHaveLength(3);
  });

  it("stores category preferences without dropping channel settings", () => {
    const session = buildSession();
    patchUserPreferences(session, {
      notifications: {
        categories: {
          trade: false,
          finance: true,
          weather: true,
          advisory: false,
          copilot: true,
          transport: true,
          system: true,
        },
      },
    });

    const next = readUserPreferences(session);
    expect(next.notifications.push).toBe(true);
    expect(next.notifications.categories.trade).toBe(false);
    expect(next.notifications.categories.system).toBe(true);
  });

  it("migrates legacy language preferences to the nearest active locale", () => {
    const session = buildSession({
      actor: {
        ...buildSession().actor,
        country_code: "NG",
        locale: "en-NG",
      },
    });

    window.localStorage.setItem(
      USER_PREFERENCES_KEY,
      JSON.stringify({
        [session.actor.actor_id]: {
          display: {
            currency: "USD",
            language: "ha",
          },
        },
      }),
    );

    const next = readUserPreferences(session);
    expect(next.display.locale).toBe("en-NG");
    expect(next.display.currency).toBe("USD");
    expect(next.display.readingLevelBand).toBe("plain");
  });
});
