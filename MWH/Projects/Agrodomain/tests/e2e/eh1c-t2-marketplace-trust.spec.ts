import crypto from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import {
  bootstrapPasswordSession,
  gotoPath,
  type SessionSeed,
} from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";

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
  const requestId = `req-eh1c-t2-${crypto.randomUUID()}`;
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
): Promise<string> {
  const createListingResponse = await sendWorkflowCommand(request, {
    actorId: seller.session.actor.actor_id,
    aggregateRef: "listing",
    commandName: "market.listings.create",
    countryCode: seller.session.actor.country_code,
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: {
      commodity: "Cassava",
      location: "Tamale, GH",
      price_amount: 440,
      price_currency: "GHS",
      quantity_tons: 6.5,
      summary: "Published marketplace lot for EH1C-T2 browser proof.",
      title: `EH1C-T2 cassava lot ${runId}`,
    },
    token: seller.accessToken,
  });
  const listingId = (
    createListingResponse.result as { listing: { listing_id: string } }
  ).listing.listing_id;

  await sendWorkflowCommand(request, {
    actorId: seller.session.actor.actor_id,
    aggregateRef: listingId,
    commandName: "market.listings.publish",
    countryCode: seller.session.actor.country_code,
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: { listing_id: listingId },
    token: seller.accessToken,
  });

  return listingId;
}

async function seedPendingConfirmationThread(
  request: APIRequestContext,
  seller: SessionSeed,
  buyer: SessionSeed,
  runId: string,
): Promise<{ listingId: string; threadId: string }> {
  const listingId = await seedPublishedListing(request, seller, `${runId}-pending`);
  const createThreadResponse = await sendWorkflowCommand(request, {
    actorId: buyer.session.actor.actor_id,
    aggregateRef: listingId,
    commandName: "market.negotiations.create",
    countryCode: buyer.session.actor.country_code,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      listing_id: listingId,
      note: "Buyer offer for EH1C-T2 pending confirmation proof.",
      offer_amount: 420,
      offer_currency: "GHS",
    },
    token: buyer.accessToken,
  });
  const threadId = (
    createThreadResponse.result as { thread: { thread_id: string } }
  ).thread.thread_id;

  await sendWorkflowCommand(request, {
    actorId: seller.session.actor.actor_id,
    aggregateRef: threadId,
    commandName: "market.negotiations.confirm.request",
    countryCode: seller.session.actor.country_code,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      note: "Seller requests final buyer confirmation.",
      required_confirmer_actor_id: buyer.session.actor.actor_id,
      thread_id: threadId,
    },
    token: seller.accessToken,
  });

  return { listingId, threadId };
}

async function seedFundedEscrow(
  request: APIRequestContext,
  seller: SessionSeed,
  buyer: SessionSeed,
  runId: string,
): Promise<{ escrowId: string; listingId: string; threadId: string }> {
  const { listingId, threadId } = await seedPendingConfirmationThread(request, seller, buyer, `${runId}-funded`);

  await sendWorkflowCommand(request, {
    actorId: buyer.session.actor.actor_id,
    aggregateRef: threadId,
    commandName: "market.negotiations.confirm.approve",
    countryCode: buyer.session.actor.country_code,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      note: "Buyer approves final terms.",
      thread_id: threadId,
    },
    token: buyer.accessToken,
  });

  await sendWorkflowCommand(request, {
    actorId: buyer.session.actor.actor_id,
    aggregateRef: "wallet",
    commandName: "wallets.fund",
    countryCode: buyer.session.actor.country_code,
    journeyIds: ["CJ-004"],
    mutationScope: "wallet.ledger",
    payload: {
      wallet_actor_id: buyer.session.actor.actor_id,
      country_code: buyer.session.actor.country_code,
      currency: "GHS",
      amount: 950,
      reference_type: "deposit",
      reference_id: `dep-eh1c-t2-${runId}`,
      note: "Buyer wallet top-up for EH1C-T2 escrow proof.",
      reconciliation_marker: `rcn-eh1c-t2-${runId}`,
    },
    token: buyer.accessToken,
  });

  const initiateEscrowResponse = await sendWorkflowCommand(request, {
    actorId: buyer.session.actor.actor_id,
    aggregateRef: threadId,
    commandName: "wallets.escrows.initiate",
    countryCode: buyer.session.actor.country_code,
    journeyIds: ["CJ-004"],
    mutationScope: "wallet.escrow",
    payload: {
      note: "Reserve funds for the accepted EH1C-T2 proof flow.",
      thread_id: threadId,
    },
    token: buyer.accessToken,
  });
  const escrowId = (
    initiateEscrowResponse.result as { escrow: { escrow_id: string } }
  ).escrow.escrow_id;

  await sendWorkflowCommand(request, {
    actorId: buyer.session.actor.actor_id,
    aggregateRef: escrowId,
    commandName: "wallets.escrows.fund",
    countryCode: buyer.session.actor.country_code,
    journeyIds: ["CJ-004"],
    mutationScope: "wallet.escrow",
    payload: {
      escrow_id: escrowId,
      note: "Funds are now secured for EH1C-T2 settlement explainability proof.",
      partner_outcome: "funded",
    },
    token: buyer.accessToken,
  });

  return { escrowId, listingId, threadId };
}

