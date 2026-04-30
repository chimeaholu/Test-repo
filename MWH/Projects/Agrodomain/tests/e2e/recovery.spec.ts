import { expect, test, type Page } from "@playwright/test";

import { grantConsent, gotoPath, signIn, signInAndGrantConsent } from "./helpers";

const apiBaseUrl =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";

async function expectHydratedHeading(page: Page, name: string): Promise<void> {
  const bootHeading = page.getByRole("heading", { name: "Restoring your workspace and recent activity." });
  await bootHeading.waitFor({ state: "hidden", timeout: 20_000 }).catch(() => undefined);
  await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });
}

test.describe("Consent recovery and offline retry", () => {
  test.setTimeout(180_000);

  test("consent revoke blocks protected routes until restored", async ({ page }) => {
    const displayName = "Esi Farmer";
    const email = `esi.${Date.now()}@example.com`;

    await signInAndGrantConsent(page, {
      displayName,
      email,
      role: "farmer",
    });

    await gotoPath(page, "/app/profile");
    await expectHydratedHeading(page, "Consent and permissions");
    await page
      .getByLabel("Reason for revocation")
      .fill("Consent needs review");
    await page.getByRole("button", { name: "Revoke consent" }).click();

    await expect(page.getByText("consent_revoked")).toBeVisible();
    await gotoPath(page, "/app/market/listings");
    await expect(page).toHaveURL(/\/(signin|onboarding\/consent)$/);

    if (page.url().endsWith("/signin")) {
      await signIn(page, {
        displayName,
        email,
        role: "farmer",
      });
      await grantConsent(page);
      await expect(page).toHaveURL(/\/app\/farmer$/);
    } else {
      await gotoPath(page, "/app/profile");
      await page.getByRole("button", { name: "Restore consent" }).click();
      await expect(page).toHaveURL(/\/app\/farmer$/);
    }

    await gotoPath(page, "/app/market/listings");
    await expectHydratedHeading(
      page,
      "Create, revise, and publish inventory with clear market status",
    );
  });

  test("offline seam exposes connectivity, retry, and dismiss controls", async ({ page, request }) => {
    const sessionEmail = `eh1b.offline.${Date.now()}@example.com`;
    const sessionResponse = await request.post(`${apiBaseUrl}/api/v1/identity/session`, {
      data: {
        country_code: "GH",
        display_name: "Yaw Farmer",
        email: sessionEmail,
        role: "farmer",
      },
    });
    test.skip(!sessionResponse.ok(), `pending-backend: preview session bootstrap failed (${sessionResponse.status()})`);
    const sessionPayload = (await sessionResponse.json()) as {
      access_token: string;
      session: Record<string, unknown>;
    };

    const consentResponse = await request.post(`${apiBaseUrl}/api/v1/identity/consent`, {
      data: {
        captured_at: new Date().toISOString(),
        policy_version: "2026.04.e2e",
        scope_ids: ["identity.core", "workflow.audit"],
      },
      headers: {
        Authorization: `Bearer ${sessionPayload.access_token}`,
      },
    });
    test.skip(!consentResponse.ok(), `pending-backend: consent bootstrap failed (${consentResponse.status()})`);
    const grantedSession = await consentResponse.json();

    await gotoPath(page, "/");
    await page.evaluate(
      ([sessionKey, tokenKey, token, session]) => {
        window.localStorage.setItem(sessionKey, JSON.stringify(session));
        window.localStorage.setItem(tokenKey, token);
        document.cookie = "agrodomain-session=1;path=/";
      },
      [SESSION_KEY, TOKEN_KEY, sessionPayload.access_token, grantedSession],
    );

    await gotoPath(page, "/app/market/listings/create");
    await expect(page.getByRole("heading", { name: "Show buyers exactly what you have available" })).toBeVisible();

    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Simulate offline" }).click();
    await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Offline" })).toBeVisible();
    await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Handoff whatsapp" })).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page.getByText("Saved offline")).toBeVisible();

    await gotoPath(page, "/app/offline/outbox");
    await expect(page.getByRole("heading", { name: "See what is waiting to sync" })).toBeVisible();
    await expect(page.getByText(/Suggested handoff/i)).toBeVisible();
    await expect(page.getByText("Saved offline")).toBeVisible();

    await page.context().setOffline(false);
    await page.getByRole("button", { name: "Force online" }).click();
    await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Online" })).toBeVisible();
    await expect(page.locator(".sync-banner .status-pill").filter({ hasText: "Handoff whatsapp" })).toHaveCount(0);

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("Synced")).toBeVisible();

    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText(/Draft listing/i)).toHaveCount(0);
  });
});
