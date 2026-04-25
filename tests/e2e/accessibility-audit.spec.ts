import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { gotoPath } from "./helpers";
import {
  captureEvidence,
  createAuthenticatedSession,
  openAgroGuide,
  primeSession,
  routeSlug,
  stripDevOverlays,
  waitForStablePage,
} from "./r8-utils";

const accessibilityProjects = new Set(["chromium-desktop", "chromium-mobile"]);
const publicRoutes = ["/", "/signin", "/signup", "/about", "/features", "/contact", "/onboarding/consent"];
const farmerRoutes = [
  "/app/farmer",
  "/app/market/listings",
  "/app/payments/wallet",
  "/app/farm",
  "/app/weather",
  "/app/trucker",
  "/app/advisory/new",
  "/app/analytics",
] as const;

async function auditCurrentPage(route: string, page: Parameters<typeof test>[0]["page"], testInfo: Parameters<typeof test>[0]["testInfo"]) {
  await waitForStablePage(page);
  await stripDevOverlays(page);
  const results = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .exclude("[data-next-badge-root]")
    .analyze();
  const blocking = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious",
  );

  await testInfo.attach(`axe-${routeSlug(route)}.json`, {
    body: JSON.stringify(
      {
        route,
        project: testInfo.project.name,
        violations: results.violations,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await captureEvidence(page, testInfo, "accessibility", routeSlug(route));

  expect(
    blocking,
    blocking.length
      ? `Blocking axe violations on ${route}:\n${blocking
          .map((violation) => `${violation.id}: ${violation.help}`)
          .join("\n")}`
      : undefined,
  ).toEqual([]);
}

test.describe.configure({ mode: "serial" });

for (const route of publicRoutes) {
  test(`RB-063 public route ${route} has no critical or serious axe violations`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !accessibilityProjects.has(testInfo.project.name),
      "Accessibility automation is scoped to chromium desktop/mobile for this lane.",
    );

    await gotoPath(page, route);
    await auditCurrentPage(route, page, testInfo);
  });
}

test("RB-063 authenticated farmer routes stay accessible", async ({ page, request }, testInfo) => {
  test.skip(
    !accessibilityProjects.has(testInfo.project.name),
    "Accessibility automation is scoped to chromium desktop/mobile for this lane.",
  );

  const farmer = await createAuthenticatedSession(request, {
    displayName: "R8 Farmer Accessibility",
    email: `r8.accessibility.${testInfo.project.name}.${Date.now()}@example.com`,
    role: "farmer",
  });

  for (const route of farmerRoutes) {
    await primeSession(page, farmer, route);
    if (route === "/app/farmer") {
      const agroGuideTrigger = page.getByRole("button", { name: "Open AgroGuide AI assistant" });
      if ((await agroGuideTrigger.count()) > 0 && (await agroGuideTrigger.first().isVisible())) {
        await openAgroGuide(page);
        await stripDevOverlays(page);
        await captureEvidence(page, testInfo, "accessibility", `${routeSlug(route)}-agroguide`);
        const agroGuideCloseButton = page.locator(".agroguide-close").first();
        await expect(agroGuideCloseButton).toBeVisible();
        await agroGuideCloseButton.click({ force: true });
      }
    }
    await auditCurrentPage(route, page, testInfo);
  }
});

test("RB-063 admin analytics stays accessible", async ({ page, request }, testInfo) => {
  test.skip(
    !accessibilityProjects.has(testInfo.project.name),
    "Accessibility automation is scoped to chromium desktop/mobile for this lane.",
  );

  const admin = await createAuthenticatedSession(request, {
    displayName: "R8 Admin Accessibility",
    email: `r8.admin.${testInfo.project.name}.${Date.now()}@example.com`,
    role: "admin",
  });

  await primeSession(page, admin, "/app/admin/analytics");
  await auditCurrentPage("/app/admin/analytics", page, testInfo);
});

test("RB-063 keyboard access works for the mobile nav dialog and sign-in role picker", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-mobile",
    "Keyboard interaction sampling is captured once on mobile chromium.",
  );

  await gotoPath(page, "/");
  await waitForStablePage(page);
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await menuButton.focus();
  await expect(menuButton).toBeFocused();
  await page.keyboard.press("Enter");

  const closeButton = page.getByRole("button", { name: "Close menu" });
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();

  await gotoPath(page, "/signin");
  await waitForStablePage(page);
  const farmerRole = page.locator("input[name='role'][value='farmer']");
  const buyerRole = page.locator("input[name='role'][value='buyer']");
  await farmerRole.focus();
  await expect(farmerRole).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(buyerRole).toBeChecked();
  await captureEvidence(page, testInfo, "accessibility", "keyboard-controls");
});
