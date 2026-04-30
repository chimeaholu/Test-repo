import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";

import { bootstrapPasswordSession, gotoPath, type Role, type SessionSeed } from "./helpers";

const artifactDir =
  process.env.PLAYWRIGHT_ARTIFACT_DIR ?? path.join("execution", "reviews", "r7-qa-gate");
const screenshotDir = path.join(artifactDir, "screenshots");
const sessionKey = "agrodomain.session.v2";
const tokenKey = "agrodomain.session-token.v1";
const uploadAsset = "/ductor/agents/engineering/workspace/playwright-desktop.png";
const DEMO_OPERATOR_EMAIL = "operator@agrodomain-demo.invalid";
const DEMO_OPERATOR_PASSWORD = "DemoAccess2026!";

type RuntimeTracker = {
  errors: string[];
  stop: () => void;
};

type AllowedResponseRule = {
  pathname: RegExp;
  status: number;
};

const allowedResponseRules: AllowedResponseRule[] = [
  { pathname: /\/api\/v1\/admin\/analytics\/health$/, status: 503 },
  { pathname: /\/api\/v1\/admin\/observability\/alerts$/, status: 503 },
  { pathname: /\/api\/v1\/admin\/release-readiness$/, status: 503 },
  { pathname: /\/api\/v1\/admin\/rollouts\/status$/, status: 503 },
  { pathname: /\/api\/v1\/climate\/farms\/[^/]+$/, status: 404 },
  { pathname: /\/api\/v1\/climate\/observations$/, status: 404 },
];

test.beforeAll(() => {
  fs.mkdirSync(screenshotDir, { recursive: true });
});

async function createAuthenticatedSession(
  request: APIRequestContext,
  input: {
  countryCode?: "GH" | "NG" | "JM";
  displayName: string;
  email: string;
  role: Role;
  scopeIds: string[];
},
): Promise<SessionSeed> {
  if (input.role === "admin") {
    return bootstrapPasswordSession(request, {
      countryCode: input.countryCode ?? "GH",
      displayName: input.displayName,
      email: DEMO_OPERATOR_EMAIL,
      password: DEMO_OPERATOR_PASSWORD,
      role: "admin",
      mode: "login_only",
      scopeIds: input.scopeIds,
    });
  }

  return bootstrapPasswordSession(request, {
    countryCode: input.countryCode ?? "GH",
    displayName: input.displayName,
    email: input.email,
    password: `Harvest!${(input.countryCode ?? "GH").toUpperCase()}R7${crypto.randomUUID().slice(0, 6)}`,
    role: input.role,
    scopeIds: input.scopeIds,
  });
}

async function primeSession(page: Page, seed: SessionSeed): Promise<void> {
  await gotoPath(page, "/signin");
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    {
      name: "agrodomain-session",
      value: "1",
      url: origin,
      sameSite: "Lax",
    },
  ]);
  await page.evaluate(
    ([nextSessionKey, nextTokenKey, session, token]) => {
      window.localStorage.setItem(nextSessionKey, JSON.stringify(session));
      window.localStorage.setItem(nextTokenKey, token);
      document.cookie = "agrodomain-session=1;path=/;samesite=lax";
      window.dispatchEvent(new CustomEvent("agrodomain:auth-state-changed"));
    },
    [sessionKey, tokenKey, seed.session, seed.accessToken],
  );
}

async function captureProof(page: Page, testInfo: TestInfo, slug: string): Promise<void> {
  const filename = `${testInfo.project.name}-${slug}.png`;
  const target = path.join(screenshotDir, filename);
  await page.screenshot({ fullPage: true, path: target });
  await testInfo.attach(slug, {
    contentType: "image/png",
    path: target,
  });
}

function trackRuntimeErrors(page: Page): RuntimeTracker {
  const errors: string[] = [];
  const onConsole = (message: { text: () => string; type: () => string }) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();
    if (/^Failed to load resource: the server responded with a status of \d+/.test(text)) {
      return;
    }

    errors.push(`console: ${text}`);
  };
  const onPageError = (error: Error) => {
    errors.push(`pageerror: ${error.message}`);
  };
  const onResponse = (response: { status: () => number; url: () => string }) => {
    const status = response.status();
    if (status < 400) {
      return;
    }

    const url = response.url();
    if (!url.includes("/api/")) {
      return;
    }

    if (isAllowedRuntimeResponse(url, status)) {
      return;
    }

    errors.push(`response ${status}: ${url}`);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  return {
    errors,
    stop: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);
    },
  };
}

function isAllowedRuntimeResponse(url: string, status: number): boolean {
  const pathname = new URL(url).pathname;
  return allowedResponseRules.some((rule) => rule.status === status && rule.pathname.test(pathname));
}

async function expectNoRuntimeErrors(tracker: RuntimeTracker): Promise<void> {
  expect(
    tracker.errors,
    tracker.errors.length ? `Runtime errors detected:\n${tracker.errors.join("\n")}` : undefined,
  ).toEqual([]);
}

