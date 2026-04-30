import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";

import { gotoPath } from "./helpers";

const apiBaseUrl =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const artifactDir =
  process.env.PLAYWRIGHT_ARTIFACT_DIR ??
  path.join("execution", "reviews", "r8-qa-lane");
const screenshotRoot = path.join(artifactDir, "screenshots");

export const sessionKey = "agrodomain.session.v2";
export const tokenKey = "agrodomain.session-token.v1";

export type SessionSeed = {
  accessToken: string;
  session: {
    actor: {
      actor_id: string;
      country_code: string;
      display_name: string;
      email: string;
      membership: {
        organization_name: string;
      };
      role: string;
    };
    consent: {
      state: string;
    };
  };
};

type SessionInput = {
  countryCode?: "GH" | "NG" | "JM";
  displayName: string;
  email: string;
  role: string;
  scopeIds?: string[];
};

export function routeSlug(route: string): string {
  return route.replace(/^\/+/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
}

export async function createAuthenticatedSession(
  request: APIRequestContext,
  input: SessionInput,
): Promise<SessionSeed> {
  let lastError = "Unknown authentication bootstrap failure.";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const signInRequestId = crypto.randomUUID();
    const signInResponse = await request.post(`${apiBaseUrl}/api/v1/identity/session`, {
      data: {
        country_code: input.countryCode ?? "GH",
        display_name: input.displayName,
        email: input.email,
        role: input.role,
      },
      headers: {
        "X-Correlation-ID": signInRequestId,
        "X-Request-ID": signInRequestId,
      },
    });

    if (!signInResponse.ok()) {
      lastError = `Sign-in bootstrap failed with ${signInResponse.status()}: ${await signInResponse.text()}`;
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      continue;
    }

    const signInPayload = (await signInResponse.json()) as {
      access_token: string;
    };

    const consentRequestId = crypto.randomUUID();
    const consentResponse = await request.post(`${apiBaseUrl}/api/v1/identity/consent`, {
      data: {
        captured_at: new Date().toISOString(),
        policy_version: "2026.04.w1",
        scope_ids: input.scopeIds ?? ["identity.core", "workflow.audit", "notifications.delivery"],
      },
      headers: {
        Authorization: `Bearer ${signInPayload.access_token}`,
        "X-Correlation-ID": consentRequestId,
        "X-Request-ID": consentRequestId,
      },
    });

    if (!consentResponse.ok()) {
      lastError = `Consent bootstrap failed with ${consentResponse.status()}: ${await consentResponse.text()}`;
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      continue;
    }

    return {
      accessToken: signInPayload.access_token,
      session: (await consentResponse.json()) as SessionSeed["session"],
    };
  }

  throw new Error(lastError);
}

export async function primeSession(
  page: Page,
  seed: SessionSeed,
  route: string = "/signin",
): Promise<void> {
  await gotoPath(page, "/signin");
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    {
      name: "agrodomain-session",
      value: "1",
      url: origin,
      sameSite: "Lax",
    },
  ]);
  await page.evaluate(
    ([nextSessionKey, nextTokenKey, session, token]) => {
      window.localStorage.setItem(nextSessionKey, JSON.stringify(session));
      window.localStorage.setItem(nextTokenKey, token);
      document.cookie = "agrodomain-session=1;path=/;samesite=lax";
    },
    [sessionKey, tokenKey, seed.session, seed.accessToken],
  );
  await gotoPath(page, route);
  await waitForStablePage(page);
}

export async function waitForStablePage(page: Page): Promise<void> {
  await page.getByRole("main").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(250);
}

export async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  bucket: string,
  slug: string,
): Promise<string> {
  const directory = path.join(screenshotRoot, bucket);
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, `${testInfo.project.name}-${slug}.png`);
  try {
    await page.screenshot({ fullPage: true, path: target });
  } catch {
    await page.screenshot({ path: target });
  }
  await testInfo.attach(`${bucket}-${slug}`, {
    contentType: "image/png",
    path: target,
  });
  return target;
}

export async function stripDevOverlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal, [data-next-badge-root]").forEach((node) => node.remove());
  });
}

export async function openAgroGuide(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Open AgroGuide AI assistant" }).click();
  await expect(page.getByRole("dialog", { name: "AgroGuide AI assistant" })).toBeVisible();
}
