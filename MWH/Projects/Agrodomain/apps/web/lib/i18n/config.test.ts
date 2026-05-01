import { describe, expect, it } from "vitest";

import {
  currencyOptionsForLocale,
  getPlannedLocaleOptions,
  resolveLocaleProfile,
} from "@/lib/i18n/config";

describe("locale profile resolution", () => {
  it("resolves Ghana sessions to the Ghana English pack", () => {
    const profile = resolveLocaleProfile({
      countryCode: "GH",
      preferredLocale: "en-GH",
      readingLevelBand: "plain",
    });

    expect(profile.locale).toBe("en-GH");
    expect(profile.effectiveLocale).toBe("en-GH");
    expect(profile.currencyCode).toBe("GHS");
    expect(profile.translationPackVersion).toBe("2026.04-eh1a.1");
  });

  it("falls back planned Nigerian locales to the active Nigerian English pack", () => {
    const profile = resolveLocaleProfile({
      countryCode: "NG",
      preferredLocale: "ha-NG",
      readingLevelBand: "plain",
    });

    expect(profile.locale).toBe("ha-NG");
    expect(profile.effectiveLocale).toBe("en-NG");
    expect(profile.fallbackNotice).toContain("Hausa");
  });

  it("orders currency options by the current locale pack", () => {
    expect(currencyOptionsForLocale("en-NG")[0]?.value).toBe("NGN");
    expect(currencyOptionsForLocale("en-GH")[0]?.value).toBe("GHS");
  });

  it("filters planned locale options by country", () => {
    const ghLocales = getPlannedLocaleOptions("GH").map((item) => item.code);
    const ngLocales = getPlannedLocaleOptions("NG").map((item) => item.code);

    expect(ghLocales).toContain("tw-GH");
    expect(ngLocales).toContain("ha-NG");
    expect(ghLocales).not.toContain("ha-NG");
  });
});
