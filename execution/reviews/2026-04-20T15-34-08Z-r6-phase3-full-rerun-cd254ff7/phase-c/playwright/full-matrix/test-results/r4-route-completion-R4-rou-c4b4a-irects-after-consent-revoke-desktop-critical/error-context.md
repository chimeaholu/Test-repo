# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> server-authoritative home posture redirects after consent revoke
- Location: tests/e2e/r4-route-completion.spec.ts:301:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Protected path open/i)
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText(/Protected path open/i)

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - alert [ref=e3]
  - generic [ref=e4]:
    - link "Skip to content" [ref=e5] [cursor=pointer]:
      - /url: "#main-content"
    - main [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]:
            - generic [ref=e10]: Buyer
            - generic [ref=e11]: GH
          - paragraph [ref=e12]: R4 Consent Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e13]
          - paragraph [ref=e14]: r4.role-home.1776699774700@example.com · Buyer · GH
          - paragraph [ref=e15]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e16]:
          - generic [ref=e17]: Trace trace--app-buyer-hlfhg8
          - button "Sign out" [ref=e18] [cursor=pointer]
      - region "Sync status" [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e22]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e23]
          - paragraph [ref=e24]: "Pending items: 0. Conflicts: 0. Trace ID: trace--app-buyer-hlfhg8."
        - generic [ref=e25]:
          - button "Force online" [ref=e26] [cursor=pointer]
          - button "Simulate degraded" [ref=e27] [cursor=pointer]
          - button "Simulate offline" [ref=e28] [cursor=pointer]
      - generic [ref=e29]:
        - complementary [ref=e30]:
          - generic [ref=e31]:
            - generic [ref=e32]:
              - generic [ref=e34]:
                - paragraph [ref=e35]: Role-aware workspace
                - heading "Buyer operations" [level=2] [ref=e36]
                - paragraph [ref=e37]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e38]:
                - generic [ref=e39]:
                  - link "Home" [ref=e40] [cursor=pointer]:
                    - /url: /app/buyer
                    - generic [ref=e41]: Home
                  - link "Market" [ref=e42] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e43]: Market
                  - link "Inbox" [ref=e44] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e45]: Inbox
                  - link "Alerts" [ref=e46] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e47]: Alerts
                  - link "Profile 2" [ref=e48] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e49]: Profile
                    - generic [ref=e50]: "2"
            - list [ref=e51]:
              - listitem [ref=e52]:
                - generic [ref=e53]: Home route
                - strong [ref=e54]: /app/buyer
              - listitem [ref=e55]:
                - generic [ref=e56]: Field posture
                - strong [ref=e57]: Offer work
              - listitem [ref=e58]:
                - generic [ref=e59]: Proof posture
                - strong [ref=e60]: Proof before commitment
            - complementary [ref=e61]:
              - strong [ref=e62]: Design note
              - paragraph [ref=e63]: Listing proof, identity state, and queue continuity appear before deal actions.
        - generic [ref=e64]:
          - generic [ref=e65]:
            - generic [ref=e66]:
              - generic [ref=e67]:
                - paragraph [ref=e68]: Buyer flow
                - heading "Review supply quickly, inspect proof, and move offers without losing context." [level=2] [ref=e69]
                - paragraph [ref=e70]: The buyer home exposes trusted listing work first, then keeps proof and negotiation recovery within one tap.
              - generic [ref=e71]:
                - link "Review market" [ref=e72] [cursor=pointer]:
                  - /url: /app/market/listings
                - link "Open outbox" [ref=e73] [cursor=pointer]:
                  - /url: /app/offline/outbox
            - generic [ref=e74]:
              - generic [ref=e75]:
                - generic [ref=e76]:
                  - generic [ref=e77]: Consent active
                  - generic [ref=e78]: online
                  - generic [ref=e79]: Protected work available
                - paragraph [ref=e80]: Listing proof, identity state, and queue continuity appear before deal actions.
                - list [ref=e81]:
                  - listitem [ref=e82]:
                    - generic [ref=e83]: Offer work
                    - strong [ref=e84]: 0 active item(s)
                  - listitem [ref=e85]:
                    - generic [ref=e86]: Conflicts
                    - strong [ref=e87]: "0"
                  - listitem [ref=e88]:
                    - generic [ref=e89]: Policy version
                    - strong [ref=e90]: 2026.04.w1
                  - listitem [ref=e91]:
                    - generic [ref=e92]: Last consent capture
                    - strong [ref=e93]: 2026-04-20T15:42:54.764000
                - generic "Role landing summary" [ref=e94]:
                  - article [ref=e95]:
                    - generic [ref=e96]: Dominant action
                    - strong [ref=e97]: Review market
                    - paragraph [ref=e98]: The route starts with one clear next move rather than a dashboard of equal-weight options.
                  - article [ref=e99]:
                    - generic [ref=e100]: Recovery posture
                    - strong [ref=e101]: Queue is clear
                    - paragraph [ref=e102]: No queue conflicts are currently forcing an escalation.
              - generic [ref=e103]:
                - complementary [ref=e104]:
                  - strong [ref=e105]: Mobile mode
                  - paragraph [ref=e106]: Mobile browsing keeps actions short and evidence compact.
                - complementary [ref=e107]:
                  - strong [ref=e108]: Desktop mode
                  - paragraph [ref=e109]: Larger screens keep market details and trust signals side by side.
                - complementary [ref=e110]:
                  - strong [ref=e111]: Proof before commitment
                  - paragraph [ref=e112]: "Current access reason: ok. Trace trace--app-buyer-hlfhg8."
          - generic [ref=e113]:
            - generic [ref=e114]:
              - generic [ref=e116]:
                - paragraph [ref=e117]: Queue first
                - heading "Priority actions" [level=2] [ref=e118]
                - paragraph [ref=e119]: Every role lands on work that can be resumed immediately instead of a generic dashboard.
              - generic [ref=e120]:
                - link "Review offers Jump back into active negotiations with queue counts already surfaced." [ref=e121] [cursor=pointer]:
                  - /url: /app/market/negotiations
                  - strong [ref=e122]: Review offers
                  - paragraph [ref=e123]: Jump back into active negotiations with queue counts already surfaced.
                - link "Check alerts Climate or quality shifts can change buying posture before confirmation." [ref=e124] [cursor=pointer]:
                  - /url: /app/climate/alerts
                  - strong [ref=e125]: Check alerts
                  - paragraph [ref=e126]: Climate or quality shifts can change buying posture before confirmation.
            - generic [ref=e127]:
              - generic [ref=e129]:
                - paragraph [ref=e130]: State framing
                - heading "Workspace status" [level=2] [ref=e131]
                - paragraph [ref=e132]: These signals stay visible so teams know whether they can proceed, recover, or escalate.
              - generic [ref=e133]:
                - article [ref=e134]:
                  - text: Access status
                  - strong [ref=e135]: Ready
                  - paragraph [ref=e136]: Protected actions depend on current consent, not a stale local session.
                - article [ref=e137]:
                  - text: Queue depth
                  - strong [ref=e138]: "0"
                  - paragraph [ref=e139]: 0 conflict(s) currently need explicit attention.
                - article [ref=e140]:
                  - text: Next step
                  - strong [ref=e141]: Continue
                  - paragraph [ref=e142]: "Reason code: ok"
