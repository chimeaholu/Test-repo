# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-route-completion.spec.ts >> R4 route completion proof >> wallet and notifications routes surface live escrow state after accepted negotiation
- Location: tests/e2e/r4-route-completion.spec.ts:196:7

# Error details

```
Error: Channel closed
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Ledger provenance and escrow lifecycle' })
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('heading', { name: 'Ledger provenance and escrow lifecycle' })

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
          - paragraph [ref=e21]: R4 Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: r4.buyer.1776696311014@example.com · Buyer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace--payments-wallet-hbpir9
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 0. Conflicts: 0. Trace ID: trace--payments-wallet-hbpir9."
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
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76]:
              - generic [ref=e77]:
                - paragraph [ref=e78]: Wallet and escrow
                - heading "Track balances, escrow, and settlement exceptions" [level=2] [ref=e79]
                - paragraph [ref=e80]: Wallet balances, escrow activity, and settlement exceptions stay visible in one place so finance and operations teams can act with clear ledger context.
              - generic [ref=e82]:
                - generic [ref=e83]: 0 escrow(s)
                - generic [ref=e84]: 1 candidate(s)
            - generic "Wallet posture" [ref=e85]:
              - article [ref=e86]:
                - generic [ref=e87]: Available balance
                - strong [ref=e88]: "0.00"
                - paragraph [ref=e89]: GHS available for settlement movement.
              - article [ref=e90]:
                - generic [ref=e91]: Held balance
                - strong [ref=e92]: "0.00"
                - paragraph [ref=e93]: Funds currently retained in controlled flows.
              - article [ref=e94]:
                - generic [ref=e95]: Settlement risk
                - strong [ref=e96]: 1 item(s)
                - paragraph [ref=e97]: Escrows and accepted-deal candidates requiring attention.
          - generic [ref=e98]:
            - generic [ref=e99]:
              - generic [ref=e101]:
                - paragraph [ref=e102]: Ledger
                - heading "Wallet balance" [level=2] [ref=e103]
                - paragraph [ref=e104]: Available and held balances stay attributable to ledger entries and reconciliation markers.
              - complementary [ref=e105]:
                - strong [ref=e106]: Ledger interpretation
                - paragraph [ref=e107]: Operations and finance teams should be able to explain every held or released amount from this route without opening a separate reconciliation view.
              - list [ref=e108]:
                - listitem [ref=e109]:
                  - generic [ref=e110]: Wallet id
                  - strong [ref=e111]: wallet-gh-ghs-actor-buyer-gh-r4-buyer-1776696311014
                - listitem [ref=e112]:
                  - generic [ref=e113]: Currency
                  - strong [ref=e114]: GHS
                - listitem [ref=e115]:
                  - generic [ref=e116]: Available
                  - strong [ref=e117]: "0.00"
                - listitem [ref=e118]:
                  - generic [ref=e119]: Held
                  - strong [ref=e120]: "0.00"
                - listitem [ref=e121]:
                  - generic [ref=e122]: Total
                  - strong [ref=e123]: "0.00"
              - paragraph [ref=e125]: No ledger entries have been recorded for this wallet yet.
            - generic [ref=e126]:
              - generic [ref=e128]:
                - paragraph [ref=e129]: Escrow candidates
                - heading "Accepted deals waiting for escrow" [level=2] [ref=e130]
                - paragraph [ref=e131]: Accepted negotiation threads without escrow records can be started directly from this workspace.
              - paragraph [ref=e132]: These records are already commercially accepted. The next job is to start a controlled settlement path.
              - article [ref=e134]:
                - generic [ref=e135]:
                  - strong [ref=e136]: thread-7bafac39afa5
                  - generic [ref=e137]: Awaiting initiation
                - paragraph [ref=e138]: Listing listing-b80aea1f433c • 405 GHS
                - button "Start escrow" [ref=e139] [cursor=pointer]
          - generic [ref=e141]:
            - strong [ref=e142]: No active escrows
            - paragraph [ref=e143]: Escrow records will appear here after an accepted deal is moved into settlement.
```

# Test source

```ts
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
  282 | 
  283 |     await primeSession(page, buyer);
  284 |     await gotoPath(page, "/app/payments/wallet");
  285 |     await waitForWorkspaceReady(page);
> 286 |     await expect(page.getByRole("heading", { name: "Ledger provenance and escrow lifecycle" })).toBeVisible({ timeout: 30_000 });
      |                                                                                                 ^ Error: expect(locator).toBeVisible() failed
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
  311 |     await expect(page.getByText(/Protected path open/i)).toBeVisible({ timeout: 30_000 });
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