import { expect, test } from "@playwright/test";

import { gotoPath, signInAndGrantConsent } from "../helpers";
import { captureEvidence, waitForStablePage } from "../r8-utils";

test("RB-072 offline to online recovery stays usable for the farmer shell", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "Offline-online transition coverage runs once on desktop chromium in this lane.",
  );

  await signInAndGrantConsent(page, {
    displayName: "R8 Recovery Farmer",
    email: `r8.recovery.${Date.now()}@example.com`,
    role: "farmer",
  });
  await gotoPath(page, "/app/farmer");
  await waitForStablePage(page);
  await gotoPath(page, "/app/offline/outbox");
  await waitForStablePage(page);
  await expect(page).toHaveURL(/\/app\/offline\/outbox$/);

  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Simulate offline" }).click();
  await expect(page.locator(".status-pill.offline").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Outbox and replay controls" })).toBeVisible();
  await captureEvidence(page, testInfo, "offline-online", "offline-shell");

  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Force online" }).click();
  await expect(page.locator(".status-pill.online").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Outbox and replay controls" })).toBeVisible();
  await captureEvidence(page, testInfo, "offline-online", "online-shell");
});
