import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { gotoPath, signInAndGrantConsent } from "./helpers";

function proofPath(testInfo: TestInfo, name: string): string | null {
  const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR;
  if (!artifactDir) {
    return null;
  }
  const screenshotDir = path.join(artifactDir, "screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });
  return path.join(screenshotDir, `${testInfo.project.name}-${name}.png`);
}

async function captureProof(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const screenshotPath = proofPath(testInfo, name);
  if (!screenshotPath) {
    return;
  }
  if (testInfo.project.name === "mobile-critical") {
    return;
  }
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Target crashed") || message.includes("page crashed")) {
      return;
    }
    if (!message.includes("Page.captureScreenshot")) {
      throw error;
    }
    // Fallback for intermittent mobile full-page capture protocol failures.
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
  }
}

async function openAdvisorRequestsWithRecovery(
  page: Page,
  authInput: Parameters<typeof signInAndGrantConsent>[1],
): Promise<void> {
  const heading = page.getByRole("heading", { name: "Review evidence-backed recommendations" });
  const onAuthGate =
    /\/signin(\?.*)?$/.test(page.url()) || /\/onboarding\/consent(\?.*)?$/.test(page.url());
  if (onAuthGate) {
    await signInAndGrantConsent(page, authInput);
  }

  await gotoPath(page, "/app/advisor");
  await expect(page).toHaveURL(/\/app\/advisor(\?.*)?$/, { timeout: 20_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);

  await gotoPath(page, "/app/advisor/requests");
  await expect(page).toHaveURL(/\/app\/advisor\/requests(\?.*)?$/, { timeout: 20_000 });
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

async function openClimateAlertsWithRecovery(
  page: Page,
  authInput: Parameters<typeof signInAndGrantConsent>[1],
): Promise<void> {
  const heading = page.getByRole("heading", { name: "Monitor weather risk and field evidence with confidence in view" });
  const onAuthGate =
    /\/signin(\?.*)?$/.test(page.url()) || /\/onboarding\/consent(\?.*)?$/.test(page.url());
  if (onAuthGate) {
    await signInAndGrantConsent(page, authInput);
  }

  await gotoPath(page, "/app/climate/alerts");
  if (/\/signin(\?.*)?$/.test(page.url()) || /\/onboarding\/consent(\?.*)?$/.test(page.url())) {
    await signInAndGrantConsent(page, authInput);
    await gotoPath(page, "/app/climate/alerts");
  }
  await expect(page).toHaveURL(/\/app\/climate\/alerts(\?.*)?$/, { timeout: 20_000 });
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

test.describe("N4 advisory and climate tranche diagnostics", () => {
  test("CJ-005 EP-006 RJ-003 DI-005 advisory route shows citations, confidence, and reviewer state", async ({
    page,
  }, testInfo) => {
    const runId = `${testInfo.project.name}-${Date.now()}`;
    const advisorIdentity = {
      displayName: "N4 Advisor QA",
      email: `advisor.n4.${runId}@example.com`,
      role: "advisor",
      countryCode: "GH",
    } as const;
    await signInAndGrantConsent(page, advisorIdentity);
    await openAdvisorRequestsWithRecovery(page, advisorIdentity);
    await expect(
      page.getByText(
        "Every response keeps citations, confidence, and reviewer posture visible before anyone treats it as field advice.",
      ),
    ).toBeVisible();
    await expect(page.getByText(/confidence/i).first()).toBeVisible();
    await expect(page.getByText(/Reviewer decision/i)).toBeVisible();
    await page.getByRole("button", { name: "Open citation drawer" }).click();
    await expect(page.getByRole("heading", { name: "Source proof" })).toBeVisible();
    await expect(page.getByText("Unverified input claims control")).toBeVisible();

    await captureProof(page, testInfo, "cj005-advisory-conversation");
  });

  test("CJ-006 EP-008 RJ-003 DI-006 climate route shows alert acknowledgement and MRV evidence", async ({
    page,
  }, testInfo) => {
    const runId = `${testInfo.project.name}-${Date.now()}`;
    const farmerIdentity = {
      displayName: "N4 Farmer QA",
      email: `farmer.n4.${runId}@example.com`,
      role: "farmer",
      countryCode: "GH",
    } as const;
    await signInAndGrantConsent(page, farmerIdentity);
    await openClimateAlertsWithRecovery(page, farmerIdentity);
    await expect(
      page.getByText(
        "Alert severity, acknowledgement state, source posture, and evidence assumptions stay visible together so operators do not over-read partial data.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Acknowledge alert/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assumptions and method references" })).toBeVisible();
    await expect(page.getByText("IPCC Tier 2 Annex 4")).toBeVisible();
    await expect(page.getByText(/Assumption/i).first()).toBeVisible();
    await expect(page.getByText(/degraded/i).first()).toBeVisible();

    await captureProof(page, testInfo, "cj006-climate-dashboard");
  });
});
