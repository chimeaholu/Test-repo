import { expect, test, type Page } from "@playwright/test";

import { completePasswordEntry, gateActors } from "./eh0-auth-harness";
import { gotoPath } from "./helpers";

const uploadAsset = "/ductor/agents/engineering/workspace/playwright-desktop.png";

async function drawSignature(page: Page): Promise<void> {
  const canvas = page.locator("canvas.trucker-signature-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  await page.mouse.move(box.x + 24, box.y + 42);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 78, { steps: 12 });
  await page.mouse.move(box.x + 220, box.y + 54, { steps: 12 });
  await page.mouse.up();
}

test("EH6 AgroTrucker mobile lane captures SLA, exceptions, and POD", async ({ page }) => {
  test.setTimeout(240_000);
  test.skip(
    process.env.AGRO_E2E_REAL_TRANSPORT_FIXTURES !== "1",
    "pending-backend: EH6 browser proof requires real auth-backed transport fixtures; preview or seeded sessions cannot authorize marketplace mutations.",
  );

  const pickupDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const deliveryDeadline = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const farmer = gateActors.find((actor) => actor.role === "farmer" && actor.countryCode === "GH");
  const transporter = gateActors.find((actor) => actor.role === "transporter" && actor.countryCode === "GH");
  if (!farmer || !transporter) {
    throw new Error("Missing GH farmer/transporter fixtures for EH6 coverage");
  }

  await completePasswordEntry(page, page.request, farmer);
  await gotoPath(page, "/app/trucker/loads/new");
  await expect(page.getByRole("heading", { name: "Describe the load and set the trip clearly" })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByLabel("Pickup location").fill("Tamale, Northern Region");
  await page.getByLabel("Destination").fill("Accra, Greater Accra");
  await page.getByLabel("Commodity").fill("White maize");
  await page.getByLabel("Weight (tonnes)").fill("6");
  await page.getByLabel("Number of items").fill("54");
  await page.getByLabel("Preferred date").fill(pickupDate);
  await page.getByLabel("Delivery deadline").fill(deliveryDeadline);
  await page.getByLabel("Budget").fill("2400");
  await page.getByLabel("Special instructions").fill("Keep dry and confirm receiver by phone before arrival.");
  await page.getByRole("button", { name: "Review load" }).click();
  await page.getByRole("button", { exact: true, name: "Post load" }).click();
  await page.waitForURL(/\/app\/trucker\/shipments\/[^/]+$/, { timeout: 30_000 });

  await gotoPath(page, "/signin");
  await completePasswordEntry(page, page.request, transporter);
  await expect(page).toHaveURL(/\/app\/transporter(\?.*)?$/, { timeout: 30_000 });
  const agroTruckerLink = page.getByRole("link", { name: "AgroTrucker" }).first();
  await expect(agroTruckerLink).toBeVisible({ timeout: 60_000 });
  await agroTruckerLink.click();
  await page.waitForURL((url) => new URL(url).pathname === "/app/trucker", {
    timeout: 30_000,
  });
  await expect(page.getByRole("tab", { name: "I'm a Driver" })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("tab", { name: "I'm a Driver" }).click();
  await page.getByRole("button", { name: "Accept" }).first().click();
  await page.getByRole("button", { name: "Confirm load" }).click();

  const shipmentLink = page.getByRole("link", { name: "Track delivery" }).first();
  await expect(shipmentLink).toBeVisible({ timeout: 60_000 });
  await shipmentLink.click();
  await page.waitForURL(/\/app\/trucker\/shipments\/[^/]+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Delivery timing" })).toBeVisible();
  await page.getByRole("button", { name: /Mark picked up|Mark in transit|Record corridor checkpoint/ }).click();
  await page.getByRole("button", { name: "Report issue" }).click();
  const issueModal = page.getByRole("dialog", { name: "Report issue" });
  await issueModal.locator("select").nth(0).selectOption("breakdown");
  await issueModal.locator("select").nth(1).selectOption("high");
  await page.getByPlaceholder("Delay minutes (optional)").fill("95");
  await page.getByPlaceholder("Describe the issue, checkpoint, and next mitigation step.").fill(
    "Engine issue after the checkpoint. Backup vehicle dispatched.",
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save issue" }).click();

  await expect(page.getByText(/breakdown/i)).toBeVisible();
  await expect(page.getByText(/95 min delay/i)).toBeVisible();
  await expect(page.locator(".status-pill").filter({ hasText: /At risk|Breached/i }).first()).toBeVisible();

  await page.locator("input[type='file']").setInputFiles(uploadAsset);
  await page.getByPlaceholder("Recipient name").fill("Abena Receiver");
  await drawSignature(page);
  await page.getByRole("button", { name: "Complete delivery" }).click();

  await expect(page.getByText(/Completed on /)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".status-pill").filter({ hasText: /Met SLA|Missed SLA/ }).first()).toBeVisible();
  await expect(page.locator(".trucker-page-head").getByText(/^delivered$/i)).toBeVisible();
});
