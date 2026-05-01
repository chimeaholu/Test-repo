import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { TopBar } from "@/components/layout/top-bar";

const copy = {
  actions: { openNavigation: "Open navigation" },
  brand: {
    workspaceFallback: "Agrodomain workspace",
    workspaceUserFallback: "Workspace user",
  },
  topbar: {
    liveWorkspace: "Live workspace",
    localeLabel: "Locale",
    notifications: "Notifications",
    signedIn: "Signed in",
    tagline: "Your trade, funding, and farm operations workspace.",
  },
} as const;

describe("top bar", () => {
  it("renders demo boundary labels when the session is in the shared demo tenant", () => {
    render(
      <TopBar
        copy={copy as never}
        countryCode="GH"
        demoWatermark="Synthetic demo data only."
        isDemoTenant
        localeProfile={{ effectiveLocale: "en-GH" } as never}
        organizationName="AGD Demo | Operator Console"
        operatorCanSwitchPersonas
        roleLabel="Admin"
        userName="Operator"
      />,
    );

    expect(screen.getByText("Guided preview")).toBeInTheDocument();
    expect(screen.getByText("Preview controls")).toBeInTheDocument();
    expect(screen.getByText("Synthetic demo data only.")).toBeInTheDocument();
  });
});
