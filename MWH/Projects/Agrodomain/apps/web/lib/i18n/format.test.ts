import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatUnit,
} from "@/lib/i18n/format";

describe("locale formatters", () => {
  it("formats Ghana and Nigeria currencies through the shared layer", () => {
    expect(formatCurrency(1250.5, { locale: "en-GH" })).toContain("GH");
    expect(formatCurrency(1250.5, { locale: "en-NG" })).toContain("₦");
  });

  it("formats dates and datetimes with locale-aware output", () => {
    expect(formatDate("2026-04-29T10:00:00.000Z", { locale: "en-GH" })).toContain("2026");
    expect(formatDateTime("2026-04-29T10:00:00.000Z", { locale: "en-NG" })).toContain("2026");
  });

  it("formats units with metric-first labels", () => {
    expect(formatUnit(4.5, "ton", { locale: "en-NG" })).toBe("4.5 tons");
    expect(formatUnit(3, "hectare", { compact: true, locale: "en-GH" })).toBe("3 ha");
  });

  it("renders relative time through the shared formatter", () => {
    const output = formatRelativeTime("2026-04-29T09:00:00.000Z", {
      baseDate: "2026-04-29T10:00:00.000Z",
      locale: "en-GH",
    });

    expect(output).toBe("1 hour ago");
  });
});
