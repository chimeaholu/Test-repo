import crypto from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { createListing, gotoPath, listingIdFromHref } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SCHEMA_VERSION = "2026-04-18.wave1";
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const CONSENT_SCOPE_IDS = ["identity.core", "workflow.audit"];

type ActorRole = "farmer" | "buyer";
type SessionSeed = {
  accessToken: string;
  session: {
    actor: {
      actor_id: string;
      country_code: string;
      role: ActorRole;
    };
  };
};

async function createAuthenticatedSession(
  request: APIRequestContext,
  input: {
    displayName: string;
    email: string;
    role: ActorRole;
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
      scope_ids: CONSENT_SCOPE_IDS,
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

async function activateSession(page: Page, sessionSeed: SessionSeed, route: "/app/farmer" | "/app/buyer"): Promise<void> {
  await primeSession(page, sessionSeed);
  await gotoPath(page, route);
  await waitForWorkspaceReady(page);
}

async function waitForWorkspaceReady(page: Page): Promise<void> {
  await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
}

async function publishListingViaCommand(
  request: APIRequestContext,
  page: Page,
  listingId: string,
): Promise<void> {
  const token = await page.evaluate(() => window.localStorage.getItem("agrodomain.session-token.v1"));
  const sessionRaw = await page.evaluate(() => window.localStorage.getItem("agrodomain.session.v2"));
  if (!token || !sessionRaw) {
    throw new Error("Expected seller token and session in localStorage");
  }

  const session = JSON.parse(sessionRaw) as {
    actor: {
      actor_id: string;
      country_code: string;
    };
  };
  const requestId = crypto.randomUUID();
  const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: requestId,
        idempotency_key: requestId,
        actor_id: session.actor.actor_id,
        country_code: session.actor.country_code,
        channel: "pwa",
        schema_version: SCHEMA_VERSION,
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
        payload: {
          listing_id: listingId,
        },
      },
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function sellerCreateAndPublishListing(request: APIRequestContext, page: Page, timestamp: number, suffix: string): Promise<string> {
  const detailHref = await createListing(page, {
    title: `Negotiation proof cassava ${timestamp} ${suffix}`,
    commodity: "Cassava",
    quantityTons: "6.0",
    priceAmount: "400",
    priceCurrency: "GHS",
    location: "Tamale, GH",
    summary: "Published cassava listing used for canonical negotiation browser proof.",
  });
  const listingId = listingIdFromHref(detailHref);
  await publishListingViaCommand(request, page, listingId);
  return listingId;
}

async function buyerCreateThread(
  request: APIRequestContext,
  page: Page,
  listingId: string,
): Promise<string> {
  await gotoPath(page, `/app/market/negotiations?listingId=${listingId}`);
  await waitForWorkspaceReady(page);
  const inboxHeading = page.getByRole("heading", {
    name: "Track every live negotiation in one place",
  });
  const inboxLoaded = await inboxHeading.isVisible({ timeout: 10_000 }).catch(() => false);
  if (!inboxLoaded) {
    const inboxLink = page.getByRole("link", { name: /^Inbox/ });
    if (await inboxLink.isVisible().catch(() => false)) {
      await inboxLink.click();
    } else {
      await gotoPath(page, "/app/market/negotiations");
    }
  }
  await expect(inboxHeading).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Listing ID").fill(listingId);
  await page.getByLabel("Offer amount").fill("385");
  await page.getByLabel("Currency").fill("GHS");
  await page.getByLabel("Buyer note").fill("Buyer opening offer for canonical thread proof.");
  await page.getByRole("button", { name: "Create offer thread" }).click();
  await expect(page.getByRole("list", { name: "Negotiation threads" })).toContainText(listingId, { timeout: 30_000 });

  const buyerThreadButton = page
    .getByRole("list", { name: "Negotiation threads" })
    .getByRole("button")
    .filter({ hasText: listingId })
    .first();
  await expect(buyerThreadButton).toBeVisible({ timeout: 30_000 });
  await buyerThreadButton.scrollIntoViewIfNeeded();
  await buyerThreadButton.click();

  const token = await page.evaluate((tokenKey) => window.localStorage.getItem(tokenKey), TOKEN_KEY);
  if (!token) {
    throw new Error("Expected buyer token in localStorage");
  }
  const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(threadsResponse.ok()).toBeTruthy();
  const threadsPayload = (await threadsResponse.json()) as {
    items: Array<{ listing_id: string; thread_id: string }>;
  };
  const matchingThread = threadsPayload.items.find((item) => item.listing_id === listingId);
  if (!matchingThread) {
    throw new Error(`Expected negotiation thread for listing ${listingId}`);
  }
  return matchingThread.thread_id;
}

async function sellerRequestConfirmation(page: Page, listingId: string): Promise<void> {
  await gotoPath(page, "/app/market/negotiations");
  await waitForWorkspaceReady(page);
  const sellerThreadList = page.getByRole("list", { name: "Negotiation threads" });
  await expect(sellerThreadList).toContainText(listingId, { timeout: 30_000 });
  await sellerThreadList.getByRole("button").filter({ hasText: listingId }).first().click();
  await expect(page.getByRole("heading", { name: "Request confirmation" })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Checkpoint note").fill("Seller requests final buyer confirmation.");
  await page.getByRole("button", { name: "Move to pending confirmation" }).click();
  await expect(page.getByText(/Waiting for (authorized )?confirmation/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Approve thread" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reject thread" })).toHaveCount(0);
}

async function buyerOpenPendingConfirmationThread(page: Page, listingId: string): Promise<void> {
  await gotoPath(page, "/app/market/negotiations");
  await waitForWorkspaceReady(page);
  const buyerThreadButton = page
    .getByRole("list", { name: "Negotiation threads" })
    .getByRole("button")
    .filter({ hasText: listingId })
    .first();
  await expect(buyerThreadButton).toBeVisible({ timeout: 30_000 });
  await buyerThreadButton.scrollIntoViewIfNeeded();
  await buyerThreadButton.click();
  await expect(page.getByText(/Waiting for (authorized )?confirmation/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve thread" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Reject thread" })).toBeVisible({ timeout: 30_000 });
}

test.describe("Negotiation inbox and thread proof", () => {
  test.setTimeout(240_000);

  test("pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked", async ({ page, request }) => {
    const timestamp = Date.now();
    const sellerIdentity = {
      displayName: "Ama Seller",
      email: `seller.negotiation.${timestamp}@example.com`,
      role: "farmer" as const,
    };
    const sellerSession = await createAuthenticatedSession(request, sellerIdentity);
    const buyerSession = await createAuthenticatedSession(request, {
      displayName: "Kofi Buyer",
      email: `buyer.negotiation.${timestamp}@example.com`,
      role: "buyer",
    });
    await activateSession(page, sellerSession, "/app/farmer");

    const listingIdApprove = await sellerCreateAndPublishListing(
      request,
      page,
      timestamp,
      "approve",
    );
    await activateSession(page, buyerSession, "/app/buyer");
    await buyerCreateThread(request, page, listingIdApprove);
    await activateSession(page, sellerSession, "/app/farmer");
    await sellerRequestConfirmation(page, listingIdApprove);
    await activateSession(page, buyerSession, "/app/buyer");
    await buyerOpenPendingConfirmationThread(page, listingIdApprove);
    await page.getByLabel("Decision note").fill("Buyer approves the negotiated thread.");
    await page.getByRole("button", { name: "Approve thread" }).click();
    await expect(page.getByText("Terminal-state lock is active")).toBeVisible();
    await expect(page.getByText("Thread status is accepted.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit counter" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Move to pending confirmation" })).toHaveCount(0);

    await activateSession(page, sellerSession, "/app/farmer");
    const listingIdReject = await sellerCreateAndPublishListing(
      request,
      page,
      timestamp,
      "reject",
    );
    await activateSession(page, buyerSession, "/app/buyer");
    const rejectedThreadId = await buyerCreateThread(request, page, listingIdReject);
    await activateSession(page, sellerSession, "/app/farmer");
    await sellerRequestConfirmation(page, listingIdReject);
    await activateSession(page, buyerSession, "/app/buyer");
    await buyerOpenPendingConfirmationThread(page, listingIdReject);
    await page.getByLabel("Decision note").fill("Buyer rejects this thread.");
    await page.getByRole("button", { name: "Reject thread" }).click();
    await expect(page.getByText("Terminal-state lock is active")).toBeVisible();
    await expect(page.getByText("Thread status is rejected.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit counter" })).toHaveCount(0);

    const outsiderSession = await createAuthenticatedSession(request, {
      displayName: "Nana Outsider",
      email: `outsider.negotiation.${timestamp}@example.com`,
      role: "buyer",
    });
    await activateSession(page, outsiderSession, "/app/buyer");
    await gotoPath(page, `/app/market/negotiations?threadId=${rejectedThreadId}`);
    await expect(page.getByText("Thread not available in your actor scope")).toBeVisible();
  });
});
