import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { gotoPath } from "./helpers";

const OUTPUT_DIR = path.join(
  process.cwd(),
  "output_to_user",
  "ui-screenshot-pack",
  "batch-1-public-auth",
);
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;

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

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

async function capture(page: Page, filename: string, fullPage = false): Promise<string> {
  ensureDir(OUTPUT_DIR);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await page.waitForTimeout(500);
  const target = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: target, fullPage });
  expect(fs.existsSync(target)).toBeTruthy();
  return target;
}

async function gotoSignupReady(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await gotoPath(page, "/signup");
    await page.locator("main").waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(500);
    if (/\/signup(\?.*)?$/.test(page.url())) {
      return;
    }
  }
  throw new Error("signup screen did not settle on the expected route");
}

async function createIdentifiedSession(
  request: APIRequestContext,
  input: {
    countryCode?: "GH" | "NG" | "JM";
    displayName: string;
    email: string;
    password: string;
    role: "farmer" | "buyer" | "cooperative" | "transporter" | "extension_agent";
  },
): Promise<SessionSeed> {
  const requestResponse = await request.post(`${API_BASE_URL}/api/v1/identity/register/password`, {
    data: {
      display_name: input.displayName,
      country_code: input.countryCode ?? "GH",
      email: input.email,
      password: input.password,
      phone_number: `+23324${Date.now().toString().slice(-7)}`,
      role: input.role,
    },
  });
  if (!requestResponse.ok()) {
    const payload = await requestResponse.text().catch(() => "");
    throw new Error(`password registration failed (${requestResponse.status()}): ${payload}`);
  }

  const payload = (await requestResponse.json()) as {
    access_token: string;
    session: SessionSeed["session"];
  };

  return {
    accessToken: payload.access_token,
    session: payload.session,
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
  await page.locator("main").waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

test.describe("public auth screenshot batch 1", () => {
  test("captures signin, signup, and consent surfaces", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-critical");

    await gotoPath(page, "/signin");
    await expect(page.getByRole("heading", { name: "Sign in to your Agrodomain account" })).toBeVisible();
    await capture(page, "signin.png");

    await gotoSignupReady(page);
    await expect(
      page.getByRole("heading", { name: "Set up your Agrodomain workspace" }),
    ).toBeVisible();
    await capture(page, "signup.png", true);

    const runId = crypto.randomUUID().slice(0, 8);
    const identifiedSession = await createIdentifiedSession(request, {
      displayName: "Screenshot Farmer",
      email: `screenshots.${runId}@example.com`,
      password: "Harvest!GH101",
      role: "farmer",
    });

    await activateSession(
      page,
      {
        accessToken: identifiedSession.accessToken,
        session: {
          ...identifiedSession.session,
          consent: {
            ...identifiedSession.session.consent,
            state: "identified",
          },
        },
      },
      "/onboarding/consent",
    );
    await expect(
      page.getByRole("heading", {
        name: "Review the permissions that keep your workspace working",
      }),
    ).toBeVisible();
    await capture(page, "onboarding-consent.png", true);
  });
});