async function expectNoFatalAlert(page: Page, pattern: RegExp): Promise<void> {
  await expect(page.getByRole("alert").filter({ hasText: pattern })).toHaveCount(0);
}

async function openAgroGuide(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Open AgroGuide AI assistant" }).click();
  await expect(page.getByRole("dialog", { name: "AgroGuide AI assistant" })).toBeVisible();
}

async function assertAgroGuideViewport(page: Page, isMobile: boolean): Promise<void> {
  const panel = page.getByRole("dialog", { name: "AgroGuide AI assistant" });
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (!viewport) {
    return;
  }

  if (isMobile) {
    expect(box.x).toBeLessThan(8);
    expect(box.y).toBeLessThan(8);
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 8);
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 8);
    return;
  }

  expect(box.width).toBeGreaterThanOrEqual(360);
  expect(box.width).toBeLessThanOrEqual(440);
  expect(box.x).toBeGreaterThan(viewport.width / 2);
}

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

test("R7 transport surfaces render and support the shipped load-to-delivery flow", async ({
  page,
  request,
}, testInfo) => {
  const tracker = trackRuntimeErrors(page);
  const stamp = `${testInfo.project.name}-${Date.now()}`;

  try {
    const farmer = await createAuthenticatedSession(request, {
      displayName: "R7 Farmer",
      email: `r7.farmer.${stamp}@example.com`,
      role: "farmer",
      scopeIds: ["identity.core", "workflow.audit", "transport.logistics"],
    });
    const transporter = await createAuthenticatedSession(request, {
      displayName: "R7 Transporter",
      email: `r7.transporter.${stamp}@example.com`,
      role: "transporter",
      scopeIds: ["identity.core", "workflow.audit", "transport.logistics"],
    });

    await primeSession(page, farmer);
    await gotoPath(page, "/app/trucker");
    await expect(page).toHaveURL(/\/app\/trucker$/);
    await expect(
      page.getByRole("heading", {
        name: "Match loads, track deliveries, and keep transport visible",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open AgroGuide AI assistant" })).toBeVisible();
    await expectNoFatalAlert(page, /Unable to load the AgroTrucker workspace/i);
    await captureProof(page, testInfo, "app-trucker");

    await page.getByRole("link", { name: "Post load" }).click();
    await expect(page).toHaveURL(/\/app\/trucker\/loads\/new$/);
    await expect(
      page.getByRole("heading", { name: "Describe the load and set the trip clearly" }),
    ).toBeVisible();
    await page.getByLabel("Pickup location").fill("Tamale, Northern Region");
    await page.getByLabel("Destination").fill("Accra, Greater Accra");
    await page.getByLabel("Commodity").fill("White maize");
    await page.getByLabel("Weight (tonnes)").fill("6");
    await page.getByLabel("Number of items").fill("54");
    await page.getByLabel("Budget").fill("2400");
    await page
      .getByLabel("Special instructions")
      .fill("Keep dry, confirm loading photo, and call the receiver 30 minutes before arrival.");
    await captureProof(page, testInfo, "app-trucker-loads-new");

    await page.getByRole("button", { name: "Review load" }).click();
    await expect(page.getByRole("heading", { name: "Review load" })).toBeVisible();
    await page.getByRole("button", { name: "Post load", exact: true }).click();
    await page.waitForURL(/\/app\/trucker\/shipments\/[^/]+$/, { timeout: 30_000 });
    const shipmentPath = new URL(page.url()).pathname;
    const shipmentId = shipmentPath.split("/").filter(Boolean).at(-1);
    expect(shipmentId).toBeTruthy();

    await primeSession(page, transporter);
    await gotoPath(page, "/app/trucker");
    await page.getByRole("tab", { name: "I'm a Driver" }).click();
    await expect(page.getByRole("heading", { name: "Available loads near you" })).toBeVisible();
    await page.getByRole("button", { name: "Accept load" }).first().click();
    await expect(page.getByRole("heading", { name: "Accept this load?" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm load" }).click();

    await gotoPath(page, shipmentPath);
    await expect(page).toHaveURL(new RegExp(`${shipmentPath.replace(/\//g, "\\/")}$`));
    await expect(page.getByRole("heading", { name: "Route progress" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mark picked up|Mark in transit|Record corridor checkpoint/ })).toBeVisible();
    await page.getByRole("button", { name: /Mark picked up|Mark in transit|Record corridor checkpoint/ }).click();
    await expect(page.getByText(/picked up|in transit/i).first()).toBeVisible();

    await page.locator("input[type='file']").setInputFiles(uploadAsset);
    await expect(page.getByText("playwright-desktop.png")).toBeVisible();
    await page.getByPlaceholder("Recipient name").fill("Abena Receiver");
    await drawSignature(page);
    await page.getByRole("button", { name: "Complete delivery" }).click();

    await expect(page.getByText(/Completed on /)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".trucker-page-head").getByText(/^delivered$/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to transport board" })).toBeVisible();
    await captureProof(page, testInfo, "app-trucker-shipment");
  } finally {
    tracker.stop();
  }

  await expectNoRuntimeErrors(tracker);
});

test("R7 analytics surfaces render with supported range and export interactions", async ({
  page,
  request,
}, testInfo) => {
  const tracker = trackRuntimeErrors(page);
  const stamp = `${testInfo.project.name}-${Date.now()}`;

  try {
    const farmer = await createAuthenticatedSession(request, {
      displayName: "R7 Analytics Farmer",
      email: `r7.analytics.${stamp}@example.com`,
      role: "farmer",
      scopeIds: ["identity.core", "workflow.audit"],
    });
    const admin = await createAuthenticatedSession(request, {
      displayName: "R7 Admin",
      email: `r7.admin.${stamp}@example.com`,
      role: "admin",
      scopeIds: ["identity.core", "workflow.audit", "admin.observability", "admin.rollout"],
    });

    await primeSession(page, farmer);
    await gotoPath(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics$/);
    await expect(page.getByTestId("analytics-dashboard-root")).toBeVisible();
    await expect(page.getByText("Insights")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open AgroGuide AI assistant" })).toBeVisible();
    await expectNoFatalAlert(page, /Unable to load insights/i);
    await expect(page.getByTestId("analytics-loading-state")).toHaveCount(0);
    await page.getByTestId("analytics-range-7d").click();
    await expect(page.getByTestId("analytics-range-7d")).toHaveAttribute("aria-pressed", "true");

    const [analyticsCsv] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("analytics-export-csv").click(),
    ]);
    expect(await analyticsCsv.suggestedFilename()).toBe("agrodomain-analytics-report.csv");

    const [analyticsPdf] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("analytics-export-pdf").click(),
    ]);
    expect(await analyticsPdf.suggestedFilename()).toBe("agrodomain-analytics-report.pdf");
    await captureProof(page, testInfo, "app-analytics");

    await gotoPath(page, "/app/insights");
    await expect(page).toHaveURL(/\/app\/insights$/);
    await expect(page.getByTestId("analytics-dashboard-root")).toBeVisible();
    await expect(page.getByText("Insights")).toBeVisible();
    await captureProof(page, testInfo, "app-insights");

    await primeSession(page, admin);
    await gotoPath(page, "/app/admin/analytics");
    await expect(page).toHaveURL(/\/app\/admin\/analytics$/);
    await expect(page.getByTestId("admin-analytics-root")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Monitor product health, release readiness, and operating pressure",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open AgroGuide AI assistant" })).toBeVisible();
    await expectNoFatalAlert(page, /Unable to load the admin analytics workspace/i);
    await expect(page.getByTestId("admin-analytics-loading-state")).toHaveCount(0);
    await page.getByTestId("admin-analytics-refresh").click();

    const [adminCsv] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("analytics-export-csv").click(),
    ]);
    expect(await adminCsv.suggestedFilename()).toBe("agrodomain-admin-analytics.csv");
    await captureProof(page, testInfo, "app-admin-analytics");
  } finally {
    tracker.stop();
  }

  await expectNoRuntimeErrors(tracker);
});

