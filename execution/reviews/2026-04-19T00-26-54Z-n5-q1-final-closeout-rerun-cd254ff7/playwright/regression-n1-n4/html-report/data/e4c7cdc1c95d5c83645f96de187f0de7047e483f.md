# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negotiation.spec.ts >> Negotiation inbox and thread proof >> pending confirmation approve/reject paths lock terminal state and outsider thread access is blocked
- Location: tests/e2e/negotiation.spec.ts:250:7

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8000
Call log:
  - → POST http://127.0.0.1:8000/api/v1/identity/session
    - user-agent: Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Mobile Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - X-Correlation-ID: 08f3f0b1-27d5-4322-a25f-992db413878d
    - X-Request-ID: 08f3f0b1-27d5-4322-a25f-992db413878d
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
  7   | const API_BASE_URL = process.env.AGRO_E2E_API_BASE_URL ?? "http://127.0.0.1:8000";
  8   | const SCHEMA_VERSION = "2026-04-18.wave1";
  9   | const SESSION_KEY = "agrodomain.session.v2";
  10  | const TOKEN_KEY = "agrodomain.session-token.v1";
  11  | const CONSENT_SCOPE_IDS = ["identity.core", "workflow.audit"];
  12  | 
  13  | type ActorRole = "farmer" | "buyer";
  14  | type SessionSeed = {
  15  |   accessToken: string;
  16  |   session: {
  17  |     actor: {
  18  |       actor_id: string;
  19  |       country_code: string;
  20  |       role: ActorRole;
  21  |     };
  22  |   };
  23  | };
  24  | 
  25  | async function createAuthenticatedSession(
  26  |   request: APIRequestContext,
  27  |   input: {
  28  |     displayName: string;
  29  |     email: string;
  30  |     role: ActorRole;
  31  |     countryCode?: "GH" | "NG" | "JM";
  32  |   },
  33  | ): Promise<SessionSeed> {
  34  |   const signInRequestId = crypto.randomUUID();
> 35  |   const signInResponse = await request.post(`${API_BASE_URL}/api/v1/identity/session`, {
      |                                        ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8000
  36  |     data: {
  37  |       display_name: input.displayName,
  38  |       email: input.email,
  39  |       role: input.role,
  40  |       country_code: input.countryCode ?? "GH",
  41  |     },
  42  |     headers: {
  43  |       "X-Correlation-ID": signInRequestId,
  44  |       "X-Request-ID": signInRequestId,
  45  |     },
  46  |   });
  47  |   expect(signInResponse.ok()).toBeTruthy();
  48  |   const signInPayload = (await signInResponse.json()) as {
  49  |     access_token: string;
  50  |     session: SessionSeed["session"];
  51  |   };
  52  | 
  53  |   const consentRequestId = crypto.randomUUID();
  54  |   const consentResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent`, {
  55  |     data: {
  56  |       captured_at: new Date().toISOString(),
  57  |       policy_version: "2026.04.w1",
  58  |       scope_ids: CONSENT_SCOPE_IDS,
  59  |     },
  60  |     headers: {
  61  |       Authorization: `Bearer ${signInPayload.access_token}`,
  62  |       "X-Correlation-ID": consentRequestId,
  63  |       "X-Request-ID": consentRequestId,
  64  |     },
  65  |   });
  66  |   expect(consentResponse.ok()).toBeTruthy();
  67  | 
  68  |   return {
  69  |     accessToken: signInPayload.access_token,
  70  |     session: (await consentResponse.json()) as SessionSeed["session"],
  71  |   };
  72  | }
  73  | 
  74  | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  75  |   await gotoPath(page, "/signin");
  76  |   await page.evaluate(
  77  |     ([sessionKey, tokenKey, session, token]) => {
  78  |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  79  |       window.localStorage.setItem(tokenKey, token);
  80  |     },
  81  |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  82  |   );
  83  | }
  84  | 
  85  | async function activateSession(page: Page, sessionSeed: SessionSeed, route: "/app/farmer" | "/app/buyer"): Promise<void> {
  86  |   await primeSession(page, sessionSeed);
  87  |   await gotoPath(page, route);
  88  |   await waitForWorkspaceReady(page);
  89  | }
  90  | 
  91  | async function waitForWorkspaceReady(page: Page): Promise<void> {
  92  |   await page.getByText("Loading workspace").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  93  | }
  94  | 
  95  | async function publishListingViaCommand(
  96  |   request: APIRequestContext,
  97  |   page: Page,
  98  |   listingId: string,
  99  | ): Promise<void> {
  100 |   const token = await page.evaluate(() => window.localStorage.getItem("agrodomain.session-token.v1"));
  101 |   const sessionRaw = await page.evaluate(() => window.localStorage.getItem("agrodomain.session.v2"));
  102 |   if (!token || !sessionRaw) {
  103 |     throw new Error("Expected seller token and session in localStorage");
  104 |   }
  105 | 
  106 |   const session = JSON.parse(sessionRaw) as {
  107 |     actor: {
  108 |       actor_id: string;
  109 |       country_code: string;
  110 |     };
  111 |   };
  112 |   const requestId = crypto.randomUUID();
  113 |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  114 |     data: {
  115 |       metadata: {
  116 |         request_id: requestId,
  117 |         idempotency_key: requestId,
  118 |         actor_id: session.actor.actor_id,
  119 |         country_code: session.actor.country_code,
  120 |         channel: "pwa",
  121 |         schema_version: SCHEMA_VERSION,
  122 |         correlation_id: requestId,
  123 |         occurred_at: new Date().toISOString(),
  124 |         traceability: {
  125 |           journey_ids: ["CJ-002"],
  126 |           data_check_ids: ["DI-001"],
  127 |         },
  128 |       },
  129 |       command: {
  130 |         name: "market.listings.publish",
  131 |         aggregate_ref: listingId,
  132 |         mutation_scope: "marketplace.listings",
  133 |         payload: {
  134 |           listing_id: listingId,
  135 |         },
```