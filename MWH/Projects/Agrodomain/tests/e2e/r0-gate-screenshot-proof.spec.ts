import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { createListing, gotoPath, listingIdFromHref, signIn, signInAndGrantConsent } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const CONSENT_SCOPE_IDS = ["identity.core", "workflow.audit"];
const SCREENSHOT_DIR =
  process.env.R0_SCREENSHOT_REVIEW_DIR ??
  path.join("execution", "reviews", "r0-screenshot-proof");
const SCHEMA_VERSION = "2026-04-18.wave1";
const N3_DATA_CHECK_IDS = ["DI-003"];
const N3_JOURNEY_MARKERS = {
  create: "CJ-004",
  exception: "EP-004",
  read: "RJ-004",
} as const;

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

type WorkflowCommandInput = {
  aggregateRef: string;
  actorId: string;
  commandName: string;
  countryCode: string;
  dataCheckIds?: string[];
  journeyIds: string[];
  mutationScope: string;
  payload: Record<string, unknown>;
  requestSuffix: string;
  token: string;
};

async function ensureScreenshotDir(): Promise<void> {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
}

async function capture(page: Page, filename: string): Promise<void> {
  await ensureScreenshotDir();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: true,
  });
}

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

async function createListingViaCommand(
  request: APIRequestContext,
  seller: SessionSeed,
  input: {
    title: string;
    commodity: string;
    quantityTons: number;
    priceAmount: number;
    priceCurrency: string;
    location: string;
    summary: string;
  },
): Promise<string> {
  const requestId = crypto.randomUUID();
  const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: requestId,
        idempotency_key: crypto.randomUUID(),
        actor_id: seller.session.actor.actor_id,
        country_code: seller.session.actor.country_code,
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
        name: "market.listings.create",
        aggregate_ref: "listing",
        mutation_scope: "marketplace.listings",
        payload: {
          title: input.title,
          commodity: input.commodity,
          quantity_tons: input.quantityTons,
          price_amount: input.priceAmount,
          price_currency: input.priceCurrency,
          location: input.location,
          summary: input.summary,
        },
      },
    },
    headers: {
      Authorization: `Bearer ${seller.accessToken}`,
      "X-Correlation-ID": requestId,
      "X-Request-ID": requestId,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    result: {
      listing: {
        listing_id: string;
      };
    };
  };
  return payload.result.listing.listing_id;
}

