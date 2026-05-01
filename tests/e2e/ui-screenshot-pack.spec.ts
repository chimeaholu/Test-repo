import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { gotoPath } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const OUTPUT_ROOT = path.join(
  process.cwd(),
  "output_to_user",
  "agrodomain-ui-screenshot-pack-2026-04-30",
);
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const DEMO_OPERATOR_EMAIL = "operator@agrodomain-demo.invalid";
const DEMO_OPERATOR_PASSWORD = "DemoAccess2026!";
const DEMO_FARMER_EMAIL = "kwame.gh@agrodomain-demo.invalid";
const DEMO_BUYER_EMAIL = "ama.gh@agrodomain-demo.invalid";
const DEMO_TRANSPORTER_EMAIL = "kofi.gh@agrodomain-demo.invalid";
const DEMO_EXTENSION_AGENT_EMAIL = "fatima.ng@agrodomain-demo.invalid";
const UPLOAD_ASSET = "/ductor/agents/engineering/workspace/playwright-desktop.png";

type AppRole =
  | "farmer"
  | "buyer"
  | "cooperative"
  | "transporter"
  | "extension_agent";

type SessionSeed = {
  accessToken: string;
  session: {
    actor: {
      actor_id: string;
      country_code: string;
      display_name: string;
      email: string;
      role: string;
    };
    consent?: {
      state?: string;
    };
  };
};

type WorkflowCommandInput = {
  actorId: string;
  aggregateRef: string;
  commandName: string;
  countryCode: string;
  journeyIds: string[];
  mutationScope: string;
  payload: Record<string, unknown>;
  token: string;
};

type CaptureEntry = {
  category: string;
  description: string;
  filename: string;
  path: string;
  route: string;
  viewport: "desktop" | "mobile";
};

type OptionalBlock = {
  reason: string;
  surface: string;
};

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function outputDirFor(testInfo: TestInfo): string {
  const viewport = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
  const dir = path.join(OUTPUT_ROOT, viewport);
  ensureDir(dir);
  return dir;
}

function manifestPathFor(testInfo: TestInfo): string {
  const viewport = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
  ensureDir(OUTPUT_ROOT);
  return path.join(OUTPUT_ROOT, `${viewport}-manifest.json`);
}

async function writeManifest(
  testInfo: TestInfo,
  captures: CaptureEntry[],
  blocked: OptionalBlock[],
): Promise<void> {
  fs.writeFileSync(
    manifestPathFor(testInfo),
    JSON.stringify(
      {
        blocked,
        captures,
        generated_at: new Date().toISOString(),
        project: testInfo.project.name,
      },
      null,
      2,
    ),
  );
}

async function capture(
  page: Page,
  testInfo: TestInfo,
  captures: CaptureEntry[],
  input: {
    category: string;
    description: string;
    filename: string;
    fullPage?: boolean;
    route?: string;
  },
): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.waitForTimeout(500);
  const target = path.join(outputDirFor(testInfo), input.filename);
  await page.screenshot({
    fullPage: input.fullPage ?? false,
    path: target,
  });
  captures.push({
    category: input.category,
    description: input.description,
    filename: input.filename,
    path: target,
    route: input.route ?? new URL(page.url()).pathname,
    viewport: testInfo.project.name.includes("mobile") ? "mobile" : "desktop",
  });
}