test.describe("EH1C-T2 marketplace trust surfaces", () => {
  test.setTimeout(240_000);

  test("listing creation, detail, and seller management surfaces use the remediated customer composition", async ({
    page,
    request,
  }) => {
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const seller = await bootstrapPasswordSession(request, {
      displayName: `EH1C-T2 Seller ${runId}`,
      email: `eh1c.t2.seller.${runId}@example.com`,
      password: `Harvest!T2${runId.slice(-4)}`,
      role: "farmer",
    });

    await primeAuthenticatedSession(page, seller, "/app/market/listings/create");
    await expect(page.getByRole("heading", { name: "Show buyers exactly what you have available" })).toBeVisible();

    const listingId = await seedPublishedListing(request, seller, runId);

    await gotoPath(page, `/app/market/listings/${listingId}`);
    await expect(page.getByText("Review the lot, confirm fit, and take the next step with confidence.")).toBeVisible();
    await expect(page.getByText("Why this lot is easy to review")).toBeVisible();
    await expect(page.getByText("How this listing is performing")).toBeVisible();

    await gotoPath(page, "/app/market/my-listings");
    await expect(
      page.getByRole("heading", {
        name: "See what is live, what needs work, and what buyers are responding to",
      }),
    ).toBeVisible();
    await expect(page.getByText(`EH1C-T2 cassava lot ${runId}`)).toBeVisible();
  });

  test("negotiation detail surfaces keep the confirmation step explicit for the required confirmer", async ({
    page,
    request,
  }) => {
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const seller = await bootstrapPasswordSession(request, {
      displayName: `EH1C-T2 Seller ${runId}`,
      email: `eh1c.t2.neg.seller.${runId}@example.com`,
      password: `Harvest!T2${runId.slice(-4)}A`,
      role: "farmer",
    });
    const buyer = await bootstrapPasswordSession(request, {
      displayName: `EH1C-T2 Buyer ${runId}`,
      email: `eh1c.t2.neg.buyer.${runId}@example.com`,
      password: `Harvest!T2${runId.slice(-4)}B`,
      role: "buyer",
    });
    const seededThread = await seedPendingConfirmationThread(request, seller, buyer, runId);

    await primeAuthenticatedSession(page, buyer, `/app/market/negotiations/${seededThread.threadId}`);
    await expect(page.getByRole("heading", { name: "Keep every negotiation moving toward a clear outcome" })).toBeVisible();
    await expect(page.getByText("A final decision is still needed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept offer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
    await expect(page.getByText("Move to payment")).toBeVisible();
  });

  test("wallet, traceability, and outbox routes expose the T2 trust and explainability headings", async ({
    page,
    request,
  }) => {
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    const seller = await bootstrapPasswordSession(request, {
      displayName: `EH1C-T2 Seller ${runId}`,
      email: `eh1c.t2.wallet.seller.${runId}@example.com`,
      password: `Harvest!T2${runId.slice(-4)}C`,
      role: "farmer",
    });
    const buyer = await bootstrapPasswordSession(request, {
      displayName: `EH1C-T2 Buyer ${runId}`,
      email: `eh1c.t2.wallet.buyer.${runId}@example.com`,
      password: `Harvest!T2${runId.slice(-4)}D`,
      role: "buyer",
    });
    const fundedFlow = await seedFundedEscrow(request, seller, buyer, runId);

    await primeAuthenticatedSession(page, buyer, "/app/payments/wallet");
    await expect(
      page.getByRole("heading", {
        name: "See your balance, money on hold, and recent payment movement",
      }).first(),
    ).toBeVisible();
    await expect(page.getByText("Payments on hold")).toBeVisible();
    await expect(page.getByText("Latest payment update")).toBeVisible();

    await primeAuthenticatedSession(page, seller, `/app/traceability/${fundedFlow.listingId}`);
    await expect(page.getByRole("heading", { name: "Track the journey for this lot" })).toBeVisible();
    await expect(page.getByText("Lot snapshot")).toBeVisible();
    await expect(page.getByText("Supporting details")).toBeVisible();

    await gotoPath(page, "/app/offline/outbox");
    await expect(page.getByRole("heading", { name: "See what is waiting to sync" })).toBeVisible();
    await expect(page.getByText("Waiting for signal")).toBeVisible();
  });
});
