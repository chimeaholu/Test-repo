import crypto from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { grantConsent, gotoPath } from "./helpers";

const API_BASE_URL =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
const DEMO_OPERATOR_EMAIL = "operator@agrodomain-demo.invalid";
const DEMO_OPERATOR_PASSWORD = "DemoAccess2026!";
const DEMO_WATERMARK =
  "Synthetic demo data only. Shared-environment demo tenant; do not treat as production truth.";

type RegisteredActor = {
  actorId: string;
  email: string;
};

type ActorSearchResponse = {
  items: Array<{
    actor_id: string;
    display_name: string;
    email: string;
  }>;
};

async function registerOperationalRecipient(
  request: APIRequestContext,
  runId: string,
): Promise<RegisteredActor> {
  const response = await request.post(`${API_BASE_URL}/api/v1/identity/register/password`, {
    data: {
      country_code: "GH",
      display_name: `Boundary Guard ${runId}`,
      email: `boundary.guard.${runId}@example.com`,
      password: "BoundaryGuard123!",
      phone_number: `+23320${runId.slice(-8)}`,
      role: "buyer",
    },
    headers: {
      "X-Correlation-ID": `eh2-register-${runId}`,
      "X-Request-ID": `eh2-register-${runId}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        detail?: unknown;
        session?: {
          actor: {
            actor_id: string;
            email: string;
          };
        };
      }
    | null;
  expect(response.ok(), `recipient register failed: ${JSON.stringify(payload)}`).toBeTruthy();
  return {
    actorId: payload?.session?.actor.actor_id ?? "",
    email: payload?.session?.actor.email ?? "",
  };
}

async function signInDemoOperator(page: Page): Promise<void> {
  await gotoPath(page, "/signin");
  await page.locator("#passwordCountryCode").selectOption("GH");
  await page.locator("#passwordIdentifier").fill(DEMO_OPERATOR_EMAIL);
  await page.locator("#password").fill(DEMO_OPERATOR_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(onboarding\/consent|app\/admin)(\?.*)?$/, { timeout: 30_000 });

  if (/\/onboarding\/consent(\?.*)?$/.test(page.url())) {
    await grantConsent(page);
  }

  await expect(page).toHaveURL(/\/app\/admin(\?.*)?$/, { timeout: 30_000 });
}

async function expectDemoChrome(
  page: Page,
): Promise<void> {
  const boundaryRegion = page.getByRole("region", { name: "Demo boundary" });
  await expect(boundaryRegion.getByText("Guided preview", { exact: true })).toBeVisible();
  await expect(boundaryRegion.getByText("Sample data", { exact: true })).toBeVisible();
  await expect(
    boundaryRegion.getByRole("heading", {
      name: "This walkthrough uses sample data and stays separate from live work.",
    }),
  ).toBeVisible();
  await expect(boundaryRegion.getByText(DEMO_WATERMARK)).toBeVisible();
}

async function switchToPersona(page: Page, displayName: string): Promise<void> {
  const personaCard = page.locator(".inline-actions").filter({
    has: page.getByText(displayName),
  }).first();
  await expect(personaCard).toBeVisible({ timeout: 20_000 });
  await personaCard.getByRole("button", { name: "Switch persona" }).click();
}

async function searchRecipientsInBrowser(
  page: Page,
  query: string,
): Promise<ActorSearchResponse> {
  return page.evaluate(
    async ({ apiBaseUrl, nextQuery }) => {
      const token = window.localStorage.getItem("agrodomain.session-token.v1");
      const response = await fetch(
        `${apiBaseUrl}/api/v1/identity/actors/search?q=${encodeURIComponent(nextQuery)}&limit=8`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.json();
    },
    {
      apiBaseUrl: API_BASE_URL,
      nextQuery: query,
    },
  );
}

test.describe("EH2 demo operator shared-environment proof", () => {
  test.setTimeout(240_000);

  test("operator walkthrough keeps demo labels visible and blocks operational contamination", async ({
    page,
    request,
  }) => {
    const runId = `${Date.now()}`;
    const operationalRecipient = await registerOperationalRecipient(request, runId);

    await signInDemoOperator(page);
    await expectDemoChrome(page);

    await gotoPath(page, "/app/admin/demo-operator");
    await expect(
      page.getByRole("heading", {
        name: "Guide the product preview without losing the boundary",
      }),
    ).toBeVisible();
    await expect(page.getByText("Ghana maize trade walkthrough")).toBeVisible();
    await expect(page.getByText("Nigeria climate response walkthrough")).toBeVisible();
    await expect(page.getByText("AGD Demo | Kwame Maize Farmer")).toBeVisible();

    await switchToPersona(page, "AGD Demo | Kwame Maize Farmer");
    await expect(page).toHaveURL(/\/app\/farmer(\?.*)?$/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", {
        name: /AGD Demo \| Kwame Maize Farmer\. Keep the next field move clear\./,
      }),
    ).toBeVisible();
    await expectDemoChrome(page);

    const blockedSearch = await searchRecipientsInBrowser(page, `Boundary Guard ${runId}`);
    expect(blockedSearch.items).toHaveLength(0);

    const demoSearch = await searchRecipientsInBrowser(page, "Ama Buyer Desk");
    expect(demoSearch.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          display_name: "AGD Demo | Ama Buyer Desk",
          email: "ama.gh@agrodomain-demo.invalid",
        }),
      ]),
    );

    const boundaryViolation = await page.evaluate(
      async ({ apiBaseUrl, recipientActorId }) => {
        const token = window.localStorage.getItem("agrodomain.session-token.v1");
        const response = await fetch(`${apiBaseUrl}/api/v1/wallet/transfers`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient_actor_id: recipientActorId,
            currency: "GHS",
            amount: 5,
            note: "EH2 browser proof boundary check",
          }),
        });
        return {
          body: await response.json().catch(() => null),
          status: response.status,
        };
      },
      {
        apiBaseUrl: API_BASE_URL,
        recipientActorId: operationalRecipient.actorId,
      },
    );
    expect(boundaryViolation.status).toBe(403);
    expect(boundaryViolation.body).toMatchObject({
      detail: "demo_boundary_violation",
    });

    await gotoPath(page, "/app/market/listings");
    await expect(
      page.getByRole("heading", {
        name: "Manage what buyers can see",
      }),
    ).toBeVisible();
    await expect(page.getByText("Seller view", { exact: true })).toBeVisible();
    await expectDemoChrome(page);
  });
});