async function createIdentifiedSession(
  request: APIRequestContext,
  input: {
    countryCode?: "GH" | "NG" | "JM";
    displayName: string;
    email: string;
    role: AppRole;
  },
): Promise<SessionSeed> {
  const requestResponse = await request.post(`${API_BASE_URL}/api/v1/identity/login/magic-link/request`, {
    data: {
      country_code: input.countryCode ?? "GH",
      delivery_channel: "email",
      identifier: input.email,
      role: input.role,
    },
  });
  if (!requestResponse.ok()) {
    const payload = await requestResponse.text().catch(() => "");
    throw new Error(`magic-link request failed (${requestResponse.status()}): ${payload}`);
  }
  const requestPayload = (await requestResponse.json()) as {
    challenge_id: string;
    preview_code?: string;
  };
  if (!requestPayload.preview_code) {
    throw new Error("magic-link preview code was not returned in seeded runtime");
  }

  const response = await request.post(`${API_BASE_URL}/api/v1/identity/login/magic-link/verify`, {
    data: {
      challenge_id: requestPayload.challenge_id,
      verification_code: requestPayload.preview_code,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    access_token: string;
    session: SessionSeed["session"];
  };
  return {
    accessToken: payload.access_token,
    session: payload.session,
  };
}

async function createAuthenticatedSession(
  request: APIRequestContext,
  input: {
    countryCode?: "GH" | "NG" | "JM";
    displayName: string;
    email: string;
    role: AppRole;
    scopeIds?: string[];
  },
): Promise<SessionSeed> {
  const identified = await createIdentifiedSession(request, input);
  if (identified.session.consent?.state === "consent_granted") {
    return identified;
  }
  const requestId = crypto.randomUUID();
  const response = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
    data: {
      captured_at: new Date().toISOString(),
      policy_version: "2026.04.w1",
      scope_ids: input.scopeIds ?? ["identity.core", "workflow.audit"],
    },
    headers: {
      Authorization: `Bearer ${identified.accessToken}`,
      "X-Correlation-ID": requestId,
      "X-Request-ID": requestId,
    },
  });
  expect(response.ok()).toBeTruthy();
  return {
    accessToken: identified.accessToken,
    session: (await response.json()) as SessionSeed["session"],
  };
}

