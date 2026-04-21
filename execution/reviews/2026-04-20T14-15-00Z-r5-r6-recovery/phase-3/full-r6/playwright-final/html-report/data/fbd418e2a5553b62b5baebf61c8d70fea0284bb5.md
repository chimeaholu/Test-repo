# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:252:7

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8210
Call log:
  - → POST http://127.0.0.1:8210/api/v1/identity/session
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - X-Correlation-ID: 16f4e44d-e9b0-4a6e-930d-69e7d0507f97
    - X-Request-ID: 16f4e44d-e9b0-4a6e-930d-69e7d0507f97
    - content-type: application/json
    - content-length: 120

```

# Test source

```ts
  1   | import crypto from "node:crypto";
  2   | 
  3   | import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
  4   | 
  5   | import { createListing, gotoPath, listingIdFromHref } from "./helpers";
  6   | 
  7   | const API_BASE_URL =
  8   |   process.env.AGRO_E2E_API_BASE_URL ??
  9   |   `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
  10  | const SCHEMA_VERSION = "2026-04-18.wave1";
  11  | const SESSION_KEY = "agrodomain.session.v2";
  12  | const TOKEN_KEY = "agrodomain.session-token.v1";
  13  | const CONSENT_SCOPE_IDS = ["identity.core", "workflow.audit"];
  14  | 
  15  | type ActorRole = "farmer" | "buyer";
  16  | type SessionSeed = {
  17  |   accessToken: string;
  18  |   session: {
  19  |     actor: {
  20  |       actor_id: string;
  21  |       country_code: string;
  22  |       role: ActorRole;
  23  |     };
  24  |   };
  25  | };
  26  | 
  27  | async function createAuthenticatedSession(
  28  |   request: APIRequestContext,
  29  |   input: {
  30  |     displayName: string;
  31  |     email: string;
  32  |     role: ActorRole;
  33  |     countryCode?: "GH" | "NG" | "JM";
  34  |   },
  35  | ): Promise<SessionSeed> {
  36  |   const signInRequestId = crypto.randomUUID();
> 37  |   const signInResponse = await request.post(`${API_BASE_URL}/api/v1/identity/session`, {
      |                                        ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8210
  38  |     data: {
  39  |       display_name: input.displayName,
  40  |       email: input.email,
  41  |       role: input.role,
  42  |       country_code: input.countryCode ?? "GH",
  43  |     },
  44  |     headers: {
  45  |       "X-Correlation-ID": signInRequestId,
  46  |       "X-Request-ID": signInRequestId,
  47  |     },
  48  |   });
  49  |   expect(signInResponse.ok()).toBeTruthy();
  50  |   const signInPayload = (await signInResponse.json()) as {
  51  |     access_token: string;
  52  |     session: SessionSeed["session"];
  53  |   };
  54  | 
  55  |   const consentRequestId = crypto.randomUUID();
  56  |   const consentResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
  57  |     data: {
  58  |       captured_at: new Date().toISOString(),
  59  |       policy_version: "2026.04.w1",
  60  |       scope_ids: CONSENT_SCOPE_IDS,
  61  |     },
  62  |     headers: {
  63  |       Authorization: `Bearer ${signInPayload.access_token}`,
  64  |       "X-Correlation-ID": consentRequestId,
  65  |       "X-Request-ID": consentRequestId,
  66  |     },
  67  |   });
  68  |   expect(consentResponse.ok()).toBeTruthy();
  69  | 
  70  |   return {
  71  |     accessToken: signInPayload.access_token,
  72  |     session: (await consentResponse.json()) as SessionSeed["session"],
  73  |   };
  74  | }
  75  | 
  76  | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  77  |   await gotoPath(page, "/signin");
  78  |   await page.evaluate(
  79  |     ([sessionKey, tokenKey, session, token]) => {
  80  |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  81  |       window.localStorage.setItem(tokenKey, token);
  82  |     },
  83  |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  84  |   );
  85  | }
  86  | 
  87  | async function activateSession(page: Page, sessionSeed: SessionSeed, route: "/app/farmer" | "/app/buyer"): Promise<void> {
  88  |   await primeSession(page, sessionSeed);
  89  |   await gotoPath(page, route);
  90  |   await waitForWorkspaceReady(page);
  91  | }
  92  | 
  93  | async function waitForWorkspaceReady(page: Page): Promise<void> {
  94  |   await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  95  | }
  96  | 
  97  | async function publishListingViaCommand(
  98  |   request: APIRequestContext,
  99  |   page: Page,
  100 |   listingId: string,
  101 | ): Promise<void> {
  102 |   const token = await page.evaluate(() => window.localStorage.getItem("agrodomain.session-token.v1"));
  103 |   const sessionRaw = await page.evaluate(() => window.localStorage.getItem("agrodomain.session.v2"));
  104 |   if (!token || !sessionRaw) {
  105 |     throw new Error("Expected seller token and session in localStorage");
  106 |   }
  107 | 
  108 |   const session = JSON.parse(sessionRaw) as {
  109 |     actor: {
  110 |       actor_id: string;
  111 |       country_code: string;
  112 |     };
  113 |   };
  114 |   const requestId = crypto.randomUUID();
  115 |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  116 |     data: {
  117 |       metadata: {
  118 |         request_id: requestId,
  119 |         idempotency_key: requestId,
  120 |         actor_id: session.actor.actor_id,
  121 |         country_code: session.actor.country_code,
  122 |         channel: "pwa",
  123 |         schema_version: SCHEMA_VERSION,
  124 |         correlation_id: requestId,
  125 |         occurred_at: new Date().toISOString(),
  126 |         traceability: {
  127 |           journey_ids: ["CJ-002"],
  128 |           data_check_ids: ["DI-001"],
  129 |         },
  130 |       },
  131 |       command: {
  132 |         name: "market.listings.publish",
  133 |         aggregate_ref: listingId,
  134 |         mutation_scope: "marketplace.listings",
  135 |         payload: {
  136 |           listing_id: listingId,
  137 |         },
```