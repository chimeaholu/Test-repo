import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { gotoPath } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const SAMPLE_COUNT = Number(process.env.EH3_SPOTCHECK_SAMPLES ?? "12");
const ACTION_TIMEOUT_MS = Number(process.env.EH3_SPOTCHECK_TIMEOUT_MS ?? "30000");
const OUTPUT_PATH =
  process.env.EH3_SPOTCHECK_OUTPUT_PATH ??
  "/tmp/agrodomain-eh3-latency-spotcheck.json";

type Role = "buyer" | "farmer";

type PasswordFixture = {
  countryCode: "GH";
  displayName: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: Role;
};

type SessionSeed = {
  actorId: string;
  countryCode: "GH";
  session: Record<string, unknown>;
  token: string;
};

type TelemetryEntry = {
  event: {
    detail?: {
      duration_ms?: number;
      outcome?: string;
      source_surface?: string;
      stage?: string;
    };
    event?: string;
  };
  recorded_at_ms: number;
};

type SampleResult = {
  attempt_count: number;
  latency_ms: number;
  retries_used: number;
};

type PathSummary = {
  error_rate: number;
  failures: Array<{ attempt: number; error: string; sample: number }>;
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  retries: number;
  samples: number[];
  successes: number;
  timeouts: number;
};

function makeFixture(role: Role, runId: string): PasswordFixture {
  const digits = runId.replace(/\D/gu, "").slice(-4).padStart(4, "0");
  return {
    countryCode: "GH",
    displayName: `EH3 ${role} ${runId}`,
    email: `eh3.latency.${role}.${runId}@example.com`,
    password: `Harvest!GH${role === "buyer" ? "202" : "101"}`,
    phoneNumber: role === "buyer" ? `+23324202${digits}` : `+23324101${digits}`,
    role,
  };
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return Number(sorted[index].toFixed(2));
}

function summarizePath(
  samples: SampleResult[],
  failures: Array<{ attempt: number; error: string; sample: number }>,
): PathSummary {
  const latencies = samples.map((sample) => sample.latency_ms);
  const totalAttempts = samples.reduce((count, sample) => count + sample.attempt_count, 0) + failures.length;
  return {
    error_rate:
      totalAttempts === 0 ? 0 : Number((failures.length / totalAttempts).toFixed(4)),
    failures,
    p50_ms: percentile(latencies, 50),
    p95_ms: percentile(latencies, 95),
    p99_ms: percentile(latencies, 99),
    retries: samples.reduce((count, sample) => count + sample.retries_used, 0),
    samples: latencies,
    successes: samples.length,
    timeouts: failures.filter((failure) => failure.error === "timeout").length,
  };
}

async function createSessionSeed(
  request: APIRequestContext,
  fixture: PasswordFixture,
): Promise<SessionSeed> {
  const registerResponse = await request.post(`${API_BASE_URL}/api/v1/identity/register/password`, {
    data: {
      country_code: fixture.countryCode,
      display_name: fixture.displayName,
      email: fixture.email,
      password: fixture.password,
      phone_number: fixture.phoneNumber,
      role: fixture.role,
    },
  });
  expect([200, 409]).toContain(registerResponse.status());

  const response = await request.post(`${API_BASE_URL}/api/v1/identity/login/password`, {
    data: {
      country_code: fixture.countryCode,
      identifier: fixture.email,
      password: fixture.password,
      role: fixture.role,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    access_token: string;
    session: {
      actor: {
        actor_id: string;
        country_code: "GH";
      };
    };
  };

  const consentResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
    data: {
      captured_at: new Date().toISOString(),
      policy_version: "2026.04.w1",
      scope_ids: ["identity.core", "workflow.audit"],
    },
    headers: {
      Authorization: `Bearer ${payload.access_token}`,
    },
  });
  expect(consentResponse.ok()).toBeTruthy();
  const sessionPayload = (await consentResponse.json()) as Record<string, unknown>;

  return {
    actorId: payload.session.actor.actor_id,
    countryCode: payload.session.actor.country_code,
    session: sessionPayload,
    token: payload.access_token,
  };
}

