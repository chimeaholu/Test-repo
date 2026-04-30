import { expect, test, type Page } from "@playwright/test";

import { gotoPath } from "./helpers";

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
}

async function primeFarmerShell(page: Page): Promise<void> {
  const session = {
    actor: {
      actor_id: "eh1-farmer",
      country_code: "GH",
      display_name: "Ama Mensah",
      email: "ama.eh1@example.com",
      locale: "en-GH",
      membership: {
        organization_id: "org-eh1",
        organization_name: "Northern Growers",
        role: "farmer",
      },
      role: "farmer",
    },
    available_roles: ["farmer"],
    consent: {
      actor_id: "eh1-farmer",
      captured_at: "2026-04-29T00:00:00.000Z",
      channel: "pwa",
      country_code: "GH",
      policy_version: "2026.04.eh1",
      revoked_at: null,
      scope_ids: ["identity.core", "workflow.audit"],
      state: "consent_granted",
    },
  };

  await page.route("**/api/v1/identity/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify(session),
      contentType: "application/json",
      status: 200,
    });
  });

  await gotoPath(page, "/signin");
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    {
      name: "agrodomain-session",
      sameSite: "Lax",
      url: origin,
      value: "1",
    },
  ]);
  await page.evaluate((seedSession) => {
    window.localStorage.setItem("agrodomain.session-token.v1", "eh1-seeded-token");
    window.localStorage.setItem("agrodomain.session.v2", JSON.stringify(seedSession));
    document.cookie = "agrodomain-session=1;path=/;samesite=lax";
  }, session);
}

test.describe("EH1 brand and mixed-literacy UX", () => {
  test("public and auth entry routes keep one Agrodomain brand language", async ({ page }) => {
    await gotoPath(page, "/");
    await expect(page.getByText("Agrodomain").first()).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Run your agriculture business with more control and less guesswork.",
      }),
    ).toBeVisible();
    const heroImage = await page.evaluate(() =>
      getComputedStyle(document.querySelector(".pub-home-visual")!).backgroundImage,
    );
    expect(heroImage).toContain("agrodomain-cover");

    await gotoPath(page, "/signin");
    await expect(page.getByRole("heading", { name: "Sign in to your Agrodomain account" })).toBeVisible();
    const signInImage = await page.evaluate(() =>
      getComputedStyle(document.querySelector(".pub-signin-bg")!, "::before").backgroundImage,
    );
    expect(signInImage).toContain("agrodomain-article");

    await gotoPath(page, "/signup");
    await expect(page.getByRole("heading", { name: "Set up your Agrodomain workspace" })).toBeVisible();
  });

  test("farmer shell surfaces stay icon-led, mobile-safe, and brand-consistent", async ({ page }, testInfo) => {
    await primeFarmerShell(page);
    await gotoPath(page, "/app/farmer");

    await expect(page.getByRole("heading", { name: /keep the next field move clear/i })).toBeVisible();
    await expect(page.getByText("Choose the next farm task")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const actionTileHeight = await page
      .locator(".task-card")
      .first()
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(actionTileHeight).toBeGreaterThanOrEqual(100);

    if (testInfo.project.name === "mobile-critical") {
      const bottomNavHeight = await page
        .locator(".ds-bottom-nav-item")
        .first()
        .evaluate((element) => element.getBoundingClientRect().height);
      expect(bottomNavHeight).toBeGreaterThanOrEqual(48);
      await expect(page.getByRole("link", { name: /workspace/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /market/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /alerts/i }).first()).toBeVisible();
    } else {
      await expect(page.getByRole("link", { name: /workspace/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /^market$/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /updates/i }).first()).toBeVisible();
    }
  });
});
