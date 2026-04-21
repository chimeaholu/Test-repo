# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r5-ux-hardening.spec.ts >> R5 UX hardening proof >> captures seeded marketplace, wallet, notifications, and traceability flows
- Location: tests/e2e/r5-ux-hardening.spec.ts:337:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Track every live negotiation in one place' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Track every live negotiation in one place' })

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
          - paragraph [ref=e12]: R5 Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e13]
          - paragraph [ref=e14]: r5.buyer.1776699826357@example.com · Buyer · GH
          - paragraph [ref=e15]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e16]:
          - generic [ref=e17]: Trace trace-ket-negotiations-vqe0m1
          - button "Sign out" [ref=e18] [cursor=pointer]
      - region "Sync status" [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e22]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e23]
          - paragraph [ref=e24]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-vqe0m1."
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
        - generic [ref=e65]:
          - generic [ref=e66]:
            - generic [ref=e68]:
              - paragraph [ref=e69]: Offers and negotiations
              - heading "Inbox and thread controls on the canonical N2-A2 runtime" [level=2] [ref=e70]
              - paragraph [ref=e71]: Review active threads, create offers, respond with counters, and manage confirmation checkpoints without losing the audit trail.
            - generic [ref=e72]:
              - generic [ref=e73]: buyer
              - generic [ref=e74]: Accepted
            - generic "Negotiation workspace posture" [ref=e75]:
              - article [ref=e76]:
                - generic [ref=e77]: Visible threads
                - strong [ref=e78]: "1"
                - paragraph [ref=e79]: Only participant threads surface in this inbox.
              - article [ref=e80]:
                - generic [ref=e81]: Selected state
                - strong [ref=e82]: Accepted
                - paragraph [ref=e83]: Controls change as confirmation and terminal states evolve.
              - article [ref=e84]:
                - generic [ref=e85]: Evidence capture
                - strong [ref=e86]: Pending action
                - paragraph [ref=e87]: Request metadata appears after each regulated mutation.
          - generic [ref=e88]:
            - article [ref=e89]:
              - generic [ref=e91]:
                - paragraph [ref=e92]: Inbox
                - heading "Visible negotiations" [level=2] [ref=e93]
                - paragraph [ref=e94]: Only participant threads appear here. If you are not part of the negotiation, you do not see the thread or its confirmation controls.
              - generic "Inbox rules" [ref=e95]:
                - article [ref=e96]:
                  - heading "Scope is enforced" [level=3] [ref=e97]
                  - paragraph [ref=e98]: Threads outside your actor scope fail closed and stay out of the list.
                - article [ref=e99]:
                  - heading "Status drives controls" [level=3] [ref=e100]
                  - paragraph [ref=e101]: Open, pending confirmation, accepted, and rejected threads do not share the same actions.
              - list "Negotiation threads" [ref=e102]:
                - button "listing-e2e466092bd2 with actor-farmer-gh-r5-seller-1776699826357 Accepted Offer 405 GHS Updated 4/20/2026, 3:43:51 PM" [ref=e103] [cursor=pointer]:
                  - generic [ref=e104]:
                    - strong [ref=e105]: listing-e2e466092bd2 with actor-farmer-gh-r5-seller-1776699826357
                    - generic [ref=e106]: Accepted
                  - paragraph [ref=e107]: Offer 405 GHS
                  - paragraph [ref=e108]: Updated 4/20/2026, 3:43:51 PM
            - generic [ref=e109]:
              - article [ref=e110]:
                - generic [ref=e112]:
                  - paragraph [ref=e113]: Open offer
                  - heading "Buyer offer composer" [level=2] [ref=e114]
                  - paragraph [ref=e115]: Start with a published lot, submit one canonical offer, and keep the result visible if the request is replayed or retried.
                - paragraph [ref=e116]: This composer is buyer-only and assumes the lot has already passed the buyer-safe visibility boundary.
                - generic [ref=e117]:
                  - generic [ref=e118]:
                    - generic [ref=e119]: Listing ID
                    - textbox "Listing ID" [ref=e120]: listing-e2e466092bd2
                    - paragraph [ref=e121]: Use a published listing id. Owner and unpublished listings fail closed.
                  - generic [ref=e122]:
                    - generic [ref=e123]:
                      - generic [ref=e124]: Offer amount
                      - spinbutton "Offer amount" [ref=e125]: "500"
                    - generic [ref=e126]:
                      - generic [ref=e127]: Currency
                      - textbox "Currency" [ref=e128]: GHS
                  - generic [ref=e129]:
                    - generic [ref=e130]: Buyer note
                    - textbox "Buyer note" [ref=e131]
                  - button "Create offer thread" [ref=e132] [cursor=pointer]
              - article [ref=e133]:
                - generic [ref=e135]:
                  - paragraph [ref=e136]: Thread
                  - heading "listing-e2e466092bd2 with actor-farmer-gh-r5-seller-1776699826357" [level=2] [ref=e137]
                  - paragraph [ref=e138]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
                - generic [ref=e139]:
                  - generic [ref=e140]:
                    - generic [ref=e141]: Accepted
                    - generic [ref=e142]: 405 GHS
                    - generic [ref=e143]: thread-c42ad3ab9508
                  - generic "Selected thread summary" [ref=e144]:
                    - article [ref=e145]:
                      - generic [ref=e146]: Current offer
                      - strong [ref=e147]: 405 GHS
                      - paragraph [ref=e148]: Latest commercial position for this thread.
                    - article [ref=e149]:
                      - generic [ref=e150]: Participants
                      - strong [ref=e151]: Buyer and seller only
                      - paragraph [ref=e152]: Confirmation controls are restricted to the named participant when a checkpoint exists.
                  - complementary [ref=e153]:
                    - strong [ref=e154]: Terminal-state lock is active
                    - paragraph [ref=e155]: Thread status is accepted. Counter and confirmation-request controls are intentionally disabled because the thread is already closed.
                  - generic [ref=e158]:
                    - generic [ref=e160]:
                      - paragraph [ref=e161]: Conversation
                      - heading "Message history" [level=2] [ref=e162]
                      - paragraph [ref=e163]: Each offer, counter, and confirmation step is added to the timeline so the commercial record is easy to follow.
                    - list [ref=e164]:
                      - listitem [ref=e165]:
                        - generic [ref=e167]:
                          - strong [ref=e168]: Offer created
                          - paragraph [ref=e169]: actor-buyer-gh-r5-buyer-1776699826357 • 405 GHS
                          - paragraph [ref=e170]: R5 buyer offer
                          - paragraph [ref=e171]: 4/20/2026, 3:43:51 PM
                      - listitem [ref=e172]:
                        - generic [ref=e174]:
                          - strong [ref=e175]: Confirmation requested
                          - paragraph [ref=e176]: actor-farmer-gh-r5-seller-1776699826357
                          - paragraph [ref=e177]: Seller requests final confirmation.
                          - paragraph [ref=e178]: 4/20/2026, 3:43:51 PM
                      - listitem [ref=e179]:
                        - generic [ref=e181]:
                          - strong [ref=e182]: Confirmation approved
                          - paragraph [ref=e183]: actor-buyer-gh-r5-buyer-1776699826357
                          - paragraph [ref=e184]: Buyer approves accepted thread.
                          - paragraph [ref=e185]: 4/20/2026, 3:43:51 PM
              - article [ref=e187]:
                - generic [ref=e189]:
                  - paragraph [ref=e190]: Evidence
                  - heading "Audit and idempotency cues" [level=2] [ref=e191]
                  - paragraph [ref=e192]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
                - paragraph [ref=e193]: Use this panel to explain whether the last change succeeded once, replayed safely, or still needs another attempt.
                - complementary [ref=e194]:
                  - strong [ref=e195]: No mutation evidence captured yet
                  - paragraph [ref=e196]: Create or update a thread to surface request metadata, replay state, and audit evidence from the canonical audit route.
