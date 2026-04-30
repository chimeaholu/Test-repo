import { render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorState } from "@/components/error-state";

describe("error hardening", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sanitizes network failures in the shared error state", () => {
    vi.stubEnv("NODE_ENV", "production");

    render(
      <ErrorState
        context="Workspace error"
        error={Object.assign(new Error("Failed to fetch"), { digest: "abc123" })}
        secondaryHref="/app"
        secondaryLabel="Back to workspace"
      />,
    );

    expect(
      screen.getByText(
        "We could not reach the live service backing this view. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Reference: abc123")).toBeInTheDocument();
  });

  it("explains chunk loading failures without exposing internal details", () => {
    vi.stubEnv("NODE_ENV", "production");

    render(
      <ErrorState
        context="Workspace error"
        error={Object.assign(new Error("Loading chunk 12 failed"), { name: "ChunkLoadError" })}
        secondaryHref="/app"
        secondaryLabel="Back to workspace"
      />,
    );

    expect(
      screen.getByText(
        "Part of the latest interface did not load correctly. Retry once, and reload the page if the problem persists.",
      ),
    ).toBeInTheDocument();
  });
});
