import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { AppShell } from "@/components/layout/app-shell";

const shellCopy = {
  actions: {
    closeMenu: "Seal drawer",
    closeNavigation: "Seal navigation",
    collapseSidebar: "Fold rail",
    expandSidebar: "Open rail",
    openNavigation: "Open navigation",
    signOut: "Leave",
  },
  brand: {
    mark: "Agrodomain",
    tag: "Field operations",
    workspaceFallback: "Agrodomain workspace",
    workspaceUserFallback: "Workspace user",
  },
  mobileNavigationLabel: "Pocket navigation",
  navigation: {
    advisory: "Guide",
    alerts: "Buzz",
    analytics: "Pulse",
    dashboard: "Overview",
    deals: "Deals",
    dispatch: "Routes",
    market: "Bazaar",
    marketplace: "Bazaar",
    negotiations: "Bargains",
    notifications: "Buzzboard",
    profile: "Identity",
    queue: "Queue",
    requests: "Requests",
    settings: "Controls",
    signals: "Signals",
    weather: "Skies",
  },
  sections: {
    account: "Account",
    core: "Core deck",
    finance: "Finance",
    intelligence: "Intel",
    operations: "Ops",
  },
  sync: {
    ariaLabel: "Sync status",
    forceOnline: "Force online",
    handoffLabel: "Handoff",
    lowConnectivity: "Low connectivity",
    offline: "Offline",
    online: "Online",
    simulateDegraded: "Simulate degraded",
    simulateOffline: "Simulate offline",
    summary:
      "Pending items: {actionableCount}. Review conflicts: {conflictedCount}. Cached views: {cachedCount}. Local reads: {localCount}. Stale reads: {staleCount}.",
    title: "Your work stays saved, even when the connection drops.",
  },
  topbar: {
    liveWorkspace: "Live workspace",
    localeLabel: "Locale pack",
    notifications: "Notifications",
    signedIn: "Signed in",
    tagline: "Your trade, funding, and farm operations workspace.",
  },
} as const;

describe("AppShell", () => {
  it("passes localized navigation copy into shared shell surfaces", () => {
    mockUsePathname.mockReturnValue("/app/farmer");

    render(
      <AppShell
        localeProfile={{ effectiveLocale: "en-GH" } as never}
        role="farmer"
        roleLabel="Farmer"
        shellCopy={shellCopy as never}
      >
        <div>Child content</div>
      </AppShell>,
    );

    expect(screen.getByText("Core deck")).toBeInTheDocument();
    expect(screen.getAllByText("Bazaar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Buzzboard").length).toBeGreaterThan(0);
    expect(screen.getByText("Locale pack: en-GH")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Pocket navigation" })).toBeInTheDocument();
  });
});