```

# Test source

```ts
  333 |     await assertA11ySmoke(page);
  334 |     await captureProof(page, testInfo, "04-role-home");
  335 |   });
  336 | 
  337 |   test("captures seeded marketplace, wallet, notifications, and traceability flows", async ({ page, request }, testInfo) => {
  338 |     const stamp = Date.now();
  339 |     const seller = await createAuthenticatedSession(request, {
  340 |       displayName: "R5 Seller",
  341 |       email: `r5.seller.${stamp}@example.com`,
  342 |       role: "farmer",
  343 |       scopeIds: ["identity.core", "workflow.audit", "traceability.runtime"],
  344 |     });
  345 |     const buyer = await createAuthenticatedSession(request, {
  346 |       displayName: "R5 Buyer",
  347 |       email: `r5.buyer.${stamp}@example.com`,
  348 |       role: "buyer",
  349 |       scopeIds: ["identity.core", "workflow.audit", "notifications.delivery"],
  350 |     });
  351 | 
  352 |     await primeSession(page, seller);
  353 |     await gotoPath(page, "/app/market/listings");
  354 |     await expect(page.getByRole("heading", { name: "Create, revise, and publish inventory with clear market status" })).toBeVisible();
  355 |     await assertA11ySmoke(page);
  356 |     await captureProof(page, testInfo, "05-market-listings");
  357 | 
  358 |     const detailHref = await createListing(page, {
  359 |       title: `R5 listing ${stamp}`,
  360 |       commodity: "Cassava",
  361 |       quantityTons: "5.0",
  362 |       priceAmount: "420",
  363 |       priceCurrency: "GHS",
  364 |       location: "Tamale, GH",
  365 |       summary: "Accepted negotiation route proof for wallet, notifications, and listing detail.",
  366 |     });
  367 |     const listingId = listingIdFromHref(detailHref);
  368 |     await gotoPath(page, detailHref);
  369 |     await expect(page.getByText(`R5 listing ${stamp}`).first()).toBeVisible();
  370 |     await assertA11ySmoke(page);
  371 |     await captureProof(page, testInfo, "06-market-listing-detail");
  372 | 
  373 |     await publishListingViaCommand(
  374 |       request,
  375 |       seller.accessToken,
  376 |       seller.session.actor.actor_id,
  377 |       seller.session.actor.country_code,
  378 |       listingId,
  379 |     );
  380 | 
  381 |     await requestNegotiationCommand(
  382 |       request,
  383 |       buyer.accessToken,
  384 |       buyer.session.actor.actor_id,
  385 |       buyer.session.actor.country_code,
  386 |       "market.negotiations.create",
  387 |       listingId,
  388 |       {
  389 |         listing_id: listingId,
  390 |         offer_amount: 405,
  391 |         offer_currency: "GHS",
  392 |         note: "R5 buyer offer",
  393 |       },
  394 |     );
  395 |     const threadsResponse = await request.get(`${API_BASE_URL}/api/v1/marketplace/negotiations`, {
  396 |       headers: { Authorization: `Bearer ${buyer.accessToken}` },
  397 |     });
  398 |     expect(threadsResponse.ok()).toBeTruthy();
  399 |     const threadPayload = (await threadsResponse.json()) as {
  400 |       items: Array<{ listing_id: string; thread_id: string }>;
  401 |     };
  402 |     const threadId = threadPayload.items.find((item) => item.listing_id === listingId)?.thread_id;
  403 |     expect(threadId).toBeTruthy();
  404 | 
  405 |     await requestNegotiationCommand(
  406 |       request,
  407 |       seller.accessToken,
  408 |       seller.session.actor.actor_id,
  409 |       seller.session.actor.country_code,
  410 |       "market.negotiations.confirm.request",
  411 |       threadId!,
  412 |       {
  413 |         thread_id: threadId,
  414 |         required_confirmer_actor_id: buyer.session.actor.actor_id,
  415 |         note: "Seller requests final confirmation.",
  416 |       },
  417 |     );
  418 |     await requestNegotiationCommand(
  419 |       request,
  420 |       buyer.accessToken,
  421 |       buyer.session.actor.actor_id,
  422 |       buyer.session.actor.country_code,
  423 |       "market.negotiations.confirm.approve",
  424 |       threadId!,
  425 |       {
  426 |         thread_id: threadId,
  427 |         note: "Buyer approves accepted thread.",
  428 |       },
  429 |     );
  430 | 
  431 |     await primeSession(page, buyer);
  432 |     await gotoPath(page, `/app/market/negotiations?listingId=${listingId}&threadId=${threadId}`);
> 433 |     await expect(page.getByRole("heading", { name: "Track every live negotiation in one place" })).toBeVisible();
      |                                                                                                    ^ Error: expect(locator).toBeVisible() failed
  434 |     await assertA11ySmoke(page);
  435 |     await captureProof(page, testInfo, "07-negotiation");
  436 | 
  437 |     await gotoPath(page, "/app/payments/wallet");
  438 |     await expect(page.getByRole("heading", { name: "Track balances, escrow, and settlement exceptions" })).toBeVisible();
  439 |     const startEscrow = page.getByRole("button", { name: "Start escrow" });
  440 |     if (await startEscrow.isVisible().catch(() => false)) {
  441 |       await startEscrow.click();
  442 |       await expect(page.getByRole("button", { name: "Mark as partner pending" })).toBeVisible({ timeout: 30_000 });
  443 |       await page.getByRole("button", { name: "Mark as partner pending" }).click();
  444 |     }
  445 |     await assertA11ySmoke(page);
  446 |     await captureProof(page, testInfo, "08-wallet");
  447 | 
  448 |     await gotoPath(page, "/app/notifications");
  449 |     await expect(page.getByRole("heading", { name: "Important updates across your workflow" })).toBeVisible();
  450 |     await assertA11ySmoke(page);
  451 |     await captureProof(page, testInfo, "09-notifications");
  452 | 
  453 |     const consignmentId = await createConsignmentTimeline(request, seller);
  454 |     await primeSession(page, seller);
  455 |     await gotoPath(page, `/app/traceability/${consignmentId}`);
  456 |     await expect(page.getByRole("heading", { name: "Ordered event chain" })).toBeVisible();
  457 |     await assertA11ySmoke(page);
  458 |     await captureProof(page, testInfo, "10-traceability");
  459 |   });
  460 | 
  461 |   test("captures operations, advisory, climate, finance, and admin routes", async ({ page, request }, testInfo) => {
  462 |     const stamp = `${testInfo.project.name}-${Date.now()}`;
  463 | 
  464 |     await signInAndGrantConsent(page, {
  465 |       displayName: "R5 Cooperative",
  466 |       email: `r5.coop.${stamp}@example.com`,
  467 |       role: "cooperative",
  468 |       countryCode: "GH",
  469 |     });
  470 |     await gotoPath(page, "/app/cooperative/dispatch");
  471 |     await expect(page.getByRole("heading", { name: "Coordinate dispatch, member actions, and proof checkpoints" })).toBeVisible();
  472 |     await assertA11ySmoke(page);
  473 |     await captureProof(page, testInfo, "11-dispatch");
  474 | 
  475 |     await signInAndGrantConsent(page, {
  476 |       displayName: "R5 Advisor",
  477 |       email: `r5.advisor.${stamp}@example.com`,
  478 |       role: "advisor",
  479 |       countryCode: "GH",
  480 |     });
  481 |     await gotoPath(page, "/app/advisor/requests");
  482 |     await expect(page.getByRole("heading", { name: "Grounded guidance with reviewer state" })).toBeVisible();
  483 |     await assertA11ySmoke(page);
  484 |     await captureProof(page, testInfo, "12-advisory");
  485 | 
  486 |     await gotoPath(page, "/app/climate/alerts");
  487 |     await expect(page.getByRole("heading", { name: "Live alert triage with visible degraded-mode posture" })).toBeVisible();
  488 |     await assertA11ySmoke(page);
  489 |     await captureProof(page, testInfo, "13-climate");
  490 | 
  491 |     const finance = await createAuthenticatedSession(request, {
  492 |       displayName: "R5 Finance",
  493 |       email: `r5.finance.${stamp}@example.com`,
  494 |       role: "finance",
  495 |       scopeIds: ["identity.core", "workflow.audit", "regulated.finance"],
  496 |     });
  497 |     await primeSession(page, finance);
  498 |     await gotoPath(page, "/app/finance/queue");
  499 |     await expect(page.getByRole("heading", { name: "Review partner-owned decisions without hidden approval paths" })).toBeVisible();
  500 |     await assertA11ySmoke(page);
  501 |     await captureProof(page, testInfo, "14-finance");
  502 | 
  503 |     const admin = await createAuthenticatedSession(request, {
  504 |       displayName: "R5 Admin",
  505 |       email: `r5.admin.${stamp}@example.com`,
  506 |       role: "admin",
  507 |       scopeIds: ["identity.core", "workflow.audit", "admin.observability", "admin.rollout"],
  508 |     });
  509 |     await primeSession(page, admin);
  510 |     await gotoPath(page, "/app/admin/analytics");
  511 |     await expect(page.getByRole("heading", { name: "Platform health and release posture" })).toBeVisible();
  512 |     await assertA11ySmoke(page);
  513 |     await captureProof(page, testInfo, "15-admin");
  514 |   });
  515 | });
  516 | 
```