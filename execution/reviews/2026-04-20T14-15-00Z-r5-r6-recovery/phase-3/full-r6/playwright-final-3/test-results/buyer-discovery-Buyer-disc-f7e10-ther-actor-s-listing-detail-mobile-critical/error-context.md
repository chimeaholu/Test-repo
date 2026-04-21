# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buyer-discovery.spec.ts >> Buyer discovery and scoped read behavior >> buyer reaches the discovery shell and cannot read another actor's listing detail
- Location: tests/e2e/buyer-discovery.spec.ts:145:7

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8213
Call log:
  - → POST http://127.0.0.1:8213/api/v1/identity/session
    - user-agent: Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Mobile Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - X-Correlation-ID: afc0dda3-852e-4575-a265-2f2b0fb82f6a
    - X-Request-ID: afc0dda3-852e-4575-a265-2f2b0fb82f6a
    - content-type: application/json
    - content-length: 108

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
  10  | const CONSENT_SCOPE_IDS = ["identity.core", "workflow.audit"];
  11  | const apiBaseUrl =
  12  |   process.env.AGRO_E2E_API_BASE_URL ??
  13  |   `http://127.0.0.1:${process.env.AGRO_E2E_API_PORT ?? "8000"}`;
  14  | 
  15  | type ActorRole = "farmer" | "buyer";
  16  | 
  17  | type SessionSeed = {
  18  |   accessToken: string;
  19  |   session: Record<string, unknown>;
  20  | };
  21  | 
  22  | async function createAuthenticatedSession(
  23  |   request: APIRequestContext,
  24  |   input: {
  25  |     displayName: string;
  26  |     email: string;
  27  |     role: ActorRole;
  28  |     countryCode: "GH" | "NG" | "JM";
  29  |   },
  30  | ): Promise<SessionSeed> {
  31  |   const signInRequestId = crypto.randomUUID();
> 32  |   const signInResponse = await request.post(`${apiBaseUrl}/api/v1/identity/session`, {
      |                                        ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8213
  33  |     data: {
  34  |       display_name: input.displayName,
  35  |       email: input.email,
  36  |       role: input.role,
  37  |       country_code: input.countryCode,
  38  |     },
  39  |     headers: {
  40  |       "X-Correlation-ID": signInRequestId,
  41  |       "X-Request-ID": signInRequestId,
  42  |     },
  43  |   });
  44  |   expect(signInResponse.ok()).toBeTruthy();
  45  |   const signInPayload = (await signInResponse.json()) as {
  46  |     access_token: string;
  47  |     session: Record<string, unknown>;
  48  |   };
  49  | 
  50  |   const consentRequestId = crypto.randomUUID();
  51  |   const consentResponse = await request.post(`${apiBaseUrl}/api/v1/identity/consent`, {
  52  |     data: {
  53  |       captured_at: new Date().toISOString(),
  54  |       policy_version: "2026.04.w1",
  55  |       scope_ids: CONSENT_SCOPE_IDS,
  56  |     },
  57  |     headers: {
  58  |       Authorization: `Bearer ${signInPayload.access_token}`,
  59  |       "X-Correlation-ID": consentRequestId,
  60  |       "X-Request-ID": consentRequestId,
  61  |     },
  62  |   });
  63  |   expect(consentResponse.ok()).toBeTruthy();
  64  | 
  65  |   return {
  66  |     accessToken: signInPayload.access_token,
  67  |     session: (await consentResponse.json()) as Record<string, unknown>,
  68  |   };
  69  | }
  70  | 
  71  | async function createListingViaApi(
  72  |   request: APIRequestContext,
  73  |   seller: SessionSeed,
  74  |   input: {
  75  |     title: string;
  76  |     commodity: string;
  77  |     quantityTons: string;
  78  |     priceAmount: string;
  79  |     priceCurrency: string;
  80  |     location: string;
  81  |     summary: string;
  82  |   },
  83  | ): Promise<string> {
  84  |   const requestId = crypto.randomUUID();
  85  |   const response = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
  86  |     data: {
  87  |       metadata: {
  88  |         request_id: requestId,
  89  |         idempotency_key: crypto.randomUUID(),
  90  |         actor_id: ((seller.session.actor as { actor_id: string }).actor_id),
  91  |         country_code: ((seller.session.actor as { country_code: string }).country_code),
  92  |         channel: "pwa",
  93  |         schema_version: schemaVersion,
  94  |         correlation_id: requestId,
  95  |         occurred_at: new Date().toISOString(),
  96  |         traceability: {
  97  |           journey_ids: ["CJ-002"],
  98  |           data_check_ids: ["DI-001"],
  99  |         },
  100 |       },
  101 |       command: {
  102 |         name: "market.listings.create",
  103 |         aggregate_ref: "listing",
  104 |         mutation_scope: "marketplace.listings",
  105 |         payload: {
  106 |           title: input.title,
  107 |           commodity: input.commodity,
  108 |           quantity_tons: Number(input.quantityTons),
  109 |           price_amount: Number(input.priceAmount),
  110 |           price_currency: input.priceCurrency,
  111 |           location: input.location,
  112 |           summary: input.summary,
  113 |         },
  114 |       },
  115 |     },
  116 |     headers: {
  117 |       Authorization: `Bearer ${seller.accessToken}`,
  118 |       "X-Correlation-ID": requestId,
  119 |       "X-Request-ID": requestId,
  120 |     },
  121 |   });
  122 |   expect(response.ok()).toBeTruthy();
  123 |   const payload = (await response.json()) as {
  124 |     result: {
  125 |       listing: {
  126 |         listing_id: string;
  127 |       };
  128 |     };
  129 |   };
  130 |   return `/app/market/listings/${payload.result.listing.listing_id}`;
  131 | }
  132 | 
```