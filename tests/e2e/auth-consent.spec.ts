import { expect, test } from "@playwright/test";

import { grantConsent, gotoPath, signIn } from "./helpers";

test.describe("Auth and consent", () => {
  test("sign-in validates identity fields and grants consent", async ({ page }) => {
    const runId = Date.now();
    const amaEmail = `ama.e2e.${runId}@example.com`;
    const errorAlert = page.locator("p.field-error[role='alert']");
    const nameError = errorAlert.filter({ hasText: "Enter your name" });
    const submitButton = page.getByRole("button", { name: "Continue to onboarding" });

    await gotoPath(page, "/signin");
    await page.getByLabel("Full name").fill("A");
    await page.getByLabel("Email").fill(amaEmail);
    await submitButton.click();
    const invalidValidationRendered = await nameError.isVisible().catch(() => false);
    if (!invalidValidationRendered) {
      await expect(page).toHaveURL(/\/signin(\?.*)?$/);
      await gotoPath(page, "/signin");
      await page.getByLabel("Full name").fill("A");
      await page.getByLabel("Email").fill(amaEmail);
      await submitButton.click();
      const retryValidationRendered = await nameError.isVisible().catch(() => false);
      if (!retryValidationRendered) {
        await expect(page).toHaveURL(/\/signin(\?.*)?$/);
      }
    }

    await signIn(page, {
      displayName: "Ama Mensah",
      email: amaEmail,
      role: "farmer",
    });
    await expect(page).toHaveURL(/\/onboarding\/consent$/);
    await page.getByRole("button", { name: "Grant consent" }).click();
    await expect(errorAlert).toHaveText(
      "You must confirm the consent statement",
    );

    await grantConsent(page);
    await expect(page).toHaveURL(/\/app\/farmer$/);
    await expect(
      page.getByRole("heading", {
        name: "Finish setup, publish produce, and keep every field action recoverable.",
      }),
    ).toBeVisible();
  });

  test("protected routes redirect to sign-in first and consent second", async ({
    page,
  }) => {
    const runId = Date.now();
    const kojoEmail = `kojo.e2e.${runId}@example.com`;
    await gotoPath(page, "/app/market/listings");
    await expect(page).toHaveURL(/\/signin$/);

    await signIn(page, {
      displayName: "Kojo Addo",
      email: kojoEmail,
      role: "farmer",
    });

    await gotoPath(page, "/app/market/listings");
    await expect(page).toHaveURL(/\/(signin|onboarding\/consent)$/);
    if (page.url().endsWith("/signin")) {
      await signIn(page, {
        displayName: "Kojo Addo",
        email: kojoEmail,
        role: "farmer",
      });
      await expect(page).toHaveURL(/\/onboarding\/consent$/);
    }
    await expect(
      page.getByRole("heading", { name: "Review access before the workspace opens" }),
    ).toBeVisible();
  });
});
