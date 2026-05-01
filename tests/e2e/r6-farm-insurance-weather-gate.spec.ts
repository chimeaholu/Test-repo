import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type ConsoleMessage, type Page, type TestInfo } from "@playwright/test";

import { gotoPath } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";

type SessionSeed = {
  accessToken: string;
  session: {
    actor: {
      actor_id: string;
      country_code: string;
      role: "farmer";
    };
  };
};

function screenshotPath(testInfo: TestInfo, slug: string): string | null {
  const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR;
  if (!artifactDir) {
    return null;
  }

  const screenshotDir = path.join(artifactDir, "screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });
  return path.join(screenshotDir, `${testInfo.project.name}-${slug}.png`);
}

async function captureProof(page: Page, testInfo: TestInfo, slug: string): Promise<void> {
  const targetPath = screenshotPath(testInfo, slug);
  if (!targetPath) {
    return;
  }

  try {
    await page.screenshot({ path: targetPath, fullPage: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Page.captureScreenshot")) {
      throw error;
    }
    await page.screenshot({ path: targetPath, fullPage: false });
  }
}

async function createAuthenticatedSession(
  request: APIRequestContext,
  input: {
    countryCode?: "GH" | "NG" | "JM";
    displayName: string;
    email: string;
  },
): Promise<SessionSeed> {
  const signInRequestId = crypto.randomUUID();
  const signInResponse = await request.post(`${API_BASE_URL}/api/v1/identity/session`, {
    data: {
      display_name: input.displayName,
      email: input.email,
      role: "farmer",
      country_code: input.countryCode ?? "GH",
    },
    headers: {
      "X-Correlation-ID": signInRequestId,
      "X-Request-ID": signInRequestId,
    },
  });
  expect(signInResponse.ok()).toBeTruthy();

  const signInPayload = (await signInResponse.json()) as {
    access_token: string;
    session: SessionSeed["session"];
  };

  const consentRequestId = crypto.randomUUID();
  const consentResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
    data: {
      captured_at: new Date().toISOString(),
      policy_version: "2026.04.r6",
      scope_ids: ["identity.core", "workflow.audit", "notifications.delivery"],
    },
    headers: {
      Authorization: `Bearer ${signInPayload.access_token}`,
      "X-Correlation-ID": consentRequestId,
      "X-Request-ID": consentRequestId,
    },
  });
  expect(consentResponse.ok()).toBeTruthy();

  return {
    accessToken: signInPayload.access_token,
    session: (await consentResponse.json()) as SessionSeed["session"],
  };
}

async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  await gotoPath(page, "/signin");
  await page.evaluate(
    ([sessionKey, tokenKey, session, token]) => {
      window.localStorage.setItem(sessionKey, JSON.stringify(session));
      window.localStorage.setItem(tokenKey, token);
    },
    [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  );
}

async function activateSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  await primeSession(page, sessionSeed);
  await gotoPath(page, "/app/farmer");
  await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  await expect(page).toHaveURL(/\/app\/farmer$/, { timeout: 30_000 });
}

async function assertNoHorizontalOverflow(page: Page, route: string): Promise<void> {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(
    metrics.scrollWidth - metrics.clientWidth,
    `${route} should not introduce horizontal overflow`,
  ).toBeLessThanOrEqual(1);
}

function newConsoleErrors(
  errors: string[],
  pageErrors: string[],
  previous: { consoleCount: number; pageCount: number },
): string[] {
  return [
    ...errors.slice(previous.consoleCount),
    ...pageErrors.slice(previous.pageCount),
  ].filter(
    (message) =>
      !message.includes("favicon.ico") &&
      message !== "Failed to load resource: the server responded with a status of 404 (Not Found)",
  );
}

async function assertNoRuntimeErrors(
  errors: string[],
  pageErrors: string[],
  previous: { consoleCount: number; pageCount: number },
  route: string,
): Promise<void> {
  expect(newConsoleErrors(errors, pageErrors, previous), `${route} emitted runtime errors`).toEqual([]);
}

async function openDrawer(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
}

