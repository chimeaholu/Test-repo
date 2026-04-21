# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> server-authoritative home posture redirects after consent revoke
- Location: tests/e2e/r4-route-completion.spec.ts:301:7

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8210
Call log:
  - → POST http://127.0.0.1:8210/api/v1/identity/session
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - X-Correlation-ID: fcd2421c-111a-4463-8962-715eba35431e
    - X-Request-ID: fcd2421c-111a-4463-8962-715eba35431e
    - content-type: application/json
    - content-length: 119

```

# Test source

```ts
  1   | import crypto from "node:crypto";
  2   | 
  3   | import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
  4   | 
  5   | import { createListing, gotoPath, listingIdFromHref, signInAndGrantConsent } from "./helpers";
  6   | 
  7   | const API_BASE_URL =
  8   |   process.env.AGRO_E2E_API_BASE_URL ??
  9   |   `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
  10  | const SESSION_KEY = "agrodomain.session.v2";
  11  | const TOKEN_KEY = "agrodomain.session-token.v1";
  12  | const SCHEMA_VERSION = "2026-04-18.wave1";
  13  | 
  14  | type SessionSeed = {
  15  |   accessToken: string;
  16  |   session: {
  17  |     actor: {
  18  |       actor_id: string;
  19  |       country_code: string;
  20  |       role: "farmer" | "buyer" | "admin";
  21  |     };
  22  |   };
  23  | };
  24  | 
  25  | async function createAuthenticatedSession(
  26  |   request: APIRequestContext,
  27  |   input: {
  28  |     displayName: string;
  29  |     email: string;
  30  |     role: "farmer" | "buyer" | "admin";
  31  |     scopeIds: string[];
  32  |     countryCode?: "GH" | "NG" | "JM";
  33  |   },
  34  | ): Promise<SessionSeed> {
  35  |   const signInRequestId = crypto.randomUUID();
> 36  |   const signInResponse = await request.post(`${API_BASE_URL}/api/v1/identity/session`, {
      |                                        ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8210
  37  |     data: {
  38  |       display_name: input.displayName,
  39  |       email: input.email,
  40  |       role: input.role,
  41  |       country_code: input.countryCode ?? "GH",
  42  |     },
  43  |     headers: {
  44  |       "X-Correlation-ID": signInRequestId,
  45  |       "X-Request-ID": signInRequestId,
  46  |     },
  47  |   });
  48  |   expect(signInResponse.ok()).toBeTruthy();
  49  |   const signInPayload = (await signInResponse.json()) as {
  50  |     access_token: string;
  51  |     session: SessionSeed["session"];
  52  |   };
  53  | 
  54  |   const consentRequestId = crypto.randomUUID();
  55  |   const consentResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
  56  |     data: {
  57  |       captured_at: new Date().toISOString(),
  58  |       policy_version: "2026.04.w1",
  59  |       scope_ids: input.scopeIds,
  60  |     },
  61  |     headers: {
  62  |       Authorization: `Bearer ${signInPayload.access_token}`,
  63  |       "X-Correlation-ID": consentRequestId,
  64  |       "X-Request-ID": consentRequestId,
  65  |     },
  66  |   });
  67  |   expect(consentResponse.ok()).toBeTruthy();
  68  | 
  69  |   return {
  70  |     accessToken: signInPayload.access_token,
  71  |     session: (await consentResponse.json()) as SessionSeed["session"],
  72  |   };
  73  | }
  74  | 
  75  | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  76  |   await gotoPath(page, "/signin");
  77  |   await page.evaluate(
  78  |     ([sessionKey, tokenKey, session, token]) => {
  79  |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  80  |       window.localStorage.setItem(tokenKey, token);
  81  |     },
  82  |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  83  |   );
  84  | }
  85  | 
  86  | async function waitForWorkspaceReady(page: Page): Promise<void> {
  87  |   await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  88  | }
  89  | 
  90  | async function publishListingViaCommand(
  91  |   request: APIRequestContext,
  92  |   token: string,
  93  |   actorId: string,
  94  |   countryCode: string,
  95  |   listingId: string,
  96  | ): Promise<void> {
  97  |   const requestId = crypto.randomUUID();
  98  |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  99  |     data: {
  100 |       metadata: {
  101 |         request_id: requestId,
  102 |         idempotency_key: requestId,
  103 |         actor_id: actorId,
  104 |         country_code: countryCode,
  105 |         channel: "pwa",
  106 |         schema_version: SCHEMA_VERSION,
  107 |         correlation_id: requestId,
  108 |         occurred_at: new Date().toISOString(),
  109 |         traceability: {
  110 |           journey_ids: ["CJ-002"],
  111 |           data_check_ids: ["DI-001"],
  112 |         },
  113 |       },
  114 |       command: {
  115 |         name: "market.listings.publish",
  116 |         aggregate_ref: listingId,
  117 |         mutation_scope: "marketplace.listings",
  118 |         payload: { listing_id: listingId },
  119 |       },
  120 |     },
  121 |     headers: {
  122 |       Authorization: `Bearer ${token}`,
  123 |     },
  124 |   });
  125 |   expect(response.ok()).toBeTruthy();
  126 | }
  127 | 
  128 | async function requestNegotiationCommand(
  129 |   request: APIRequestContext,
  130 |   token: string,
  131 |   actorId: string,
  132 |   countryCode: string,
  133 |   name: string,
  134 |   aggregateRef: string,
  135 |   payload: Record<string, unknown>,
  136 | ): Promise<void> {
```