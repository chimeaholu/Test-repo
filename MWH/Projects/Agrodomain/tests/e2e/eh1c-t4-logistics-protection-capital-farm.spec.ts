import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { bootstrapPasswordSession, gotoPath, type SessionSeed } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";

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
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

async function primeAuthenticatedSession(page: Page, sessionSeed: SessionSeed, route: string): Promise<void> {
  await gotoPath(page, "/signin");
  await page.evaluate(
    ([sessionKey, tokenKey, session, token]) => {
      window.localStorage.setItem(sessionKey, JSON.stringify(session));
      window.localStorage.setItem(tokenKey, token);
      document.cookie = "agrodomain-session=1;path=/;samesite=lax";
      window.dispatchEvent(new CustomEvent("agrodomain:auth-state-changed"));
    },
    [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  );
  await gotoPath(page, route);
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function sendWorkflowCommand(
  request: APIRequestContext,
  input: {
    actorId: string;
    aggregateRef: string;
    commandName: string;
    countryCode: string;
    journeyIds: string[];
    mutationScope: string;
    payload: Record<string, unknown>;
    token: string;
  },
): Promise<Record<string, unknown>> {
  const requestId = `req-eh1c-t4-${crypto.randomUUID()}`;
  const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        actor_id: input.actorId,
        channel: "pwa",
        correlation_id: requestId,
        country_code: input.countryCode,
        idempotency_key: requestId,
        occurred_at: new Date().toISOString(),
        request_id: requestId,
        schema_version: schemaVersion,
        traceability: {
          data_check_ids: ["EH1C-T4"],
          journey_ids: input.journeyIds,
        },
      },
      command: {
        aggregate_ref: input.aggregateRef,
        mutation_scope: input.mutationScope,
        name: input.commandName,
        payload: input.payload,
      },
    },
    headers: {
      Authorization: `Bearer ${input.token}`,
      "X-Correlation-ID": requestId,
      "X-Request-ID": requestId,
    },
  });

  expect(response.ok(), `${input.commandName} should succeed`).toBeTruthy();
  return (await response.json()) as Record<string, unknown>;
}

async function createPublishedListing(
  request: APIRequestContext,
  farmer: SessionSeed,
  runId: string,
): Promise<string> {
  const createListingResponse = await sendWorkflowCommand(request, {
    actorId: farmer.session.actor.actor_id,
    aggregateRef: "listing",
    commandName: "market.listings.create",
    countryCode: farmer.session.actor.country_code,
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: {
      commodity: "Maize",
      location: "Tamale, GH",
      price_amount: 320,
      price_currency: "GHS",
      quantity_tons: 8,
      summary: "Published farm opportunity for EH1C-T4 browser proof.",
      title: `EH1C-T4 maize cycle ${runId}`,
    },
    token: farmer.accessToken,
  });
  const listingId = (
    createListingResponse.result as { listing: { listing_id: string } }
  ).listing.listing_id;

  await sendWorkflowCommand(request, {
    actorId: farmer.session.actor.actor_id,
    aggregateRef: listingId,
    commandName: "market.listings.publish",
    countryCode: farmer.session.actor.country_code,
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: { listing_id: listingId },
    token: farmer.accessToken,
  });

  return listingId;
}

