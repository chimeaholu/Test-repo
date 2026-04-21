import crypto from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { schemaVersion } from "@agrodomain/contracts";

import { gotoPath } from "./helpers";

const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const apiBaseUrl =
  process.env.AGRO_E2E_API_BASE_URL ??
  `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;

type SessionSeed = {
  accessToken: string;
  session: Record<string, unknown>;
};

async function createAuthenticatedSession(
  request: APIRequestContext,
  input: {
    displayName: string;
    email: string;
    role: "farmer" | "finance";
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
  };

  const consentRequestId = crypto.randomUUID();
  const consentResponse = await request.post(`${apiBaseUrl}/api/v1/identity/consent`, {
    data: {
      captured_at: new Date().toISOString(),
      policy_version: "2026.04.w5",
      scope_ids: ["identity.core", "workflow.audit", "regulated.finance", "traceability.runtime"],
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

async function openSeededProtectedRoute(page: Page, sessionSeed: SessionSeed, path: string): Promise<void> {
  await gotoPath(page, path);
  if (/\/signin(\?.*)?$/.test(page.url()) || /\/onboarding\/consent(\?.*)?$/.test(page.url())) {
    await primeSession(page, sessionSeed);
    await gotoPath(page, path);
  }
}

async function createConsignmentTimeline(
  request: APIRequestContext,
  actor: SessionSeed,
): Promise<{ consignmentId: string; harvestedReference: string; dispatchedReference: string }> {
  const actorId = String((actor.session.actor as { actor_id: string }).actor_id);
  const countryCode = String((actor.session.actor as { country_code: string }).country_code);
  const eventRefSeed = crypto.randomUUID().slice(0, 8);
  const harvestedReference = `evt-ref-harvested-${eventRefSeed}`;
  const dispatchedReference = `evt-ref-dispatched-${eventRefSeed}`;
  const createRequestId = crypto.randomUUID();
  const createResponse = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: createRequestId,
        idempotency_key: crypto.randomUUID(),
        actor_id: actorId,
        country_code: countryCode,
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
          partner_reference_id: "partner-shipment-77",
          current_custody_actor_id: actorId,
        },
      },
    },
    headers: {
      Authorization: `Bearer ${actor.accessToken}`,
      "X-Correlation-ID": createRequestId,
      "X-Request-ID": createRequestId,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createJson = (await createResponse.json()) as {
    result?: {
      consignment?: { consignment_id?: string };
      consignment_id?: string;
    };
  };
  const consignmentId = createJson.result?.consignment?.consignment_id ?? createJson.result?.consignment_id;
  if (!consignmentId) {
    throw new Error(`traceability.consignments.create did not return consignment_id: ${JSON.stringify(createJson)}`);
  }

  const harvestRequestId = crypto.randomUUID();
  const harvestResponse = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: harvestRequestId,
        idempotency_key: crypto.randomUUID(),
        actor_id: actorId,
        country_code: countryCode,
        channel: "pwa",
        schema_version: schemaVersion,
        correlation_id: harvestRequestId,
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
          milestone: "harvested",
          event_reference: harvestedReference,
          previous_event_reference: null,
          occurred_at: new Date().toISOString(),
          current_custody_actor_id: actorId,
        },
      },
    },
    headers: {
      Authorization: `Bearer ${actor.accessToken}`,
      "X-Correlation-ID": harvestRequestId,
      "X-Request-ID": harvestRequestId,
    },
  });
  expect(harvestResponse.ok()).toBeTruthy();

  const dispatchRequestId = crypto.randomUUID();
  const dispatchResponse = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
    data: {
      metadata: {
        request_id: dispatchRequestId,
        idempotency_key: crypto.randomUUID(),
        actor_id: actorId,
        country_code: countryCode,
        channel: "pwa",
        schema_version: schemaVersion,
        correlation_id: dispatchRequestId,
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
          milestone: "dispatched",
          event_reference: dispatchedReference,
          previous_event_reference: harvestedReference,
          occurred_at: new Date().toISOString(),
          current_custody_actor_id: "actor-transporter-gh-1",
        },
      },
    },
    headers: {
      Authorization: `Bearer ${actor.accessToken}`,
      "X-Correlation-ID": dispatchRequestId,
      "X-Request-ID": dispatchRequestId,
    },
  });
  expect(dispatchResponse.ok()).toBeTruthy();

  return { consignmentId, harvestedReference, dispatchedReference };
}

test.describe("N5 finance and traceability tranche checks", () => {
  test("CJ-004/CJ-008 finance HITL queue and decision actions are live", async ({ page, request }) => {
    const finance = await createAuthenticatedSession(request, {
      displayName: "Finance N5",
      email: `finance.n5.${Date.now()}@example.com`,
      role: "finance",
      countryCode: "GH",
    });
    await primeSession(page, finance);

    await openSeededProtectedRoute(page, finance, "/app/finance/queue");
    await expect(page.getByRole("heading", { name: "Review partner-owned decisions without hidden approval paths" })).toBeVisible();

    await page.getByRole("button", { name: "Submit finance request" }).click();
    await expect(page.getByText("listing/listing-201", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Record partner approved" }).click();
    await expect(page.getByText("evidence_sufficient")).toBeVisible();
    await expect(page.getByText("Actor history count")).toBeVisible();

    await page.getByRole("button", { name: "Evaluate trigger" }).click();
    await expect(page.getByText("Payout dedupe key")).toBeVisible();
  });

  test("CJ-007 traceability timeline renders ordered events and explicit evidence state", async ({ page, request }) => {
    const farmer = await createAuthenticatedSession(request, {
      displayName: "Farmer N5",
      email: `farmer.n5.${Date.now()}@example.com`,
      role: "farmer",
      countryCode: "GH",
    });
    const timelineSeed = await createConsignmentTimeline(request, farmer);
    await primeSession(page, farmer);

    await openSeededProtectedRoute(page, farmer, `/app/traceability/${timelineSeed.consignmentId}`);
    await expect(page.getByRole("heading", { name: "Ordered event chain" })).toBeVisible();
    await expect(page.getByText(timelineSeed.harvestedReference).first()).toBeVisible();
    await expect(page.getByText(timelineSeed.dispatchedReference).first()).toBeVisible();
    await expect(page.getByText("No evidence attachment metadata returned")).toBeVisible();
  });
});
