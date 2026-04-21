import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { chromium, devices } from "@playwright/test";

const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR;
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3200";
const apiBaseUrl = process.env.AGRO_E2E_API_BASE_URL ?? "http://127.0.0.1:8000";
const sessionKey = "agrodomain.session.v2";
const tokenKey = "agrodomain.session-token.v1";
const schemaVersion = "2026-04-18.wave1";

if (!artifactDir) {
  throw new Error("PLAYWRIGHT_ARTIFACT_DIR is required");
}

const screenshotDir = path.join(artifactDir, "screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });

const projects = [
  {
    name: "desktop-critical",
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: 1440, height: 960 },
    },
  },
  {
    name: "mobile-critical",
    use: {
      ...devices["Pixel 7"],
    },
  },
];

const results = [];

async function apiJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

async function createAuthenticatedSession(input) {
  const signInRequestId = crypto.randomUUID();
  const signInPayload = await apiJson(`${apiBaseUrl}/api/v1/identity/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Correlation-ID": signInRequestId,
      "X-Request-ID": signInRequestId,
    },
    body: JSON.stringify({
      display_name: input.displayName,
      email: input.email,
      role: input.role,
      country_code: input.countryCode ?? "GH",
    }),
  });

  const consentRequestId = crypto.randomUUID();
  const session = await apiJson(`${apiBaseUrl}/api/v1/identity/consent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${signInPayload.access_token}`,
      "Content-Type": "application/json",
      "X-Correlation-ID": consentRequestId,
      "X-Request-ID": consentRequestId,
    },
    body: JSON.stringify({
      captured_at: new Date().toISOString(),
      policy_version: "2026.04.w1",
      scope_ids: input.scopeIds,
    }),
  });

  return {
    accessToken: signInPayload.access_token,
    session,
  };
}

async function gotoPath(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
}

async function primeSession(page, seed) {
  await gotoPath(page, "/signin");
  await page.evaluate(
    ([nextSessionKey, nextTokenKey, session, token]) => {
      window.localStorage.setItem(nextSessionKey, JSON.stringify(session));
      window.localStorage.setItem(nextTokenKey, token);
    },
    [sessionKey, tokenKey, seed.session, seed.accessToken],
  );
}

async function assertA11ySmoke(page, route) {
  const snapshot = await page.evaluate(() => {
    function hasAssociatedLabel(element) {
      if (element.closest("label")) {
        return true;
      }
      const id = element.getAttribute("id");
      if (!id) {
        return false;
      }
      return document.querySelector(`label[for="${id}"]`) !== null;
    }

    const unlabeledActions = Array.from(document.querySelectorAll("button, a")).flatMap((element) => {
      const label = element.getAttribute("aria-label") ?? element.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return label.length > 0 ? [] : [element.tagName.toLowerCase()];
    });
    const formFieldsMissingLabels = Array.from(document.querySelectorAll("input, select, textarea"))
      .filter((element) => !hasAssociatedLabel(element) && !element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby"))
      .map((element) => element.tagName.toLowerCase());
    return {
      mainCount: document.querySelectorAll("main").length,
      h1Count: document.querySelectorAll("h1").length,
      skipLinkCount: document.querySelectorAll(".skip-link").length,
      unlabeledActions,
      formFieldsMissingLabels,
    };
  });

  if (snapshot.mainCount !== 1) {
    throw new Error(`${route}: expected 1 main landmark, got ${snapshot.mainCount}`);
  }
  if (snapshot.h1Count > 1) {
    throw new Error(`${route}: expected at most 1 h1, got ${snapshot.h1Count}`);
  }
  if (snapshot.unlabeledActions.length > 0) {
    throw new Error(`${route}: unlabeled actions found`);
  }
  if (snapshot.formFieldsMissingLabels.length > 0) {
    throw new Error(`${route}: unlabeled form fields found`);
  }

  return snapshot;
}

async function captureRoute(page, projectName, index, slug, route, headingText) {
  await gotoPath(page, route);
  if (headingText) {
    await page.getByRole("heading", { name: headingText }).first().waitFor({ timeout: 30_000 });
  }
  const a11y = await assertA11ySmoke(page, route);
  const file = `${projectName}-${String(index).padStart(2, "0")}-${slug}.png`;
  await page.screenshot({ path: path.join(screenshotDir, file), fullPage: true });
  results.push({ project: projectName, route, screenshot: `screenshots/${file}`, a11y });
}

async function createListingViaUi(page, stamp) {
  await gotoPath(page, "/app/market/listings");
  await page.getByLabel("Listing title").fill(`R5 listing ${stamp}`);
  await page.getByLabel("Commodity").fill("Cassava");
  await page.getByLabel("Quantity (tons)").fill("5.0");
  await page.getByLabel("Price amount").fill("420");
  await page.getByLabel("Currency").fill("GHS");
  await page.getByLabel("Location").fill("Tamale, GH");
  await page.getByLabel("Summary").fill("Accepted negotiation route proof for wallet, notifications, and listing detail.");
  await page.getByRole("button", { name: "Create listing" }).click();
  const detailLink = page.getByRole("link", { name: "View and edit" }).first();
  await detailLink.waitFor({ timeout: 30_000 });
  const href = await detailLink.getAttribute("href");
  if (!href) {
    throw new Error("listing detail href missing");
  }
  const listingId = href.split("/").filter(Boolean).at(-1);
  if (!listingId) {
    throw new Error("listing id missing from href");
  }
  return { href, listingId };
}

async function requestNegotiationCommand(seed, name, aggregateRef, payload) {
  const requestId = crypto.randomUUID();
  await apiJson(`${apiBaseUrl}/api/v1/workflow/commands`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${seed.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metadata: {
        request_id: requestId,
        idempotency_key: requestId,
        actor_id: seed.session.actor.actor_id,
        country_code: seed.session.actor.country_code,
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
        mutation_scope: name.startsWith("market.negotiations") ? "marketplace.negotiations" : "marketplace.listings",
        payload,
      },
    }),
  });
}

async function publishListing(seed, listingId) {
  const requestId = crypto.randomUUID();
  await apiJson(`${apiBaseUrl}/api/v1/workflow/commands`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${seed.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metadata: {
        request_id: requestId,
        idempotency_key: requestId,
        actor_id: seed.session.actor.actor_id,
        country_code: seed.session.actor.country_code,
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
    }),
  });
}

async function createConsignmentTimeline(seed) {
  const eventRefSeed = crypto.randomUUID().slice(0, 8);
  const harvestedReference = `evt-ref-harvested-${eventRefSeed}`;
  const dispatchedReference = `evt-ref-dispatched-${eventRefSeed}`;

  const createRequestId = crypto.randomUUID();
  const createJson = await apiJson(`${apiBaseUrl}/api/v1/workflow/commands`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${seed.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metadata: {
        request_id: createRequestId,
        idempotency_key: crypto.randomUUID(),
        actor_id: seed.session.actor.actor_id,
        country_code: seed.session.actor.country_code,
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
          current_custody_actor_id: seed.session.actor.actor_id,
        },
      },
    }),
  });
  const consignmentId = createJson.result?.consignment?.consignment_id ?? createJson.result?.consignment_id;
  if (!consignmentId) {
    throw new Error("consignment id missing");
  }

  for (const [milestone, eventReference, previousEventReference, custodyActorId] of [
    ["harvested", harvestedReference, null, seed.session.actor.actor_id],
    ["dispatched", dispatchedReference, harvestedReference, "actor-transporter-gh-1"],
  ]) {
    const requestId = crypto.randomUUID();
    await apiJson(`${apiBaseUrl}/api/v1/workflow/commands`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${seed.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metadata: {
          request_id: requestId,
          idempotency_key: crypto.randomUUID(),
          actor_id: seed.session.actor.actor_id,
          country_code: seed.session.actor.country_code,
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
            event_reference_id: eventReference,
            previous_event_reference_id: previousEventReference,
            milestone,
            custody_actor_id: custodyActorId,
            note: `R5 ${milestone}`,
          },
        },
      }),
    });
  }

  return consignmentId;
}

async function signInAndGrantConsent(page, stamp, role) {
  await gotoPath(page, "/signin");
  const submit = page.getByRole("button", { name: "Continue to onboarding" });
  let reachedConsent = false;
  for (let attempt = 0; attempt < 3 && !reachedConsent; attempt += 1) {
    await page.getByLabel("Full name").fill(`R5 ${role}`);
    await page.getByLabel("Email").fill(`r5.${role}.${stamp}@example.com`);
    await page.getByLabel("Role").selectOption(role);
    await page.getByLabel("Country pack").selectOption("GH");
    await submit.click();
    reachedConsent = await page
      .getByRole("heading", { name: "Review access before the workspace opens" })
      .waitFor({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (!reachedConsent) {
      await gotoPath(page, "/signin");
    }
  }
  if (!reachedConsent) {
    throw new Error("Sign-in did not reach consent review");
  }
  await page.locator("input[name='accepted']").check();
  await page.getByRole("button", { name: "Grant consent" }).click();
  await page.waitForURL(/\/app\/.+$/, { timeout: 30_000 });
}

async function runProject(project) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(project.use);
  const page = await context.newPage();
  const stamp = `${project.name}-${Date.now()}`;

  await captureRoute(page, project.name, 1, "home", "/", "Run marketplace, operations, finance, and field decisions from one trusted workspace.");
  await captureRoute(page, project.name, 2, "signin", "/signin", "Open the right workspace with trust checks visible from the first screen.");
  await gotoPath(page, "/signin");
  await page.getByLabel("Full name").fill(`R5 farmer ${stamp}`);
  await page.getByLabel("Email").fill(`r5.farmer.${stamp}@example.com`);
  await page.getByLabel("Role").selectOption("farmer");
  await page.getByLabel("Country pack").selectOption("GH");
  await page.getByRole("button", { name: "Continue to onboarding" }).click();
  await captureRoute(page, project.name, 3, "consent", "/onboarding/consent", "Review access before the workspace opens");
  await page.locator("input[name='accepted']").check();
  await page.getByRole("button", { name: "Grant consent" }).click();
  await captureRoute(page, project.name, 4, "role-home", "/app/farmer", "Finish setup, publish produce, and keep every field action recoverable.");

  const seller = await createAuthenticatedSession({
    displayName: "R5 Seller",
    email: `r5.seller.${stamp}@example.com`,
    role: "farmer",
    scopeIds: ["identity.core", "workflow.audit", "traceability.runtime"],
  });
  const buyer = await createAuthenticatedSession({
    displayName: "R5 Buyer",
    email: `r5.buyer.${stamp}@example.com`,
    role: "buyer",
    scopeIds: ["identity.core", "workflow.audit", "notifications.delivery"],
  });

  await primeSession(page, seller);
  await captureRoute(page, project.name, 5, "market-listings", "/app/market/listings", "Create, revise, and publish inventory with clear market status");
  const listing = await createListingViaUi(page, stamp);
  await captureRoute(page, project.name, 6, "market-listing-detail", listing.href, `R5 listing ${stamp}`);
  await publishListing(seller, listing.listingId);

  await requestNegotiationCommand(buyer, "market.negotiations.create", listing.listingId, {
    listing_id: listing.listingId,
    offer_amount: 405,
    offer_currency: "GHS",
    note: "R5 buyer offer",
  });
  const threads = await apiJson(`${apiBaseUrl}/api/v1/marketplace/negotiations`, {
    headers: {
      Authorization: `Bearer ${buyer.accessToken}`,
    },
  });
  const threadId = threads.items.find((item) => item.listing_id === listing.listingId)?.thread_id;
  if (!threadId) {
    throw new Error("negotiation thread id missing");
  }
  await requestNegotiationCommand(seller, "market.negotiations.confirm.request", threadId, {
    thread_id: threadId,
    required_confirmer_actor_id: buyer.session.actor.actor_id,
    note: "Seller requests final confirmation.",
  });
  await requestNegotiationCommand(buyer, "market.negotiations.confirm.approve", threadId, {
    thread_id: threadId,
    note: "Buyer approves accepted thread.",
  });

  await primeSession(page, buyer);
  await captureRoute(page, project.name, 7, "negotiation", `/app/market/negotiations?listingId=${listing.listingId}&threadId=${threadId}`, "Track every live negotiation in one place");
  await gotoPath(page, "/app/payments/wallet");
  const startEscrow = page.getByRole("button", { name: "Start escrow" }).first();
  if (await startEscrow.isVisible().catch(() => false)) {
    await startEscrow.click();
    const pending = page.getByRole("button", { name: "Mark as partner pending" }).first();
    await pending.waitFor({ timeout: 30_000 });
    await pending.click();
  }
  const walletA11y = await assertA11ySmoke(page, "/app/payments/wallet");
  const walletFile = `${project.name}-08-wallet.png`;
  await page.screenshot({ path: path.join(screenshotDir, walletFile), fullPage: true });
  results.push({ project: project.name, route: "/app/payments/wallet", screenshot: `screenshots/${walletFile}`, a11y: walletA11y });
  await captureRoute(page, project.name, 9, "notifications", "/app/notifications", "Important updates across your workflow");

  const consignmentId = await createConsignmentTimeline(seller);
  await primeSession(page, seller);
  await captureRoute(page, project.name, 10, "traceability", `/app/traceability/${consignmentId}`, "Ordered event chain");

  await signInAndGrantConsent(page, stamp, "cooperative");
  await captureRoute(page, project.name, 11, "dispatch", "/app/cooperative/dispatch", "Member dispatch board");
  await signInAndGrantConsent(page, stamp, "advisor");
  await captureRoute(page, project.name, 12, "advisory", "/app/advisor/requests", "Review evidence-backed recommendations");
  await captureRoute(page, project.name, 13, "climate", "/app/climate/alerts", "Monitor weather risk and field evidence with confidence in view");

  const finance = await createAuthenticatedSession({
    displayName: "R5 Finance",
    email: `r5.finance.${stamp}@example.com`,
    role: "finance",
    scopeIds: ["identity.core", "workflow.audit", "regulated.finance"],
  });
  await primeSession(page, finance);
  await captureRoute(page, project.name, 14, "finance", "/app/finance/queue", "Review partner-owned decisions without hidden approval paths");

  const admin = await createAuthenticatedSession({
    displayName: "R5 Admin",
    email: `r5.admin.${stamp}@example.com`,
    role: "admin",
    scopeIds: ["identity.core", "workflow.audit", "admin.observability", "admin.rollout"],
  });
  await primeSession(page, admin);
  await captureRoute(page, project.name, 15, "admin", "/app/admin/analytics", "Platform health and release posture");

  await browser.close();
}

for (const project of projects) {
  await runProject(project);
}

fs.writeFileSync(path.join(artifactDir, "results.json"), JSON.stringify({ generated_at: new Date().toISOString(), items: results }, null, 2));
fs.writeFileSync(path.join(artifactDir, "a11y-checks.json"), JSON.stringify(results.map(({ project, route, a11y }) => ({ project, route, a11y })), null, 2));

console.log(JSON.stringify({ ok: true, results: results.length }, null, 2));
