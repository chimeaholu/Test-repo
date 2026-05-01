import { describe, expect, it } from "vitest";

import {
  assessPlainLanguageCopy,
  validateAllActiveLocaleCatalogs,
  validateLocaleGovernanceCoverage,
} from "@/lib/i18n/readability";

describe("EH1A readability and governance harness", () => {
  it("flags jargon-heavy copy", () => {
    const assessment = assessPlainLanguageCopy(
      "This canonical runtime utilises idempotency to ensure a therefore-style control surface.",
    );

    expect(assessment.passes).toBe(false);
    expect(assessment.flaggedTerms.length).toBeGreaterThan(0);
  });

  it("keeps active locale catalogs within plain-language thresholds", () => {
    expect(validateAllActiveLocaleCatalogs()).toEqual([]);
  });

  it("requires governance coverage for every active locale token", () => {
    expect(validateLocaleGovernanceCoverage()).toEqual([]);
  });
});
