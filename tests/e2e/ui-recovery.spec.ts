import { expect, test, type Page } from "@playwright/test";

import { gotoPath, signIn, signInAndGrantConsent } from "./helpers";

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => ({
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
        })),
      { timeout: 20_000 },
    )
    .toEqual(
      expect.objectContaining({
        scrollWidth: expect.any(Number),
      }),
    );

  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
}

async function expectVisibleButtonMinHeight(page: Page, name: RegExp): Promise<void> {
  const height = await page
    .getByRole("button", { name })
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(44);
}

test.describe("UI recovery pass", () => {
  test("auth and onboarding stay readable, touch-safe, and free of placeholder framing", async ({ page }) => {
    const email = `ui.recovery.${Date.now()}@example.com`;

    await gotoPath(page, "/signin");
    await expect(
      page.getByRole("heading", {
        name: "Welcome back",
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Sign in to your Agrodomain account")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectVisibleButtonMinHeight(page, /Sign In/i);
    await expect(page.getByText(/placeholder|preview|fixture|mock/i)).toHaveCount(0);

    await signIn(page, {
      displayName: "Ama Mensah",
      email,
      role: "farmer",
    });

    await expect(
      page.getByRole("heading", { name: "Review access before the workspace opens" }),
    ).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalOverflow(page);
    await expectVisibleButtonMinHeight(page, /Grant consent/i);
    await expect(page.getByText(/placeholder|preview|fixture|mock/i)).toHaveCount(0);
  });

  test("workspace surfaces keep visual hierarchy and avoid horizontal overflow across core journeys", async ({ page }) => {
    await signInAndGrantConsent(page, {
      displayName: "UI Recovery Buyer",
      email: `buyer.ui.${Date.now()}@example.com`,
      role: "buyer",
    });

    await gotoPath(page, "/app/market/listings");
    await expect(
      page.getByRole("heading", { name: "Discover trusted agricultural supply in one place" }),
    ).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalOverflow(page);

    await gotoPath(page, "/app/notifications");
    await expect(
      page.getByRole("heading", { name: "Trade, finance, weather, advisory, and system updates" }),
    ).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalOverflow(page);
    await expect(page.getByText(/placeholder|preview|fixture|mock/i)).toHaveCount(0);
  });
});