async function navigateFromSharedNav(
  page: Page,
  label: "AgroFarm" | "AgroShield" | "Weather",
  route: string,
  isMobile: boolean,
): Promise<void> {
  if (isMobile) {
    await openDrawer(page);
    await page.getByRole("link", { name: label, exact: true }).click();
  } else {
    await page.getByRole("link", { name: label, exact: true }).click();
  }

  await expect(page).toHaveURL(new RegExp(`${route.replace(/\//g, "\\/")}(\\?.*)?$`), {
    timeout: 30_000,
  });
}

async function expectHeading(page: Page, name: string | RegExp): Promise<void> {
  await expect(page.getByRole("heading", { name }).first()).toBeVisible({ timeout: 30_000 });
}

function collectConsoleMessage(message: ConsoleMessage): string | null {
  if (message.type() !== "error") {
    return null;
  }

  const text = message.text().trim();
  if (!text) {
    return null;
  }
  return text;
}

test.describe("R6 farm, insurance, and weather gate", () => {
  test("farmer entry points and target surfaces stay release-ready", async ({ page, request }, testInfo) => {
    const isMobile = testInfo.project.name.includes("mobile");
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (message) => {
      const text = collectConsoleMessage(message);
      if (text) {
        consoleErrors.push(text);
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const sessionSeed = await createAuthenticatedSession(request, {
      displayName: `R6 QA ${testInfo.project.name}`,
      email: `r6-gate-${testInfo.project.name}-${Date.now()}@example.com`,
    });

    await activateSession(page, sessionSeed);

    await test.step("farmer dashboard exposes the target modules", async () => {
      await expectHeading(page, /, .+\.$/);
      await expect(page.getByText("Farmer workspace")).toBeVisible();
      await expect(page.getByRole("link", { name: "Check weather" })).toBeVisible();
      if (isMobile) {
        await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toContainText("Farm");
      } else {
        await expect(page.getByRole("link", { name: "AgroFarm", exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: "AgroShield", exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: "Weather", exact: true })).toBeVisible();
      }
      await assertNoHorizontalOverflow(page, "/app/farmer");
      await captureProof(page, testInfo, "00-farmer-entry");
    });

    await test.step("farm home renders and drills into field detail", async () => {
      const counts = { consoleCount: consoleErrors.length, pageCount: pageErrors.length };

      if (isMobile) {
        await page.getByRole("link", { name: "Farm", exact: true }).click();
        await expect(page).toHaveURL(/\/app\/farm$/, { timeout: 30_000 });
      } else {
        await navigateFromSharedNav(page, "AgroFarm", "/app/farm", isMobile);
      }

      await expectHeading(page, "Farm management");
      await expect(page.getByText("AgroFarm operations")).toBeVisible();
      await page.getByRole("button", { name: "List" }).click();
      await expect(page.getByRole("heading", { name: "Operations surface" })).toBeVisible();
      await page.getByRole("button", { name: "Add field" }).click();
      await expectHeading(page, "Add field");
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("button", { name: "Add field" })).toBeVisible();
      await assertNoHorizontalOverflow(page, "/app/farm");
      await assertNoRuntimeErrors(consoleErrors, pageErrors, counts, "/app/farm");
      await captureProof(page, testInfo, "01-farm-home");

      await page.getByRole("link", { name: "Open field workspace" }).click();
      await expect(page).toHaveURL(/\/app\/farm\/fields\/[^/]+$/, { timeout: 30_000 });
    });

    await test.step("field detail renders and routes to inputs", async () => {
      const counts = { consoleCount: consoleErrors.length, pageCount: pageErrors.length };

      await expect(page.getByRole("link", { name: "Review inputs" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "Field weather watch" })).toBeVisible();
      await page.getByRole("button", { name: "Log activity" }).first().click();
      await expectHeading(page, "Log field activity");
      await page.getByRole("button", { name: "Cancel" }).click();
      await assertNoHorizontalOverflow(page, "/app/farm/fields/[id]");
      await assertNoRuntimeErrors(consoleErrors, pageErrors, counts, "/app/farm/fields/[id]");
      await captureProof(page, testInfo, "02-farm-field-detail");

      await page.getByRole("link", { name: "Review inputs" }).click();
      await expect(page).toHaveURL(/\/app\/farm\/inputs$/, { timeout: 30_000 });
    });

    await test.step("inputs tracker renders and keeps add-input flow reachable", async () => {
      const counts = { consoleCount: consoleErrors.length, pageCount: pageErrors.length };
      const addInputButton = page.getByRole("button", { name: "Add input" }).first();

      await expectHeading(page, "Input tracker");
      await addInputButton.click();
      await expectHeading(page, "Add input");
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(addInputButton).toBeVisible();
      await assertNoHorizontalOverflow(page, "/app/farm/inputs");
      await assertNoRuntimeErrors(consoleErrors, pageErrors, counts, "/app/farm/inputs");
      await captureProof(page, testInfo, "03-farm-inputs");
    });

    await test.step("insurance home renders and exposes claim detail", async () => {
      const counts = { consoleCount: consoleErrors.length, pageCount: pageErrors.length };

      await navigateFromSharedNav(page, "AgroShield", "/app/insurance", isMobile);
      await expectHeading(page, "Coverage, claims, and weather evidence in one workspace.");
      await expect(page.getByRole("button", { name: "Review and purchase" })).toBeVisible();
      const claimLink = page.getByRole("link", { name: /Open claim detail|Review latest claim/i }).first();
      await expect(claimLink).toBeVisible({ timeout: 30_000 });
      await assertNoHorizontalOverflow(page, "/app/insurance");
      await assertNoRuntimeErrors(consoleErrors, pageErrors, counts, "/app/insurance");
      await captureProof(page, testInfo, "04-insurance-home");
      await claimLink.click();
      await expect(page).toHaveURL(/\/app\/insurance\/claims\/[^/]+$/, { timeout: 30_000 });
    });

    await test.step("claim detail renders rainfall evidence", async () => {
      const counts = { consoleCount: consoleErrors.length, pageCount: pageErrors.length };

      await expect(page.getByText("Claim detail")).toBeVisible();
      await expectHeading(page, "Rainfall evidence");
      await expect(page.getByRole("img", { name: "Rainfall comparison chart" })).toBeVisible();
      await assertNoHorizontalOverflow(page, "/app/insurance/claims/[id]");
      await assertNoRuntimeErrors(consoleErrors, pageErrors, counts, "/app/insurance/claims/[id]");
      await captureProof(page, testInfo, "05-insurance-claim-detail");

      await page.getByRole("link", { name: /Back to insurance/i }).click();
      await expect(page).toHaveURL(/\/app\/insurance$/, { timeout: 30_000 });
    });

    await test.step("weather workspace renders and keeps alert acknowledgement functional", async () => {
      const counts = { consoleCount: consoleErrors.length, pageCount: pageErrors.length };

      await navigateFromSharedNav(page, "Weather", "/app/weather", isMobile);
      await expectHeading(page, "Forecasts, field context, and weather-linked advice in one workflow");
      await expect(page.getByTestId("weather-dashboard-root")).toBeVisible();
      await expect(page.getByLabel("Farm location")).toBeVisible();

      const acknowledgeButtons = page.getByRole("button", { name: "Acknowledge alert" });
      const noActiveAlerts = page.getByText("No active weather alerts");
      await expect
        .poll(
          async () => {
            if ((await acknowledgeButtons.count()) > 0) {
              return "acknowledgeable";
            }
            if ((await noActiveAlerts.count()) > 0) {
              return "empty";
            }
            return "pending";
          },
          { timeout: 30_000 },
        )
        .toMatch(/acknowledgeable|empty/);

      if ((await acknowledgeButtons.count()) > 0) {
        const acknowledgeButton = acknowledgeButtons.first();
        await acknowledgeButton.scrollIntoViewIfNeeded();
        await expect(acknowledgeButton).toBeVisible();
        await acknowledgeButton.click();
        await expect(page.getByRole("button", { name: "Acknowledged" }).first()).toBeVisible({ timeout: 30_000 });
      } else {
        await expect(noActiveAlerts).toBeVisible();
      }

      await assertNoHorizontalOverflow(page, "/app/weather");
      await assertNoRuntimeErrors(consoleErrors, pageErrors, counts, "/app/weather");
      await captureProof(page, testInfo, "06-weather-home");
    });
  });
});
