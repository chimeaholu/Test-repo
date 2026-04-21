# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buyer-discovery.spec.ts >> Buyer discovery and scoped read behavior >> buyer reaches the discovery shell and cannot read another actor's listing detail
- Location: tests/e2e/buyer-discovery.spec.ts:143:7

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8000
Call log:
  - → POST http://127.0.0.1:8000/api/v1/identity/session
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - X-Correlation-ID: e1c5f79d-9d8c-47ee-820f-ad5e0584dd2e
    - X-Request-ID: e1c5f79d-9d8c-47ee-820f-ad5e0584dd2e
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
  11  | const apiBaseUrl = process.env.AGRO_E2E_API_BASE_URL ?? "http://127.0.0.1:8000";
  12  | 
  13  | type ActorRole = "farmer" | "buyer";
  14  | 
  15  | type SessionSeed = {
  16  |   accessToken: string;
  17  |   session: Record<string, unknown>;
  18  | };
  19  | 
  20  | async function createAuthenticatedSession(
  21  |   request: APIRequestContext,
  22  |   input: {
  23  |     displayName: string;
  24  |     email: string;
  25  |     role: ActorRole;
  26  |     countryCode: "GH" | "NG" | "JM";
  27  |   },
  28  | ): Promise<SessionSeed> {
  29  |   const signInRequestId = crypto.randomUUID();
> 30  |   const signInResponse = await request.post(`${apiBaseUrl}/api/v1/identity/session`, {
      |                                        ^ Error: apiRequestContext.post: connect ECONNREFUSED 127.0.0.1:8000
  31  |     data: {
  32  |       display_name: input.displayName,
  33  |       email: input.email,
  34  |       role: input.role,
  35  |       country_code: input.countryCode,
  36  |     },
  37  |     headers: {
  38  |       "X-Correlation-ID": signInRequestId,
  39  |       "X-Request-ID": signInRequestId,
  40  |     },
  41  |   });
  42  |   expect(signInResponse.ok()).toBeTruthy();
  43  |   const signInPayload = (await signInResponse.json()) as {
  44  |     access_token: string;
  45  |     session: Record<string, unknown>;
  46  |   };
  47  | 
  48  |   const consentRequestId = crypto.randomUUID();
  49  |   const consentResponse = await request.post(`${apiBaseUrl}/api/v1/identity/consent`, {
  50  |     data: {
  51  |       captured_at: new Date().toISOString(),
  52  |       policy_version: "2026.04.w1",
  53  |       scope_ids: CONSENT_SCOPE_IDS,
  54  |     },
  55  |     headers: {
  56  |       Authorization: `Bearer ${signInPayload.access_token}`,
  57  |       "X-Correlation-ID": consentRequestId,
  58  |       "X-Request-ID": consentRequestId,
  59  |     },
  60  |   });
  61  |   expect(consentResponse.ok()).toBeTruthy();
  62  | 
  63  |   return {
  64  |     accessToken: signInPayload.access_token,
  65  |     session: (await consentResponse.json()) as Record<string, unknown>,
  66  |   };
  67  | }
  68  | 
  69  | async function createListingViaApi(
  70  |   request: APIRequestContext,
  71  |   seller: SessionSeed,
  72  |   input: {
  73  |     title: string;
  74  |     commodity: string;
  75  |     quantityTons: string;
  76  |     priceAmount: string;
  77  |     priceCurrency: string;
  78  |     location: string;
  79  |     summary: string;
  80  |   },
  81  | ): Promise<string> {
  82  |   const requestId = crypto.randomUUID();
  83  |   const response = await request.post(`${apiBaseUrl}/api/v1/workflow/commands`, {
  84  |     data: {
  85  |       metadata: {
  86  |         request_id: requestId,
  87  |         idempotency_key: crypto.randomUUID(),
  88  |         actor_id: ((seller.session.actor as { actor_id: string }).actor_id),
  89  |         country_code: ((seller.session.actor as { country_code: string }).country_code),
  90  |         channel: "pwa",
  91  |         schema_version: schemaVersion,
  92  |         correlation_id: requestId,
  93  |         occurred_at: new Date().toISOString(),
  94  |         traceability: {
  95  |           journey_ids: ["CJ-002"],
  96  |           data_check_ids: ["DI-001"],
  97  |         },
  98  |       },
  99  |       command: {
  100 |         name: "market.listings.create",
  101 |         aggregate_ref: "listing",
  102 |         mutation_scope: "marketplace.listings",
  103 |         payload: {
  104 |           title: input.title,
  105 |           commodity: input.commodity,
  106 |           quantity_tons: Number(input.quantityTons),
  107 |           price_amount: Number(input.priceAmount),
  108 |           price_currency: input.priceCurrency,
  109 |           location: input.location,
  110 |           summary: input.summary,
  111 |         },
  112 |       },
  113 |     },
  114 |     headers: {
  115 |       Authorization: `Bearer ${seller.accessToken}`,
  116 |       "X-Correlation-ID": requestId,
  117 |       "X-Request-ID": requestId,
  118 |     },
  119 |   });
  120 |   expect(response.ok()).toBeTruthy();
  121 |   const payload = (await response.json()) as {
  122 |     result: {
  123 |       listing: {
  124 |         listing_id: string;
  125 |       };
  126 |     };
  127 |   };
  128 |   return `/app/market/listings/${payload.result.listing.listing_id}`;
  129 | }
  130 | 
```