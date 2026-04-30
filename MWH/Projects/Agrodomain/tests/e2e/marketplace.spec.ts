import { expect, test } from "@playwright/test";

import { createListing, gotoPath, signInAndGrantConsent } from "./helpers";

test.describe("Marketplace create and read", () => {
  test("farmer creates a listing and reads it back from detail", async ({ page }) => {
    const title = `Premium cassava harvest ${Date.now()}`;

    await signInAndGrantConsent(page, {
      displayName: "Ama Mensah",
      email: `ama.${Date.now()}@example.com`,
      role: "farmer",
    });

    const detailHref = await createListing(page, {
      title,
      commodity: "Cassava",
      quantityTons: "4.2",
      priceAmount: "320",
      priceCurrency: "GHS",
      location: "Tamale, GH",
      summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
    });

    await gotoPath(page, detailHref);
    await expect(page).toHaveURL(/\/app\/market\/listings\/.+$/);
    await expect(page.getByText(title).first()).toBeVisible();
    await expect(page.getByText("Price: 320 GHS")).toBeVisible();
    await expect(page.getByText("Location: Tamale, GH")).toBeVisible();
    await expect(page.getByText("Owner edit flow")).toBeVisible();
  });

  test("farmer edits a listing and sees optimistic reconciliation evidence", async ({
    page,
  }) => {
    const title = `Edit-ready cassava ${Date.now()}`;

    await signInAndGrantConsent(page, {
      displayName: "Akosua Mensah",
      email: `akosua.${Date.now()}@example.com`,
      role: "farmer",
    });

    const detailHref = await createListing(page, {
      title,
      commodity: "Cassava",
      quantityTons: "4.2",
      priceAmount: "320",
      priceCurrency: "GHS",
      location: "Tamale, GH",
      summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
    });

    await gotoPath(page, detailHref);
    await page.getByLabel("Listing title").fill(`${title} updated`);
    await page.getByLabel("Price amount").fill("345");
    await page.locator("#edit-status").selectOption("closed");
    await page
      .getByLabel("Summary")
      .fill("Bagged cassava stock updated after inspection and now marked closed.");
    await page.getByRole("button", { name: "Save listing edits" }).click();

    await expect(page.getByText("Optimistic state reconciled")).toBeVisible();
    await expect(page.getByText("Price: 345 GHS")).toBeVisible();
    await expect(page.getByText("Edit committed with audit linkage")).toBeVisible();
    await expect(page.getByText(`${title} updated`).first()).toBeVisible();
  });

  test("farmer can publish and unpublish from owner detail without bypassing canonical commands", async ({
    page,
  }) => {
    const title = `Publish-ready cassava ${Date.now()}`;

    await signInAndGrantConsent(page, {
      displayName: "Efua Mensah",
      email: `efua.${Date.now()}@example.com`,
      role: "farmer",
    });

    const detailHref = await createListing(page, {
      title,
      commodity: "Cassava",
      quantityTons: "5.4",
      priceAmount: "380",
      priceCurrency: "GHS",
      location: "Tamale, GH",
      summary: "Publish path fixture that must move through canonical owner publish and unpublish commands.",
    });

    await gotoPath(page, detailHref);
    await page.locator("#edit-status").selectOption("published");
    await page.getByRole("button", { name: "Save listing edits" }).click();

    await expect(page.getByText("Published to buyer discovery")).toBeVisible();
    await expect(page.getByText("Publish committed with audit linkage")).toBeVisible();
    await expect(page.getByText("Buyer-safe visibility: No")).toBeVisible();

    await page.locator("#edit-status").selectOption("closed");
    await page.getByRole("button", { name: "Save listing edits" }).click();

    await expect(page.getByText("Draft is owner-only")).toBeVisible();
    await expect(page.getByText("Unpublish committed with audit linkage")).toBeVisible();
    await expect(page.getByText("Buyer-safe visibility: No")).toBeVisible();
  });
});
