# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> server-authoritative home posture redirects after consent revoke
- Location: tests/e2e/r4-route-completion.spec.ts:301:7

# Error details

```
Error: Channel closed
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Protected path open/i)
Expected: visible
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
            - generic [ref=e19]: Buyer
            - generic [ref=e20]: GH
          - paragraph [ref=e21]: R4 Consent Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: r4.role-home.1776696179556@example.com · Buyer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace--app-buyer-mgr2ij
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 0. Conflicts: 0. Trace ID: trace--app-buyer-mgr2ij."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e38]:
        - complementary [ref=e39]:
          - generic [ref=e40]:
            - generic [ref=e41]:
              - generic [ref=e43]:
                - paragraph [ref=e44]: Role-aware workspace
                - heading "Buyer operations" [level=2] [ref=e45]
                - paragraph [ref=e46]: The workspace routes to the correct role surface while keeping consent, queue, and offline state visible.
              - navigation "Primary" [ref=e47]:
                - generic [ref=e48]:
                  - link "Home" [ref=e49] [cursor=pointer]:
                    - /url: /app/buyer
                    - generic [ref=e50]: Home
                  - link "Market" [ref=e51] [cursor=pointer]:
                    - /url: /app/market/listings
                    - generic [ref=e52]: Market
                  - link "Inbox" [ref=e53] [cursor=pointer]:
                    - /url: /app/market/negotiations
                    - generic [ref=e54]: Inbox
                  - link "Alerts" [ref=e55] [cursor=pointer]:
                    - /url: /app/climate/alerts
                    - generic [ref=e56]: Alerts
                  - link "Profile 2" [ref=e57] [cursor=pointer]:
                    - /url: /app/profile
                    - generic [ref=e58]: Profile
                    - generic [ref=e59]: "2"
            - list [ref=e60]:
              - listitem [ref=e61]:
                - generic [ref=e62]: Home route
                - strong [ref=e63]: /app/buyer
              - listitem [ref=e64]:
                - generic [ref=e65]: Field posture
                - strong [ref=e66]: Offer work
              - listitem [ref=e67]:
                - generic [ref=e68]: Proof posture
                - strong [ref=e69]: Proof before commitment
            - complementary [ref=e70]:
              - strong [ref=e71]: Design note
              - paragraph [ref=e72]: Listing proof, identity state, and queue continuity appear before deal actions.
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]:
              - generic [ref=e76]:
                - paragraph [ref=e77]: Buyer flow
                - heading "Review supply quickly, inspect proof, and move offers without losing context." [level=2] [ref=e78]
                - paragraph [ref=e79]: The buyer home exposes trusted listing work first, then keeps proof and negotiation recovery within one tap.
              - generic [ref=e80]:
                - link "Review market" [ref=e81] [cursor=pointer]:
                  - /url: /app/market/listings
                - link "Open outbox" [ref=e82] [cursor=pointer]:
                  - /url: /app/offline/outbox
            - generic [ref=e83]:
              - generic [ref=e84]:
                - generic [ref=e85]:
                  - generic [ref=e86]: Consent active
                  - generic [ref=e87]: online
                  - generic [ref=e88]: Protected work available
                - paragraph [ref=e89]: Listing proof, identity state, and queue continuity appear before deal actions.
                - list [ref=e90]:
                  - listitem [ref=e91]:
                    - generic [ref=e92]: Offer work
                    - strong [ref=e93]: 0 active item(s)
                  - listitem [ref=e94]:
                    - generic [ref=e95]: Conflicts
                    - strong [ref=e96]: "0"
                  - listitem [ref=e97]:
                    - generic [ref=e98]: Policy version
                    - strong [ref=e99]: 2026.04.w1
                  - listitem [ref=e100]:
                    - generic [ref=e101]: Last consent capture
                    - strong [ref=e102]: 2026-04-20T14:42:59.706000
                - generic "Role landing summary" [ref=e103]:
                  - article [ref=e104]:
                    - generic [ref=e105]: Dominant action
                    - strong [ref=e106]: Review market
                    - paragraph [ref=e107]: The route starts with one clear next move rather than a dashboard of equal-weight options.
                  - article [ref=e108]:
                    - generic [ref=e109]: Recovery posture
                    - strong [ref=e110]: Queue is clear
                    - paragraph [ref=e111]: No queue conflicts are currently forcing an escalation.
              - generic [ref=e112]:
                - complementary [ref=e113]:
                  - strong [ref=e114]: Mobile mode
                  - paragraph [ref=e115]: Mobile browsing keeps actions short and evidence compact.
                - complementary [ref=e116]:
                  - strong [ref=e117]: Desktop mode
                  - paragraph [ref=e118]: Larger screens keep market details and trust signals side by side.
                - complementary [ref=e119]:
                  - strong [ref=e120]: Proof before commitment
                  - paragraph [ref=e121]: "Current access reason: ok. Trace trace--app-buyer-mgr2ij."
          - generic [ref=e122]:
            - generic [ref=e123]:
              - generic [ref=e125]:
                - paragraph [ref=e126]: Queue first
                - heading "Priority actions" [level=2] [ref=e127]
                - paragraph [ref=e128]: Every role lands on work that can be resumed immediately instead of a generic dashboard.
              - generic [ref=e129]:
                - link "Review offers Jump back into active negotiations with queue counts already surfaced." [ref=e130] [cursor=pointer]:
                  - /url: /app/market/negotiations
                  - strong [ref=e131]: Review offers
                  - paragraph [ref=e132]: Jump back into active negotiations with queue counts already surfaced.
                - link "Check alerts Climate or quality shifts can change buying posture before confirmation." [ref=e133] [cursor=pointer]:
                  - /url: /app/climate/alerts
                  - strong [ref=e134]: Check alerts
                  - paragraph [ref=e135]: Climate or quality shifts can change buying posture before confirmation.
            - generic [ref=e136]:
              - generic [ref=e138]:
                - paragraph [ref=e139]: State framing
                - heading "Workspace status" [level=2] [ref=e140]
                - paragraph [ref=e141]: These signals stay visible so teams know whether they can proceed, recover, or escalate.
              - generic [ref=e142]:
                - article [ref=e143]:
                  - text: Access status
                  - strong [ref=e144]: Ready
                  - paragraph [ref=e145]: Protected actions depend on current consent, not a stale local session.
                - article [ref=e146]:
                  - text: Queue depth
                  - strong [ref=e147]: "0"
                  - paragraph [ref=e148]: 0 conflict(s) currently need explicit attention.
                - article [ref=e149]:
                  - text: Next step
                  - strong [ref=e150]: Continue
                  - paragraph [ref=e151]: "Reason code: ok"
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