async function sendWorkflowCommand(
  request: APIRequestContext,
  input: WorkflowCommandInput,
): Promise<Record<string, unknown>> {
  const requestId = `req-${input.requestSuffix}-${crypto.randomUUID()}`;
  const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: requestId,
        idempotency_key: `idem-${input.requestSuffix}-${crypto.randomUUID()}`,
        actor_id: input.actorId,
        country_code: input.countryCode,
        channel: "pwa",
        schema_version: schemaVersion,
        correlation_id: requestId,
        occurred_at: new Date().toISOString(),
        traceability: {
          journey_ids: input.journeyIds,
          data_check_ids: input.dataCheckIds ?? N3_DATA_CHECK_IDS,
        },
      },
      command: {
        name: input.commandName,
        aggregate_ref: input.aggregateRef,
        mutation_scope: input.mutationScope,
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

async function waitForWorkspaceReady(page: Page): Promise<void> {
  await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
}

async function activateSession(page: Page, sessionSeed: SessionSeed, route: "/app/farmer" | "/app/buyer"): Promise<void> {
  await primeSession(page, sessionSeed);
  await gotoPath(page, route);
  await waitForWorkspaceReady(page);
}

async function publishListingViaCommand(
  request: APIRequestContext,
  page: Page,
  listingId: string,
): Promise<void> {
  const token = await page.evaluate((tokenKey) => window.localStorage.getItem(tokenKey), TOKEN_KEY);
  const sessionRaw = await page.evaluate(
    (sessionKey) => window.localStorage.getItem(sessionKey),
    SESSION_KEY,
  );
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

async function buyerCreateThread(
  request: APIRequestContext,
  page: Page,
  listingId: string,
): Promise<string> {
  await gotoPath(page, `/app/market/negotiations?listingId=${listingId}`);
  await waitForWorkspaceReady(page);
  await expect(
    page.getByRole("heading", { name: "Track every live negotiation in one place" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Listing ID").fill(listingId);
  await page.getByLabel("Offer amount").fill("385");
  await page.getByLabel("Currency").fill("GHS");
  await page.getByLabel("Buyer note").fill("Buyer opening offer for screenshot proof.");
  await page.getByRole("button", { name: "Create offer thread" }).click();
  const threads = page.getByRole("list", { name: "Negotiation threads" });
  await expect(threads).toContainText(listingId, { timeout: 30_000 });
  await threads.getByRole("button").filter({ hasText: listingId }).first().click();

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
  const threadList = page.getByRole("list", { name: "Negotiation threads" });
  await expect(threadList).toContainText(listingId, { timeout: 30_000 });
  await threadList.getByRole("button").filter({ hasText: listingId }).first().click();
  await expect(page.getByRole("heading", { name: "Request confirmation" })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Checkpoint note").fill("Seller requests final buyer confirmation.");
  await page.getByRole("button", { name: "Move to pending confirmation" }).click();
  await expect(page.getByText(/Waiting for (authorized )?confirmation/i)).toBeVisible({ timeout: 30_000 });
}

async function buyerOpenPendingConfirmationThread(page: Page, listingId: string): Promise<void> {
  await gotoPath(page, "/app/market/negotiations");
  await waitForWorkspaceReady(page);
  const threadButton = page
    .getByRole("list", { name: "Negotiation threads" })
    .getByRole("button")
    .filter({ hasText: listingId })
    .first();
  await expect(threadButton).toBeVisible({ timeout: 30_000 });
  await threadButton.click();
  await expect(page.getByText(/Waiting for (authorized )?confirmation/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve thread" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Reject thread" })).toBeVisible({ timeout: 30_000 });
}

function makeRunId(testInfo: TestInfo): string {
  const project = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `${project}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

async function openWalletDashboard(page: Page, sessionSeed: SessionSeed): Promise<void> {
  await primeSession(page, sessionSeed);
  await gotoPath(page, "/app/payments/wallet");
  await waitForWorkspaceReady(page);
  await expect(
    page.getByRole("heading", {
      name: "Canonical settlement timeline and delivery evidence",
    }),
  ).toBeVisible({ timeout: 30_000 });
}

async function clickWalletAction(page: Page, name: string): Promise<void> {
  const button = page.getByRole("button", { name });
  await button.scrollIntoViewIfNeeded();
  await button.click({ force: true });
}

async function createAcceptedThread(
  request: APIRequestContext,
  sellerSession: SessionSeed,
  buyerSession: SessionSeed,
  runId: string,
): Promise<{ listingId: string; threadId: string }> {
  const createListingResponse = await sendWorkflowCommand(request, {
    aggregateRef: "listing",
    actorId: sellerSession.session.actor.actor_id,
    commandName: "market.listings.create",
    countryCode: sellerSession.session.actor.country_code,
    journeyIds: [N3_JOURNEY_MARKERS.create],
    mutationScope: "marketplace.listings",
    payload: {
      title: `Wallet tranche cassava ${runId}`,
      commodity: "Cassava",
      quantity_tons: 6.5,
      price_amount: 440,
      price_currency: "GHS",
      location: "Tamale, GH",
      summary: "Accepted-thread fixture for wallet screenshot proof.",
    },
    requestSuffix: `wallet-listing-create-${runId}`,
    token: sellerSession.accessToken,
  });
  const listingId = (
    createListingResponse.result as { listing: { listing_id: string } }
  ).listing.listing_id;

  await sendWorkflowCommand(request, {
    aggregateRef: listingId,
    actorId: sellerSession.session.actor.actor_id,
    commandName: "market.listings.publish",
    countryCode: sellerSession.session.actor.country_code,
    journeyIds: [N3_JOURNEY_MARKERS.create],
    mutationScope: "marketplace.listings",
    payload: {
      listing_id: listingId,
    },
    requestSuffix: `wallet-listing-publish-${runId}`,
    token: sellerSession.accessToken,
  });

  const createThreadResponse = await sendWorkflowCommand(request, {
    aggregateRef: listingId,
    actorId: buyerSession.session.actor.actor_id,
    commandName: "market.negotiations.create",
    countryCode: buyerSession.session.actor.country_code,
    journeyIds: [N3_JOURNEY_MARKERS.create],
    mutationScope: "marketplace.negotiations",
    payload: {
      listing_id: listingId,
      offer_amount: 420,
      offer_currency: "GHS",
      note: "Buyer offer for wallet screenshot proof.",
    },
    requestSuffix: `wallet-thread-create-${runId}`,
    token: buyerSession.accessToken,
  });
  const threadId = (
    createThreadResponse.result as { thread: { thread_id: string } }
  ).thread.thread_id;

  await sendWorkflowCommand(request, {
    aggregateRef: threadId,
    actorId: sellerSession.session.actor.actor_id,
    commandName: "market.negotiations.confirm.request",
    countryCode: sellerSession.session.actor.country_code,
    journeyIds: [N3_JOURNEY_MARKERS.create],
    mutationScope: "marketplace.negotiations",
    payload: {
      thread_id: threadId,
      required_confirmer_actor_id: buyerSession.session.actor.actor_id,
      note: "Seller requests final buyer confirmation for settlement readiness.",
    },
    requestSuffix: `wallet-thread-confirm-request-${runId}`,
    token: sellerSession.accessToken,
  });

  await sendWorkflowCommand(request, {
    aggregateRef: threadId,
    actorId: buyerSession.session.actor.actor_id,
    commandName: "market.negotiations.confirm.approve",
    countryCode: buyerSession.session.actor.country_code,
    journeyIds: [N3_JOURNEY_MARKERS.create],
    mutationScope: "marketplace.negotiations",
    payload: {
      thread_id: threadId,
      note: "Buyer approves settlement readiness.",
    },
    requestSuffix: `wallet-thread-confirm-approve-${runId}`,
    token: buyerSession.accessToken,
  });

  return { listingId, threadId };
}

async function setupEscrow(
  request: APIRequestContext,
  runId: string,
): Promise<{ buyerSession: SessionSeed; escrowId: string; sellerSession: SessionSeed }> {
  const sellerSession = await createAuthenticatedSession(request, {
    displayName: "Ama Seller",
    email: `wallet-seller.${runId}@example.com`,
    role: "farmer",
  });
  const buyerSession = await createAuthenticatedSession(request, {
    displayName: "Kofi Buyer",
    email: `wallet-buyer.${runId}@example.com`,
    role: "buyer",
  });

  const { threadId } = await createAcceptedThread(request, sellerSession, buyerSession, runId);

  await sendWorkflowCommand(request, {
    aggregateRef: "wallet",
    actorId: buyerSession.session.actor.actor_id,
    commandName: "wallets.fund",
    countryCode: buyerSession.session.actor.country_code,
    journeyIds: [N3_JOURNEY_MARKERS.create],
    mutationScope: "wallet.ledger",
    payload: {
      wallet_actor_id: buyerSession.session.actor.actor_id,
      country_code: buyerSession.session.actor.country_code,
      currency: "GHS",
      amount: 950,
      reference_type: "deposit",
      reference_id: `dep-wallet-${runId}`,
      note: "Wallet top-up for escrow screenshot proof.",
      reconciliation_marker: `rcn-wallet-${runId}`,
    },
    requestSuffix: `wallet-fund-${runId}`,
    token: buyerSession.accessToken,
  });

  const response = await sendWorkflowCommand(request, {
    aggregateRef: threadId,
    actorId: buyerSession.session.actor.actor_id,
    commandName: "wallets.escrows.initiate",
    countryCode: buyerSession.session.actor.country_code,
    journeyIds: [N3_JOURNEY_MARKERS.create],
    mutationScope: "wallet.escrow",
    payload: {
      thread_id: threadId,
      note: "Open escrow for wallet screenshot proof.",
    },
    requestSuffix: `wallet-escrow-initiate-${runId}`,
    token: buyerSession.accessToken,
  });
  const escrowId = (response.result as { escrow: { escrow_id: string } }).escrow.escrow_id;

  return { buyerSession, escrowId, sellerSession };
}

test.describe("R0 screenshot proof set", () => {
  test.setTimeout(300_000);

  test("desktop auth, buyer discovery, owner listing, negotiation, and wallet states", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-critical");

    const runId = Date.now();
    const farmerEmail = `proof-farmer.${runId}@example.com`;

    await gotoPath(page, "/signin");
    await expect(page.getByRole("button", { name: "Continue to onboarding" })).toBeVisible();
    await capture(page, "01-desktop-signin.png");

    await signIn(page, {
      displayName: "Ama Mensah",
      email: farmerEmail,
      role: "farmer",
    });
    await expect(page).toHaveURL(/\/onboarding\/consent$/);
    await capture(page, "02-desktop-consent.png");

    await signInAndGrantConsent(page, {
      displayName: "Ama Mensah",
      email: farmerEmail,
      role: "farmer",
    });
    await expect(
      page.getByRole("heading", {
        name: "Finish setup, publish produce, and keep every field action recoverable.",
      }),
    ).toBeVisible();
    await capture(page, "03-desktop-farmer-home.png");

    const seller = await createAuthenticatedSession(request, {
      displayName: "Ama Seller",
      email: `proof-seller.${runId}@example.com`,
      role: "farmer",
    });
    const buyer = await createAuthenticatedSession(request, {
      displayName: "Kofi Buyer",
      email: `proof-buyer.${runId}@example.com`,
      role: "buyer",
    });
    const buyerListingId = await createListingViaCommand(request, seller, {
      title: `Buyer proof cassava ${runId}`,
      commodity: "Cassava",
      quantityTons: 5.2,
      priceAmount: 360,
      priceCurrency: "GHS",
      location: "Tamale, GH",
      summary: "Published listing for buyer discovery screenshot proof.",
    });
    await sendWorkflowCommand(request, {
      aggregateRef: buyerListingId,
      actorId: seller.session.actor.actor_id,
      commandName: "market.listings.publish",
      countryCode: seller.session.actor.country_code,
      journeyIds: ["CJ-002"],
      mutationScope: "marketplace.listings",
      payload: {
        listing_id: buyerListingId,
      },
      requestSuffix: `buyer-proof-publish-${runId}`,
      token: seller.accessToken,
    });

    await activateSession(page, buyer, "/app/buyer");
    await expect(
      page.getByRole("heading", {
        name: "Buyers",
      }),
    ).toBeVisible();
    await capture(page, "04-desktop-buyer-home.png");

    await gotoPath(page, "/app/market/listings");
    await expect(
      page.getByRole("heading", {
        name: "Browse published lots",
      }),
    ).toBeVisible();
    await expect(page.getByText(`Buyer proof cassava ${runId}`)).toBeVisible();
    await capture(page, "05-desktop-buyer-discovery-listings.png");

    await signInAndGrantConsent(page, {
      displayName: "Efua Mensah",
      email: `proof-owner.${runId}@example.com`,
      role: "farmer",
    });
    const detailHref = await createListing(page, {
      title: `Publish-ready cassava ${runId}`,
      commodity: "Cassava",
      quantityTons: "5.4",
      priceAmount: "380",
      priceCurrency: "GHS",
      location: "Tamale, GH",
      summary: "Owner publish/unpublish screenshot proof.",
    });
    const listingId = listingIdFromHref(detailHref);
    await gotoPath(page, detailHref);
    await page.locator("#edit-status").selectOption("published");
    await page.getByRole("button", { name: "Save listing edits" }).click();
    await expect(page.getByText("Live in the marketplace")).toBeVisible();
    await expect(page.getByText("Listing published confirmed")).toBeVisible();
    await capture(page, "06-desktop-owner-listing-published.png");

    await page.locator("#edit-status").selectOption("closed");
    await page.getByRole("button", { name: "Save listing edits" }).click();
    await expect(page.getByText("Closed to new interest")).toBeVisible();
    await expect(page.getByText("Listing closed confirmed")).toBeVisible();
    await capture(page, "07-desktop-owner-listing-closed.png");

    const negotiationSeller = await createAuthenticatedSession(request, {
      displayName: "Ama Seller",
      email: `seller.negotiation.${runId}@example.com`,
      role: "farmer",
    });
    const negotiationBuyer = await createAuthenticatedSession(request, {
      displayName: "Kofi Buyer",
      email: `buyer.negotiation.${runId}@example.com`,
      role: "buyer",
    });
    await activateSession(page, negotiationSeller, "/app/farmer");
    const detailHrefNegotiation = await createListing(page, {
      title: `Negotiation proof cassava ${runId}`,
      commodity: "Cassava",
      quantityTons: "6.0",
      priceAmount: "400",
      priceCurrency: "GHS",
      location: "Tamale, GH",
      summary: "Published cassava listing for negotiation screenshot proof.",
    });
    const negotiationListingId = listingIdFromHref(detailHrefNegotiation);
    await publishListingViaCommand(request, page, negotiationListingId);
    await activateSession(page, negotiationBuyer, "/app/buyer");
    await buyerCreateThread(request, page, negotiationListingId);
    await activateSession(page, negotiationSeller, "/app/farmer");
    await sellerRequestConfirmation(page, negotiationListingId);
    await activateSession(page, negotiationBuyer, "/app/buyer");
    await buyerOpenPendingConfirmationThread(page, negotiationListingId);
    await capture(page, "08-desktop-negotiation-pending-confirmation.png");

    const walletRunId = makeRunId(testInfo);
    const { buyerSession, escrowId, sellerSession } = await setupEscrow(request, walletRunId);
    await sendWorkflowCommand(request, {
      aggregateRef: escrowId,
      actorId: buyerSession.session.actor.actor_id,
      commandName: "wallets.escrows.fund",
      countryCode: buyerSession.session.actor.country_code,
      journeyIds: [N3_JOURNEY_MARKERS.create],
      mutationScope: "wallet.escrow",
      payload: {
        escrow_id: escrowId,
        note: "Fund escrow so seller release lifecycle can be shown in screenshot proof.",
        partner_outcome: "funded",
      },
      requestSuffix: `wallet-escrow-release-ready-${walletRunId}`,
      token: buyerSession.accessToken,
    });
    await openWalletDashboard(page, sellerSession);
    await clickWalletAction(page, "Release settlement");
    await expect(page.getByText("Release committed")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Settlement completed")).toBeVisible();
    await capture(page, "09-desktop-wallet-settlement-complete.png");
  });

  test("desktop wallet settlement completion proof", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-critical");

    const walletRunId = makeRunId(testInfo);
    const { buyerSession, escrowId, sellerSession } = await setupEscrow(request, walletRunId);
    await sendWorkflowCommand(request, {
      aggregateRef: escrowId,
      actorId: buyerSession.session.actor.actor_id,
      commandName: "wallets.escrows.fund",
      countryCode: buyerSession.session.actor.country_code,
      journeyIds: [N3_JOURNEY_MARKERS.create],
      mutationScope: "wallet.escrow",
      payload: {
        escrow_id: escrowId,
        note: "Fund escrow so seller release lifecycle can be shown in screenshot proof.",
        partner_outcome: "funded",
      },
      requestSuffix: `wallet-escrow-release-ready-${walletRunId}`,
      token: buyerSession.accessToken,
    });
    await openWalletDashboard(page, sellerSession);
    await clickWalletAction(page, "Release settlement");
    await expect(page.getByText("Release committed")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Settlement completed")).toBeVisible();
    await capture(page, "09-desktop-wallet-settlement-complete.png");
  });

  test("mobile sign-in and consent stay green", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-critical");

    const runId = Date.now();
    const farmerEmail = `proof-mobile-farmer.${runId}@example.com`;

    await gotoPath(page, "/signin");
    await expect(page.getByRole("button", { name: "Continue to onboarding" })).toBeVisible();
    await capture(page, "10-mobile-signin.png");

    await signIn(page, {
      displayName: "Ama Mobile",
      email: farmerEmail,
      role: "farmer",
    });
    await expect(page).toHaveURL(/\/onboarding\/consent$/);
    await expect(
      page.getByRole("heading", { name: "Review access before the workspace opens" }),
    ).toBeVisible();
    await capture(page, "11-mobile-consent.png");
  });
});
