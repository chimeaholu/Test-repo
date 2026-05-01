import { expect, test, type Page } from "@playwright/test";

import { grantConsent, gotoPath, signIn, signInAndGrantConsent } from "./helpers";

async function expectHydratedHeading(page: Page, name: string): Promise<void> {
  const bootHeading = page.getByRole("heading", { name: "Restoring your workspace and recent activity." });
  await bootHeading.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => undefined);
  await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });
}

test.describe("Consent recovery and offline retry", () => {
  test.setTimeout(180_000);

  test("consent revoke blocks protected routes until restored", async ({ page }) => {
    const displayName = "Esi Farmer";
    const email = `esi.${Date.now()}@example.com`;

    await signInAndGrantConsent(page, {
      displayName,
      email,
      role: "farmer",
    });

    await gotoPath(page, "/app/profile");
    await expectHydratedHeading(page, "Consent and permissions");
    await page
      .getByLabel("Reason for revocation")
      .fill("Consent needs review");
    await page.getByRole("button", { name: "Revoke consent" }).click();

    await expect(page.getByText("consent_revoked")).toBeVisible();
    await gotoPath(page, "/app/market/listings");
    await expect(page).toHaveURL(/\/(signin|onboarding\/consent)$/);

    if (page.url().endsWith("/signin")) {
      await signIn(page, {
        displayName,
        email,
        role: "farmer",
      });
      await grantConsent(page);
      await expect(page).toHaveURL(/\/app\/farmer$/);
    } else {
      await gotoPath(page, "/app/profile");
      await page.getByRole("button", { name: "Restore consent" }).click();
      await expect(page).toHaveURL(/\/app\/farmer$/);
    }

    await gotoPath(page, "/app/market/listings");
    await expectHydratedHeading(
      page,
      "Create, revise, and publish inventory with clear market status",
    );
  });

  test("offline seam exposes connectivity, retry, and dismiss controls", async ({ page }) => {
    await signInAndGrantConsent(page, {
      displayName: "Yaw Farmer",
      email: `yaw.${Date.now()}@example.com`,
      role: "farmer",
    });

    await gotoPath(page, "/app/offline/outbox");
    await expect(page.getByRole("heading", { name: "Outbox and replay controls" })).toBeVisible();
    await expect(page.getByText(/Suggested handoff/i)).toBeVisible();
    await expect(page.getByText("Attempts 0")).toBeVisible();

    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText(/acked|failed_retryable/i)).toBeVisible();
    await expect(page.getByText("Attempts 1")).toBeVisible();

    await page.getByRole("button", { name: "Simulate offline" }).click();
    await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Offline" })).toBeVisible();
    await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Handoff whatsapp" })).toBeVisible();

    await page.getByRole("button", { name: "Force online" }).click();
    await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Online" })).toBeVisible();
    await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Handoff whatsapp" })).toHaveCount(0);

    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText("market.listings.create")).toHaveCount(0);
  });
});
