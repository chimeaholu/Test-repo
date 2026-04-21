# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> admin analytics and cooperative dispatch routes are live and navigable
- Location: tests/e2e/r4-route-completion.spec.ts:171:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Service health' })
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('heading', { name: 'Service health' })

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
                  - generic [ref=e52]: "36"
                - button "Show 32 ignore-listed frame(s)" [ref=e53] [cursor=pointer]:
                  - text: Show 32 ignore-listed frame(s)
                  - img [ref=e54]
              - generic [ref=e56]:
                - generic [ref=e57]: __webpack_exec__
                - text: .next/server/app/_not-found/page.js (534:39)
              - generic [ref=e58]:
                - generic [ref=e59]: <unknown>
                - text: .next/server/app/_not-found/page.js (535:223)
              - generic [ref=e60]:
                - generic [ref=e61]: <unknown>
                - text: .next/server/app/_not-found/page.js (535:47)
              - generic [ref=e62]:
                - generic [ref=e63]: Object.<anonymous>
                - text: .next/server/app/_not-found/page.js (538:3)
          - generic [ref=e64]:
            - generic [ref=e65]: "1"
            - generic [ref=e66]: "2"
        - contentinfo [ref=e67]:
          - region "Error feedback" [ref=e68]:
            - paragraph [ref=e69]:
              - link "Was this helpful?" [ref=e70] [cursor=pointer]:
                - /url: https://nextjs.org/telemetry#error-feedback
            - button "Mark as helpful" [ref=e71] [cursor=pointer]:
              - img [ref=e72]
            - button "Mark as not helpful" [ref=e75] [cursor=pointer]:
              - img [ref=e76]
    - generic [ref=e82] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e83]:
        - img [ref=e84]
      - generic [ref=e87]:
        - button "Open issues overlay" [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]: "0"
            - generic [ref=e91]: "1"
          - generic [ref=e92]: Issue
        - button "Collapse issues badge" [ref=e93]:
          - img [ref=e94]
  - alert [ref=e96]