async function primeAuthenticatedSession(
  page: Page,
  sessionSeed: SessionSeed,
  route: string,
): Promise<void> {
  await gotoPath(page, "/signin");
  await page.evaluate(
    ([sessionKey, tokenKey, session, token]) => {
      window.localStorage.setItem(sessionKey, JSON.stringify(session));
      window.localStorage.setItem(tokenKey, token);
      document.cookie = "agrodomain-session=1;path=/;samesite=lax";
      window.dispatchEvent(new CustomEvent("agrodomain:auth-state-changed"));
    },
    [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.token],
  );
  await gotoPath(page, route);
  await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(\\?.*)?$`, "u"), {
    timeout: ACTION_TIMEOUT_MS,
  });
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
  const requestId = `req-eh3-${crypto.randomUUID()}`;
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
          data_check_ids: ["DI-001", "DI-002", "DI-003"],
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

async function seedPublishedListing(
  request: APIRequestContext,
  seller: SessionSeed,
  runId: string,
  sample: number,
): Promise<string> {
  const createListingResponse = await sendWorkflowCommand(request, {
    actorId: seller.actorId,
    aggregateRef: "listing",
    commandName: "market.listings.create",
    countryCode: seller.countryCode,
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: {
      commodity: "Cassava",
      location: "Tamale, GH",
      price_amount: 440 + sample,
      price_currency: "GHS",
      quantity_tons: 6.5,
      summary: `Negotiation latency fixture ${runId}-${sample}.`,
      title: `EH3 latency lot ${runId}-${sample}`,
    },
    token: seller.token,
  });
  const listingId = (
    createListingResponse.result as { listing: { listing_id: string } }
  ).listing.listing_id;

  await sendWorkflowCommand(request, {
    actorId: seller.actorId,
    aggregateRef: listingId,
    commandName: "market.listings.publish",
    countryCode: seller.countryCode,
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: { listing_id: listingId },
    token: seller.token,
  });

  return listingId;
}

async function fundBuyerWallet(
  request: APIRequestContext,
  buyer: SessionSeed,
  runId: string,
): Promise<void> {
  await sendWorkflowCommand(request, {
    actorId: buyer.actorId,
    aggregateRef: "wallet",
    commandName: "wallets.fund",
    countryCode: buyer.countryCode,
    journeyIds: ["CJ-004"],
    mutationScope: "wallet.ledger",
    payload: {
      wallet_actor_id: buyer.actorId,
      country_code: buyer.countryCode,
      currency: "GHS",
      amount: 950,
      reference_type: "deposit",
      reference_id: `dep-eh3-${runId}`,
      note: "Buyer wallet top-up for EH3 notification latency proof.",
      reconciliation_marker: `rcn-eh3-${runId}`,
    },
    token: buyer.token,
  });
}

async function seedAcceptedFundedEscrow(
  request: APIRequestContext,
  seller: SessionSeed,
  buyer: SessionSeed,
  runId: string,
): Promise<void> {
  const listingId = await seedPublishedListing(request, seller, `${runId}-notif`, 0);

  const createThreadResponse = await sendWorkflowCommand(request, {
    actorId: buyer.actorId,
    aggregateRef: listingId,
    commandName: "market.negotiations.create",
    countryCode: buyer.countryCode,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      listing_id: listingId,
      note: "Buyer offer for EH3 notification latency proof.",
      offer_amount: 420,
      offer_currency: "GHS",
    },
    token: buyer.token,
  });
  const threadId = (
    createThreadResponse.result as { thread: { thread_id: string } }
  ).thread.thread_id;

  await sendWorkflowCommand(request, {
    actorId: seller.actorId,
    aggregateRef: threadId,
    commandName: "market.negotiations.confirm.request",
    countryCode: seller.countryCode,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      note: "Ready for approval and escrow funding.",
      required_confirmer_actor_id: buyer.actorId,
      thread_id: threadId,
    },
    token: seller.token,
  });

  await sendWorkflowCommand(request, {
    actorId: buyer.actorId,
    aggregateRef: threadId,
    commandName: "market.negotiations.confirm.approve",
    countryCode: buyer.countryCode,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      note: "Approved for EH3 notification latency proof.",
      thread_id: threadId,
    },
    token: buyer.token,
  });

  await fundBuyerWallet(request, buyer, runId);

  const escrowResponse = await sendWorkflowCommand(request, {
    actorId: buyer.actorId,
    aggregateRef: threadId,
    commandName: "wallets.escrows.initiate",
    countryCode: buyer.countryCode,
    journeyIds: ["CJ-004"],
    mutationScope: "wallet.escrow",
    payload: {
      note: "Funded escrow for notification proof.",
      thread_id: threadId,
    },
    token: buyer.token,
  });
  const escrowId = (
    escrowResponse.result as { escrow: { escrow_id: string } }
  ).escrow.escrow_id;

  await sendWorkflowCommand(request, {
    actorId: buyer.actorId,
    aggregateRef: escrowId,
    commandName: "wallets.escrows.fund",
    countryCode: buyer.countryCode,
    journeyIds: ["CJ-004"],
    mutationScope: "wallet.escrow",
    payload: {
      escrow_id: escrowId,
      note: "Funds secured for notification latency proof.",
      partner_outcome: "funded",
    },
    token: buyer.token,
  });
}

async function installTelemetrySink(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const scopedWindow = window as Window & {
      __agroTelemetry?: Array<{ event: unknown; recorded_at_ms: number }>;
    };
    scopedWindow.__agroTelemetry = [];
    window.addEventListener("agro:telemetry", (rawEvent) => {
      const customEvent = rawEvent as CustomEvent;
      const nextStore = scopedWindow.__agroTelemetry ?? [];
      nextStore.push({
        event: customEvent.detail,
        recorded_at_ms: performance.now(),
      });
      scopedWindow.__agroTelemetry = nextStore;
    });
  });
}

async function clearTelemetry(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scopedWindow = window as Window & {
      __agroTelemetry?: Array<{ event: unknown; recorded_at_ms: number }>;
    };
    scopedWindow.__agroTelemetry = [];
  });
}

async function waitForConversionEvent(
  page: Page,
  params: {
    outcome: "completed" | "blocked";
    sourceSurface: string;
    stage: string;
  },
): Promise<TelemetryEntry> {
  const handle = await page.waitForFunction(
    ({ outcome, sourceSurface, stage }) => {
      const scopedWindow = window as Window & {
        __agroTelemetry?: Array<{
          event?: {
            detail?: {
              outcome?: string;
              source_surface?: string;
              stage?: string;
            };
            event?: string;
          };
          recorded_at_ms: number;
        }>;
      };
      return (
        scopedWindow.__agroTelemetry?.find(
          (entry) =>
            entry.event?.event === "marketplace_conversion" &&
            entry.event.detail?.outcome === outcome &&
            entry.event.detail?.source_surface === sourceSurface &&
            entry.event.detail?.stage === stage,
        ) ?? null
      );
    },
    params,
    { timeout: ACTION_TIMEOUT_MS },
  );
  return (await handle.jsonValue()) as TelemetryEntry;
}

async function measureListingPublish(page: Page, runId: string, sample: number): Promise<number> {
  await gotoPath(page, "/app/market/listings/create");
  await clearTelemetry(page);

  await page.locator("#listing-title").fill(`Latency listing ${runId}-${sample}`);
  await page.getByLabel("Commodity").fill("Cassava");
  await page.getByLabel("Variety / grade").fill("Grade A");
  await page.getByLabel("Description").fill("Bagged cassava stock with moisture proof and pickup readiness.");
  await page.getByLabel("Category").fill("Root crop");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Price amount").fill(String(320 + sample));
  await page.getByLabel("Currency").fill("GHS");
  await page.getByLabel("Quantity (tons)").fill("4.2");
  await page.getByLabel("Minimum order quantity").fill("1");
  await page.getByRole("radio", { name: "Negotiable" }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Manual location entry").fill("Tamale, GH");
  await page.getByRole("radio", { name: "Pickup or delivery" }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  const publishButton = page.getByRole("button", { name: "Publish listing" });
  await expect(publishButton).toBeVisible({ timeout: ACTION_TIMEOUT_MS });
  const startedAt = await page.evaluate(() => performance.now());
  await publishButton.click();
  const event = await waitForConversionEvent(page, {
    outcome: "completed",
    sourceSurface: "listing_wizard",
    stage: "listing_published",
  });
  await expect(page.getByText(/Listing published confirmed/u)).toBeVisible({
    timeout: ACTION_TIMEOUT_MS,
  });
  return Number((event.recorded_at_ms - startedAt).toFixed(2));
}

async function measureNegotiationOpen(
  page: Page,
  listingId: string,
  sample: number,
): Promise<number> {
  await gotoPath(page, `/app/market/negotiations?listingId=${listingId}`);
  await expect(page.getByLabel("Listing ID")).toBeVisible({ timeout: ACTION_TIMEOUT_MS });
  await clearTelemetry(page);
  await page.getByLabel("Listing ID").fill(listingId);
  await page.getByLabel("Offer amount").fill(String(410 + sample));
  await page.getByLabel("Currency").fill("GHS");
  await page.getByLabel("Buyer note").fill(`Latency offer sample ${sample}`);
  await page.getByRole("button", { name: "Send opening offer" }).click();
  const event = await waitForConversionEvent(page, {
    outcome: "completed",
    sourceSurface: "negotiation_inbox",
    stage: "offer_created",
  });
  const internalDuration = event.event.detail?.duration_ms;
  if (typeof internalDuration === "number" && Number.isFinite(internalDuration)) {
    return Number(internalDuration.toFixed(2));
  }
  return Number(event.recorded_at_ms.toFixed(2));
}

async function measureNotificationImpression(page: Page): Promise<number> {
  await gotoPath(page, "/app/notifications");
  const event = await waitForConversionEvent(page, {
    outcome: "completed",
    sourceSurface: "notifications_center",
    stage: "notification_impression",
  });
  await expect(page.getByRole("heading", { name: "Trade, finance, weather, advisory, and system updates" })).toBeVisible({
    timeout: ACTION_TIMEOUT_MS,
  });
  return Number(event.recorded_at_ms.toFixed(2));
}

async function collectSamples(
  page: Page,
  measure: (sample: number) => Promise<number>,
): Promise<{
  failures: Array<{ attempt: number; error: string; sample: number }>;
  samples: SampleResult[];
}> {
  const samples: SampleResult[] = [];
  const failures: Array<{ attempt: number; error: string; sample: number }> = [];

  for (let sample = 1; sample <= SAMPLE_COUNT; sample += 1) {
    let success = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const latency = await measure(sample);
        samples.push({
          attempt_count: attempt,
          latency_ms: latency,
          retries_used: attempt - 1,
        });
        success = true;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({
          attempt,
          error:
            message.includes("Timeout") || message.includes("timeout")
              ? "timeout"
              : message.slice(0, 200),
          sample,
        });
      }
    }
    if (!success) {
      continue;
    }
  }

  return { failures, samples };
}

test.describe("EH3 latency spot-check", () => {
  test.setTimeout(900_000);

  test("captures listing, negotiation, and notification p95 timings", async ({
    browser,
    request,
  }) => {
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const sellerFixture = makeFixture("farmer", `${runId}-seller`);
    const buyerFixture = makeFixture("buyer", `${runId}-buyer`);

    const sellerSession = await createSessionSeed(request, sellerFixture);
    const buyerSession = await createSessionSeed(request, buyerFixture);

    const negotiationListingIds = await Promise.all(
      Array.from({ length: SAMPLE_COUNT }, (_, index) =>
        seedPublishedListing(request, sellerSession, `${runId}-neg`, index + 1),
      ),
    );
    await seedAcceptedFundedEscrow(request, sellerSession, buyerSession, runId);

    const sellerContext = await browser.newContext();
    const buyerContext = await browser.newContext();
    const notificationContext = await browser.newContext();
    const sellerPage = await sellerContext.newPage();
    const buyerPage = await buyerContext.newPage();
    const notificationPage = await notificationContext.newPage();

    await Promise.all([
      installTelemetrySink(sellerPage),
      installTelemetrySink(buyerPage),
      installTelemetrySink(notificationPage),
    ]);

    await Promise.all([
      primeAuthenticatedSession(sellerPage, sellerSession, "/app/farmer"),
      primeAuthenticatedSession(buyerPage, buyerSession, "/app/buyer"),
      primeAuthenticatedSession(notificationPage, buyerSession, "/app/buyer"),
    ]);

    const listing = await collectSamples(sellerPage, (sample) =>
      measureListingPublish(sellerPage, runId, sample),
    );
    const negotiation = await collectSamples(buyerPage, (sample) =>
      measureNegotiationOpen(buyerPage, negotiationListingIds[sample - 1], sample),
    );
    const notification = await collectSamples(notificationPage, async () =>
      measureNotificationImpression(notificationPage),
    );

    const payload = {
      generated_at: new Date().toISOString(),
      run_id: runId,
      sample_count: SAMPLE_COUNT,
      timeout_ms: ACTION_TIMEOUT_MS,
      paths: {
        listing_publish: summarizePath(listing.samples, listing.failures),
        negotiation_offer_create: summarizePath(negotiation.samples, negotiation.failures),
        notifications_impression: summarizePath(notification.samples, notification.failures),
      },
    };

    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

    expect(payload.paths.listing_publish.successes).toBeGreaterThanOrEqual(10);
    expect(payload.paths.negotiation_offer_create.successes).toBeGreaterThanOrEqual(10);
    expect(payload.paths.notifications_impression.successes).toBeGreaterThanOrEqual(10);

    await Promise.all([
      sellerContext.close(),
      buyerContext.close(),
      notificationContext.close(),
    ]);
  });
});
