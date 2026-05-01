import crypto from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { createListing, gotoPath } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";

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

function makeFixture(role: Role, runId: string): PasswordFixture {
  const digits = runId.replace(/\D/gu, "").slice(-4).padStart(4, "0");
  return {
    countryCode: "GH",
    displayName: `EH3 ${role} ${runId}`,
    email: `eh3.${role}.${runId}@example.com`,
    password: `Harvest!GH${role === "buyer" ? "202" : "101"}`,
    phoneNumber: role === "buyer" ? `+23324202${digits}` : `+23324101${digits}`,
    role,
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
    timeout: 30_000,
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
      note: "Buyer wallet top-up for EH3 escrow explainability proof.",
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
): Promise<{ escrowId: string; listingId: string; threadId: string }> {
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
      price_amount: 440,
      price_currency: "GHS",
      quantity_tons: 6.5,
      summary: "Accepted escrow fixture with live delivery and settlement guidance proof.",
      title: `EH3 cassava lot ${runId}`,
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

  const createThreadResponse = await sendWorkflowCommand(request, {
    actorId: buyer.actorId,
    aggregateRef: listingId,
    commandName: "market.negotiations.create",
    countryCode: buyer.countryCode,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      listing_id: listingId,
      note: "Buyer offer for EH3 trust guidance proof.",
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
      note: "Seller requests final buyer confirmation.",
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
      note: "Buyer approves final terms.",
      thread_id: threadId,
    },
    token: buyer.token,
  });

  await fundBuyerWallet(request, buyer, runId);

  const initiateEscrowResponse = await sendWorkflowCommand(request, {
    actorId: buyer.actorId,
    aggregateRef: threadId,
    commandName: "wallets.escrows.initiate",
    countryCode: buyer.countryCode,
    journeyIds: ["CJ-004"],
    mutationScope: "wallet.escrow",
    payload: {
      note: "Reserve funds for the accepted EH3 proof flow.",
      thread_id: threadId,
    },
    token: buyer.token,
  });
  const escrowId = (
    initiateEscrowResponse.result as { escrow: { escrow_id: string } }
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
      note: "Funds are now secured for EH3 explainability proof.",
      partner_outcome: "funded",
    },
    token: buyer.token,
  });

  return { escrowId, listingId, threadId };
}

test.describe("EH3 marketplace trust lane", () => {
  test.setTimeout(240_000);

  test("guided listing flow surfaces readiness and trust cues before and after publish", async ({
    page,
    request,
  }) => {
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const sellerFixture = makeFixture("farmer", runId);

    const sellerSession = await createSessionSeed(request, sellerFixture);
    await primeAuthenticatedSession(page, sellerSession, "/app/farmer");

    await gotoPath(page, "/app/market/listings/create");
    await expect(page.getByText("What buyers need before they act")).toBeVisible();
    await expect(page.getByText("Clear before you continue")).toBeVisible();

    const detailHref = await createListing(page, {
      title: `Guided cassava ${runId}`,
      commodity: "Cassava",
      location: "Tamale, GH",
      priceAmount: "320",
      priceCurrency: "GHS",
      quantityTons: "4.2",
      summary: "Bagged cassava stock with moisture proof and pickup readiness.",
    });

    await gotoPath(page, detailHref);
    await expect(page.getByText("Next best action: review active conversations")).toBeVisible();
    await expect(page.getByText("Counterparty trust snapshot")).toBeVisible();
    await expect(page.getByText("Listing discipline")).toBeVisible();
  });

  test("negotiation and wallet surfaces explain the next move after escrow funding", async ({
    page,
    request,
  }) => {
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const sellerFixture = makeFixture("farmer", `${runId}-seller`);
    const buyerFixture = makeFixture("buyer", `${runId}-buyer`);

    const sellerSession = await createSessionSeed(request, sellerFixture);
    const buyerSession = await createSessionSeed(request, buyerFixture);
    const seededFlow = await seedAcceptedFundedEscrow(request, sellerSession, buyerSession, runId);

    await primeAuthenticatedSession(page, buyerSession, "/app/buyer");
    await gotoPath(page, `/app/market/negotiations/${seededFlow.threadId}`);

    await expect(page.getByText("Next best action")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Funds are secure" })).toBeVisible();
    await expect(page.getByText("Track delivery before release")).toBeVisible();
    await expect(page.getByText("Counterparty trust snapshot")).toBeVisible();

    await gotoPath(page, "/app/payments/wallet");
    await expect(page.getByText("Funds are held safely in escrow.").first()).toBeVisible();
    await expect(page.getByText("Buyer tracks proof before release").first()).toBeVisible();
  });
});