test.describe("EH1C-T4 logistics, protection, capital, and farm route proof", () => {
  test.setTimeout(240_000);

  test("AgroTrucker and dispatch routes use the remediated T4 customer composition", async ({
    page,
    request,
  }, testInfo) => {
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const farmer = await bootstrapPasswordSession(request, {
      displayName: `EH1C-T4 Farmer ${runId}`,
      email: `eh1c.t4.farmer.${runId}@example.com`,
      password: `Harvest!T4${runId.slice(-4)}A`,
      role: "farmer",
    });
    const cooperative = await bootstrapPasswordSession(request, {
      displayName: `EH1C-T4 Cooperative ${runId}`,
      email: `eh1c.t4.coop.${runId}@example.com`,
      password: `Harvest!T4${runId.slice(-4)}B`,
      role: "cooperative",
    });

    await primeAuthenticatedSession(page, farmer, "/app/trucker");
    await expect(page.getByRole("heading", { name: "Match loads, track deliveries, and keep transport visible" })).toBeVisible();
    await expect(page.getByText("Transport reliability")).toBeVisible();

    await gotoPath(page, "/app/trucker/loads/new");
    await expect(page.getByRole("heading", { name: "Describe the load and set the trip clearly" })).toBeVisible();
    await page.getByLabel("Pickup location").fill("Tamale, Northern Region");
    await page.getByLabel("Destination").fill("Accra, Greater Accra");
    await page.getByLabel("Commodity").fill("White maize");
    await page.getByLabel("Weight (tonnes)").fill("6");
    await page.getByLabel("Number of items").fill("54");
    await page.getByLabel("Budget").fill("2400");
    await page.getByLabel("Special instructions").fill("Keep dry and confirm receiver by phone before arrival.");
    await page.getByRole("button", { name: "Review load" }).click();
    await expect(page.getByRole("heading", { name: "Review load" })).toBeVisible();
    await page.getByRole("button", { name: "Post load", exact: true }).click();
    await page.waitForURL(/\/app\/trucker\/shipments\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Delivery timing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Capture handoff proof" })).toBeVisible();
    await captureProof(page, testInfo, "eh1c-t4-logistics");

    await primeAuthenticatedSession(page, cooperative, "/app/cooperative/dispatch");
    await expect(page.getByRole("heading", { name: "Assign the right carrier and keep at-risk shipments visible" })).toBeVisible();
    await expect(
      page.getByText(/Open loads|Assigned shipments|At-risk shipments|No dispatch work yet/).first(),
    ).toBeVisible();
    await captureProof(page, testInfo, "eh1c-t4-dispatch");
  });

  test("insurance, fund, and farm routes stay on the T4 composition contract", async ({
    page,
    request,
  }, testInfo) => {
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const farmer = await bootstrapPasswordSession(request, {
      displayName: `EH1C-T4 Farm ${runId}`,
      email: `eh1c.t4.farm.${runId}@example.com`,
      password: `Harvest!T4${runId.slice(-4)}C`,
      role: "farmer",
    });
    const investor = await bootstrapPasswordSession(request, {
      displayName: `EH1C-T4 Investor ${runId}`,
      email: `eh1c.t4.investor.${runId}@example.com`,
      password: `Harvest!T4${runId.slice(-4)}D`,
      role: "investor",
      scopeIds: ["identity.core", "workflow.audit", "finance.investments", "notifications.delivery"],
    });
    const listingId = await createPublishedListing(request, farmer, runId);

    await primeAuthenticatedSession(page, farmer, "/app/farm");
    await expect(page.getByRole("heading", { name: "Keep your fields, season work, and inputs in one working view" })).toBeVisible();
    await expect(page.getByText("Farm overview")).toBeVisible();
    await page.getByRole("button", { name: "List" }).click();
    await page.locator(".farm-card-list").getByRole("link", { name: "Open field" }).first().click();
    await expect(page.getByRole("heading", { name: "Weather risk" })).toBeVisible();
    await page.getByRole("link", { name: "Inputs used here" }).click();
    await expect(page.getByRole("heading", { name: "Input inventory" })).toBeVisible();
    await captureProof(page, testInfo, "eh1c-t4-farm");

    await gotoPath(page, "/app/insurance");
    await expect(page.getByRole("heading", { name: "Keep coverage, claims, and weather-backed protection in one place" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add protection" })).toBeVisible();
    const claimLink = page.locator('a[href^="/app/insurance/claims/"]').first();
    await expect(claimLink).toBeVisible({ timeout: 30_000 });
    await Promise.all([page.waitForURL(/\/app\/insurance\/claims\/[^/]+$/, { timeout: 30_000 }), claimLink.click()]);
    await expect(page.getByRole("heading", { name: "Weather and supporting records" })).toBeVisible({ timeout: 30_000 });
    await captureProof(page, testInfo, "eh1c-t4-insurance");

    await primeAuthenticatedSession(page, investor, `/app/fund?listing=${listingId}`);
    await expect(page.getByRole("heading", { name: "Back agricultural opportunities with clearer progress and return visibility" })).toBeVisible();
    await expect(page.getByText("Compare farms, progress, and expected return")).toBeVisible();
    await gotoPath(page, "/app/fund/seed-rice-delta");
    await expect(page).toHaveURL(/\/app\/fund\/seed-rice-delta$/);
    await expect(page.getByText("Review the farm story, funding need, return case, and protection signals before you invest.")).toBeVisible();
    await gotoPath(page, "/app/fund/my-investments");
    await expect(page.getByRole("heading", { name: "See your active commitments and expected returns" })).toBeVisible();
    await captureProof(page, testInfo, "eh1c-t4-fund");
  });
});
