# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: buyer-discovery.spec.ts >> Buyer discovery and scoped read behavior >> buyer reaches the discovery shell and cannot read another actor's listing detail
- Location: tests/e2e/buyer-discovery.spec.ts:145:7

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

# Page snapshot

```yaml
- generic:
  - generic [active]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - navigation [ref=e6]:
            - button "previous" [disabled] [ref=e7]:
              - img "previous" [ref=e8]
            - generic [ref=e10]:
              - generic [ref=e11]: 1/
              - text: "1"
            - button "next" [disabled] [ref=e12]:
              - img "next" [ref=e13]
          - img
        - generic [ref=e15]:
          - link "Next.js 15.5.15 (outdated) Webpack" [ref=e16] [cursor=pointer]:
            - /url: https://nextjs.org/docs/messages/version-staleness
            - img [ref=e17]
            - generic "An outdated version detected (latest is 16.2.4), upgrade is highly recommended!" [ref=e19]: Next.js 15.5.15 (outdated)
            - generic [ref=e20]: Webpack
          - img
      - generic [ref=e21]:
        - dialog "Runtime TypeError" [ref=e22]:
          - generic [ref=e25]:
            - generic [ref=e26]:
              - generic [ref=e27]:
                - generic [ref=e29]: Runtime TypeError
                - generic [ref=e30]:
                  - button "Copy Error Info" [ref=e31] [cursor=pointer]:
                    - img [ref=e32]
                  - button "No related documentation found" [disabled] [ref=e34]:
                    - img [ref=e35]
                  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools" [ref=e37] [cursor=pointer]:
                    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
                    - img [ref=e38]
              - paragraph [ref=e47]: __webpack_modules__[moduleId] is not a function
            - generic [ref=e49]:
              - generic [ref=e50]:
                - paragraph [ref=e51]:
                  - text: Call Stack
                  - generic [ref=e52]: "10"
                - button "Show 8 ignore-listed frame(s)" [ref=e53] [cursor=pointer]:
                  - text: Show 8 ignore-listed frame(s)
                  - img [ref=e54]
              - generic [ref=e56]:
                - generic [ref=e57]: __webpack_exec__
                - text: .next/server/app/app/[role]/page.js (695:39)
              - generic [ref=e58]:
                - generic [ref=e59]: <unknown>
                - text: .next/server/app/app/[role]/page.js (696:223)
          - generic [ref=e60]:
            - generic [ref=e61]: "1"
            - generic [ref=e62]: "2"
        - contentinfo [ref=e63]:
          - region "Error feedback" [ref=e64]:
            - paragraph [ref=e65]:
              - link "Was this helpful?" [ref=e66] [cursor=pointer]:
                - /url: https://nextjs.org/telemetry#error-feedback
            - button "Mark as helpful" [ref=e67] [cursor=pointer]:
              - img [ref=e68]
            - button "Mark as not helpful" [ref=e71] [cursor=pointer]:
              - img [ref=e72]
    - generic [ref=e78] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e79]:
        - img [ref=e80]
      - generic [ref=e83]:
        - button "Open issues overlay" [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e86]: "0"
            - generic [ref=e87]: "1"
          - generic [ref=e88]: Issue
        - button "Collapse issues badge" [ref=e89]:
          - img [ref=e90]
  - alert [ref=e92]
```

# Test source

```ts
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
  133 | async function primeSession(page: Page, sessionSeed: SessionSeed): Promise<void> {
  134 |   await gotoPath(page, "/signin");
  135 |   await page.evaluate(
  136 |     ([sessionKey, tokenKey, session, token]) => {
  137 |       window.localStorage.setItem(sessionKey, JSON.stringify(session));
  138 |       window.localStorage.setItem(tokenKey, token);
  139 |     },
  140 |     [SESSION_KEY, TOKEN_KEY, sessionSeed.session, sessionSeed.accessToken],
  141 |   );
  142 | }
  143 | 
  144 | test.describe("Buyer discovery and scoped read behavior", () => {
  145 |   test("buyer reaches the discovery shell and cannot read another actor's listing detail", async ({
  146 |     page,
  147 |     request,
  148 |   }) => {
  149 |     const title = `Buyer discovery fixture ${Date.now()}`;
  150 |     const seller = await createAuthenticatedSession(request, {
  151 |       displayName: "Ama Mensah",
  152 |       email: `seller.${Date.now()}@example.com`,
  153 |       role: "farmer",
  154 |       countryCode: "GH",
  155 |     });
  156 |     const detailHref = await createListingViaApi(request, seller, {
  157 |       title,
  158 |       commodity: "Cassava",
  159 |       quantityTons: "5.0",
  160 |       priceAmount: "350",
  161 |       priceCurrency: "GHS",
  162 |       location: "Tamale, GH",
  163 |       summary: "Cassava fixture for buyer discovery coverage.",
  164 |     });
  165 |     const buyer = await createAuthenticatedSession(request, {
  166 |       displayName: "Kofi Buyer",
  167 |       email: `buyer.${Date.now()}@example.com`,
  168 |       role: "buyer",
  169 |       countryCode: "GH",
  170 |     });
  171 | 
  172 |     await primeSession(page, buyer);
  173 | 
  174 |     await gotoPath(page, "/app/buyer");
  175 |     await expect(
  176 |       page.getByRole("heading", {
  177 |         name: "Review supply quickly, inspect proof, and move offers without losing context.",
  178 |       }),
> 179 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  180 | 
  181 |     await gotoPath(page, "/app/market/listings");
  182 |     await expect(
  183 |       page.getByRole("heading", {
  184 |         name: "Discover live lots without owner controls leaking into view",
  185 |       }),
  186 |     ).toBeVisible();
  187 |     await expect(page.getByText("Draft leak prevention is explicit")).toBeVisible();
  188 | 
  189 |     await gotoPath(page, "/app/market/negotiations");
  190 |     await expect(
  191 |       page.getByRole("heading", {
  192 |         name: "Inbox and thread controls on the canonical N2-A2 runtime",
  193 |       }),
  194 |     ).toBeVisible();
  195 |     await expect(page.getByText("No visible threads yet")).toBeVisible();
  196 | 
  197 |     await gotoPath(page, detailHref);
  198 |     await expect(page.getByText(/listing_not_(published|found)/)).toBeVisible();
  199 |   });
  200 | });
  201 | 
```