```

# Test source

```ts
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
  293 |     });
  294 | 
  295 |     await gotoPath(page, "/app/notifications");
  296 |     await waitForWorkspaceReady(page);
  297 |     await expect(page.getByRole("heading", { name: "Live route updates" })).toBeVisible({ timeout: 30_000 });
  298 |     await expect(page.getByText(/Escrow partner pending/i)).toBeVisible({ timeout: 30_000 });
  299 |   });
  300 | 
  301 |   test("server-authoritative home posture redirects after consent revoke", async ({ page, request }) => {
  302 |     const buyerSeed = await createAuthenticatedSession(request, {
  303 |       displayName: "R4 Consent Buyer",
  304 |       email: `r4.role-home.${Date.now()}@example.com`,
  305 |       role: "buyer",
  306 |       scopeIds: ["identity.core", "workflow.audit"],
  307 |     });
  308 |     await primeSession(page, buyerSeed);
  309 |     await gotoPath(page, "/app/buyer");
  310 |     await waitForWorkspaceReady(page);
> 311 |     await expect(page.getByText(/Protected path open/i)).toBeVisible({ timeout: 30_000 });
      |                                                          ^ Error: expect(locator).toBeVisible() failed
  312 | 
  313 |     const revokeResponse = await request.post(`${API_BASE_URL}/api/v1/identity/consent/revoke`, {
  314 |       data: {
  315 |         reason: "Server authoritative revoke for role-home proof",
  316 |       },
  317 |       headers: {
  318 |         Authorization: `Bearer ${buyerSeed.accessToken}`,
  319 |         "X-Request-ID": crypto.randomUUID(),
  320 |         "X-Correlation-ID": crypto.randomUUID(),
  321 |       },
  322 |     });
  323 |     expect(revokeResponse.ok()).toBeTruthy();
  324 | 
  325 |     await gotoPath(page, "/app/buyer");
  326 |     await expect(page).toHaveURL(/\/onboarding\/consent(\?.*)?$/, { timeout: 30_000 });
  327 |   });
  328 | });
  329 | 
```