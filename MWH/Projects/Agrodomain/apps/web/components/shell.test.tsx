import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoadNotificationFeed, mockUseAppState, mockUsePathname } = vi.hoisted(() => ({
  mockLoadNotificationFeed: vi.fn(),
  mockUseAppState: vi.fn(),
  mockUsePathname: vi.fn(),
}));

vi.mock("@/components/app-provider", () => ({
  useAppState: () => mockUseAppState(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/features/notifications/model", () => ({
  loadNotificationFeed: (...args: unknown[]) => mockLoadNotificationFeed(...args),
  unreadNotificationCount: (
    items: Array<{
      read: boolean;
    }>,
  ) => items.filter((item) => !item.read).length,
}));

import { ProtectedShell } from "@/components/shell";
import {
  patchUserPreferences,
  USER_PREFERENCES_KEY,
} from "@/lib/user-preferences";

const session = {
  actor: {
    actor_id: "actor-1",
    country_code: "GH",
    display_name: "Ama Mensah",
    email: "ama@example.com",
    locale: "en-GH",
    membership: {
      organization_id: "org-1",
      organization_name: "Northern Co-op",
      role: "farmer",
    },
    role: "farmer",
  },
  available_roles: ["farmer"],
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
} as const;

describe("ProtectedShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockLoadNotificationFeed.mockResolvedValue([]);
    mockUsePathname.mockReturnValue("/app/farmer");
    mockUseAppState.mockReturnValue({
      cachedReadModels: [],
      clearSession: vi.fn(),
      isHydrated: true,
      queue: {
        connectivity_state: "online",
        handoff_channel: null,
        items: [],
      },
      session,
      traceId: "trace-shell",
    });
  });

  it("re-renders shell locale state when preferences change", async () => {
    render(
      <ProtectedShell>
        <div>Workspace</div>
      </ProtectedShell>,
    );

    expect(screen.getByText("Locale pack: en-GH")).toBeInTheDocument();

    act(() => {
      patchUserPreferences(session as never, {
        display: {
          currency: "NGN",
          locale: "en-NG",
          readingLevelBand: "standard",
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Locale pack: en-NG")).toBeInTheDocument();
    });
  });

  it("hydrates shell locale state from legacy language preferences", async () => {
    window.localStorage.setItem(
      USER_PREFERENCES_KEY,
      JSON.stringify({
        [session.actor.actor_id]: {
          display: {
            currency: "USD",
            language: "tw",
          },
        },
      }),
    );

    render(
      <ProtectedShell>
        <div>Workspace</div>
      </ProtectedShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("Locale pack: en-GH")).toBeInTheDocument();
    });
  });
});
