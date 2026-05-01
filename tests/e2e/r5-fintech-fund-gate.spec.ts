import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { gotoPath } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";

type Role = "farmer" | "buyer" | "cooperative" | "advisor" | "finance" | "admin" | "investor";
type SessionSeed = {
  accessToken: string;
  session: {
    actor: {
      actor_id: string;
      country_code: string;
      display_name: string;
      role: Role;
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

function makeRunId(testInfo: TestInfo): string {
  const project = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `${project}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

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

async function createAuthenticatedSession(
  request: APIRequestContext,
  input: {
    displayName: string;
    email: string;
    role: Role;
    scopeIds?: string[];
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
      policy_version: "2026.04.r5",
      scope_ids: input.scopeIds ?? ["identity.core", "workflow.audit", "finance.investments", "notifications.delivery"],
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
          data_check_ids: input.dataCheckIds ?? ["QG-R5"],
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

async function getAuthedJson<T>(
  request: APIRequestContext,
  token: string,
  endpoint: string,
): Promise<T> {
  const response = await request.get(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok(), `GET ${endpoint} should succeed`).toBeTruthy();
  return (await response.json()) as T;
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

async function fundWallet(
  request: APIRequestContext,
  sessionSeed: SessionSeed,
  amount: number,
  runId: string,
): Promise<void> {
  await sendWorkflowCommand(request, {
    aggregateRef: "wallet",
    actorId: sessionSeed.session.actor.actor_id,
    commandName: "wallets.fund",
    countryCode: sessionSeed.session.actor.country_code,
    journeyIds: ["EP-005"],
    mutationScope: "wallet.ledger",
    payload: {
      wallet_actor_id: sessionSeed.session.actor.actor_id,
      country_code: sessionSeed.session.actor.country_code,
      currency: "GHS",
      amount,
      reference_type: "manual_seed",
      reference_id: `seed-${runId}`,
      note: "R5 QA gate wallet seed.",
    },
    requestSuffix: `wallet-fund-${runId}`,
    token: sessionSeed.accessToken,
  });
}

async function createPublishedListing(
  request: APIRequestContext,
  sellerSession: SessionSeed,
  runId: string,
): Promise<string> {
  const createListingResponse = await sendWorkflowCommand(request, {
    aggregateRef: "listing",
    actorId: sellerSession.session.actor.actor_id,
    commandName: "market.listings.create",
    countryCode: sellerSession.session.actor.country_code,
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: {
      title: `R5 Gate Maize Cycle ${runId}`,
      commodity: "Maize",
      quantity_tons: 8,
      price_amount: 250,
      price_currency: "GHS",
      location: "Tamale, GH",
      summary: "Live fund-ready listing created for the R5 fintech and fund QA gate.",
    },
    requestSuffix: `listing-create-${runId}`,
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
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: {
      listing_id: listingId,
    },
    requestSuffix: `listing-publish-${runId}`,
    token: sellerSession.accessToken,
  });

  return listingId;
}

async function createAcceptedThread(
  request: APIRequestContext,
  sellerSession: SessionSeed,
  buyerSession: SessionSeed,
  runId: string,
): Promise<{ listingId: string; threadId: string }> {
  const listingId = await createPublishedListing(request, sellerSession, `${runId}-thread`);

  const createThreadResponse = await sendWorkflowCommand(request, {
    aggregateRef: listingId,
    actorId: buyerSession.session.actor.actor_id,
    commandName: "market.negotiations.create",
    countryCode: buyerSession.session.actor.country_code,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      listing_id: listingId,
      offer_amount: 220,
      offer_currency: "GHS",
      note: "Buyer offer for R5 QA gate escrow validation.",
    },
    requestSuffix: `thread-create-${runId}`,
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
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      thread_id: threadId,
      required_confirmer_actor_id: buyerSession.session.actor.actor_id,
      note: "Seller requests buyer confirmation for escrow readiness.",
    },
    requestSuffix: `thread-confirm-request-${runId}`,
    token: sellerSession.accessToken,
  });

  await sendWorkflowCommand(request, {
    aggregateRef: threadId,
    actorId: buyerSession.session.actor.actor_id,
    commandName: "market.negotiations.confirm.approve",
    countryCode: buyerSession.session.actor.country_code,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      thread_id: threadId,
      note: "Buyer approves and accepts the current terms.",
    },
    requestSuffix: `thread-confirm-approve-${runId}`,
    token: buyerSession.accessToken,
  });

  return {
    listingId,
    threadId,
  };
}

async function initiateEscrow(
  request: APIRequestContext,
  buyerSession: SessionSeed,
  threadId: string,
  runId: string,
): Promise<string> {
  const response = await sendWorkflowCommand(request, {
    aggregateRef: threadId,
    actorId: buyerSession.session.actor.actor_id,
    commandName: "wallets.escrows.initiate",
    countryCode: buyerSession.session.actor.country_code,
    journeyIds: ["CJ-004"],
    mutationScope: "wallet.escrow",
    payload: {
      thread_id: threadId,
      note: "Escrow created from accepted negotiation for the R5 QA gate.",
    },
    requestSuffix: `escrow-initiate-${runId}`,
    token: buyerSession.accessToken,
  });
  return (response.result as { escrow: { escrow_id: string } }).escrow.escrow_id;
}

test.describe("R5 fintech and fund QA gate", () => {
  test("wallet rendering, add funds, send money, and notification routing stay green", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-critical");
    const runId = makeRunId(testInfo);
    const investorSession = await createAuthenticatedSession(request, {
      displayName: "R5 Investor Wallet",
      email: `r5-wallet-investor.${runId}@example.com`,
      role: "investor",
    });
    const recipientSession = await createAuthenticatedSession(request, {
      displayName: "R5 Recipient Farmer",
      email: `r5-recipient.${runId}@example.com`,
      role: "farmer",
    });

    await fundWallet(request, investorSession, 1200, `${runId}-initial`);
    const beforeAdd = await getAuthedJson<{
      available_balance: number;
      held_balance: number;
      total_balance: number;
    }>(request, investorSession.accessToken, "/api/v1/wallet/summary?currency=GHS");

    await primeSession(page, investorSession);
    await gotoPath(page, "/app/payments/wallet");
    await waitForWorkspaceReady(page);

    await expect(page.getByRole("heading", { name: "Your balance, transactions, and escrows" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Move money with confidence." })).toBeVisible();
    await expect(page.getByText("Track available cash, review live settlement status, and keep portfolio money movement visible across every device.")).toBeVisible();
    await captureProof(page, testInfo, "01-wallet-home");

    await page.getByLabel("MTN Mobile Money number").fill("0241234567");
    await page.getByLabel("Amount").first().fill("250");
    await page.getByRole("button", { name: "Confirm mobile money funding" }).click();
    await expect(page.getByText("Funds added")).toBeVisible({ timeout: 30_000 });

    const afterAdd = await getAuthedJson<{
      available_balance: number;
      held_balance: number;
      total_balance: number;
    }>(request, investorSession.accessToken, "/api/v1/wallet/summary?currency=GHS");
    expect(afterAdd.total_balance).toBe(beforeAdd.total_balance + 250);
    expect(afterAdd.available_balance).toBe(beforeAdd.available_balance + 250);
    await captureProof(page, testInfo, "02-wallet-add-funds-success");

    await page.getByLabel("Recipient name or email").fill(recipientSession.session.actor.display_name);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("list", { name: "Recipient search results" })).toContainText(
      recipientSession.session.actor.display_name,
    );
    await page.getByRole("button", { name: new RegExp(recipientSession.session.actor.display_name) }).click();
    await page.locator("#wallet-send-amount").fill("150");
    await page.getByRole("button", { name: "Review transfer" }).click();
    await expect(page.getByText(recipientSession.session.actor.display_name)).toBeVisible();
    await expect(page.getByText("GHS 150", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Confirm transfer" }).click();
    await expect(page.getByText("Transfer complete")).toBeVisible({ timeout: 30_000 });

    const afterTransfer = await getAuthedJson<{
      available_balance: number;
      held_balance: number;
      total_balance: number;
    }>(request, investorSession.accessToken, "/api/v1/wallet/summary?currency=GHS");
    const recipientWallet = await getAuthedJson<{
      available_balance: number;
      held_balance: number;
      total_balance: number;
    }>(request, recipientSession.accessToken, "/api/v1/wallet/summary?currency=GHS");
    expect(afterTransfer.available_balance).toBe(afterAdd.available_balance - 150);
    expect(afterTransfer.held_balance).toBe(0);
    expect(recipientWallet.available_balance).toBe(150);
    await captureProof(page, testInfo, "03-wallet-send-money-success");

    await gotoPath(page, "/app/notifications");
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("heading", { name: "Trade, finance, weather, advisory, and system updates" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Finance/ })).toBeVisible();
    await expect(page.getByText("Funding window open for Maize").or(page.getByText("Consent is active"))).toBeVisible();
    await captureProof(page, testInfo, "04-notifications");
  });

  test("negotiation escrow integration and wallet escrow state transitions stay green", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-critical");
    const runId = makeRunId(testInfo);
    const sellerSession = await createAuthenticatedSession(request, {
      displayName: "R5 Seller Farmer",
      email: `r5-seller.${runId}@example.com`,
      role: "farmer",
    });
    const buyerSession = await createAuthenticatedSession(request, {
      displayName: "R5 Buyer Trader",
      email: `r5-buyer.${runId}@example.com`,
      role: "buyer",
    });

    await fundWallet(request, buyerSession, 900, `${runId}-buyer`);
    const { listingId, threadId } = await createAcceptedThread(request, sellerSession, buyerSession, runId);
    const escrowId = await initiateEscrow(request, buyerSession, threadId, runId);

    await primeSession(page, buyerSession);
    await gotoPath(page, `/app/market/negotiations?listingId=${listingId}&threadId=${threadId}`);
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("heading", { name: "This deal is already protected" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open in wallet" })).toBeVisible();
    await captureProof(page, testInfo, "05-negotiation-escrow-linked");

    await gotoPath(page, `/app/payments/wallet?escrow=${escrowId}`);
    await waitForWorkspaceReady(page);
    await expect(page.getByText("Funding has not started yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Fund escrow" })).toBeEnabled();
    await page.getByRole("button", { name: "Fund escrow" }).click();
    await expect(page.getByText("Funding committed")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Funds are held in escrow")).toBeVisible();
    await expect(page.getByRole("list", { name: new RegExp(`Escrow state progression for ${escrowId}`) })).toContainText(
      "Funded",
    );
    await expect(page.getByRole("table")).toContainText("escrow funded");
    await captureProof(page, testInfo, "06-wallet-escrow-funded");

    await primeSession(page, sellerSession);
    await gotoPath(page, `/app/payments/wallet?escrow=${escrowId}`);
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("button", { name: "Release settlement" })).toBeEnabled();
    await page.getByRole("button", { name: "Release settlement" }).click();
    await expect(page.getByText("Release committed")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Settlement completed")).toBeVisible();
    await expect(page.getByRole("list", { name: new RegExp(`Escrow state progression for ${escrowId}`) })).toContainText(
      "Released",
    );
    await expect(page.getByRole("table")).toContainText("escrow released");
    await captureProof(page, testInfo, "07-wallet-escrow-released");
  });

  test("fund portal routing, detail rendering, and investment flow stay canonical", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-critical");
    const runId = makeRunId(testInfo);
    const farmerSession = await createAuthenticatedSession(request, {
      displayName: "R5 Fund Farmer",
      email: `r5-farmer.${runId}@example.com`,
      role: "farmer",
    });
    const investorSession = await createAuthenticatedSession(request, {
      displayName: "R5 Fund Buyer",
      email: `r5-buyer-fund.${runId}@example.com`,
      role: "buyer",
    });

    await fundWallet(request, investorSession, 1400, `${runId}-investor`);
    const listingId = await createPublishedListing(request, farmerSession, runId);
    const fundRequests: string[] = [];
    page.on("request", (nextRequest) => {
      if (nextRequest.url().includes("/api/v1/fund/")) {
        fundRequests.push(nextRequest.url());
      }
    });

    await primeSession(page, investorSession);
    await gotoPath(page, `/app/fund?listing=${listingId}`);
    await waitForWorkspaceReady(page);

    await expect(page.getByRole("heading", { name: "Back agricultural opportunities with clearer progress and return visibility" })).toBeVisible();
    await expect(page.getByText("Compare farms, progress, and expected return")).toBeVisible();
    const liveOpportunityLink = page.locator(`a[href="/app/fund/${listingId}"]`).first();
    await expect(liveOpportunityLink).toBeVisible();
    await captureProof(page, testInfo, "08-fund-portal");

    await liveOpportunityLink.click();
    await expect(page).toHaveURL(new RegExp(`/app/fund/${listingId}$`));
    await expect(page.getByText("Fund this farm from your wallet")).toBeVisible();
    await expect(page.getByText("Review the farm story, funding need, return case, and protection signals before you invest.")).toBeVisible();
    await captureProof(page, testInfo, "09-fund-detail");

    await page.getByLabel("Investment amount").fill("300");
    await page.getByRole("button", { name: "Review amount" }).click();
    await expect(page.getByRole("button", { name: "Invest now" })).toBeVisible();
    await page.getByRole("button", { name: "Invest now" }).click();
    await expect(page.getByText("Investment confirmed")).toBeVisible({ timeout: 30_000 });
    await captureProof(page, testInfo, "10-fund-investment-ui-success");

    const walletAfter = await getAuthedJson<{
      available_balance: number;
      held_balance: number;
      total_balance: number;
    }>(request, investorSession.accessToken, "/api/v1/wallet/summary?currency=GHS");
    const investmentsAfter = await getAuthedJson<{ items: Array<{ investment_id: string }> }>(
      request,
      investorSession.accessToken,
      "/api/v1/fund/investments",
    );

    const blockers: string[] = [];
    if (fundRequests.length === 0) {
      blockers.push("UI never called any `/api/v1/fund/*` endpoint during investment confirmation.");
    }
    if (walletAfter.held_balance !== 300) {
      blockers.push(
        `Wallet held balance is ${walletAfter.held_balance} after invest UI success; canonical fund flow requires 300 to move from available to held.`,
      );
    }
    if (investmentsAfter.items.length === 0) {
      blockers.push("GET /api/v1/fund/investments returned no persisted investment record after the UI reported success.");
    }

    expect(blockers, blockers.join("\n")).toEqual([]);
  });

  test("wallet and fund mobile states stay readable and route correctly", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-critical");
    const runId = makeRunId(testInfo);
    const farmerSession = await createAuthenticatedSession(request, {
      displayName: "R5 Mobile Farmer",
      email: `r5-mobile-farmer.${runId}@example.com`,
      role: "farmer",
    });
    const investorSession = await createAuthenticatedSession(request, {
      displayName: "R5 Mobile Investor",
      email: `r5-mobile-investor.${runId}@example.com`,
      role: "investor",
    });

    await fundWallet(request, investorSession, 800, `${runId}-mobile`);
    await createPublishedListing(request, farmerSession, `${runId}-mobile`);

    await primeSession(page, investorSession);
    await gotoPath(page, "/app/payments/wallet");
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("heading", { name: "Your balance, transactions, and escrows" })).toBeVisible();
    await expect(page.getByText("Your wallet is ready for action")).toBeVisible();
    await captureProof(page, testInfo, "11-mobile-wallet");

    await gotoPath(page, "/app/fund");
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("heading", { name: "Back agricultural opportunities with clearer progress and return visibility" })).toBeVisible();
    await expect(page.getByText("Use the filters to compare the farm story, funding progress, and return case before you invest.")).toBeVisible();
    await captureProof(page, testInfo, "12-mobile-fund-portal");

    await gotoPath(page, "/app/fund/my-investments");
    await waitForWorkspaceReady(page);
    await expect(page.getByText("No investments yet")).toBeVisible();
    await captureProof(page, testInfo, "13-mobile-fund-empty");
  });
});