async function createPasswordSession(
  request: APIRequestContext,
  input: {
    countryCode?: "GH" | "NG" | "JM";
    email: string;
    password: string;
    role: "admin";
  },
): Promise<SessionSeed> {
  const response = await request.post(`${API_BASE_URL}/api/v1/identity/login/password`, {
    data: {
      country_code: input.countryCode ?? "GH",
      identifier: input.email,
      password: input.password,
      role: input.role,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    access_token: string;
    session: SessionSeed["session"];
  };
  return {
    accessToken: payload.access_token,
    session: payload.session,
  };
}

async function switchDemoPersona(
  request: APIRequestContext,
  operator: SessionSeed,
  input: {
    actorId: string;
    targetRole: AppRole;
  },
): Promise<SessionSeed> {
  const response = await request.post(`${API_BASE_URL}/api/v1/identity/session/demo/switch`, {
    data: {
      target_actor_id: input.actorId,
      target_role: input.targetRole,
    },
    headers: {
      Authorization: `Bearer ${operator.accessToken}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    access_token: string;
    session: SessionSeed["session"];
  };
  return {
    accessToken: payload.access_token,
    session: payload.session,
  };
}

async function readSessionSeedFromPage(page: Page): Promise<SessionSeed> {
  const payload = await page.evaluate(
    ([sessionKey, tokenKey]) => {
      const token = window.localStorage.getItem(tokenKey);
      const sessionRaw = window.localStorage.getItem(sessionKey);
      return {
        session: sessionRaw ? JSON.parse(sessionRaw) : null,
        token,
      };
    },
    [SESSION_KEY, TOKEN_KEY],
  );
  if (!payload.token || !payload.session) {
    throw new Error("browser session seed was not available after demo operator sign-in");
  }
  return {
    accessToken: payload.token,
    session: payload.session as SessionSeed["session"],
  };
}

async function switchDemoPersonaInPage(
  page: Page,
  operator: SessionSeed,
  input: {
    actorId: string;
    targetRole: AppRole;
  },
): Promise<SessionSeed> {
  await activateSession(page, operator, "/app/admin/demo-operator");
  const payload = await page.evaluate(
    async ([apiBaseUrl, sessionKey, tokenKey, actorId, targetRole]) => {
      const token = window.localStorage.getItem(tokenKey);
      const response = await fetch(`${apiBaseUrl}/api/v1/identity/session/demo/switch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_actor_id: actorId,
          target_role: targetRole,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(JSON.stringify({ data, status: response.status }));
      }
      window.localStorage.setItem(tokenKey, data.access_token);
      window.localStorage.setItem(sessionKey, JSON.stringify(data.session));
      document.cookie = "agrodomain-session=1;path=/;samesite=lax";
      window.dispatchEvent(new CustomEvent("agrodomain:auth-state-changed"));
      return {
        accessToken: data.access_token as string,
        session: data.session as SessionSeed["session"],
      };
    },
    [API_BASE_URL, SESSION_KEY, TOKEN_KEY, input.actorId, input.targetRole],
  );
  return payload;
}

function masqueradeSession(seed: SessionSeed, role: "cooperative"): SessionSeed {
  return {
    accessToken: seed.accessToken,
    session: {
      ...seed.session,
      actor: {
        ...seed.session.actor,
        display_name: "Demo Cooperative Desk",
        role,
      },
    },
  };
}

async function activateSession(page: Page, seed: SessionSeed, route: string): Promise<void> {
  await gotoPath(page, "/signin");
  await page.evaluate(
    ([sessionKey, tokenKey, session, token]) => {
      window.localStorage.setItem(sessionKey, JSON.stringify(session));
      window.localStorage.setItem(tokenKey, token);
      document.cookie = "agrodomain-session=1;path=/;samesite=lax";
      window.dispatchEvent(new CustomEvent("agrodomain:auth-state-changed"));
    },
    [SESSION_KEY, TOKEN_KEY, seed.session, seed.accessToken],
  );
  await gotoPath(page, route);
  await page.waitForLoadState("networkidle").catch(() => {});
  await waitForWorkspaceReady(page);
  await waitForMainContent(page);
}

async function waitForWorkspaceReady(page: Page): Promise<void> {
  await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function waitForMainContent(page: Page): Promise<void> {
  await page.locator("main").waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(250);
}

async function sendWorkflowCommand(
  request: APIRequestContext,
  input: WorkflowCommandInput,
): Promise<Record<string, unknown>> {
  const requestId = `req-${crypto.randomUUID()}`;
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
          data_check_ids: ["DI-003"],
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
  if (!response.ok()) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `${input.commandName} failed (${response.status()}) for ${input.aggregateRef}: ${body}`,
    );
  }
  return (await response.json()) as Record<string, unknown>;
}

async function createPublishedListing(
  request: APIRequestContext,
  seller: SessionSeed,
  runId: string,
): Promise<{ listingId: string; title: string }> {
  const title = `Curated cassava lot ${runId}`;
  const createResponse = await sendWorkflowCommand(request, {
    actorId: seller.session.actor.actor_id,
    aggregateRef: "listing",
    commandName: "market.listings.create",
    countryCode: seller.session.actor.country_code,
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: {
      title,
      commodity: "Cassava",
      quantity_tons: 5.6,
      price_amount: 390,
      price_currency: "GHS",
      location: "Tamale, GH",
      summary: "Representative marketplace listing for the screenshot pack.",
    },
    token: seller.accessToken,
  });
  const listingId = (
    createResponse.result as {
      listing: {
        listing_id: string;
      };
    }
  ).listing.listing_id;

  await sendWorkflowCommand(request, {
    actorId: seller.session.actor.actor_id,
    aggregateRef: listingId,
    commandName: "market.listings.publish",
    countryCode: seller.session.actor.country_code,
    journeyIds: ["CJ-002"],
    mutationScope: "marketplace.listings",
    payload: {
      listing_id: listingId,
    },
    token: seller.accessToken,
  });

  return { listingId, title };
}

async function createAcceptedThread(
  request: APIRequestContext,
  seller: SessionSeed,
  buyer: SessionSeed,
  input: {
    listingId: string;
    runId: string;
  },
): Promise<string> {
  const createResponse = await sendWorkflowCommand(request, {
    actorId: buyer.session.actor.actor_id,
    aggregateRef: input.listingId,
    commandName: "market.negotiations.create",
    countryCode: buyer.session.actor.country_code,
    journeyIds: ["CJ-003"],
    mutationScope: "marketplace.negotiations",
    payload: {
      listing_id: input.listingId,
      note: "Opening offer for curated screenshot coverage.",
      offer_amount: 370,
      offer_currency: "GHS",
    },
    token: buyer.accessToken,
  });
  const threadId = (
    createResponse.result as {
      thread: {
        thread_id: string;
      };
    }
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

  return threadId;
}

async function createFundedEscrow(
  request: APIRequestContext,
  seller: SessionSeed,
  buyer: SessionSeed,
  input: {
    listingId: string;
    runId: string;
    threadId: string;
  },
): Promise<string> {
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
      reference_id: `dep-screenshots-${input.runId}`,
      note: "Wallet top-up for screenshot pack.",
      reconciliation_marker: `rcn-screenshots-${input.runId}`,
    },
    token: buyer.accessToken,
  });

  const initiateResponse = await sendWorkflowCommand(request, {
    actorId: buyer.session.actor.actor_id,
    aggregateRef: input.threadId,
    commandName: "wallets.escrows.initiate",
    countryCode: buyer.session.actor.country_code,
    journeyIds: ["CJ-004"],
    mutationScope: "wallet.escrow",
    payload: {
      note: "Reserve funds for the accepted screenshot-pack deal.",
      thread_id: input.threadId,
    },
    token: buyer.accessToken,
  });
  const escrowId = (
    initiateResponse.result as {
      escrow: {
        escrow_id: string;
      };
    }
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
      note: "Funds are secured for the screenshot pack.",
      partner_outcome: "funded",
    },
    token: buyer.accessToken,
  });

  return escrowId;
}

