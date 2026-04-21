# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: n5-finance-traceability.spec.ts >> N5 finance and traceability tranche checks >> CJ-007 traceability timeline renders ordered events and explicit evidence state
- Location: tests/e2e/n5-finance-traceability.spec.ts:237:7

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8213
Call log:
  - → POST http://127.0.0.1:8213/api/v1/identity/session
    - user-agent: Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Mobile Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - X-Correlation-ID: f2830bb7-79bc-475d-83e2-bb1a7567140a
    - X-Request-ID: f2830bb7-79bc-475d-83e2-bb1a7567140a
    - content-type: application/json
    - content-length: 110

```

# Test source

```ts
  1   | import crypto from "node:crypto";
  2   | 
  3   | import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
  4   | import { schemaVersion } from "@agrodomain/contracts";
  5   | 
  6   | import { gotoPath } from "./helpers";
  7   | 
  8   | const SESSION_KEY = "agrodomain.session.v2";
  9   | const TOKEN_KEY = "agrodomain.session-token.v1";
  10  | const apiBaseUrl =
  11  |   process.env.AGRO_E2E_API_BASE_URL ??
  12  |   `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
  13  | 
  14  | type SessionSeed = {
  15  |   accessToken: string;
  16  |   session: Record<string, unknown>;
  17  | };
  18  | 
  19  | async function createAuthenticatedSession(
  20  |   request: APIRequestContext,
  21  |   input: {
  22  |     displayName: string;
  23  |     email: string;
  24  |     role: "farmer" | "finance";
  25  |     countryCode: "GH" | "NG" | "JM";
  26  |   },
  27  | ): Promise<SessionSeed> {
  28  |   const signInRequestId = crypto.randomUUID();
> 29  |   const signInResponse = await request.post(`${apiBaseUrl}/api/v1/identity/session`, {
      |                                        ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8213
  30  |     data: {
  31  |       display_name: input.displayName,
  32  |       email: input.email,
  33  |       role: input.role,
  34  |       country_code: input.countryCode,
  35  |     },
  36  |     headers: {
  37  |       "X-Correlation-ID": signInRequestId,
  38  |       "X-Request-ID": signInRequestId,
  39  |     },
  40  |   });
  41  |   expect(signInResponse.ok()).toBeTruthy();
  42  |   const signInPayload = (await signInResponse.json()) as {
  43  |     access_token: string;
  44  |   };
  45  | 
  46  |   const consentRequestId = crypto.randomUUID();
  47  |   const consentResponse = await request.post(`${apiBaseUrl}/api/v1/identity/consent`, {
  48  |     data: {
  49  |       captured_at: new Date().toISOString(),
  50  |       policy_version: "2026.04.w5",
  51  |       scope_ids: ["identity.core", "workflow.audit", "regulated.finance", "traceability.runtime"],
  52  |     },
  53  |     headers: {
  54  |       Authorization: `Bearer ${signInPayload.access_token}`,
  55  |       "X-Correlation-ID": consentRequestId,
  56  |       "X-Request-ID": consentRequestId,
  57  |     },
  58  |   });
  59  |   expect(consentResponse.ok()).toBeTruthy();
  60  | 
  61  |   return {
  62  |     accessToken: signInPayload.access_token,
  63  |     session: (await consentResponse.json()) as Record<string, unknown>,
  64  |   };
  65  | }
  66  | 
  67  | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  68  |   await gotoPath(page, "/signin");
  69  |   await page.evaluate(
  70  |     ([sessionKey, tokenKey, session, token]) => {
  71  |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  72  |       window.localStorage.setItem(tokenKey, token);
  73  |     },
  74  |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  75  |   );
  76  | }
  77  | 
  78  | async function createConsignmentTimeline(
  79  |   request: APIRequestContext,
  80  |   actor: SessionSeed,
  81  | ): Promise<{ consignmentId: string; harvestedReference: string; dispatchedReference: string }> {
  82  |   const actorId = String((actor.session.actor as { actor_id: string }).actor_id);
  83  |   const countryCode = String((actor.session.actor as { country_code: string }).country_code);
  84  |   const eventRefSeed = crypto.randomUUID().slice(0, 8);
  85  |   const harvestedReference = `evt-ref-harvested-${eventRefSeed}`;
  86  |   const dispatchedReference = `evt-ref-dispatched-${eventRefSeed}`;
  87  |   const createRequestId = crypto.randomUUID();
  88  |   const createResponse = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
  89  |     data: {
  90  |       metadata: {
  91  |         request_id: createRequestId,
  92  |         idempotency_key: crypto.randomUUID(),
  93  |         actor_id: actorId,
  94  |         country_code: countryCode,
  95  |         channel: "pwa",
  96  |         schema_version: schemaVersion,
  97  |         correlation_id: createRequestId,
  98  |         occurred_at: new Date().toISOString(),
  99  |         traceability: {
  100 |           journey_ids: ["CJ-007"],
  101 |           data_check_ids: ["DI-006"],
  102 |         },
  103 |       },
  104 |       command: {
  105 |         name: "traceability.consignments.create",
  106 |         aggregate_ref: "traceability",
  107 |         mutation_scope: "traceability.runtime",
  108 |         payload: {
  109 |           partner_reference_id: "partner-shipment-77",
  110 |           current_custody_actor_id: actorId,
  111 |         },
  112 |       },
  113 |     },
  114 |     headers: {
  115 |       Authorization: `Bearer ${actor.accessToken}`,
  116 |       "X-Correlation-ID": createRequestId,
  117 |       "X-Request-ID": createRequestId,
  118 |     },
  119 |   });
  120 |   expect(createResponse.ok()).toBeTruthy();
  121 |   const createJson = (await createResponse.json()) as {
  122 |     result?: {
  123 |       consignment?: { consignment_id?: string };
  124 |       consignment_id?: string;
  125 |     };
  126 |   };
  127 |   const consignmentId = createJson.result?.consignment?.consignment_id ?? createJson.result?.consignment_id;
  128 |   if (!consignmentId) {
  129 |     throw new Error(`traceability.consignments.create did not return consignment_id: ${JSON.stringify(createJson)}`);
```