import { expect, test } from "@playwright/test";

import { createListing, gotoPath, signInAndGrantConsent } from "../helpers";
import { captureEvidence, waitForStablePage } from "../r8-utils";

test("RB-072 cross-role listing handoff stays intact from farmer to buyer", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Cross-role concurrency coverage runs once on desktop chromium in this lane.",
  );

  const stamp = `${testInfo.project.name}-${Date.now()}`;
  const sellerContext = await browser.newContext();
  const buyerContext = await browser.newContext();
  const sellerPage = await sellerContext.newPage();
  const buyerPage = await buyerContext.newPage();

  try {
    await signInAndGrantConsent(sellerPage, {
      displayName: "R8 Seller",
      email: `r8.seller.${stamp}@example.com`,
      role: "farmer",
    });
    const listingTitle = `R8 cassava ${stamp}`;
    const listingHref = await createListing(sellerPage, {
      title: listingTitle,
      commodity: "Cassava",
      quantityTons: "18",
      priceAmount: "9800",
      priceCurrency: "GHS",
      location: "Kumasi",
      summary: "Cross-role listing handoff for R8 regression coverage.",
    });
    await gotoPath(sellerPage, listingHref);
    await waitForStablePage(sellerPage);
    await captureEvidence(sellerPage, testInfo, "cross-role", "seller-listing");

    await signInAndGrantConsent(buyerPage, {
      displayName: "R8 Buyer",
      email: `r8.buyer.${stamp}@example.com`,
      role: "buyer",
    });
    await gotoPath(buyerPage, listingHref);
    await waitForStablePage(buyerPage);
    await expect(buyerPage.getByRole("heading", { name: listingTitle }).first()).toBeVisible();
    await buyerPage.getByRole("link", { name: "Make Offer" }).click();
    await expect(buyerPage).toHaveURL(/\/app\/market\/negotiations\?listingId=/);
    await captureEvidence(buyerPage, testInfo, "cross-role", "buyer-negotiation-entry");
  } finally {
    await sellerContext.close();
    await buyerContext.close();
  }
});
