import { describe, expect, it } from "vitest";

import { listCatalogStrings } from "@/lib/i18n/messages";

describe("locale message catalogs", () => {
  it("keeps active locale packs on the same token shape", () => {
    expect(Object.keys(listCatalogStrings("en-GH"))).toEqual(
      Object.keys(listCatalogStrings("en-NG")),
    );
  });
});
