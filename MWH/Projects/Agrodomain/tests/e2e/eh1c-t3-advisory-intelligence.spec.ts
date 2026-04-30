import fs from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";

import type { SessionSeed } from "./helpers";
import { gotoPath } from "./helpers";

const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const DEMO_OPERATOR_EMAIL = "operator@agrodomain-demo.invalid";
const DEMO_OPERATOR_PASSWORD = "DemoAccess2026!";

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
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

async function seedSession(page: Page, sessionSeed: SessionSeed) {
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
}

async function activateSession(page: Page, seed: SessionSeed, route: string): Promise<void> {
  await seedSession(page, seed);
  await gotoPath(page, route);
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function grantConsentByToken(
  request: APIRequestContext,
  accessToken: string,
): Promise<SessionSeed["session"]> {
  const response = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
    data: {
      captured_at: new Date().toISOString(),
      policy_version: "2026.04.eh1c-t3",
      scope_ids: ["identity.core", "workflow.audit", "notifications.delivery"],
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), `consent grant failed: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as SessionSeed["session"];
}

async function loginDemoOperator(request: APIRequestContext): Promise<SessionSeed> {
  const response = await request.post(`${API_BASE_URL}/api/v1/identity/login/password`, {
    data: {
      identifier: DEMO_OPERATOR_EMAIL,
      password: DEMO_OPERATOR_PASSWORD,
      country_code: "GH",
      role: "admin",
    },
  });
  expect(response.ok(), `demo operator login failed: ${await response.text()}`).toBeTruthy();
  const payload = (await response.json()) as {
    access_token: string;
    session: SessionSeed["session"];
  };

  if (payload.session.consent?.state === "consent_granted") {
    return {
      accessToken: payload.access_token,
      session: payload.session,
    };
  }

  return {
    accessToken: payload.access_token,
    session: await grantConsentByToken(request, payload.access_token),
  };
}

async function switchDemoPersona(
  request: APIRequestContext,
  operator: SessionSeed,
  input: {
    actorId: string;
    targetRole: "farmer" | "buyer" | "extension_agent";
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
  expect(response.ok(), `demo persona switch failed: ${await response.text()}`).toBeTruthy();
  const payload = (await response.json()) as {
    access_token: string;
    session: SessionSeed["session"];
  };
  return {
    accessToken: payload.access_token,
    session: payload.session,
  };
}

async function listBuyerEntities(
  request: APIRequestContext,
  accessToken: string,
): Promise<Array<{ canonical_name: string; entity_id: string }>> {
  const response = await request.get(`${API_BASE_URL}/api/v1/agro-intelligence/buyers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), `buyer list request failed: ${await response.text()}`).toBeTruthy();
  const payload = (await response.json()) as {
    items: Array<{ canonical_name: string; entity_id: string }>;
  };
  return payload.items;
}

async function listEntities(
  request: APIRequestContext,
  accessToken: string,
): Promise<Array<{ canonical_name: string; entity_id: string }>> {
  const response = await request.get(`${API_BASE_URL}/api/v1/agro-intelligence/entities`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), `entity list request failed: ${await response.text()}`).toBeTruthy();
  const payload = (await response.json()) as {
    items: Array<{ canonical_name: string; entity_id: string }>;
  };
  return payload.items;
}

