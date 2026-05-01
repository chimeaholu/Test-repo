import { expect, test } from "@playwright/test";

import { createListing, gotoPath, signInAndGrantConsent } from "../helpers";
import {
  captureEvidence,
  openAgroGuide,
  routeSlug,
  stripDevOverlays,
  waitForStablePage,
} from "../r8-utils";

test("RB-072 critical farmer journey stays green across the browser matrix", async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  const stamp = `${testInfo.project.name}-${Date.now()}`;

  await gotoPath(page, "/");
  await waitForStablePage(page);
  await stripDevOverlays(page);
  await captureEvidence(page, testInfo, "regression", "home");

  await signInAndGrantConsent(page, {
    displayName: "R8 Farmer",
    email: `r8.farmer.${stamp}@example.com`,
    role: "farmer",
  });
  await expect(page).toHaveURL(/\/app\/farmer$/);
  await expect(page.getByText("Farmer workspace")).toBeVisible();
  await captureEvidence(page, testInfo, "regression", "farmer-home");

  const listingTitle = `R8 export maize ${stamp}`;
  const listingHref = await createListing(page, {
    title: listingTitle,
    commodity: "Maize",
    quantityTons: "24",
    priceAmount: "14500",
    priceCurrency: "GHS",
    location: "Tamale",
    summary: "R8 regression listing for browser compatibility smoke coverage.",
  });
  await gotoPath(page, listingHref);
  await waitForStablePage(page);
  await expect(page.getByRole("heading", { name: listingTitle }).first()).toBeVisible();
  await captureEvidence(page, testInfo, "regression", "listing-detail");

  for (const route of ["/app/trucker", "/app/analytics"] as const) {
    await gotoPath(page, route);
    await waitForStablePage(page);
    await stripDevOverlays(page);
    if (route === "/app/trucker") {
      await expect(page.getByRole("tab", { name: "I Need Transport" })).toBeVisible();
    } else {
      await expect(page.getByTestId("analytics-dashboard-root")).toBeVisible();
    }
    await captureEvidence(page, testInfo, "regression", routeSlug(route));
  }

  await gotoPath(page, "/app/farmer");
  await waitForStablePage(page);
  await openAgroGuide(page);
  await captureEvidence(page, testInfo, "regression", "agroguide-dialog");
});
