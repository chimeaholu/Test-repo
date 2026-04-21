import crypto from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { createListing, gotoPath, listingIdFromHref, signInAndGrantConsent } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const SCHEMA_VERSION = "2026-04-18.wave1";

type SessionSeed = {
  accessToken: string;
  session: {
    actor: {
      actor_id: string;
      country_code: string;
      role: "farmer" | "buyer" | "admin";
    };
  };
};

async function createAuthenticatedSession(
  request: APIRequestContext,
  input: {
    displayName: string;
    email: string;
    role: "farmer" | "buyer" | "admin";
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

async function waitForWorkspaceReady(page: Page): Promise<void> {
  await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
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
        schema_version: SCHEMA_VERSION,
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

test.describe("R4 route completion proof", () => {
  test.setTimeout(240_000);

  test("admin analytics and cooperative dispatch routes are live and navigable", async ({ page, request }) => {
    const adminSeed = await createAuthenticatedSession(request, {
      displayName: "R4 Admin",
      email: `r4.admin.${Date.now()}@example.com`,
      role: "admin",
      scopeIds: ["identity.core", "workflow.audit", "admin.observability", "admin.rollout"],
    });
    await primeSession(page, adminSeed);
    await gotoPath(page, "/app/admin");
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Freeze rollout/i })).toBeVisible();
    await expect(page.getByText("Admin analytics route")).toHaveCount(0);

    await signInAndGrantConsent(page, {
      displayName: "R4 Cooperative",
      email: `r4.coop.${Date.now()}@example.com`,
      role: "cooperative",
    });
    await gotoPath(page, "/app/cooperative/dispatch");
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("heading", { name: "Member dispatch board" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Dispatch operations route")).toHaveCount(0);
  });

  test("wallet and notifications routes surface live escrow state after accepted negotiation", async ({ page, request }) => {
    const stamp = Date.now();
    const seller = await createAuthenticatedSession(request, {
      displayName: "R4 Seller",
      email: `r4.seller.${stamp}@example.com`,
      role: "farmer",
      scopeIds: ["identity.core", "workflow.audit"],
    });
    const buyer = await createAuthenticatedSession(request, {
      displayName: "R4 Buyer",
      email: `r4.buyer.${stamp}@example.com`,
      role: "buyer",
      scopeIds: ["identity.core", "workflow.audit", "notifications.delivery"],
    });

    await primeSession(page, seller);
    const detailHref = await createListing(page, {
      title: `R4 wallet route cassava ${stamp}`,
      commodity: "Cassava",
      quantityTons: "5.0",
      priceAmount: "420",
      priceCurrency: "GHS",
      location: "Tamale, GH",
      summary: "Accepted negotiation route proof for wallet and notification surfaces.",
    });
    const listingId = listingIdFromHref(detailHref);
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
        note: "R4 buyer offer",
      },
    );

    const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
      headers: {
        Authorization: `Bearer ${buyer.accessToken}`,
      },
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
    await gotoPath(page, "/app/payments/wallet");
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("heading", { name: "Track balances, escrow, and settlement exceptions" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Start escrow" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Start escrow" }).click();
    await expect(page.getByRole("button", { name: "Mark as partner pending" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Mark as partner pending" }).click();
    await expect(page.locator(".status-pill").filter({ hasText: "partner_pending" }).first()).toBeVisible({
      timeout: 30_000,
    });

    await gotoPath(page, "/app/notifications");
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("heading", { name: "Important updates across your workflow" })).toBeVisible({ timeout: 30_000 });
  });

  test("server-authoritative home posture redirects after consent revoke", async ({ page, request }) => {
    const buyerSeed = await createAuthenticatedSession(request, {
      displayName: "R4 Consent Buyer",
      email: `r4.role-home.${Date.now()}@example.com`,
      role: "buyer",
      scopeIds: ["identity.core", "workflow.audit"],
    });
    await primeSession(page, buyerSeed);
    await gotoPath(page, "/app/buyer");
    await waitForWorkspaceReady(page);
    await expect(page.getByRole("heading", { name: "Review supply quickly, inspect proof, and move offers without losing context." })).toBeVisible({ timeout: 30_000 });

    const revokeResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent/revoke`, {
      data: {
        reason: "Server authoritative revoke for role-home proof",
      },
      headers: {
        Authorization: `Bearer ${buyerSeed.accessToken}`,
        "X-Request-ID": crypto.randomUUID(),
        "X-Correlation-ID": crypto.randomUUID(),
      },
    });
    expect(revokeResponse.ok()).toBeTruthy();

    await gotoPath(page, "/app/buyer");
    await expect(page).toHaveURL(/\/onboarding\/consent(\?.*)?$/, { timeout: 30_000 });
  });
});