async function runAgroIntelligenceResolution(
  request: APIRequestContext,
  operatorToken: string,
): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/v1/agro-intelligence/workspace/resolution-run`, {
    headers: {
      Authorization: `Bearer ${operatorToken}`,
    },
  });
  expect(response.ok(), `resolution run failed: ${await response.text()}`).toBeTruthy();
}

async function fetchFirstEntity(
  request: APIRequestContext,
  viewerToken: string,
): Promise<{ canonical_name: string; entity_id: string } | null> {
  let items = await listBuyerEntities(request, viewerToken);
  if (items.length === 0) {
    const operator = await loginDemoOperator(request);
    await runAgroIntelligenceResolution(request, operator.accessToken);
    items = await listBuyerEntities(request, viewerToken);
  }
  if (items.length === 0) {
    items = await listEntities(request, viewerToken);
  }
  return items[0] ?? null;
}

test.describe("EH1C-T3 advisory, climate, and AgroIntelligence route proof", () => {
  test("customer-facing AgroIntelligence routes use the remediated composition", async ({
    page,
    request,
  }, testInfo) => {
    const demoOperator = await loginDemoOperator(request);
    const buyerSeed = await switchDemoPersona(request, demoOperator, {
      actorId: "demo:gh:buyer:ama",
      targetRole: "buyer",
    });
    const firstEntity = await fetchFirstEntity(request, buyerSeed.accessToken);

    await activateSession(page, buyerSeed, "/app/agro-intelligence");
    await expect(
      page.getByRole("heading", { name: "Find stronger commercial matches across the agriculture network" }),
    ).toBeVisible();
    await expect(page.getByText("Short, plain-language trust signals")).toBeVisible();

    await gotoPath(page, "/app/agro-intelligence/buyers");
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "Filter credible buyers and keep the strongest matches close" })
        .last(),
    ).toBeVisible();
    if (firstEntity) {
      await expect(page.getByRole("button", { name: "Save to shortlist" }).first()).toBeVisible();

      await gotoPath(page, `/app/agro-intelligence/buyers/${firstEntity.entity_id}`);
      await expect(page.getByRole("heading", { name: firstEntity.canonical_name }).first()).toBeVisible();
      await expect(page.getByText("Verification and sources").first()).toBeVisible();
    } else {
      await expect(page.getByText("No matching buyers found yet")).toBeVisible();
    }

    await gotoPath(page, "/app/agro-intelligence/graph");
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "Explore the strongest connection points first" })
        .last(),
    ).toBeVisible();

    if (firstEntity) {
      await gotoPath(page, `/app/agro-intelligence/graph/${firstEntity.entity_id}`);
      await expect(page.getByText("Why this record matters").first()).toBeVisible();
      await expect(page.getByText("Profiles worth opening next")).toBeVisible();
    }

    await captureProof(page, testInfo, "eh1c-t3-agrointelligence-customer");
  });

  test("advisory, climate, and operator workspace surfaces stay on the T3 contract", async ({
    page,
    request,
  }, testInfo) => {
    const extensionOperator = await loginDemoOperator(request);
    const extensionAgentSeed = await switchDemoPersona(request, extensionOperator, {
      actorId: "demo:ng:extension:fatima",
      targetRole: "extension_agent",
    });

    await activateSession(page, extensionAgentSeed, "/app/advisor/requests");
    await expect(
      page.getByRole("heading", { name: "Review the next request and send practical guidance" }),
    ).toBeVisible();
    await expect(page.getByText("Open the source details when you need them")).toBeVisible();

    await gotoPath(page, "/app/advisory/new");
    await expect(
      page.getByRole("heading", { name: "Describe the issue and get grounded guidance" }),
    ).toBeVisible();
    await expect(page.getByLabel("Where is this happening?")).toBeVisible();

    const farmerOperator = await loginDemoOperator(request);
    const farmerSeed = await switchDemoPersona(request, farmerOperator, {
      actorId: "demo:gh:farmer:kwame",
      targetRole: "farmer",
    });

    await activateSession(page, farmerSeed, "/app/climate/alerts");
    await expect(page.getByRole("heading", { name: "See what conditions matter most right now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Field confidence note" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark reviewed" }).first()).toBeVisible();

    const workspaceOperator = await loginDemoOperator(request);
    await activateSession(page, workspaceOperator, "/app/agro-intelligence/workspace");
    await expect(
      page.getByRole("heading", { name: "Review records that still need operator judgment" }),
    ).toBeVisible();
    await expect(page.getByText("Review buckets")).toBeVisible();
    await expect(page.getByRole("link", { name: "Review workspace" })).toBeVisible();

    await captureProof(page, testInfo, "eh1c-t3-advisory-climate-workspace");
  });
});
