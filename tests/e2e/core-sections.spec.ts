import { expect, test } from "@playwright/test";

import { createListing, gotoPath, listingIdFromHref, signInAndGrantConsent } from "./helpers";

test.describe("Core sections remain click-through reachable", () => {
  test("cooperative dispatch is backed by live listing and negotiation state", async ({ page }) => {
    await signInAndGrantConsent(page, {
      displayName: "Cooperative Lead",
      email: `coop.${Date.now()}@example.com`,
      role: "cooperative",
    });

    await gotoPath(page, "/app/cooperative/dispatch");
    await expect(page).toHaveURL(/\/app\/cooperative\/dispatch$/);
    await expect(
      page.getByText("Dispatch-ready lots and negotiation handoff state").first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText("This route now reads the current listing and negotiation runtime"),
    ).toBeVisible();
  });

  test("finance queue and admin analytics resolve to runtime-backed panels", async ({ page }) => {
    await signInAndGrantConsent(page, {
      displayName: "Finance Reviewer",
      email: `finance.${Date.now()}@example.com`,
      role: "finance",
    });

    await gotoPath(page, "/app/finance/queue");
    await expect(
      page.getByRole("heading", { name: "Protected finance queue with settlement and consent posture" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();

    await signInAndGrantConsent(page, {
      displayName: "Admin Reviewer",
      email: `admin.${Date.now()}@example.com`,
      role: "admin",
    });

    await gotoPath(page, "/app/admin/analytics");
    await expect(
      page.getByRole("heading", { name: "Release posture, route truth, and runtime health" }),
    ).toBeVisible();
  });

  test("traceability and notifications use live runtime context", async ({ page }) => {
    const title = `Traceability cassava ${Date.now()}`;

    await signInAndGrantConsent(page, {
      displayName: "Trace Farmer",
      email: `trace.${Date.now()}@example.com`,
      role: "farmer",
    });

    const detailHref = await createListing(page, {
      title,
      commodity: "Cassava",
      quantityTons: "3.4",
      priceAmount: "280",
      priceCurrency: "GHS",
      location: "Kumasi, GH",
      summary: "Traceability route proof lot.",
    });
    const listingId = listingIdFromHref(detailHref);

    await gotoPath(page, `/app/traceability/${listingId}`);
    await expect(
      page.getByRole("heading", { name: `Traceability chain for ${listingId}` }),
    ).toBeVisible();

    await gotoPath(page, "/app/notifications");
    await expect(
      page.getByRole("heading", { name: "Recovery prompts, settlement handoffs, and consent changes" }),
    ).toBeVisible();
  });
});
