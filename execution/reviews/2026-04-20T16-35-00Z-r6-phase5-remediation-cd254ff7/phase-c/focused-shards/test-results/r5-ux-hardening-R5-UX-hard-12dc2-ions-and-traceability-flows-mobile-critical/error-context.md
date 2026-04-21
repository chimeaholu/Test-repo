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
          - paragraph [ref=e21]: R5 Buyer
          - heading "Ghana Growers Network" [level=1] [ref=e22]
          - paragraph [ref=e23]: r5.buyer.1776703658649@example.com · Buyer · GH
          - paragraph [ref=e24]: This protected workspace keeps role routing, queue state, and consent posture persistent while you move between operational routes.
        - generic [ref=e25]:
          - generic [ref=e26]: Trace trace-ket-negotiations-ycm34j
          - button "Sign out" [ref=e27] [cursor=pointer]
      - region "Sync status" [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Online
          - heading "Offline work stays visible and recoverable." [level=2] [ref=e32]
          - paragraph [ref=e33]: "Pending items: 0. Conflicts: 0. Trace ID: trace-ket-negotiations-ycm34j."
        - generic [ref=e34]:
          - button "Force online" [ref=e35] [cursor=pointer]
          - button "Simulate degraded" [ref=e36] [cursor=pointer]
          - button "Simulate offline" [ref=e37] [cursor=pointer]
      - generic [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e43]:
            - paragraph [ref=e44]: Offers and negotiations
            - heading "Inbox and thread controls on the canonical N2-A2 runtime" [level=2] [ref=e45]
            - paragraph [ref=e46]: Review active threads, create offers, respond with counters, and manage confirmation checkpoints without losing the audit trail.
          - generic [ref=e47]:
            - generic [ref=e48]: buyer
            - generic [ref=e49]: Accepted
          - generic "Negotiation workspace posture" [ref=e50]:
            - article [ref=e51]:
              - generic [ref=e52]: Visible threads
              - strong [ref=e53]: "1"
              - paragraph [ref=e54]: Only participant threads surface in this inbox.
            - article [ref=e55]:
              - generic [ref=e56]: Selected state
              - strong [ref=e57]: Accepted
              - paragraph [ref=e58]: Controls change as confirmation and terminal states evolve.
            - article [ref=e59]:
              - generic [ref=e60]: Evidence capture
              - strong [ref=e61]: Pending action
              - paragraph [ref=e62]: Request metadata appears after each regulated mutation.
        - generic [ref=e63]:
          - article [ref=e64]:
            - generic [ref=e66]:
              - paragraph [ref=e67]: Inbox
              - heading "Visible negotiations" [level=2] [ref=e68]
              - paragraph [ref=e69]: Only participant threads appear here. If you are not part of the negotiation, you do not see the thread or its confirmation controls.
            - generic "Inbox rules" [ref=e70]:
              - article [ref=e71]:
                - heading "Scope is enforced" [level=3] [ref=e72]
                - paragraph [ref=e73]: Threads outside your actor scope fail closed and stay out of the list.
              - article [ref=e74]:
                - heading "Status drives controls" [level=3] [ref=e75]
                - paragraph [ref=e76]: Open, pending confirmation, accepted, and rejected threads do not share the same actions.
            - list "Negotiation threads" [ref=e77]:
              - button "listing-10470d81f0b9 with actor-farmer-gh-r5-seller-1776703658649 Accepted Offer 405 GHS Updated 4/20/2026, 4:47:57 PM" [ref=e78] [cursor=pointer]:
                - generic [ref=e79]:
                  - strong [ref=e80]: listing-10470d81f0b9 with actor-farmer-gh-r5-seller-1776703658649
                  - generic [ref=e81]: Accepted
                - paragraph [ref=e82]: Offer 405 GHS
                - paragraph [ref=e83]: Updated 4/20/2026, 4:47:57 PM
          - generic [ref=e84]:
            - article [ref=e85]:
              - generic [ref=e87]:
                - paragraph [ref=e88]: Open offer
                - heading "Buyer offer composer" [level=2] [ref=e89]
                - paragraph [ref=e90]: Start with a published lot, submit one canonical offer, and keep the result visible if the request is replayed or retried.
              - paragraph [ref=e91]: This composer is buyer-only and assumes the lot has already passed the buyer-safe visibility boundary.
              - generic [ref=e92]:
                - generic [ref=e93]:
                  - generic [ref=e94]: Listing ID
                  - textbox "Listing ID" [ref=e95]: listing-10470d81f0b9
                  - paragraph [ref=e96]: Use a published listing id. Owner and unpublished listings fail closed.
                - generic [ref=e97]:
                  - generic [ref=e98]:
                    - generic [ref=e99]: Offer amount
                    - spinbutton "Offer amount" [ref=e100]: "500"
                  - generic [ref=e101]:
                    - generic [ref=e102]: Currency
                    - textbox "Currency" [ref=e103]: GHS
                - generic [ref=e104]:
                  - generic [ref=e105]: Buyer note
                  - textbox "Buyer note" [ref=e106]
                - button "Create offer thread" [ref=e107] [cursor=pointer]
            - article [ref=e108]:
              - generic [ref=e110]:
                - paragraph [ref=e111]: Thread
                - heading "listing-10470d81f0b9 with actor-farmer-gh-r5-seller-1776703658649" [level=2] [ref=e112]
                - paragraph [ref=e113]: Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next.
              - generic [ref=e114]:
                - generic [ref=e115]:
                  - generic [ref=e116]: Accepted
                  - generic [ref=e117]: 405 GHS
                  - generic [ref=e118]: thread-99b04f643a7c
                - generic "Selected thread summary" [ref=e119]:
                  - article [ref=e120]:
                    - generic [ref=e121]: Current offer
                    - strong [ref=e122]: 405 GHS
                    - paragraph [ref=e123]: Latest commercial position for this thread.
                  - article [ref=e124]:
                    - generic [ref=e125]: Participants
                    - strong [ref=e126]: Buyer and seller only
                    - paragraph [ref=e127]: Confirmation controls are restricted to the named participant when a checkpoint exists.
                - complementary [ref=e128]:
                  - strong [ref=e129]: Terminal-state lock is active
                  - paragraph [ref=e130]: Thread status is accepted. Counter and confirmation-request controls are intentionally disabled because the thread is already closed.
                - generic [ref=e133]:
                  - generic [ref=e135]:
                    - paragraph [ref=e136]: Conversation
                    - heading "Message history" [level=2] [ref=e137]
                    - paragraph [ref=e138]: Each offer, counter, and confirmation step is added to the timeline so the commercial record is easy to follow.
                  - list [ref=e139]:
                    - listitem [ref=e140]:
                      - generic [ref=e142]:
                        - strong [ref=e143]: Offer created
                        - paragraph [ref=e144]: actor-buyer-gh-r5-buyer-1776703658649 • 405 GHS
                        - paragraph [ref=e145]: R5 buyer offer
                        - paragraph [ref=e146]: 4/20/2026, 4:47:57 PM
                    - listitem [ref=e147]:
                      - generic [ref=e149]:
                        - strong [ref=e150]: Confirmation requested
                        - paragraph [ref=e151]: actor-farmer-gh-r5-seller-1776703658649
                        - paragraph [ref=e152]: Seller requests final confirmation.
                        - paragraph [ref=e153]: 4/20/2026, 4:47:57 PM
                    - listitem [ref=e154]:
                      - generic [ref=e156]:
                        - strong [ref=e157]: Confirmation approved
                        - paragraph [ref=e158]: actor-buyer-gh-r5-buyer-1776703658649
                        - paragraph [ref=e159]: Buyer approves accepted thread.
                        - paragraph [ref=e160]: 4/20/2026, 4:47:57 PM
            - article [ref=e161]:
              - generic [ref=e163]:
                - paragraph [ref=e164]: Evidence
                - heading "Audit and idempotency cues" [level=2] [ref=e165]
                - paragraph [ref=e166]: Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked.
              - paragraph [ref=e167]: Use this panel to explain whether the last change succeeded once, replayed safely, or still needs another attempt.
              - complementary [ref=e168]:
                - strong [ref=e169]: No mutation evidence captured yet
                - paragraph [ref=e170]: Create or update a thread to surface request metadata, replay state, and audit evidence from the canonical audit route.
      - navigation "Mobile primary" [ref=e172]:
        - link "Home" [ref=e173] [cursor=pointer]:
          - /url: /app/buyer
          - generic [ref=e174]: Home
        - link "Market" [ref=e175] [cursor=pointer]:
          - /url: /app/market/listings
          - generic [ref=e176]: Market
        - link "Inbox" [ref=e177] [cursor=pointer]:
          - /url: /app/market/negotiations
          - generic [ref=e178]: Inbox
        - link "Alerts" [ref=e179] [cursor=pointer]:
          - /url: /app/climate/alerts
          - generic [ref=e180]: Alerts
        - link "Profile 2" [ref=e181] [cursor=pointer]:
          - /url: /app/profile
          - generic [ref=e182]: Profile
          - generic [ref=e183]: "2"
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