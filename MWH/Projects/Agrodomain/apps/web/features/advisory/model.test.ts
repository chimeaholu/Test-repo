import { describe, expect, it } from "vitest";

import { confidenceTone, resolveAdvisoryLocale, reviewerHeadline } from "@/features/advisory/model";

describe("advisory model", () => {
  it("falls back to the nearest supported locale", () => {
    expect(resolveAdvisoryLocale("fr-SN")).toEqual({
      resolvedLocale: "fr-CI",
      usedFallback: true,
    });
    expect(resolveAdvisoryLocale("en-GH")).toEqual({
      resolvedLocale: "en-GH",
      usedFallback: false,
    });
  });

  it("maps confidence and reviewer states to explicit UI copy", () => {
    expect(confidenceTone("high")).toBe("online");
    expect(confidenceTone("medium")).toBe("degraded");
    expect(confidenceTone("low")).toBe("offline");
    expect(
      reviewerHeadline({
        reviewer_decision: {
          outcome: "hitl_required",
        },
      } as never),
    ).toBe("Human review required before delivery");
  });
});
