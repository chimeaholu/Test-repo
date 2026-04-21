import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { createListing, gotoPath, listingIdFromHref, signIn, signInAndGrantConsent } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";

type Role = "farmer" | "buyer" | "cooperative" | "advisor" | "finance" | "admin";
type SessionSeed = {
  accessToken: string;
  session: {
    actor: {
      actor_id: string;
      country_code: string;
      role: Role;
    };
  };
};

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
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Page.captureScreenshot")) {
      throw error;
    }
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }
}

async function assertA11ySmoke(page: Page): Promise<void> {
  await expect(page.locator("main")).toHaveCount(1);
  const h1Count = await page.locator("h1").count();
  expect(h1Count).toBeLessThanOrEqual(1);
  const offenders = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button, a")).flatMap((element) => {
      const label =
        element.getAttribute("aria-label") ??
        element.textContent?.replace(/\s+/g, " ").trim() ??
        "";
      if (label.length > 0) {
        return [];
      }
      return [`${element.tagName.toLowerCase()}:${element.outerHTML.slice(0, 120)}`];
    });
  });
  expect(offenders).toEqual([]);
}

async function createAuthenticatedSession(
  request: APIRequestContext,
  input: {
    displayName: string;
    email: string;
    role: Role;
    scopeIds: string[];
    countryCode?: "GH" | "NG" | "JM";
  },
): Promise<SessionSeed> {
  const signInRequestId = crypto.randomUUID();
  const signInResponse = await request.post(`${API_BASE_URL}/api/v1/identity/session`, {
    data: {
      display_name: input.displayName,
      email: input.email,
      role: input.role,
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
      policy_version: "2026.04.w1",
      scope_ids: input.scopeIds,
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

async function publishListingViaCommand(
  request: APIRequestContext,
  token: string,
  actorId: string,
  countryCode: string,
  listingId: string,
): Promise<void> {
  const requestId = crypto.randomUUID();
  const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: requestId,
        idempotency_key: requestId,
        actor_id: actorId,
        country_code: countryCode,
        channel: "pwa",
        schema_version: schemaVersion,
        correlation_id: requestId,
        occurred_at: new Date().toISOString(),
        traceability: {
          journey_ids: ["CJ-002"],
          data_check_ids: ["DI-001"],
        },
      },
      command: {
        name: "market.listings.publish",
        aggregate_ref: listingId,
        mutation_scope: "marketplace.listings",
        payload: { listing_id: listingId },
      },
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function requestNegotiationCommand(
  request: APIRequestContext,
  token: string,
  actorId: string,
  countryCode: string,
  name: string,
  aggregateRef: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const requestId = crypto.randomUUID();
  const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: requestId,
        idempotency_key: requestId,
        actor_id: actorId,
        country_code: countryCode,
        channel: "pwa",
        schema_version: schemaVersion,
        correlation_id: requestId,
        occurred_at: new Date().toISOString(),
        traceability: {
          journey_ids: ["CJ-003"],
          data_check_ids: ["DI-003"],
        },
      },
      command: {
        name,
        aggregate_ref: aggregateRef,
        mutation_scope: "marketplace.negotiations",
        payload,
      },
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function createConsignmentTimeline(
  request: APIRequestContext,
  actor: SessionSeed,
): Promise<string> {
  const eventRefSeed = crypto.randomUUID().slice(0, 8);
  const harvestedReference = `evt-ref-harvested-${eventRefSeed}`;
  const dispatchedReference = `evt-ref-dispatched-${eventRefSeed}`;
  const createRequestId = crypto.randomUUID();
  const createResponse = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: createRequestId,
        idempotency_key: crypto.randomUUID(),
        actor_id: actor.session.actor.actor_id,
        country_code: actor.session.actor.country_code,
        channel: "pwa",
        schema_version: schemaVersion,
        correlation_id: createRequestId,
        occurred_at: new Date().toISOString(),
        traceability: {
          journey_ids: ["CJ-007"],
          data_check_ids: ["DI-006"],
        },
      },
      command: {
        name: "traceability.consignments.create",
        aggregate_ref: "traceability",
        mutation_scope: "traceability.runtime",
        payload: {
          partner_reference_id: "partner-shipment-r5",
          current_custody_actor_id: actor.session.actor.actor_id,
        },
      },
    },
    headers: { Authorization: `Bearer ${actor.accessToken}` },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createJson = (await createResponse.json()) as {
    result?: { consignment?: { consignment_id?: string }; consignment_id?: string };
  };
  const consignmentId = createJson.result?.consignment?.consignment_id ?? createJson.result?.consignment_id;
  if (!consignmentId) {
    throw new Error("traceability consignment seed missing consignment_id");
  }

  for (const [milestone, eventReference, previousEventReference, custodyActorId] of [
    ["harvested", harvestedReference, null, actor.session.actor.actor_id],
    ["dispatched", dispatchedReference, harvestedReference, "actor-transporter-gh-1"],
  ] as const) {
    const requestId = crypto.randomUUID();
    const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
      data: {
        metadata: {
          request_id: requestId,
          idempotency_key: crypto.randomUUID(),
          actor_id: actor.session.actor.actor_id,
          country_code: actor.session.actor.country_code,
          channel: "pwa",
          schema_version: schemaVersion,
          correlation_id: requestId,
          occurred_at: new Date().toISOString(),
          traceability: {
            journey_ids: ["CJ-007"],
            data_check_ids: ["DI-006"],
          },
        },
        command: {
          name: "traceability.events.append",
          aggregate_ref: "traceability",
          mutation_scope: "traceability.runtime",
          payload: {
            consignment_id: consignmentId,
            milestone,
            event_reference: eventReference,
            previous_event_reference: previousEventReference,
            occurred_at: new Date().toISOString(),
            current_custody_actor_id: custodyActorId,
          },
        },
      },
      headers: { Authorization: `Bearer ${actor.accessToken}` },
    });
    expect(response.ok()).toBeTruthy();
  }

  return consignmentId;
}

