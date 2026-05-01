import crypto from "node:crypto";

import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { gotoPath } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const CONSENT_SCOPE_IDS = ["identity.core", "workflow.audit"];
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

function makeRunId(testInfo: TestInfo): string {
  const project = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `${project}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
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
      summary: "Accepted-thread fixture for the N3 wallet, escrow, and settlement browser tranche.",
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
      note: "Buyer offer for wallet settlement tranche coverage.",
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

async function fundBuyerWallet(
  request: APIRequestContext,
  buyerSession: SessionSeed,
  runId: string,
): Promise<void> {
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
      note: "Canonical N3 wallet top-up for escrow browser coverage.",
      reconciliation_marker: `rcn-wallet-${runId}`,
    },
    requestSuffix: `wallet-fund-${runId}`,
    token: buyerSession.accessToken,
  });
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
    journeyIds: [N3_JOURNEY_MARKERS.create],
    mutationScope: "wallet.escrow",
    payload: {
      thread_id: threadId,
      note: "Open escrow for the N3 wallet and settlement runtime.",
    },
    requestSuffix: `wallet-escrow-initiate-${runId}`,
    token: buyerSession.accessToken,
  });
  return (response.result as { escrow: { escrow_id: string } }).escrow.escrow_id;
}

async function setupEscrow(
  request: APIRequestContext,
  runId: string,
): Promise<{
  buyerSession: SessionSeed;
  escrowId: string;
  listingId: string;
  sellerSession: SessionSeed;
  threadId: string;
}> {
  const sellerSession = await createAuthenticatedSession(request, {
    displayName: "Ama Seller",
    email: `wallet-seller.${runId}@example.com`,
    role: "farmer",
  });
  const buyerSession = await createAuthenticatedSession(request, {
    displayName: "Kojo Buyer",
    email: `wallet-buyer.${runId}@example.com`,
    role: "buyer",
  });
  const { listingId, threadId } = await createAcceptedThread(
    request,
    sellerSession,
    buyerSession,
    runId,
  );
  await fundBuyerWallet(request, buyerSession, runId);
  const escrowId = await initiateEscrow(request, buyerSession, threadId, runId);
  return {
    buyerSession,
    escrowId,
    listingId,
    sellerSession,
    threadId,
  };
}

async function attachCoverageMarkers(
  testInfo: TestInfo,
  input: {
    assertions: string[];
    commands: string[];
    dataCheckIds?: string[];
    escrowId: string;
    journeyIds: string[];
    path: string;
  },
): Promise<void> {
  await testInfo.attach("coverage-markers", {
    body: Buffer.from(
      JSON.stringify(
        {
          scope: "N3 wallet / escrow / settlement browser tranche",
          escrow_id: input.escrowId,
          path: input.path,
          journey_ids: input.journeyIds,
          data_check_ids: input.dataCheckIds ?? N3_DATA_CHECK_IDS,
          commands: input.commands,
          assertions: input.assertions,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
}

test.describe("Wallet, escrow, and settlement tranche", () => {
  test.setTimeout(240_000);

  test("wallet timeline shows EP-004 fallback, explicit delivery degradation, and buyer retry recovery", async ({
    page,
    request,
  }, testInfo) => {
    const runId = makeRunId(testInfo);
    const { buyerSession, escrowId } = await setupEscrow(request, runId);

    await sendWorkflowCommand(request, {
      aggregateRef: escrowId,
      actorId: buyerSession.session.actor.actor_id,
      commandName: "wallets.escrows.fund",
      countryCode: buyerSession.session.actor.country_code,
      journeyIds: [N3_JOURNEY_MARKERS.create, N3_JOURNEY_MARKERS.exception],
      mutationScope: "wallet.escrow",
      payload: {
        escrow_id: escrowId,
        note: "Trigger partner timeout so fallback delivery stays visible in the wallet timeline.",
        partner_outcome: "timeout",
      },
      requestSuffix: `wallet-escrow-timeout-${runId}`,
      token: buyerSession.accessToken,
    });

    await openWalletDashboard(page, buyerSession);
    await expect(page.getByText("Pending fallback active")).toBeVisible();
    await expect(page.getByText("Settlement fallback is visible and recoverable")).toBeVisible();
    await expect(page.getByText("Fallback sent via sms")).toBeVisible();
    await expect(page.getByText("delivery_failed").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry funding" })).toBeEnabled();
    await expect(page.getByRole("list", { name: "Escrow settlement timeline" })).toContainText(
      "partner_pending",
    );

    await attachCoverageMarkers(testInfo, {
      assertions: [
        "Wallet queue renders partner-pending fallback state",
        "Participant update panel exposes fallback_sent with sms fallback",
        "Settlement timeline includes partner_pending before recovery",
        "Buyer can recover with retry funding from the browser",
      ],
      commands: [
        "wallets.fund",
        "wallets.escrows.initiate",
        "wallets.escrows.fund(timeout)",
        "wallets.escrows.fund(retry)",
      ],
      escrowId,
      journeyIds: [
        N3_JOURNEY_MARKERS.create,
        N3_JOURNEY_MARKERS.exception,
        N3_JOURNEY_MARKERS.read,
      ],
      path: "partner_pending fallback -> retry funding recovery",
    });

    await clickWalletAction(page, "Retry funding");
    await expect(page.getByText("Funding committed")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Funds are held in escrow")).toBeVisible();
    await expect(page.getByText("No fallback active")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reverse escrow" })).toBeEnabled();
    await expect(page.getByText("Only the seller can release a funded escrow.")).toBeVisible();
  });

  test("wallet timeline shows action_required dispute state and buyer reversal recovery without leaking actor scope", async ({
    page,
    request,
  }, testInfo) => {
    const runId = makeRunId(testInfo);
    const { buyerSession, escrowId, sellerSession } = await setupEscrow(request, runId);

    await sendWorkflowCommand(request, {
      aggregateRef: escrowId,
      actorId: buyerSession.session.actor.actor_id,
      commandName: "wallets.escrows.fund",
      countryCode: buyerSession.session.actor.country_code,
      journeyIds: [N3_JOURNEY_MARKERS.create],
      mutationScope: "wallet.escrow",
      payload: {
        escrow_id: escrowId,
        note: "Fund escrow so dispute and reversal paths can be exercised in browser coverage.",
        partner_outcome: "funded",
      },
      requestSuffix: `wallet-escrow-funded-${runId}`,
      token: buyerSession.accessToken,
    });

    await openWalletDashboard(page, sellerSession);
    await expect(page.getByRole("button", { name: "Open dispute" })).toBeEnabled();
    await clickWalletAction(page, "Open dispute");
    await expect(page.getByText("Dispute committed")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Participant follow-up required")).toBeVisible();
    await expect(page.getByText("Notification action_required")).toBeVisible();
    await expect(page.getByRole("list", { name: "Escrow settlement timeline" })).toContainText(
      "dispute_opened",
    );

    await attachCoverageMarkers(testInfo, {
      assertions: [
        "Dispute flow surfaces action_required notification state",
        "Timeline records dispute_opened for funded escrow",
        "Buyer can recover from disputed state with reversal",
        "Outsider actor does not see escrow records in wallet scope",
      ],
      commands: [
        "wallets.escrows.fund(funded)",
        "wallets.escrows.dispute_open",
        "wallets.escrows.reverse",
      ],
      escrowId,
      journeyIds: [
        N3_JOURNEY_MARKERS.create,
        N3_JOURNEY_MARKERS.exception,
        N3_JOURNEY_MARKERS.read,
      ],
      path: "funded dispute action_required -> reversal recovery -> scoped read denial",
    });

    await openWalletDashboard(page, buyerSession);
    await expect(page.getByRole("button", { name: "Reverse escrow" })).toBeEnabled();
    await clickWalletAction(page, "Reverse escrow");
    await expect(page.getByText("Reversal committed")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Escrow was reversed")).toBeVisible();
    await expect(page.getByRole("button", { name: "No further action" })).toBeDisabled();
    await expect(page.getByRole("list", { name: "Wallet transaction history" })).toContainText(
      "escrow_reversed",
    );

    const outsiderSession = await createAuthenticatedSession(request, {
      displayName: "Nana Outsider",
      email: `wallet-outsider.${runId}@example.com`,
      role: "buyer",
    });
    await openWalletDashboard(page, outsiderSession);
    await expect(page.getByText("No escrow records in actor scope")).toBeVisible();
  });

  test("seller release path completes the escrow lifecycle and buyer readback stays terminal", async ({
    page,
    request,
  }, testInfo) => {
    const runId = makeRunId(testInfo);
    const { buyerSession, escrowId, sellerSession } = await setupEscrow(request, runId);

    await sendWorkflowCommand(request, {
      aggregateRef: escrowId,
      actorId: buyerSession.session.actor.actor_id,
      commandName: "wallets.escrows.fund",
      countryCode: buyerSession.session.actor.country_code,
      journeyIds: [N3_JOURNEY_MARKERS.create],
      mutationScope: "wallet.escrow",
      payload: {
        escrow_id: escrowId,
        note: "Fund escrow so seller release lifecycle can be validated from the browser.",
        partner_outcome: "funded",
      },
      requestSuffix: `wallet-escrow-release-ready-${runId}`,
      token: buyerSession.accessToken,
    });

    await openWalletDashboard(page, sellerSession);
    await expect(page.getByRole("button", { name: "Release settlement" })).toBeEnabled();
    await clickWalletAction(page, "Release settlement");
    await expect(page.getByText("Release committed")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Settlement completed")).toBeVisible();
    await expect(page.getByRole("list", { name: "Escrow settlement timeline" })).toContainText(
      "released",
    );
    await expect(page.getByRole("list", { name: "Wallet transaction history" })).toContainText(
      "escrow_released",
    );

    await attachCoverageMarkers(testInfo, {
      assertions: [
        "Seller release transitions funded escrow to released in browser timeline",
        "Seller wallet ledger shows escrow_released immutable entry",
        "Buyer readback shows terminal released state without new actions",
      ],
      commands: [
        "wallets.escrows.fund(funded)",
        "wallets.escrows.release",
      ],
      escrowId,
      journeyIds: [N3_JOURNEY_MARKERS.create, N3_JOURNEY_MARKERS.read],
      path: "funded release lifecycle -> buyer terminal readback",
    });

    await openWalletDashboard(page, buyerSession);
    await expect(page.getByText("Settlement completed")).toBeVisible();
    await expect(page.getByRole("button", { name: "No further action" })).toBeDisabled();
  });
});
