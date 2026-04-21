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
          - paragraph [ref=e14]: r5.buyer.1776701638582@example.com · Buyer · GH
          - paragraph [ref=e15]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e16]:
          - generic [ref=e17]: Trace trace-ket-negotiations-2nmpj7
          - button "Sign out" [ref=e18] [cursor=pointer]
      - region "Sync status" [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e22]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e23]
          - paragraph [ref=e24]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-2nmpj7."
        - generic [ref=e25]:
          - button "Force online" [ref=e26] [cursor=pointer]
          - button "Simulate degraded" [ref=e27] [cursor=pointer]
          - button "Simulate offline" [ref=e28] [cursor=pointer]
      - generic [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e34]:
            - paragraph [ref=e35]: Offers and negotiations
            - heading "Inbox and thread controls on the canonical N2-A2 runtime" [level=2] [ref=e36]
            - paragraph [ref=e37]: Review active threads, create offers, respond with counters, and manage confirmation checkpoints without losing the audit trail.
          - generic [ref=e38]:
            - generic [ref=e39]: buyer
            - generic [ref=e40]: Accepted
          - generic "Negotiation workspace posture" [ref=e41]:
            - article [ref=e42]:
              - generic [ref=e43]: Visible threads
              - strong [ref=e44]: "1"
              - paragraph [ref=e45]: Only participant threads surface in this inbox.
            - article [ref=e46]:
              - generic [ref=e47]: Selected state
              - strong [ref=e48]: Accepted
              - paragraph [ref=e49]: Controls change as confirmation and terminal states evolve.
            - article [ref=e50]:
              - generic [ref=e51]: Evidence capture
              - strong [ref=e52]: Pending action
              - paragraph [ref=e53]: Request metadata appears after each regulated mutation.
        - generic [ref=e54]:
          - article [ref=e55]:
            - generic [ref=e57]:
              - paragraph [ref=e58]: Inbox
              - heading "Visible negotiations" [level=2] [ref=e59]
              - paragraph [ref=e60]: Only participant threads appear here. If you are not part of the negotiation, you do not see the thread or its confirmation controls.
            - generic "Inbox rules" [ref=e61]:
              - article [ref=e62]:
                - heading "Scope is enforced" [level=3] [ref=e63]
                - paragraph [ref=e64]: Threads outside your actor scope fail closed and stay out of the list.
              - article [ref=e65]:
                - heading "Status drives controls" [level=3] [ref=e66]
                - paragraph [ref=e67]: Open, pending confirmation, accepted, and rejected threads do not share the same actions.
            - list "Negotiation threads" [ref=e68]:
              - button "listing-03d4d5d02001 with actor-farmer-gh-r5-seller-1776701638582 Accepted Offer 405 GHS Updated 4/20/2026, 4:14:07 PM" [ref=e69] [cursor=pointer]:
                - generic [ref=e70]:
                  - strong [ref=e71]: listing-03d4d5d02001 with actor-farmer-gh-r5-seller-1776701638582
                  - generic [ref=e72]: Accepted
                - paragraph [ref=e73]: Offer 405 GHS
                - paragraph [ref=e74]: Updated 4/20/2026, 4:14:07 PM
          - generic [ref=e75]:
            - article [ref=e76]:
              - generic [ref=e78]:
                - paragraph [ref=e79]: Open offer
                - heading "Buyer offer composer" [level=2] [ref=e80]
                - paragraph [ref=e81]: Start with a published lot, submit one canonical offer, and keep the result visible if the request is replayed or retried.
              - paragraph [ref=e82]: This composer is buyer-only and assumes the lot has already passed the buyer-safe visibility boundary.
              - generic [ref=e83]:
                - generic [ref=e84]:
                  - generic [ref=e85]: Listing ID
                  - textbox "Listing ID" [ref=e86]: listing-03d4d5d02001
                  - paragraph [ref=e87]: Use a published listing id. Owner and unpublished listings fail closed.
                - generic [ref=e88]:
                  - generic [ref=e89]:
                    - generic [ref=e90]: Offer amount
                    - spinbutton "Offer amount" [ref=e91]: "500"
                  - generic [ref=e92]:
                    - generic [ref=e93]: Currency
                    - textbox "Currency" [ref=e94]: GHS
                - generic [ref=e95]:
                  - generic [ref=e96]: Buyer note
                  - textbox "Buyer note" [ref=e97]
                - button "Create offer thread" [ref=e98] [cursor=pointer]
            - article [ref=e99]:
              - generic [ref=e101]:
                - paragraph [ref=e102]: Thread
                - heading "listing-03d4d5d02001 with actor-farmer-gh-r5-seller-1776701638582" [level=2] [ref=e103]
                - paragraph [ref=e104]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
              - generic [ref=e105]:
                - generic [ref=e106]:
                  - generic [ref=e107]: Accepted
                  - generic [ref=e108]: 405 GHS
                  - generic [ref=e109]: thread-73afe211b069
                - generic "Selected thread summary" [ref=e110]:
                  - article [ref=e111]:
                    - generic [ref=e112]: Current offer
                    - strong [ref=e113]: 405 GHS
                    - paragraph [ref=e114]: Latest commercial position for this thread.
                  - article [ref=e115]:
                    - generic [ref=e116]: Participants
                    - strong [ref=e117]: Buyer and seller only
                    - paragraph [ref=e118]: Confirmation controls are restricted to the named participant when a checkpoint exists.
                - complementary [ref=e119]:
                  - strong [ref=e120]: Terminal-state lock is active
                  - paragraph [ref=e121]: Thread status is accepted. Counter and confirmation-request controls are intentionally disabled because the thread is already closed.
                - generic [ref=e124]:
                  - generic [ref=e126]:
                    - paragraph [ref=e127]: Conversation
                    - heading "Message history" [level=2] [ref=e128]
                    - paragraph [ref=e129]: Each offer, counter, and confirmation step is added to the timeline so the commercial record is easy to follow.
                  - list [ref=e130]:
                    - listitem [ref=e131]:
                      - generic [ref=e133]:
                        - strong [ref=e134]: Offer created
                        - paragraph [ref=e135]: actor-buyer-gh-r5-buyer-1776701638582 • 405 GHS
                        - paragraph [ref=e136]: R5 buyer offer
                        - paragraph [ref=e137]: 4/20/2026, 4:14:07 PM
                    - listitem [ref=e138]:
                      - generic [ref=e140]:
                        - strong [ref=e141]: Confirmation requested
                        - paragraph [ref=e142]: actor-farmer-gh-r5-seller-1776701638582
                        - paragraph [ref=e143]: Seller requests final confirmation.
                        - paragraph [ref=e144]: 4/20/2026, 4:14:07 PM
                    - listitem [ref=e145]:
                      - generic [ref=e147]:
                        - strong [ref=e148]: Confirmation approved
                        - paragraph [ref=e149]: actor-buyer-gh-r5-buyer-1776701638582
                        - paragraph [ref=e150]: Buyer approves accepted thread.
                        - paragraph [ref=e151]: 4/20/2026, 4:14:07 PM
            - article [ref=e152]:
              - generic [ref=e154]:
                - paragraph [ref=e155]: Evidence
                - heading "Audit and idempotency cues" [level=2] [ref=e156]
                - paragraph [ref=e157]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
              - paragraph [ref=e158]: Use this panel to explain whether the last change succeeded once, replayed safely, or still needs another attempt.
              - complementary [ref=e159]:
                - strong [ref=e160]: No mutation evidence captured yet
                - paragraph [ref=e161]: Create or update a thread to surface request metadata, replay state, and audit evidence from the canonical audit route.
      - navigation "Mobile primary" [ref=e163]:
        - link "Home" [ref=e164] [cursor=pointer]:
          - /url: /app/buyer
          - generic [ref=e165]: Home
        - link "Market" [ref=e166] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e167]: Market
        - link "Inbox" [ref=e168] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e169]: Inbox
        - link "Alerts" [ref=e170] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e171]: Alerts
        - link "Profile 2" [ref=e172] [cursor=pointer]:
          - /url: /app/profile
          - generic [ref=e173]: Profile
          - generic [ref=e174]: "2"
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
  471 |     await expect(page.getByRole("heading", { name: "Member dispatch board" })).toBeVisible();
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
  511 |     await expect(page.getByRole("heading", { name: "Service health" })).toBeVisible();
  512 |     await assertA11ySmoke(page);
  513 |     await captureProof(page, testInfo, "15-admin");
  514 |   });
  515 | });
  516 | 
```