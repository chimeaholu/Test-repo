# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buyer-discovery.spec.ts >> Buyer discovery and scoped read behavior >> buyer reaches the discovery shell and cannot read another actor's listing detail
- Location: tests/e2e/buyer-discovery.spec.ts:143:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Review supply quickly, inspect proof, and move offers without losing context.' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Review supply quickly, inspect proof, and move offers without losing context.' })

```

# Test source

```ts
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
  131 | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  132 |   await gotoPath(page, "/signin");
  133 |   await page.evaluate(
  134 |     ([sessionKey, tokenKey, session, token]) => {
  135 |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  136 |       window.localStorage.setItem(tokenKey, token);
  137 |     },
  138 |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  139 |   );
  140 | }
  141 | 
  142 | test.describe("Buyer discovery and scoped read behavior", () => {
  143 |   test("buyer reaches the discovery shell and cannot read another actor's listing detail", async ({
  144 |     page,
  145 |     request,
  146 |   }) => {
  147 |     const title = `Buyer discovery fixture ${Date.now()}`;
  148 |     const seller = await createAuthenticatedSession(request, {
  149 |       displayName: "Ama Mensah",
  150 |       email: `seller.${Date.now()}@example.com`,
  151 |       role: "farmer",
  152 |       countryCode: "GH",
  153 |     });
  154 |     const detailHref = await createListingViaApi(request, seller, {
  155 |       title,
  156 |       commodity: "Cassava",
  157 |       quantityTons: "5.0",
  158 |       priceAmount: "350",
  159 |       priceCurrency: "GHS",
  160 |       location: "Tamale, GH",
  161 |       summary: "Cassava fixture for buyer discovery coverage.",
  162 |     });
  163 |     const buyer = await createAuthenticatedSession(request, {
  164 |       displayName: "Kofi Buyer",
  165 |       email: `buyer.${Date.now()}@example.com`,
  166 |       role: "buyer",
  167 |       countryCode: "GH",
  168 |     });
  169 | 
  170 |     await primeSession(page, buyer);
  171 | 
  172 |     await gotoPath(page, "/app/buyer");
  173 |     await expect(
  174 |       page.getByRole("heading", {
  175 |         name: "Review supply quickly, inspect proof, and move offers without losing context.",
  176 |       }),
> 177 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  178 | 
  179 |     await gotoPath(page, "/app/market/listings");
  180 |     await expect(
  181 |       page.getByRole("heading", {
  182 |         name: "Discover live lots without owner controls leaking into view",
  183 |       }),
  184 |     ).toBeVisible();
  185 |     await expect(page.getByText("Draft leak prevention is explicit")).toBeVisible();
  186 | 
  187 |     await gotoPath(page, "/app/market/negotiations");
  188 |     await expect(
  189 |       page.getByRole("heading", {
  190 |         name: "Inbox and thread controls on the canonical N2-A2 runtime",
  191 |       }),
  192 |     ).toBeVisible();
  193 |     await expect(page.getByText("No visible threads yet")).toBeVisible();
  194 | 
  195 |     await gotoPath(page, detailHref);
  196 |     await expect(page.getByText(/listing_not_(published|found)/)).toBeVisible();
  197 |   });
  198 | });
  199 | 
```