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

Locator: getByRole('heading', { name: 'Member dispatch board' })
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('heading', { name: 'Member dispatch board' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]
  - generic [ref=e13]:
    - link "Skip to content" [ref=e14] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]:
            - generic [ref=e19]: Cooperative
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: R4 Cooperative
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: r4.coop.1776695621689@example.com · Cooperative · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace-erative-dispatch-l9ljae
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: Low connectivity
            - generic [ref=e32]: Handoff ussd
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e33]
          - paragraph [ref=e34]: "Pending items: 1. Conflicts: 0. Trace ID: trace-erative-dispatch-l9ljae."
        - generic [ref=e35]:
          - button "Force online" [ref=e36] [cursor=pointer]
          - button "Simulate degraded" [ref=e37] [cursor=pointer]
          - button "Simulate offline" [ref=e38] [cursor=pointer]
      - generic [ref=e39]:
        - complementary [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e42]:
              - generic [ref=e44]:
                - paragraph [ref=e45]: Role-aware workspace
                - heading "Cooperative operations" [level=2] [ref=e46]
                - paragraph [ref=e47]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e48]:
                - generic [ref=e49]:
                  - link "Home" [ref=e50] [cursor=pointer]:
                    - /url: /app/cooperative
                    - generic [ref=e51]: Home
                  - link "Operations" [ref=e52] [cursor=pointer]:
                    - /url: /app/cooperative/dispatch
                    - generic [ref=e53]: Operations
                  - link "Market" [ref=e54] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e55]: Market
                  - link "Inbox 1" [ref=e56] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e57]: Inbox
                    - generic [ref=e58]: "1"
                  - link "Alerts" [ref=e59] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e60]: Alerts
                  - link "Profile 2" [ref=e61] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e62]: Profile
                    - generic [ref=e63]: "2"
            - list [ref=e64]:
              - listitem [ref=e65]:
                - generic [ref=e66]: Home route
                - strong [ref=e67]: /app/cooperative
              - listitem [ref=e68]:
                - generic [ref=e69]: Field posture
                - strong [ref=e70]: Operations queue
              - listitem [ref=e71]:
                - generic [ref=e72]: Proof posture
                - strong [ref=e73]: Operational proof
            - complementary [ref=e74]:
              - strong [ref=e75]: Design note
              - paragraph [ref=e76]: Dispatch state, member actions, and queue conflicts are framed as operational tasks, not buried system alerts.
        - generic [ref=e78]:
          - generic [ref=e79]:
            - generic [ref=e80]:
              - generic [ref=e81]:
                - paragraph [ref=e82]: Cooperative dispatch
                - heading "Coordinate dispatch, member actions, and proof checkpoints" [level=2] [ref=e83]
                - paragraph [ref=e84]: Listings, member queue status, and deal checkpoints stay visible in one operations view so dispatch teams can act without switching context.
              - generic [ref=e86]:
                - generic [ref=e87]: 1 active member queue items
                - generic [ref=e88]: 0 proof checkpoints
            - generic "Dispatch posture" [ref=e89]:
              - article [ref=e90]:
                - generic [ref=e91]: Member actions
                - strong [ref=e92]: "1"
                - paragraph [ref=e93]: Items still needing batching, follow-up, or recovery.
              - article [ref=e94]:
                - generic [ref=e95]: Checkpoint threads
                - strong [ref=e96]: "0"
                - paragraph [ref=e97]: Accepted or pending deals still shaping dispatch work.
              - article [ref=e98]:
                - generic [ref=e99]: Visible supply
                - strong [ref=e100]: "0"
                - paragraph [ref=e101]: Recent cooperative lots loaded into the workspace.
          - generic [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e105]:
                - paragraph [ref=e106]: Member queue
                - heading "Work that needs dispatch attention" [level=2] [ref=e107]
                - paragraph [ref=e108]: See which member actions still need batching, follow-up, or recovery before dispatch can move forward.
              - complementary [ref=e109]:
                - strong [ref=e110]: Queue discipline
                - paragraph [ref=e111]: Dispatch teams should be able to explain which member actions are blocking movement and which ones are only waiting for normal replay.
              - article [ref=e113]:
                - generic [ref=e114]:
                  - strong [ref=e115]: market.listings.create
                  - generic [ref=e116]: queued
                - paragraph [ref=e117]: Handoff ussd • Attempts 0
            - generic [ref=e118]:
              - generic [ref=e120]:
                - paragraph [ref=e121]: Deal checkpoints
                - heading "Accepted and pending negotiations" [level=2] [ref=e122]
                - paragraph [ref=e123]: Negotiation threads that can affect dispatch are surfaced alongside the listing they belong to.
              - paragraph [ref=e124]: This keeps commercial confirmation work adjacent to batching and transport decisions.
              - paragraph [ref=e126]: No accepted or pending negotiations are currently affecting dispatch.
          - generic [ref=e127]:
            - generic [ref=e129]:
              - paragraph [ref=e130]: Member supply
              - heading "Recent cooperative lots" [level=2] [ref=e131]
              - paragraph [ref=e132]: Keep current supply visible for batching, transport planning, and downstream handoff.
            - generic "Supply summary" [ref=e133]:
              - article [ref=e134]:
                - generic [ref=e135]: Published lots
                - strong [ref=e136]: "0"
                - paragraph [ref=e137]: Ready for downstream operational planning.
              - article [ref=e138]:
                - generic [ref=e139]: Draft or closed
                - strong [ref=e140]: "0"
                - paragraph [ref=e141]: Not yet ready for active dispatch allocation.
            - paragraph [ref=e143]: No cooperative lots are currently available for batching.
```

# Test source

```ts
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
  181 |     await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible({ timeout: 30_000 });
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
> 192 |     await expect(page.getByRole("heading", { name: "Member dispatch board" })).toBeVisible({ timeout: 30_000 });
      |                                                                                ^ Error: expect(locator).toBeVisible() failed
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
  282 | 
  283 |     await primeSession(page, buyer);
  284 |     await gotoPath(page, "/app/payments/wallet");
  285 |     await waitForWorkspaceReady(page);
  286 |     await expect(page.getByRole("heading", { name: "Ledger provenance and escrow lifecycle" })).toBeVisible({ timeout: 30_000 });
  287 |     await expect(page.getByRole("button", { name: "Initiate escrow" })).toBeVisible({ timeout: 30_000 });
  288 |     await page.getByRole("button", { name: "Initiate escrow" }).click();
  289 |     await expect(page.getByRole("button", { name: "Mark partner pending" })).toBeVisible({ timeout: 30_000 });
  290 |     await page.getByRole("button", { name: "Mark partner pending" }).click();
  291 |     await expect(page.locator(".status-pill").filter({ hasText: "partner_pending" }).first()).toBeVisible({
  292 |       timeout: 30_000,
```