import { describe, expect, it } from "vitest";

import { listingFormSchema, listingRecordToFormValues } from "@/features/listings/schema";

describe("listing schemas", () => {
  it("validates an edit-ready listing payload", () => {
    expect(
      listingFormSchema.safeParse({
        title: "Premium cassava harvest",
        commodity: "Cassava",
        quantityTons: "4.2",
        priceAmount: "320",
        priceCurrency: "GHS",
        location: "Tamale, GH",
        summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
        status: "published",
      }).success,
    ).toBe(true);
  });

  it("rejects incomplete edits", () => {
    const result = listingFormSchema.safeParse({
      title: "Ok",
      commodity: "",
      quantityTons: "0",
      priceAmount: "-1",
      priceCurrency: "ghs",
      location: "",
      summary: "short",
      status: "published",
    });

    expect(result.success).toBe(false);
  });

  it("maps server listings into form state", () => {
    expect(
      listingRecordToFormValues({
        title: "Fresh maize lot",
        commodity: "Maize",
        quantity_tons: 3.1,
        price_amount: 280,
        price_currency: "GHS",
        location: "Kumasi, GH",
        summary: "Fresh maize lot ready for pickup with weighbridge receipt available.",
        status: "draft",
      }),
    ).toEqual({
      title: "Fresh maize lot",
      commodity: "Maize",
      quantityTons: "3.1",
      priceAmount: "280",
      priceCurrency: "GHS",
      location: "Kumasi, GH",
      summary: "Fresh maize lot ready for pickup with weighbridge receipt available.",
      status: "draft",
    });
  });
});