test("R7 AgroGuide floating panel appears on protected routes and adapts to viewport", async ({
  page,
  request,
}, testInfo) => {
  const tracker = trackRuntimeErrors(page);
  const stamp = `${testInfo.project.name}-${Date.now()}`;
  const isMobile = testInfo.project.name.includes("mobile");

  try {
    const farmer = await createAuthenticatedSession(request, {
      displayName: "R7 AgroGuide Farmer",
      email: `r7.agroguide.${stamp}@example.com`,
      role: "farmer",
      scopeIds: ["identity.core", "workflow.audit", "advisory.runtime"],
    });

    await primeSession(page, farmer);
    await gotoPath(page, "/app/market/listings");
    await expect(page.getByRole("button", { name: "Open AgroGuide AI assistant" })).toBeVisible();
    await openAgroGuide(page);
    await assertAgroGuideViewport(page, isMobile);
    await expect(page.getByRole("button", { name: "Current market prices" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Help me create a listing" })).toBeVisible();
    await captureProof(page, testInfo, "app-market-agroguide");
    await page.getByRole("button", { name: "Close AgroGuide" }).click();
    await expect(page.getByRole("dialog", { name: "AgroGuide AI assistant" })).toHaveCount(0);

    await gotoPath(page, "/app/weather");
    await expect(page.getByRole("button", { name: "Open AgroGuide AI assistant" })).toBeVisible();
    await openAgroGuide(page);
    await expect(page.getByRole("button", { name: "Explain forecast" })).toBeVisible();
    await page.getByRole("button", { name: "Close AgroGuide" }).click();

    await gotoPath(page, "/app/trucker");
    await expect(page.getByRole("button", { name: "Open AgroGuide AI assistant" })).toBeVisible();
    await gotoPath(page, "/app/analytics");
    await expect(page.getByRole("button", { name: "Open AgroGuide AI assistant" })).toBeVisible();
  } finally {
    tracker.stop();
  }

  await expectNoRuntimeErrors(tracker);
});
