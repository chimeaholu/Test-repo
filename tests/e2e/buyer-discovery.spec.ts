import crypto from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { gotoPath } from "./helpers";

const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const CONSENT_SCOPE_IDS = ["identity.core", "workflow.audit"];
const apiBaseUrl =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;

type ActorRole = "farmer" | "buyer";

type SessionSeed = {
  accessToken: string;
  session: Record<string, unknown>;
};

async function createAuthenticatedSession(
  request: APIRequestContext,
  input: {
    displayName: string;
    email: string;
    role: ActorRole;
    countryCode: "GH" | "NG" | "JM";
  },
): Promise<SessionSeed> {
  const signInRequestId = crypto.randomUUID();
  const signInResponse = await request.post(`${apiBaseUrl}/api/v1/identity/session`, {
    data: {
      display_name: input.displayName,
      email: input.email,
      role: input.role,
      country_code: input.countryCode,
    },
    headers: {
      "X-Correlation-ID": signInRequestId,
      "X-Request-ID": signInRequestId,
    },
  });
  expect(signInResponse.ok()).toBeTruthy();
  const signInPayload = (await signInResponse.json()) as {
    access_token: string;
    session: Record<string, unknown>;
  };

  const consentRequestId = crypto.randomUUID();
  const consentResponse = await request.post(`${apiBaseUrl}/api/v1/identity/consent`, {
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
    session: (await consentResponse.json()) as Record<string, unknown>,
  };
}

async function createListingViaApi(
  request: APIRequestContext,
  seller: SessionSeed,
  input: {
    title: string;
    commodity: string;
    quantityTons: string;
    priceAmount: string;
    priceCurrency: string;
    location: string;
    summary: string;
  },
): Promise<string> {
  const requestId = crypto.randomUUID();
  const response = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: requestId,
        idempotency_key: crypto.randomUUID(),
        actor_id: ((seller.session.actor as { actor_id: string }).actor_id),
        country_code: ((seller.session.actor as { country_code: string }).country_code),
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
        name: "market.listings.create",
        aggregate_ref: "listing",
        mutation_scope: "marketplace.listings",
        payload: {
          title: input.title,
          commodity: input.commodity,
          quantity_tons: Number(input.quantityTons),
          price_amount: Number(input.priceAmount),
          price_currency: input.priceCurrency,
          location: input.location,
          summary: input.summary,
        },
      },
    },
    headers: {
      Authorization: `Bearer ${seller.accessToken}`,
      "X-Correlation-ID": requestId,
      "X-Request-ID": requestId,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    result: {
      listing: {
        listing_id: string;
      };
    };
  };
  return `/app/market/listings/${payload.result.listing.listing_id}`;
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

test.describe("Buyer discovery and scoped read behavior", () => {
  test("buyer reaches the discovery shell and cannot read another actor's listing detail", async ({
    page,
    request,
  }) => {
    const title = `Buyer discovery fixture ${Date.now()}`;
    const seller = await createAuthenticatedSession(request, {
      displayName: "Ama Mensah",
      email: `seller.${Date.now()}@example.com`,
      role: "farmer",
      countryCode: "GH",
    });
    const detailHref = await createListingViaApi(request, seller, {
      title,
      commodity: "Cassava",
      quantityTons: "5.0",
      priceAmount: "350",
      priceCurrency: "GHS",
      location: "Tamale, GH",
      summary: "Cassava fixture for buyer discovery coverage.",
    });
    const buyer = await createAuthenticatedSession(request, {
      displayName: "Kofi Buyer",
      email: `buyer.${Date.now()}@example.com`,
      role: "buyer",
      countryCode: "GH",
    });

    await primeSession(page, buyer);

    await gotoPath(page, "/app/buyer");
    await expect(
      page.getByRole("heading", {
        name: "Source live supply, keep deals moving, and watch settlement readiness in one place.",
      }),
    ).toBeVisible();

    await gotoPath(page, "/app/market/listings");
    await expect(
      page.getByRole("heading", {
        name: "Discover trusted agricultural supply in one place",
      }),
    ).toBeVisible();
    await expect(page.getByText("Live inventory only")).toBeVisible();

    await gotoPath(page, "/app/market/negotiations");
    await expect(
      page.getByRole("heading", {
        name: "Negotiation workspace",
      }),
    ).toBeVisible();
    await expect(page.getByText("No visible threads yet")).toBeVisible();

    await gotoPath(page, detailHref);
    await expect(page.getByText(/listing_not_(published|found)/)).toBeVisible();
  });
});