```

# Test source

```ts
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
  137 |   const requestId = crypto.randomUUID();
  138 |   const response = await request.post(`${API_BASE_URL}/api/v1/workflow/commands`, {
  139 |     data: {
  140 |       metadata: {
  141 |         request_id: requestId,
  142 |         idempotency_key: requestId,
  143 |         actor_id: actorId,
  144 |         country_code: countryCode,
  145 |         channel: "pwa",
  146 |         schema_version: SCHEMA_VERSION,
  147 |         correlation_id: requestId,
  148 |         occurred_at: new Date().toISOString(),
  149 |         traceability: {
  150 |           journey_ids: ["CJ-003"],
  151 |           data_check_ids: ["DI-003"],
  152 |         },
  153 |       },
  154 |       command: {
  155 |         name,
  156 |         aggregate_ref: aggregateRef,
  157 |         mutation_scope: "marketplace.negotiations",
  158 |         payload,
  159 |       },
  160 |     },
  161 |     headers: {
  162 |       Authorization: `Bearer ${token}`,
  163 |     },
  164 |   });
  165 |   expect(response.ok()).toBeTruthy();
  166 | }
  167 | 
  168 | test.describe("R4 route completion proof", () => {
  169 |   test.setTimeout(240_000);
  170 | 
  171 |   test("admin analytics and cooperative dispatch routes are live and navigable", async ({ page, request }) => {
  172 |     const adminSeed = await createAuthenticatedSession(request, {
  173 |       displayName: "R4 Admin",
  174 |       email: `r4.admin.${Date.now()}@example.com`,
  175 |       role: "admin",
  176 |       scopeIds: ["identity.core", "workflow.audit", "admin.observability", "admin.rollout"],
  177 |     });
  178 |     await primeSession(page, adminSeed);
  179 |     await gotoPath(page, "/app/admin");
  180 |     await waitForWorkspaceReady(page);
> 181 |     await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible({ timeout: 30_000 });
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  182 |     await expect(page.getByRole("button", { name: /Freeze rollout/i })).toBeVisible();
  183 |     await expect(page.getByText("Admin analytics route")).toHaveCount(0);
  184 | 
  185 |     await signInAndGrantConsent(page, {
  186 |       displayName: "R4 Cooperative",
  187 |       email: `r4.coop.${Date.now()}@example.com`,
  188 |       role: "cooperative",
  189 |     });
  190 |     await gotoPath(page, "/app/cooperative/dispatch");
  191 |     await waitForWorkspaceReady(page);
  192 |     await expect(page.getByRole("heading", { name: "Member dispatch board" })).toBeVisible({ timeout: 30_000 });
  193 |     await expect(page.getByText("Dispatch operations route")).toHaveCount(0);
  194 |   });
  195 | 
  196 |   test("wallet and notifications routes surface live escrow state after accepted negotiation", async ({ page, request }) => {
  197 |     const stamp = Date.now();
  198 |     const seller = await createAuthenticatedSession(request, {
  199 |       displayName: "R4 Seller",
  200 |       email: `r4.seller.${stamp}@example.com`,
  201 |       role: "farmer",
  202 |       scopeIds: ["identity.core", "workflow.audit"],
  203 |     });
  204 |     const buyer = await createAuthenticatedSession(request, {
  205 |       displayName: "R4 Buyer",
  206 |       email: `r4.buyer.${stamp}@example.com`,
  207 |       role: "buyer",
  208 |       scopeIds: ["identity.core", "workflow.audit", "notifications.delivery"],
  209 |     });
  210 | 
  211 |     await primeSession(page, seller);
  212 |     const detailHref = await createListing(page, {
  213 |       title: `R4 wallet route cassava ${stamp}`,
  214 |       commodity: "Cassava",
  215 |       quantityTons: "5.0",
  216 |       priceAmount: "420",
  217 |       priceCurrency: "GHS",
  218 |       location: "Tamale, GH",
  219 |       summary: "Accepted negotiation route proof for wallet and notification surfaces.",
  220 |     });
  221 |     const listingId = listingIdFromHref(detailHref);
  222 |     await publishListingViaCommand(
  223 |       request,
  224 |       seller.accessToken,
  225 |       seller.session.actor.actor_id,
  226 |       seller.session.actor.country_code,
  227 |       listingId,
  228 |     );
  229 | 
  230 |     await requestNegotiationCommand(
  231 |       request,
  232 |       buyer.accessToken,
  233 |       buyer.session.actor.actor_id,
  234 |       buyer.session.actor.country_code,
  235 |       "market.negotiations.create",
  236 |       listingId,
  237 |       {
  238 |         listing_id: listingId,
  239 |         offer_amount: 405,
  240 |         offer_currency: "GHS",
  241 |         note: "R4 buyer offer",
  242 |       },
  243 |     );
  244 | 
  245 |     const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
  246 |       headers: {
  247 |         Authorization: `Bearer ${buyer.accessToken}`,
  248 |       },
  249 |     });
  250 |     expect(threadsResponse.ok()).toBeTruthy();
  251 |     const threadPayload = (await threadsResponse.json()) as {
  252 |       items: Array<{ listing_id: string; thread_id: string }>;
  253 |     };
  254 |     const threadId = threadPayload.items.find((item) => item.listing_id === listingId)?.thread_id;
  255 |     expect(threadId).toBeTruthy();
  256 | 
  257 |     await requestNegotiationCommand(
  258 |       request,
  259 |       seller.accessToken,
  260 |       seller.session.actor.actor_id,
  261 |       seller.session.actor.country_code,
  262 |       "market.negotiations.confirm.request",
  263 |       threadId!,
  264 |       {
  265 |         thread_id: threadId,
  266 |         required_confirmer_actor_id: buyer.session.actor.actor_id,
  267 |         note: "Seller requests final confirmation.",
  268 |       },
  269 |     );
  270 |     await requestNegotiationCommand(
  271 |       request,
  272 |       buyer.accessToken,
  273 |       buyer.session.actor.actor_id,
  274 |       buyer.session.actor.country_code,
  275 |       "market.negotiations.confirm.approve",
  276 |       threadId!,
  277 |       {
  278 |         thread_id: threadId,
  279 |         note: "Buyer approves accepted thread.",
  280 |       },
  281 |     );
```