async function listBuyerEntities(token: string): Promise<Array<{ entity_id: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/v1/agro-intelligence/buyers`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok).toBeTruthy();
  const payload = (await response.json()) as {
    items: Array<{ entity_id: string }>;
  };
  return payload.items;
}

async function listEntities(token: string): Promise<Array<{ entity_id: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/v1/agro-intelligence/entities`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok).toBeTruthy();
  const payload = (await response.json()) as {
    items: Array<{ entity_id: string }>;
  };
  return payload.items;
}

async function runAgroIntelligenceResolution(operatorToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/agro-intelligence/workspace/resolution-run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${operatorToken}`,
    },
  });
  expect(response.ok).toBeTruthy();
}

async function getFirstBuyerEntityId(input: {
  operatorToken: string;
  viewerToken: string;
}): Promise<string | null> {
  let items = await listBuyerEntities(input.viewerToken);
  if (items.length === 0) {
    await runAgroIntelligenceResolution(input.operatorToken);
    items = await listBuyerEntities(input.viewerToken);
  }
  if (items.length === 0) {
    items = await listEntities(input.viewerToken);
  }
  return items[0]?.entity_id ?? null;
}

async function signInDemoOperator(page: Page): Promise<SessionSeed> {
  await gotoPath(page, "/signin");
  await page.locator("#passwordCountryCode").selectOption("GH");
  await page.locator("#passwordIdentifier").fill(DEMO_OPERATOR_EMAIL);
  await page.locator("#password").fill(DEMO_OPERATOR_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(onboarding\/consent|app\/admin)(\?.*)?$/, { timeout: 60_000 });
  if (/\/onboarding\/consent(\?.*)?$/.test(page.url())) {
    await page
      .getByRole("checkbox", {
        name: "I understand these permissions and want to continue into my workspace.",
      })
      .check();
    await page.getByRole("button", { name: /Accept and continue|Grant consent/i }).click();
    await page.waitForURL(/\/app\/.+$/, { timeout: 90_000 });
  }
  return readSessionSeedFromPage(page);
}

async function createDemoPersonaSession(
  page: Page,
  _request: APIRequestContext,
  input: {
    actorId: string;
    targetRole: AppRole;
  },
): Promise<SessionSeed> {
  const operator = await signInDemoOperator(page);
  return switchDemoPersonaInPage(page, operator, input);
}

async function gotoSignupReady(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await gotoPath(page, "/signup");
    await waitForMainContent(page);
    if (/\/signup(\?.*)?$/.test(page.url())) {
      return;
    }
  }
  throw new Error("signup screen did not settle on the expected route");
}

async function fillLoadForm(page: Page, runId: string): Promise<void> {
  const pickupDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const deliveryDeadline = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Pickup location").fill("Tamale, Northern Region");
  await page.getByLabel("Destination").fill("Accra, Greater Accra");
  await page.getByLabel("Commodity").fill("White maize");
  await page.getByLabel("Weight (tonnes)").fill("6");
  await page.getByLabel("Number of items").fill("54");
  await page.getByLabel("Preferred date").fill(pickupDate);
  await page.getByLabel("Delivery deadline").fill(deliveryDeadline);
  await page.getByLabel("Budget").fill("2400");
  await page.getByLabel("Special instructions").fill(
    `Keep dry and confirm receiver by phone before arrival. ${runId}`,
  );
}

async function drawSignature(page: Page): Promise<void> {
  const canvas = page.locator("canvas.trucker-signature-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  await page.mouse.move(box.x + 24, box.y + 42);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 78, { steps: 12 });
  await page.mouse.move(box.x + 220, box.y + 54, { steps: 12 });
  await page.mouse.up();
}

test.describe("Agrodomain UI screenshot pack", () => {
  test.setTimeout(900_000);

  test("captures the desktop screenshot pack", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-critical");

    const captures: CaptureEntry[] = [];
    const blocked: OptionalBlock[] = [];
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;

    await gotoPath(page, "/signin");
    await expect(page.getByRole("heading", { name: "Sign in to your Agrodomain account" })).toBeVisible();
    await capture(page, testInfo, captures, {
      category: "public-auth",
      description: "Public sign-in screen with password and verification-code entry paths.",
      filename: "01-public-signin.png",
    });

    await gotoSignupReady(page);
    await capture(page, testInfo, captures, {
      category: "public-auth",
      description: "Public multi-step sign-up flow on the identity step.",
      filename: "02-public-signup.png",
    });

    const demoOperator = await signInDemoOperator(page);
    const farmer = await createDemoPersonaSession(page, request, {
      actorId: "demo:gh:farmer:kwame",
      targetRole: "farmer",
    });
    const identifiedFarmer: SessionSeed = {
      accessToken: farmer.accessToken,
      session: {
        ...farmer.session,
        consent: {
          ...farmer.session.consent,
          state: "identified",
        },
      },
    };
    await activateSession(page, identifiedFarmer, "/onboarding/consent");
    await expect(
      page.getByRole("heading", {
        name: "Review the permissions that keep your workspace working",
      }),
    ).toBeVisible();
    await capture(page, testInfo, captures, {
      category: "public-auth",
      description: "Consent and onboarding review before protected access opens.",
      filename: "03-onboarding-consent.png",
    });

    const buyer = await createDemoPersonaSession(page, request, {
      actorId: "demo:gh:buyer:ama",
      targetRole: "buyer",
    });
    const transporter = await createDemoPersonaSession(page, request, {
      actorId: "demo:gh:transporter:kofi",
      targetRole: "transporter",
    });
    const extensionAgent = await createDemoPersonaSession(page, request, {
      actorId: "demo:ng:extension:fatima",
      targetRole: "extension_agent",
    });
    const cooperative = masqueradeSession(demoOperator, "cooperative");

    const publishedListing = await createPublishedListing(request, farmer, runId);
    const threadId = await createAcceptedThread(request, farmer, buyer, {
      listingId: publishedListing.listingId,
      runId,
    });
    blocked.push({
      surface: "wallet-funded-escrow-state",
      reason:
        "Runtime-backed wallet funding is blocked in the seeded demo environment by a duplicate wallet-account insert on wallets.fund. The wallet and escrow UI is still captured from the current customer-facing state.",
    });

    await activateSession(page, farmer, "/app/farmer");
    await capture(page, testInfo, captures, {
      category: "role-surface",
      description: "Farmer dashboard with current field, marketplace, and wallet activity.",
      filename: "04-role-farmer-dashboard.png",
    });

    await activateSession(page, buyer, "/app/buyer");
    await capture(page, testInfo, captures, {
      category: "role-surface",
      description: "Buyer dashboard summarizing listings, negotiations, and wallet readiness.",
      filename: "05-role-buyer-dashboard.png",
    });

    await activateSession(page, cooperative, "/app/cooperative");
    await capture(page, testInfo, captures, {
      category: "role-surface",
      description: "Cooperative dashboard with member, dispatch, listing, and wallet summaries.",
      filename: "06-role-cooperative-dashboard.png",
    });

    await activateSession(page, transporter, "/app/transporter");
    await capture(page, testInfo, captures, {
      category: "role-surface",
      description: "Transporter dashboard with active shipments, available loads, and completed delivery value.",
      filename: "07-role-transporter-dashboard.png",
    });

    await activateSession(page, extensionAgent, "/app/advisor/requests");
    await capture(page, testInfo, captures, {
      category: "role-surface",
      description: "Extension-agent advisory workspace showing recommendation review, citations, and confidence posture.",
      filename: "08-role-extension-agent-advisory.png",
    });

    await activateSession(page, demoOperator, "/app/admin/analytics");
    await capture(page, testInfo, captures, {
      category: "role-surface",
      description: "Internal analytics workspace showing health overview, readiness, alerts, and trend review.",
      filename: "09-role-admin-analytics.png",
    });

    await activateSession(page, buyer, "/app/market/listings");
    await capture(page, testInfo, captures, {
      category: "marketplace",
      description: "Marketplace listings feed with buyer discovery cards and trust cues.",
      filename: "10-marketplace-listings.png",
    });

    await gotoPath(page, `/app/market/listings/${publishedListing.listingId}`);
    await waitForMainContent(page);
    await capture(page, testInfo, captures, {
      category: "marketplace",
      description: "Listing detail page for a live buyer-safe lot.",
      filename: "11-marketplace-listing-detail.png",
    });

    await gotoPath(page, `/app/market/negotiations/${threadId}`);
    await waitForMainContent(page);
    await capture(page, testInfo, captures, {
      category: "marketplace",
      description: "Negotiation detail view showing an accepted thread and trade trust workflow.",
      filename: "12-marketplace-negotiation-thread.png",
    });

    await activateSession(page, farmer, "/app/payments/wallet");
    await capture(page, testInfo, captures, {
      category: "marketplace",
      description: "Wallet and escrow workspace showing the current settlement timeline and delivery evidence surface.",
      filename: "13-wallet-escrow-dashboard.png",
    });

    await activateSession(page, buyer, "/app/advisory/new");
    await capture(page, testInfo, captures, {
      category: "agroguide",
      description: "AgroGuide copilot workspace with advisory history, context suggestions, and live recommendations.",
      filename: "14-agroguide-copilot.png",
    });

    await activateSession(page, buyer, "/app/agro-intelligence");
    await capture(page, testInfo, captures, {
      category: "agro-intelligence",
      description: "AgroIntelligence overview showing verified-partner discovery entry points.",
      filename: "15-agrointelligence-overview.png",
    });

    await gotoPath(page, "/app/agro-intelligence/buyers");
    await waitForMainContent(page);
    await capture(page, testInfo, captures, {
      category: "agro-intelligence",
      description: "Buyer sourcing directory with filters, match counts, and shortlist controls.",
      filename: "16-agrointelligence-buyers-directory.png",
    });

    const entityId = await getFirstBuyerEntityId({
      operatorToken: demoOperator.accessToken,
      viewerToken: buyer.accessToken,
    });
    if (entityId) {
      await gotoPath(page, `/app/agro-intelligence/buyers/${entityId}`);
      await waitForMainContent(page);
      await capture(page, testInfo, captures, {
        category: "agro-intelligence",
        description: "Buyer/entity detail profile with trust dossier, evidence, and relationship summary.",
        filename: "17-agrointelligence-buyer-detail.png",
      });
    } else {
      blocked.push({
        surface: "agrointelligence-buyer-detail",
        reason:
          "AgroIntelligence buyer/entity detail could not be captured because the fresh seeded runtime returned no buyer or entity records, even after an operator resolution run.",
      });
    }

    await activateSession(page, demoOperator, "/app/agro-intelligence/workspace");
    await capture(page, testInfo, captures, {
      category: "agro-intelligence",
      description: "Operator verification workspace for queue review and decision actions.",
      filename: "18-agrointelligence-workspace.png",
    });

    await activateSession(page, buyer, "/app/agro-intelligence/graph");
    await capture(page, testInfo, captures, {
      category: "agro-intelligence",
      description: "AgroIntelligence network view with featured graph entry points.",
      filename: "19-agrointelligence-network-view.png",
    });

    const truckerShipper = farmer;
    await activateSession(page, truckerShipper, "/app/trucker");
    await capture(page, testInfo, captures, {
      category: "agrotrucker",
      description: "Desktop AgroTrucker marketplace showing shipper-side logistics workspace.",
      filename: "20-agrotrucker-marketplace.png",
    });

    await gotoPath(page, "/app/trucker/loads/new");
    await waitForMainContent(page);
    await fillLoadForm(page, runId);
    await page.getByRole("button", { name: "Review load" }).click();
    await waitForMainContent(page);
    await page.getByRole("button", { name: "Post load", exact: true }).click();
    await page.waitForURL(/\/app\/trucker\/shipments\/[^/]+$/, { timeout: 30_000 });

    await activateSession(page, cooperative, "/app/cooperative/dispatch");
    await capture(page, testInfo, captures, {
      category: "agrotrucker",
      description: "Cooperative dispatch board with live load matching and assignment controls.",
      filename: "21-agrotrucker-dispatch-board.png",
    });

    await activateSession(page, demoOperator, "/app/admin/demo-operator");
    await capture(page, testInfo, captures, {
      category: "demo-operator",
      description: "Internal demo controls workspace for guided preview journeys, sample personas, and boundary rules.",
      filename: "22-demo-operator-workspace.png",
    });

    await writeManifest(testInfo, captures, blocked);
  });

  test("captures the mobile AgroTrucker pack", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-critical");

    const captures: CaptureEntry[] = [];
    const blocked: OptionalBlock[] = [];
    const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;

    const demoOperator = await signInDemoOperator(page);
    const shipper = await createDemoPersonaSession(page, request, {
      actorId: "demo:gh:farmer:kwame",
      targetRole: "farmer",
    });
    const driver = await createDemoPersonaSession(page, request, {
      actorId: "demo:gh:transporter:kofi",
      targetRole: "transporter",
    });

    await activateSession(page, shipper, "/app/trucker");
    await capture(page, testInfo, captures, {
      category: "agrotrucker-mobile",
      description: "Mobile AgroTrucker shipper workspace.",
      filename: "M01-mobile-agrotrucker-marketplace.png",
      fullPage: true,
    });

    await gotoPath(page, "/app/trucker/loads/new");
    await waitForMainContent(page);
    await fillLoadForm(page, runId);
    await page.getByRole("button", { name: "Review load" }).click();
    await page.getByRole("button", { name: "Post load", exact: true }).click();
    await page.waitForURL(/\/app\/trucker\/shipments\/[^/]+$/, { timeout: 30_000 });

    await activateSession(page, driver, "/app/trucker");
    await page.getByRole("tab", { name: "I'm a Driver" }).click();
    await waitForMainContent(page);
    await capture(page, testInfo, captures, {
      category: "agrotrucker-mobile",
      description: "Mobile driver board showing available loads ready for acceptance.",
      filename: "M02-mobile-driver-board.png",
      fullPage: true,
    });

    await page.getByRole("button", { name: "Accept" }).first().click();
    await page.getByRole("button", { name: "Confirm load" }).click();
    const acceptedShipmentCard = page
      .locator("article.trucker-shipment-card")
      .filter({ hasText: "White maize" })
      .filter({ hasText: "Accra, Greater Accra" })
      .first();
    const acceptedShipmentTrackLink = acceptedShipmentCard.getByRole("link", { name: "Track" });
    const acceptedShipmentReady = await acceptedShipmentTrackLink
      .isVisible({ timeout: 30_000 })
      .catch(() => false);

    if (!acceptedShipmentReady) {
      blocked.push({
        surface: "mobile-shipment-sla-issue",
        reason:
          "The accepted mobile AgroTrucker shipment did not appear in the driver delivery queue for the freshly posted Tamale-to-Accra white-maize load, so the tracking/SLA capture could not be produced from the current seeded runtime.",
      });
      blocked.push({
        surface: "mobile-shipment-pod-complete",
        reason:
          "The accepted mobile AgroTrucker shipment did not appear in the driver delivery queue for the freshly posted Tamale-to-Accra white-maize load, so the POD completion capture could not be produced from the current seeded runtime.",
      });
      await writeManifest(testInfo, captures, blocked);
      return;
    }

    await acceptedShipmentTrackLink.click();
    await page.waitForURL(/\/app\/trucker\/shipments\/[^/]+$/, { timeout: 30_000 });
    await waitForMainContent(page);

    const trackingMissingAlert = await page
      .getByRole("alert")
      .filter({ hasText: "transport_load_not_found" })
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    const milestoneAction = page
      .getByRole("button", { name: /Mark picked up|Mark in transit|Record corridor checkpoint/ })
      .first();
    const milestoneActionReady = await milestoneAction.isVisible({ timeout: 3_000 }).catch(() => false);

    if (trackingMissingAlert || !milestoneActionReady) {
      blocked.push({
        surface: "mobile-shipment-sla-issue",
        reason:
          "The accepted mobile AgroTrucker shipment route resolved without live milestone controls in the fresh seeded runtime, returning a missing-load state instead of the trackable SLA surface.",
      });
      blocked.push({
        surface: "mobile-shipment-pod-complete",
        reason:
          "The accepted mobile AgroTrucker shipment route resolved without live milestone controls in the fresh seeded runtime, so the POD completion surface could not be reached from a representative tracking state.",
      });
      await writeManifest(testInfo, captures, blocked);
      return;
    }

    await milestoneAction.click();
    await page.getByRole("button", { name: "Report issue" }).click();
    const issueDialog = page.getByRole("dialog", { name: "Report issue" });
    await issueDialog.locator("select").nth(0).selectOption("breakdown");
    await issueDialog.locator("select").nth(1).selectOption("high");
    await page.getByPlaceholder("Delay minutes (optional)").fill("95");
    await page.getByPlaceholder("Describe the issue, checkpoint, and next mitigation step.").fill(
      "Engine issue after the checkpoint. Backup vehicle dispatched.",
    );
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Save issue" }).click();
    await waitForMainContent(page);
    await capture(page, testInfo, captures, {
      category: "agrotrucker-mobile",
      description: "Mobile shipment tracking with SLA pressure and exception reporting visible.",
      filename: "M03-mobile-shipment-sla-issue.png",
      fullPage: true,
    });

    await page.locator("input[type='file']").setInputFiles(UPLOAD_ASSET);
    await page.getByPlaceholder("Recipient name").fill("Abena Receiver");
    await drawSignature(page);
    await page.getByRole("button", { name: "Complete delivery" }).click();
    await waitForMainContent(page);
    await capture(page, testInfo, captures, {
      category: "agrotrucker-mobile",
      description: "Mobile POD completion state after delivery, photo upload, and signature capture.",
      filename: "M04-mobile-shipment-pod-complete.png",
      fullPage: true,
    });

    await writeManifest(testInfo, captures, blocked);
  });
});
