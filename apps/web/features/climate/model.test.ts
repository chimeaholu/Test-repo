import { describe, expect, it } from "vitest";

import { climateSeverityTone, climateSourceConfidence, mrvCompletenessTone } from "@/features/climate/model";

describe("climate model", () => {
  it("maps severity and completeness into visible tones", () => {
    expect(climateSeverityTone("critical")).toBe("offline");
    expect(climateSeverityTone("warning")).toBe("degraded");
    expect(mrvCompletenessTone("complete")).toBe("online");
    expect(mrvCompletenessTone("degraded")).toBe("offline");
  });

  it("keeps degraded-mode confidence explicit", () => {
    expect(
      climateSourceConfidence({
        degraded_mode: true,
      } as never),
    ).toBe("Reduced while source windows recover");
  });
});