test.describe("R5 UX hardening proof", () => {
  test.setTimeout(300_000);

  test("captures public, onboarding, and role-home routes", async ({ page }, testInfo) => {
    const stamp = `${testInfo.project.name}-${Date.now()}`;

    await gotoPath(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "01-home");

    await gotoPath(page, "/signin");
    await expect(page.getByRole("heading", { name: "Open the right workspace with trust checks visible from the first screen." })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "02-signin");

    await signIn(page, {
      displayName: "R5 Farmer",
      email: `r5.public.${stamp}@example.com`,
      role: "farmer",
      countryCode: "GH",
    });
    await expect(page.getByRole("heading", { name: "Review access before the workspace opens" })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "03-consent");

    await signInAndGrantConsent(page, {
      displayName: "R5 Farmer",
      email: `r5.farmer.${stamp}@example.com`,
      role: "farmer",
      countryCode: "GH",
    });
    await expect(page.getByRole("heading", { name: "Finish setup, publish produce, and keep every field action recoverable." })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "04-role-home");
  });

  test("captures seeded marketplace, wallet, notifications, and traceability flows", async ({ page, request }, testInfo) => {
    const stamp = Date.now();
    const seller = await createAuthenticatedSession(request, {
      displayName: "R5 Seller",
      email: `r5.seller.${stamp}@example.com`,
      role: "farmer",
      scopeIds: ["identity.core", "workflow.audit", "traceability.runtime"],
    });
    const buyer = await createAuthenticatedSession(request, {
      displayName: "R5 Buyer",
      email: `r5.buyer.${stamp}@example.com`,
      role: "buyer",
      scopeIds: ["identity.core", "workflow.audit", "notifications.delivery"],
    });

    await primeSession(page, seller);
    await gotoPath(page, "/app/market/listings");
    await expect(page.getByRole("heading", { name: "Create, revise, and publish inventory with clear market status" })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "05-market-listings");

    const detailHref = await createListing(page, {
      title: `R5 listing ${stamp}`,
      commodity: "Cassava",
      quantityTons: "5.0",
      priceAmount: "420",
      priceCurrency: "GHS",
      location: "Tamale, GH",
      summary: "Accepted negotiation route proof for wallet, notifications, and listing detail.",
    });
    const listingId = listingIdFromHref(detailHref);
    await gotoPath(page, detailHref);
    await expect(page.getByText(`R5 listing ${stamp}`).first()).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "06-market-listing-detail");

    await publishListingViaCommand(
      request,
      seller.accessToken,
      seller.session.actor.actor_id,
      seller.session.actor.country_code,
      listingId,
    );

    await requestNegotiationCommand(
      request,
      buyer.accessToken,
      buyer.session.actor.actor_id,
      buyer.session.actor.country_code,
      "market.negotiations.create",
      listingId,
      {
        listing_id: listingId,
        offer_amount: 405,
        offer_currency: "GHS",
        note: "R5 buyer offer",
      },
    );
    const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
      headers: { Authorization: `Bearer ${buyer.accessToken}` },
    });
    expect(threadsResponse.ok()).toBeTruthy();
    const threadPayload = (await threadsResponse.json()) as {
      items: Array<{ listing_id: string; thread_id: string }>;
    };
    const threadId = threadPayload.items.find((item) => item.listing_id === listingId)?.thread_id;
    expect(threadId).toBeTruthy();

    await requestNegotiationCommand(
      request,
      seller.accessToken,
      seller.session.actor.actor_id,
      seller.session.actor.country_code,
      "market.negotiations.confirm.request",
      threadId!,
      {
        thread_id: threadId,
        required_confirmer_actor_id: buyer.session.actor.actor_id,
        note: "Seller requests final confirmation.",
      },
    );
    await requestNegotiationCommand(
      request,
      buyer.accessToken,
      buyer.session.actor.actor_id,
      buyer.session.actor.country_code,
      "market.negotiations.confirm.approve",
      threadId!,
      {
        thread_id: threadId,
        note: "Buyer approves accepted thread.",
      },
    );

    await primeSession(page, buyer);
    await gotoPath(page, `/app/market/negotiations?listingId=${listingId}&threadId=${threadId}`);
    await expect(
      page.getByRole("heading", {
        name: "Track every live negotiation in one place",
      }),
    ).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "07-negotiation");

    await gotoPath(page, "/app/payments/wallet");
    await expect(page.getByRole("heading", { name: "Track balances, escrow, and settlement exceptions" })).toBeVisible();
    const startEscrow = page.getByRole("button", { name: "Start escrow" });
    if (await startEscrow.isVisible().catch(() => false)) {
      await startEscrow.click();
      await expect(page.getByRole("button", { name: "Mark as partner pending" })).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Mark as partner pending" }).click();
    }
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "08-wallet");

    await gotoPath(page, "/app/notifications");
    await expect(page.getByRole("heading", { name: "Important updates across your workflow" })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "09-notifications");

    const consignmentId = await createConsignmentTimeline(request, seller);
    await primeSession(page, seller);
    await gotoPath(page, `/app/traceability/${consignmentId}`);
    await expect(page.getByRole("heading", { name: "Ordered event chain" })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "10-traceability");
  });

  test("captures operations, advisory, climate, finance, and admin routes", async ({ page, request }, testInfo) => {
    const stamp = `${testInfo.project.name}-${Date.now()}`;

    await signInAndGrantConsent(page, {
      displayName: "R5 Cooperative",
      email: `r5.coop.${stamp}@example.com`,
      role: "cooperative",
      countryCode: "GH",
    });
    await gotoPath(page, "/app/cooperative/dispatch");
    await expect(page.getByRole("heading", { name: "Member dispatch board" })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "11-dispatch");

    await signInAndGrantConsent(page, {
      displayName: "R5 Advisor",
      email: `r5.advisor.${stamp}@example.com`,
      role: "advisor",
      countryCode: "GH",
    });
    await gotoPath(page, "/app/advisor/requests");
    await expect(page.getByRole("heading", { name: "Review evidence-backed recommendations" })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "12-advisory");

    await gotoPath(page, "/app/climate/alerts");
    await expect(page.getByRole("heading", { name: "Monitor weather risk and field evidence with confidence in view" })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "13-climate");

    const finance = await createAuthenticatedSession(request, {
      displayName: "R5 Finance",
      email: `r5.finance.${stamp}@example.com`,
      role: "finance",
      scopeIds: ["identity.core", "workflow.audit", "regulated.finance"],
    });
    await primeSession(page, finance);
    await gotoPath(page, "/app/finance/queue");
    await expect(page.getByRole("heading", { name: "Review partner-owned decisions without hidden approval paths" })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "14-finance");

    const admin = await createAuthenticatedSession(request, {
      displayName: "R5 Admin",
      email: `r5.admin.${stamp}@example.com`,
      role: "admin",
      scopeIds: ["identity.core", "workflow.audit", "admin.observability", "admin.rollout"],
    });
    await primeSession(page, admin);
    await gotoPath(page, "/app/admin/analytics");
    await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible();
    await assertA11ySmoke(page);
    await captureProof(page, testInfo, "15-admin");
  });
});
